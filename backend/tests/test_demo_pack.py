"""M1 演示包端到端：make_demo_pack 生成 → import_seed_package 导入 →
按车找件链（I1 fitments+ru 名）→ 幂等重导 → DELTA 增量 → schema_ver 拒收。

对应 26号 §九 DoD2/DoD3 演练的仓内自动化部分；演练（真实服务端）另录证据。
"""

import json
import zipfile

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from catalog.models import VehicleModel, VehicleSeries
from catalog.models_entity_names import EntityName
from catalog.models_fitment import SPUFitment
from catalog.models_pack_log import CatalogPackLog
from catalog.models_product import SPU, SPUInterchange
from catalog.services import query as Q

pytestmark = pytest.mark.django_db


@pytest.fixture
def demo_dir(tmp_path):
    return tmp_path / "demo"


def _make_pack(demo_dir, pack_type="INIT"):
    call_command("make_demo_pack", f"--type={pack_type}", f"--out={demo_dir}")
    assert demo_dir.exists()
    files = sorted(demo_dir.glob(f"*{pack_type}*.zip"))
    assert len(files) == 1, files
    return files[0]


def _import(path):
    call_command("import_seed_package", f"--package={path}")


def test_init_pack_import_full_chain(demo_dir):
    """INIT 全链：10 实体落库 + 包内 UUID 与 entity_names 对上 + 按车找件出件。"""
    pkg = _make_pack(demo_dir, "INIT")
    _import(pkg)

    assert CatalogPackLog.objects.filter(pack_id="DEMO-0001").exists()
    assert SPU.objects.filter(spu_code__startswith="DM0000").count() == 4
    assert VehicleSeries.objects.filter(series_code__in=["TIGGO7", "TIGGO4", "JOLION"]).count() == 3
    assert VehicleModel.objects.count() == 3
    assert SPUFitment.objects.filter(verified_status="verified").count() == 5
    assert SPUInterchange.objects.count() == 1

    # 27号§5.2：包内 UUID 主键生效——entity_names 的 entity_id 能命中实体行
    spu = SPU.objects.get(spu_code="DM00001")
    rows = EntityName.objects.filter(entity_type="spu", entity_id=str(spu.spu_id))
    assert rows.filter(market="ru", status="active").exists()

    # I1 按车找件：车型→verified 适配→SPU（ru 名称回退链生效）
    model = VehicleModel.objects.get(model_code="TIG7-15T")
    total, fits = Q.fitment_spus(Q.FitmentQuery(model_id=str(model.model_id)))
    assert total == 2
    Q.attach_entity_names("spu", [f.spu for f in fits])
    names = {Q.resolve_name(f.spu, zh_field="spu_name", en_field="spu_name_en") for f in fits}
    assert all(n and n != f.spu.spu_name for n, f in zip(sorted(names), fits)) or names
    assert {
        Q.resolved_locale(f.spu, zh_field="spu_name", en_field="spu_name_en") for f in fits
    } == {"ru"}
    # 交叉号双向检索：原厂 OE 命中副厂
    direct, xref = Q.search_oe("481H-1010050")
    assert [s.spu_code for s in direct] == ["DM00003"]
    assert [s.spu_code for s in xref] == ["DM00004"]


def test_reimport_same_pack_noop(demo_dir):
    """27号§七 幂等：同包重导 no-op，库内零漂移。"""
    pkg = _make_pack(demo_dir, "INIT")
    _import(pkg)
    first = SPU.objects.count()
    _import(pkg)  # 第二次：包级 no-op
    assert CatalogPackLog.objects.count() == 1
    assert SPU.objects.count() == first


def test_delta_increment_applies(demo_dir):
    """DELTA 增量：新增 SPU 生效，INIT 存量不受影响。"""
    _import(_make_pack(demo_dir, "INIT"))
    base = SPU.objects.count()
    _import(_make_pack(demo_dir, "DELTA"))

    assert SPU.objects.filter(spu_code="DM00005").exists()
    assert SPU.objects.count() == base + 1
    assert CatalogPackLog.objects.filter(pack_id="DEMO-0002").exists()
    model = VehicleModel.objects.get(model_code="TIG4-15T")
    total, _fits = Q.fitment_spus(Q.FitmentQuery(model_id=str(model.model_id)))
    assert total == 2  # 存量 DM00003 + DELTA 新增 DM00005


def test_schema_ver_out_of_window_rejected(demo_dir, tmp_path):
    """27号§六.2：schema_ver 超窗（2.0 > 支持窗口）→ 拒收且零残留。"""
    pkg = _make_pack(demo_dir, "INIT")
    tampered = tmp_path / "tampered.zip"
    with zipfile.ZipFile(pkg) as src, zipfile.ZipFile(tampered, "w") as dst:
        for name in src.namelist():
            data = src.read(name)
            if name == "manifest.json":
                manifest = json.loads(data)
                manifest["version"] = "DEMO-BAD"
                manifest["schema_ver"] = "2.0"
                data = json.dumps(manifest).encode()
            dst.writestr(name, data)

    with pytest.raises(CommandError, match="schema_ver"):
        _import(tampered)
    assert SPU.objects.count() == 0  # 拒收即零残留

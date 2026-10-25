"""S1 目录域测试（29号§七验收 + I3 导入幂等，27号§七/§十一）。"""

import json
import zipfile
from io import BytesIO

import pytest
from django.test import Client

from catalog.models import Brand, VehicleModel, VehicleSeries
from catalog.models_category import Category
from catalog.models_fitment import SPUFitment
from catalog.models_pack_log import CatalogPackLog
from catalog.models_product import SPU, SPUInterchange

pytestmark = [pytest.mark.django_db]


@pytest.fixture
def seed_data():
    brand = Brand.objects.create(
        brand_code="BRT",
        brand_name="博世",
        brand_name_en="BOSCH",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )
    cat = Category.objects.create(
        category_code="BRAKE",
        category_name="制动系统",
        category_type="back",
        category_level="level2",
        node_type="leaf",
        category_status="active",
    )
    series = VehicleSeries.objects.create(
        series_code="TIG7",
        series_name="瑞虎7",
        series_name_en="Tiggo 7",
        brand_id=brand,
        brand_code="BRT",
        brand_name="博世",
        launch_year=2020,
        series_status="active",
    )
    model = VehicleModel.objects.create(
        model_code="TIG7PRO",
        model_name="瑞虎7 Pro 1.6T",
        series=series,
        series_code="TIG7",
        series_name="瑞虎7",
        brand=brand,
        brand_code="BRT",
        brand_name="博世",
        status="active",
    )
    spu = SPU.objects.create(
        spu_code="P000001",
        spu_name="前制动摩擦片",
        brand_id=brand,
        product_type="part",
        oe_number="T11-3501080",
        spu_status="active",
    )
    fit_v = SPUFitment.objects.create(
        spu=spu,
        series=series,
        submodel=model,
        qualifiers={"YEAR_FROM": 2020},
        year_from=2020,
        year_to=2024,
        verified_status="verified",
        status="active",
    )
    SPUFitment.objects.create(  # 未验证行——门控应隐藏
        spu=spu,
        series=series,
        submodel=model,
        qualifiers={},
        verified_status="unverified",
        status="active",
    )
    spu2 = SPU.objects.create(
        spu_code="P000002",
        spu_name="后制动摩擦片(互换)",
        brand_id=brand,
        product_type="part",
        oe_number="T11-3501090",
        spu_status="active",
    )
    SPUInterchange.objects.create(
        source_spu=spu,
        target_spu=spu2,
        interchange_type="CROSS_BRAND",
        direction="TWO_WAY",
    )
    return {
        "brand": brand,
        "category": cat,
        "series": series,
        "model": model,
        "spu": spu,
        "spu2": spu2,
        "fit_verified": fit_v,
    }


client = Client()


def test_i1_brands(seed_data):
    resp = client.get("/catalog/v1/brands")
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["catalog_version"]
    assert body["data"][0]["display_name"] == "BOSCH"  # 回退链 en 优先于 zh


def test_i1_series_models(seed_data):
    d = seed_data
    r1 = client.get(f"/catalog/v1/brands/{d['brand'].brand_id}/series")
    assert r1.json()["data"][0]["series_id"] == str(d["series"].series_id)
    r2 = client.get(f"/catalog/v1/series/{d['series'].series_id}/models")
    row = r2.json()["data"][0]
    assert row["model_id"] == str(d["model"].model_id)


def test_i1_fitments_verified_gate(seed_data):
    """29号§七.3 门控：unverified 适配行前台不可见。"""
    d = seed_data
    resp = client.get(f"/catalog/v1/fitments?model_id={d['model'].model_id}")
    data = resp.json()["data"]
    assert len(data) == 1  # 只放行 verified 行
    assert data[0]["fitment"]["verified_status"] == "verified"


def test_i1_fitments_missing_model_id(seed_data):
    resp = client.get("/catalog/v1/fitments")
    assert resp.status_code == 400


def test_i1_oe_search_groups(seed_data):
    """29号§七.2：OE 检索精确+交叉号分组；规范化容错。"""
    d = seed_data
    resp = client.get("/catalog/v1/search/oe?q=t11-3501080")  # 连字符+小写
    groups = resp.json()["data"]
    assert groups["direct"][0]["spu_id"] == str(d["spu"].spu_id)
    assert groups["cross_reference"][0]["spu_id"] == str(d["spu2"].spu_id)


def test_i1_spu_detail_with_attributes(seed_data):
    d = seed_data
    resp = client.get(f"/catalog/v1/spus/{d['spu'].spu_id}")
    assert resp.status_code == 200
    assert "attributes" in resp.json()["data"]


def test_i1_interchanges(seed_data):
    d = seed_data
    resp = client.get(f"/catalog/v1/spus/{d['spu'].spu_id}/interchanges")
    assert resp.json()["data"][0]["target_spu"]["spu_id"] == str(d["spu2"].spu_id)


def test_i2_picker_candidates(seed_data):
    d = seed_data
    resp = client.get("/catalog/v1/picker/candidates?oe=T11-3501080")
    assert resp.json()["data"][0]["spu_id"] == str(d["spu"].spu_id)


def test_pack_log_current_version_default():
    assert CatalogPackLog.current_version() == "unknown"


def _make_package(path, version="test-v1", order=None, counts=None):
    """构造最小种子包（manifest+brands/categories 数据），验证导入幂等。"""
    order = order or ["brands", "categories"]
    rows = {
        "brands": [
            {
                "brand_code": "ZTST",
                "brand_name": "测试品牌",
                "brand_type": "S",
                "brand_level": "brand",
                "brand_status": "active",
            },
        ],
        "categories": [
            {
                "category_code": "ZTSTC",
                "category_name": "测试类目",
                "category_type": "back",
                "category_level": "level3",
                "category_status": "active",
                "node_type": "leaf",
                "sort_order": 1,
            },
        ],
    }
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        manifest = {
            "version": version,
            "import_order": order,
            "counts": counts or {k: len(v) for k, v in rows.items()},
        }
        zf.writestr("manifest.json", json.dumps(manifest))
        for k, v in rows.items():
            zf.writestr(f"{k}.json", json.dumps(v))
    pathlib_write(path, buf.getvalue())


def pathlib_write(path, data):
    with open(path, "wb") as f:
        f.write(data)


def test_i3_import_idempotent(tmp_path):
    """27号§七 幂等细则：同包重导第二次 no-op。"""
    pkg = str(tmp_path / "p.zip")
    _make_package(pkg)
    from django.core.management import call_command

    call_command("import_seed_package", "--package", pkg)
    assert Brand.objects.filter(brand_code="ZTST").count() == 1
    assert CatalogPackLog.objects.filter(pack_id="test-v1").count() == 1

    call_command("import_seed_package", "--package", pkg)
    assert Brand.objects.filter(brand_code="ZTST").count() == 1  # 不重复
    assert CatalogPackLog.objects.count() == 1  # 同包重复导入 no-op（版本登记不重复）


def test_i3_import_unknown_entity_skip_and_strict(tmp_path):
    """G6：未知实体默认 skip+告警，--strict 硬失败。"""
    pkg = str(tmp_path / "p2.zip")
    _make_package(
        pkg,
        order=["brands", "future_entity", "categories"],
        counts={"brands": 1, "future_entity": 3, "categories": 1},
    )
    from django.core.management import call_command
    from django.core.management.base import CommandError

    call_command("import_seed_package", "--package", pkg)  # 默认 skip 不炸
    assert Brand.objects.filter(brand_code="ZTST").count() == 1
    pkg3 = str(tmp_path / "p3.zip")
    _make_package(
        pkg3,
        version="test-strict",
        order=["brands", "future_entity"],
        counts={"brands": 1, "future_entity": 3},
    )
    with pytest.raises(CommandError):
        call_command("import_seed_package", "--package", pkg3, "--strict")

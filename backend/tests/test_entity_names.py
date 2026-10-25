"""D2-B/C 回归：entity_names（27号§四契约）——回退链 ru→en→zh / name_chain / I3 导入 / 演示词表。"""

import json
import zipfile
from io import BytesIO

import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from catalog.models import Brand
from catalog.models_category import Category
from catalog.models_entity_names import EntityName
from catalog.services import query as Q

pytestmark = pytest.mark.django_db


@pytest.fixture
def bosch():
    """中文+英文名品牌（回退链 en 段原料）。"""
    return Brand.objects.create(
        brand_code="BEN1",
        brand_name="博世",
        brand_name_en="BOSCH",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )


def _ru_row(entity_type, entity_id, name, **kw):
    return EntityName.objects.create(
        entity_type=entity_type,
        entity_id=str(entity_id),
        market=kw.get("market", "ru"),
        locale=kw.get("locale", "ru-RU"),
        name_type=kw.get("name_type", "official"),
        source=kw.get("source", "official"),
        name=name,
    )


def test_resolve_prefers_ru_row_over_en(bosch):
    """回退链第一段：entity_names ru official 命中，优先于 *_en 字段。"""
    _ru_row("brand", bosch.brand_id, "Бош")
    Q.attach_entity_names("brand", [bosch])
    assert Q.resolve_name(bosch, zh_field="brand_name", en_field="brand_name_en") == "Бош"
    assert Q.resolved_locale(bosch, zh_field="brand_name", en_field="brand_name_en") == "ru"


def test_resolve_falls_back_en_then_zh(bosch):
    """无 entity_names 行 → 退化 en→zh（语料未灌时行为与此前一致）。"""
    Q.attach_entity_names("brand", [bosch])
    r = Q.resolve_name(bosch, zh_field="brand_name", en_field="brand_name_en")
    assert (r, Q.resolved_locale(bosch, zh_field="brand_name", en_field="brand_name_en")) == (
        "BOSCH",
        "en",
    )
    bosch.brand_name_en = ""
    assert Q.resolve_name(bosch, zh_field="brand_name") == "博世"


def test_alias_row_used_when_no_official(bosch):
    """仅有俗称行（name_type=alias, source=market）→ 以别名为展示名，chain 可标注。"""
    _ru_row("brand", bosch.brand_id, "бошка", name_type="alias", source="market")
    Q.attach_entity_names("brand", [bosch])
    assert Q.resolve_name(bosch, zh_field="brand_name") == "бошка"
    chain = Q.name_chain(bosch)
    assert chain[0]["name_type"] == "alias" and chain[0]["source"] == "market"


def test_global_row_honest_locale(bosch):
    """GLOBAL 行（可能非 ru locale）→ meta 语言如实反映该行 locale，不冒称 ru。"""
    _ru_row("brand", bosch.brand_id, "Robert Bosch GmbH", market="GLOBAL", locale="en-US")
    Q.attach_entity_names("brand", [bosch])
    assert Q.resolve_name(bosch, zh_field="brand_name", en_field="brand_name_en") == (
        "Robert Bosch GmbH"
    )
    assert Q.resolved_locale(bosch, zh_field="brand_name", en_field="brand_name_en") == "en"


def test_brands_api_carries_name_chain(bosch):
    """I1 响应附 name_chain（29号§二）；display_name/ meta.locale 走 entity_names。"""
    _ru_row("brand", bosch.brand_id, "Бош")
    resp = APIClient().get("/catalog/v1/brands")
    assert resp.status_code == 200
    row = next(d for d in resp.json()["data"] if d["brand_code"] == "BEN1")
    assert row["display_name"] == "Бош"
    assert row["name_chain"][0]["name"] == "Бош"
    assert resp.json()["meta"]["locale"] == "ru"


def _pkg_with_entity_names(path, pack_id="ent-v1"):
    rows = [
        {  # 无 name_id（幂等靠自然键）；market 缺省 GLOBAL
            "entity_type": "brand",
            "entity_id": "11111111-1111-1111-1111-111111111111",
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Бош",
            "source": "official",
            "status": "active",
        },
        {
            "entity_type": "category",
            "entity_id": "22222222-2222-2222-2222-222222222222",
            "market": "GLOBAL",
            "locale": "en",
            "name_type": "official",
            "name": "Filters",
            "source": "official",
            "status": "active",
        },
    ]
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            "manifest.json",
            json.dumps(
                {
                    "version": pack_id,
                    "schema_ver": "1.0",
                    "import_order": ["entity_names"],
                    "counts": {"entity_names": len(rows)},
                }
            ),
        )
        zf.writestr("entity_names.json", json.dumps(rows))
    with open(path, "wb") as f:
        f.write(buf.getvalue())


def test_i3_import_entity_names_idempotent(tmp_path):
    """27号§七：entity_names 随包灌入 + 同包重导 no-op。"""
    pkg = str(tmp_path / "ent.zip")
    _pkg_with_entity_names(pkg)
    call_command("import_seed_package", "--package", pkg)
    assert EntityName.objects.filter(entity_type="brand").count() == 1
    call_command("import_seed_package", "--package", pkg)
    assert EntityName.objects.count() == 2  # 不重复


def test_demo_words_load_and_purge():
    """D2-C：演示词表按中文类目名命中灌入；--purge 置 retired（不物理删）。"""
    cat = Category.objects.create(
        category_code="DGFLT",
        category_name="滤清器",
        category_type="back",
        category_level="level3",
        category_status="active",
        node_type="leaf",
        sort_order=1,
    )
    call_command("load_ru_demo_names")
    Q.attach_entity_names("category", [cat])
    assert Q.resolve_name(cat, zh_field="category_name") == "Фильтры"
    call_command("load_ru_demo_names", "--purge")
    cat = Category.objects.get(pk=cat.pk)
    Q.attach_entity_names("category", [cat])
    assert Q.resolve_name(cat, zh_field="category_name") == "滤清器"  # retired 行不参与解析
    assert EntityName.objects.filter(source="demo_manual").count() >= 1  # 痕迹保留

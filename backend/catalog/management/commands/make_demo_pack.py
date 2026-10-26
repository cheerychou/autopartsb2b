"""M1 演示数据包生成器（26号 §九 DoD2/DoD3 演练前置件）。

产出 INIT / DELTA 两版 zip（import_seed_package 直接可导，对齐 27号 契约字段）：
- INIT  B1RU-CAT-DEMO-INIT-0001.zip：奇瑞/哈弗 2 品牌、3 车系 3 车型、5 类目、
  4 SPU（OE 号 + 1 组交叉号）、5 行适配（verified）、ru entity_names 全挂；
- DELTA B1RU-CAT-DEMO-DELTA-0002.zip：base_pack=INIT-0001，增量=后刹车片 SPU
  + 1 行适配 + 1 行 ru 名称（验证增量生效与 base_pack 依赖）。

确定性：全部 UUID = uuid5(固定命名空间, 实体码)——同码重生成零漂移，幂等
演练（同包重导 no-op）可反复复算。行键与 import_seed_package 的行契约一致
（实体行携带 *_id 供包内 UUID 预绑定，27号§5.2）。

用法（backend/）：
    ./venv/bin/python manage.py make_demo_pack                 # INIT+DELTA 全出
    ./venv/bin/python manage.py make_demo_pack --type INIT     # 只出 INIT
    ./venv/bin/python manage.py make_demo_pack --out /tmp/demo
"""

import json
import uuid
import zipfile
from datetime import date
from pathlib import Path

from django.core.management.base import BaseCommand

# 演示包命名空间：换数据集时换后缀，避免与旧包 UUID 冲突
_NS = uuid.uuid5(uuid.NAMESPACE_URL, "b1ru-demo-pack-v1")


def _uid(key: str) -> str:
    return str(uuid.uuid5(_NS, key))


DEMO_ORDER = [
    "brands",
    "vehicle_series",
    "vehicle_models",
    "position_dicts",
    "categories",
    "spus",
    "category_spus",
    "spu_interchanges",
    "fitments",
    "entity_names",
]

_INIT_ROWS = {
    "brands": [
        {
            "brand_id": _uid("brand:CHERY"),
            "brand_code": "CHERY",
            "brand_name": "奇瑞",
            "brand_name_en": "Chery",
            "brand_type": "M",
            "brand_level": "brand",
            "brand_status": "active",
        },
        {
            "brand_id": _uid("brand:HAVAL"),
            "brand_code": "HAVAL",
            "brand_name": "哈弗",
            "brand_name_en": "Haval",
            "brand_type": "M",
            "brand_level": "brand",
            "brand_status": "active",
        },
    ],
    "vehicle_series": [
        {
            "series_id": _uid("series:TIGGO7"),
            "series_code": "TIGGO7",
            "series_name": "瑞虎7",
            "series_name_en": "Tiggo 7",
            "series_alias": ["Тигго 7"],
            "brand_id": _uid("brand:CHERY"),
            "brand_code": "CHERY",
            "brand_name": "奇瑞",
            "vehicle_class": "passenger",
            "series_level": "mainstream",
            "series_segment": "SUV",
            "series_type": "suv",
            "series_positioning": "family",
            "series_status": "active",
            "launch_year": 2016,
            "year_from": 2016,
        },
        {
            "series_id": _uid("series:TIGGO4"),
            "series_code": "TIGGO4",
            "series_name": "瑞虎4",
            "series_name_en": "Tiggo 4",
            "brand_id": _uid("brand:CHERY"),
            "brand_code": "CHERY",
            "brand_name": "奇瑞",
            "vehicle_class": "passenger",
            "series_level": "entry",
            "series_segment": "A0",
            "series_type": "suv",
            "series_positioning": "economy",
            "series_status": "active",
            "launch_year": 2017,
            "year_from": 2017,
        },
        {
            "series_id": _uid("series:JOLION"),
            "series_code": "JOLION",
            "series_name": "哈弗JOLION",
            "series_name_en": "Jolion",
            "brand_id": _uid("brand:HAVAL"),
            "brand_code": "HAVAL",
            "brand_name": "哈弗",
            "vehicle_class": "passenger",
            "series_level": "mainstream",
            "series_segment": "SUV",
            "series_type": "suv",
            "series_positioning": "family",
            "series_status": "active",
            "launch_year": 2020,
            "year_from": 2020,
        },
    ],
    "vehicle_models": [
        {
            "model_id": _uid("model:TIG7-15T"),
            "model_code": "TIG7-15T",
            "model_name": "瑞虎7 2021款 1.5T CVT 豪华版",
            "series_id": _uid("series:TIGGO7"),
            "series_code": "TIGGO7",
            "series_name": "瑞虎7",
            "brand_id": _uid("brand:CHERY"),
            "brand_code": "CHERY",
            "brand_name": "奇瑞",
            "vehicle_class": "passenger",
            "model_level": "high",
            "status": "active",
            "listing_date": "2021-04",
        },
        {
            "model_id": _uid("model:TIG4-15T"),
            "model_code": "TIG4-15T",
            "model_name": "瑞虎4 2021款 1.5T CVT 精英版",
            "series_id": _uid("series:TIGGO4"),
            "series_code": "TIGGO4",
            "series_name": "瑞虎4",
            "brand_id": _uid("brand:CHERY"),
            "brand_code": "CHERY",
            "brand_name": "奇瑞",
            "vehicle_class": "passenger",
            "model_level": "mid",
            "status": "active",
            "listing_date": "2021-06",
        },
        {
            "model_id": _uid("model:JOL-15T"),
            "model_code": "JOL-15T",
            "model_name": "哈弗JOLION 2021款 1.5T DCT 畅玩版",
            "series_id": _uid("series:JOLION"),
            "series_code": "JOLION",
            "series_name": "哈弗JOLION",
            "brand_id": _uid("brand:HAVAL"),
            "brand_code": "HAVAL",
            "brand_name": "哈弗",
            "vehicle_class": "passenger",
            "model_level": "mid",
            "status": "active",
            "listing_date": "2021-01",
        },
    ],
    "position_dicts": [
        {
            "position_code": "FRONT",
            "position_name": "前部",
            "position_name_en": "Front",
            "position_group": "Position",
            "sort_order": 1,
        },
        {
            "position_code": "REAR",
            "position_name": "后部",
            "position_name_en": "Rear",
            "position_group": "Position",
            "sort_order": 2,
        },
    ],
    "categories": [
        {
            "category_id": _uid("cat:BRAKE"),
            "category_code": "BRAKE",
            "category_name": "制动系统",
            "category_name_en": "Brake system",
            "category_type": "back",
            "category_level": "level1",
            "node_type": "category",
            "category_status": "active",
            "sort_order": 1,
        },
        {
            "category_id": _uid("cat:BRPAD"),
            "category_code": "BRPAD",
            "parent_code": "BRAKE",
            "category_name": "刹车片",
            "category_name_en": "Brake pads",
            "category_type": "back",
            "category_level": "level2",
            "node_type": "leaf",
            "category_status": "active",
            "sort_order": 1,
        },
        {
            "category_id": _uid("cat:BRDISC"),
            "category_code": "BRDISC",
            "parent_code": "BRAKE",
            "category_name": "刹车盘",
            "category_name_en": "Brake discs",
            "category_type": "back",
            "category_level": "level2",
            "node_type": "leaf",
            "category_status": "active",
            "sort_order": 2,
        },
        {
            "category_id": _uid("cat:FILTR"),
            "category_code": "FILTR",
            "category_name": "滤清器",
            "category_name_en": "Filters",
            "category_type": "back",
            "category_level": "level1",
            "node_type": "category",
            "category_status": "active",
            "sort_order": 2,
        },
        {
            "category_id": _uid("cat:OILFLT"),
            "category_code": "OILFLT",
            "parent_code": "FILTR",
            "category_name": "机油滤清器",
            "category_name_en": "Oil filters",
            "category_type": "back",
            "category_level": "level2",
            "node_type": "leaf",
            "category_status": "active",
            "sort_order": 1,
        },
    ],
    "spus": [
        {
            "spu_id": _uid("spu:DM00001"),
            "spu_code": "DM00001",
            "brand_id": _uid("brand:CHERY"),
            "brand_code": "CHERY",
            "spu_name": "前制动摩擦片（奇瑞）",
            "spu_name_en": "Front brake pad set (Chery)",
            "product_type": "part",
            "spu_status": "active",
            "oe_number": "T11-3501080",
            "harmonized_code": "870830",
            "sort_weight": 10,
        },
        {
            "spu_id": _uid("spu:DM00002"),
            "spu_code": "DM00002",
            "brand_id": _uid("brand:CHERY"),
            "brand_code": "CHERY",
            "spu_name": "前制动盘（奇瑞）",
            "spu_name_en": "Front brake disc (Chery)",
            "product_type": "part",
            "spu_status": "active",
            "oe_number": "T11-3501075",
            "harmonized_code": "870830",
            "sort_weight": 11,
        },
        {
            "spu_id": _uid("spu:DM00003"),
            "spu_code": "DM00003",
            "brand_id": _uid("brand:CHERY"),
            "brand_code": "CHERY",
            "spu_name": "机油滤清器（奇瑞原厂）",
            "spu_name_en": "Oil filter (Chery OEM)",
            "product_type": "part",
            "spu_status": "active",
            "oe_number": "481H-1010050",
            "harmonized_code": "842123",
            "sort_weight": 12,
        },
        {
            "spu_id": _uid("spu:DM00004"),
            "spu_code": "DM00004",
            "brand_id": _uid("brand:CHERY"),
            "brand_code": "CHERY",
            "spu_name": "机油滤清器（副厂适配）",
            "spu_name_en": "Oil filter (aftermarket)",
            "product_type": "part",
            "spu_status": "active",
            "oe_number": "",
            "harmonized_code": "842123",
            "sort_weight": 13,
        },
    ],
    "category_spus": [
        {"category_code": "BRPAD", "spu_code": "DM00001", "is_primary": True, "sort_order": 10},
        {"category_code": "BRDISC", "spu_code": "DM00002", "is_primary": True, "sort_order": 10},
        {"category_code": "OILFLT", "spu_code": "DM00003", "is_primary": True, "sort_order": 10},
        {"category_code": "OILFLT", "spu_code": "DM00004", "is_primary": False, "sort_order": 20},
    ],
    "spu_interchanges": [
        {
            "source_spu_code": "DM00003",
            "target_spu_code": "DM00004",
            "interchange_type": "OE_TO_AFTERMARKET",
            "direction": "TWO_WAY",
            "priority": 10,
            "interchange_status": "active",
            "notes": "演示：原厂↔副厂交叉号",
        }
    ],
    "fitments": [
        {
            "fitment_id": _uid("fit:DM00001:TIG7-15T"),
            "spu_code": "DM00001",
            "series_code": "TIGGO7",
            "model_code": "TIG7-15T",
            "qualifiers": {"POSITION": "FRONT"},
            "match_level": "FULL_MATCH",
            "fitment_type": "DIRECT",
            "fitment_level": "PERFECT",
            "year_from": 2019,
            "year_to": 2025,
            "priority": 10,
            "is_default": True,
            "data_source": "oem_catalog",
            "verified_status": "verified",
            "verified_by": "demo-pack",
            "status": "active",
        },
        {
            "fitment_id": _uid("fit:DM00002:TIG7-15T"),
            "spu_code": "DM00002",
            "series_code": "TIGGO7",
            "model_code": "TIG7-15T",
            "qualifiers": {"POSITION": "FRONT"},
            "match_level": "FULL_MATCH",
            "fitment_type": "DIRECT",
            "fitment_level": "PERFECT",
            "year_from": 2019,
            "year_to": 2025,
            "priority": 10,
            "is_default": True,
            "data_source": "oem_catalog",
            "verified_status": "verified",
            "verified_by": "demo-pack",
            "status": "active",
        },
        {
            "fitment_id": _uid("fit:DM00003:TIG4-15T"),
            "spu_code": "DM00003",
            "series_code": "TIGGO4",
            "model_code": "TIG4-15T",
            "qualifiers": {},
            "match_level": "FULL_MATCH",
            "fitment_type": "DIRECT",
            "fitment_level": "GOOD",
            "year_from": 2019,
            "year_to": 2025,
            "priority": 10,
            "is_default": True,
            "data_source": "oem_catalog",
            "verified_status": "verified",
            "verified_by": "demo-pack",
            "status": "active",
        },
        {
            "fitment_id": _uid("fit:DM00003:JOL-15T"),
            "spu_code": "DM00003",
            "series_code": "JOLION",
            "model_code": "JOL-15T",
            "qualifiers": {},
            "match_level": "FULL_MATCH",
            "fitment_type": "DIRECT",
            "fitment_level": "GOOD",
            "year_from": 2020,
            "year_to": 2025,
            "priority": 10,
            "is_default": True,
            "data_source": "oem_catalog",
            "verified_status": "verified",
            "verified_by": "demo-pack",
            "status": "active",
        },
        {
            "fitment_id": _uid("fit:DM00004:JOL-15T"),
            "spu_code": "DM00004",
            "series_code": "JOLION",
            "model_code": "JOL-15T",
            "qualifiers": {},
            "match_level": "FULL_MATCH",
            "fitment_type": "DIRECT",
            "fitment_level": "GOOD",
            "year_from": 2020,
            "year_to": 2025,
            "priority": 10,
            "is_default": True,
            "data_source": "supplier",
            "verified_status": "verified",
            "verified_by": "demo-pack",
            "status": "active",
        },
    ],
    "entity_names": [
        {
            "entity_type": "brand",
            "entity_id": _uid("brand:CHERY"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Chery (Чери)",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "brand",
            "entity_id": _uid("brand:HAVAL"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Haval (Хавал)",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "series",
            "entity_id": _uid("series:TIGGO7"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Tiggo 7",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "series",
            "entity_id": _uid("series:TIGGO4"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Tiggo 4",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "series",
            "entity_id": _uid("series:JOLION"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Jolion",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "model",
            "entity_id": _uid("model:TIG7-15T"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Tiggo 7 1.5T CVT 2021",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "model",
            "entity_id": _uid("model:TIG4-15T"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Tiggo 4 1.5T CVT 2021",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "model",
            "entity_id": _uid("model:JOL-15T"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Jolion 1.5T DCT 2021",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "category",
            "entity_id": _uid("cat:BRAKE"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Тормозная система",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "category",
            "entity_id": _uid("cat:BRPAD"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Тормозные колодки",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "category",
            "entity_id": _uid("cat:BRDISC"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Тормозные диски",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "category",
            "entity_id": _uid("cat:FILTR"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Фильтры",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "category",
            "entity_id": _uid("cat:OILFLT"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Масляные фильтры",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "spu",
            "entity_id": _uid("spu:DM00001"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Колодки тормозные передние Chery",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "spu",
            "entity_id": _uid("spu:DM00002"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Диск тормозной передний Chery",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "spu",
            "entity_id": _uid("spu:DM00003"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Фильтр масляный Chery (оригинал)",
            "source": "market",
            "status": "active",
        },
        {
            "entity_type": "spu",
            "entity_id": _uid("spu:DM00004"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Фильтр масляный (аналог)",
            "source": "market",
            "status": "active",
        },
    ],
}

# DELTA 增量（27号§三）：base_pack=INIT，只带变更实体
_DELTA_ROWS = {
    "spus": [
        {
            "spu_id": _uid("spu:DM00005"),
            "spu_code": "DM00005",
            "brand_id": _uid("brand:CHERY"),
            "brand_code": "CHERY",
            "spu_name": "后制动摩擦片（奇瑞）",
            "spu_name_en": "Rear brake pad set (Chery)",
            "product_type": "part",
            "spu_status": "active",
            "oe_number": "T15-3501090",
            "harmonized_code": "870830",
            "sort_weight": 14,
        }
    ],
    "category_spus": [
        {"category_code": "BRPAD", "spu_code": "DM00005", "is_primary": True, "sort_order": 11}
    ],
    "fitments": [
        {
            "fitment_id": _uid("fit:DM00005:TIG4-15T"),
            "spu_code": "DM00005",
            "series_code": "TIGGO4",
            "model_code": "TIG4-15T",
            "qualifiers": {"POSITION": "REAR"},
            "match_level": "FULL_MATCH",
            "fitment_type": "DIRECT",
            "fitment_level": "PERFECT",
            "year_from": 2019,
            "year_to": 2025,
            "priority": 10,
            "is_default": True,
            "data_source": "oem_catalog",
            "verified_status": "verified",
            "verified_by": "demo-pack",
            "status": "active",
        }
    ],
    "entity_names": [
        {
            "entity_type": "spu",
            "entity_id": _uid("spu:DM00005"),
            "market": "ru",
            "locale": "ru-RU",
            "name_type": "official",
            "name": "Колодки тормозные задние Chery",
            "source": "market",
            "status": "active",
        }
    ],
}

_PACKS = {
    "INIT": {
        "version": "DEMO-0001",
        "rows": _INIT_ROWS,
        "base_pack": None,
    },
    "DELTA": {
        "version": "DEMO-0002",
        "rows": _DELTA_ROWS,
        "base_pack": "DEMO-0001",
    },
}


class Command(BaseCommand):
    help = "生成 M1 演示数据包（INIT/DELTA zip，import_seed_package 直接可导）"

    def add_arguments(self, parser):
        parser.add_argument(
            "--type",
            choices=["INIT", "DELTA", "BOTH"],
            default="BOTH",
            help="生成哪种包（默认 BOTH）",
        )
        parser.add_argument(
            "--out",
            default="",
            help="输出目录（默认 <repo>/deploy/demo）",
        )

    def handle(self, *args, **options):
        out_dir = (
            Path(options["out"])
            if options["out"]
            else Path(__file__).resolve().parents[4] / "deploy" / "demo"
        )
        out_dir.mkdir(parents=True, exist_ok=True)
        wanted = ["INIT", "DELTA"] if options["type"] == "BOTH" else [options["type"]]
        for pack_type in wanted:
            spec = _PACKS[pack_type]
            version = spec["version"]
            path = out_dir / f"B1RU-CAT-DEMO-{pack_type}-{version.split('-')[1]}.zip"
            manifest = {
                "version": version,
                "pack_type": pack_type,
                "schema_ver": "1.0",
                "base_pack": spec["base_pack"],
                "customer_instance": "demo",
                "produced_at": date.today().isoformat(),
                "scope": {"market": "RU", "category_roots": ["BRAKE", "FILTR"]},
                "import_order": DEMO_ORDER,
                "counts": {k: len(v) for k, v in spec["rows"].items()},
            }
            with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
                zf.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=1))
                for name in DEMO_ORDER:
                    rows = spec["rows"].get(name, [])
                    if rows:
                        zf.writestr(f"{name}.json", json.dumps(rows, ensure_ascii=False, indent=1))
            self.stdout.write(
                self.style.SUCCESS(f"✅ {path}（{sum(manifest['counts'].values())} 行）")
            )

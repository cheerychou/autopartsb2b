"""
通用种子包导入器（M0 正式化，对接 export_standalone_seed 的包契约）。

按 manifest.json 的 import_order 依序灌入，幂等键 = 各模型业务唯一键
（update_or_create），树模型依赖包内"父先于子"排序（导出端保证）。

用于：
- 独立版 init_standalone（standalone 部署细设 §4.2）；
- 任何环境的基线种子重建（SaaS 亦可用同一包恢复 public 基线）。

与五个 seed_* 命令的关系：seed_* 是"从代码常量建库"，本命令是
"从版本化包建库"——包是发布物（standalone/seed/*.zip），可审计可回滚。
"""

import json
import zipfile

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.models import Brand
from catalog.models_category import Category, CategorySPU, PositionDict
from catalog.models_product import SPU


def _pick(row, *fields):
    return {f: row[f] for f in fields if f in row}


def _import_brands(rows):
    created = updated = 0
    for r in rows:
        _, was_created = Brand.objects.update_or_create(
            brand_code=r["brand_code"],
            defaults=_pick(
                r,
                "brand_name",
                "brand_name_en",
                "brand_alias",
                "brand_type",
                "brand_level",
                "brand_status",
            ),
        )
        created, updated = created + was_created, updated + (not was_created)
    return created, updated


def _import_position_dicts(rows):
    created = updated = 0
    for r in rows:
        _, was_created = PositionDict.objects.update_or_create(
            position_code=r["position_code"],
            defaults=_pick(
                r,
                "position_name",
                "position_name_en",
                "position_group",
                "description",
                "sort_order",
            ),
        )
        created, updated = created + was_created, updated + (not was_created)
    return created, updated


def _import_categories(rows):
    """树模型：包内父先于子（导出端排序保证），单遍导入。"""
    created = updated = 0
    for r in rows:
        parent = None
        if r.get("parent_code"):
            parent = Category.objects.filter(category_code=r["parent_code"]).first()
            if parent is None:
                raise CommandError(
                    f"categories 破坏父先于子顺序：{r['category_code']} "
                    f"的父 {r['parent_code']} 尚不存在（包损坏，请重新导出）"
                )
        _, was_created = Category.objects.update_or_create(
            category_code=r["category_code"],
            defaults={
                **_pick(
                    r,
                    "category_name",
                    "category_name_en",
                    "aces_pcdb_code",
                    "category_type",
                    "category_level",
                    "icon_url",
                    "sort_order",
                    "category_status",
                    "data_source",
                    "standardized",
                    "category_description",
                    "category_keywords",
                ),
                "parent_id": parent,
            },
        )
        created, updated = created + was_created, updated + (not was_created)
    return created, updated


def _import_spus(rows):
    created = updated = 0
    for r in rows:
        brand = Brand.objects.get(brand_code=r["brand_code"])
        _, was_created = SPU.objects.update_or_create(
            spu_code=r["spu_code"],
            defaults={
                **_pick(
                    r,
                    "spu_name",
                    "spu_name_en",
                    "spu_alias",
                    "product_type",
                    "spu_status",
                    "data_source",
                    "standardized",
                    "oe_number",
                    "gtin",
                    "harmonized_code",
                    "moq",
                    "sort_weight",
                ),
                "brand_id": brand,
            },
        )
        created, updated = created + was_created, updated + (not was_created)
    return created, updated


def _import_category_spus(rows):
    created = updated = 0
    for r in rows:
        category = Category.objects.get(category_code=r["category_code"])
        spu = SPU.objects.get(spu_code=r["spu_code"])
        _, was_created = CategorySPU.objects.update_or_create(
            category=category,
            spu=spu,
            defaults=_pick(r, "is_primary", "sort_order"),
        )
        created, updated = created + was_created, updated + (not was_created)
    return created, updated


IMPORTERS = {
    "brands": _import_brands,
    "position_dicts": _import_position_dicts,
    "categories": _import_categories,
    "spus": _import_spus,
    "category_spus": _import_category_spus,
}


class Command(BaseCommand):
    help = (
        "导入版本化种子包（export_standalone_seed 生成的 zip），"
        "按 manifest.import_order 幂等灌入（update_or_create）。"
    )

    def add_arguments(self, parser):
        parser.add_argument("--package", required=True, help="种子包 zip 路径")
        parser.add_argument(
            "--strict",
            action="store_true",
            help="遇未知实体硬失败（默认 skip+告警——G6 前向兼容，27号§六.5）",
        )

    def handle(self, *args, **options):
        path = options["package"]
        strict = options.get("strict", False)
        try:
            zf = zipfile.ZipFile(path)
        except (OSError, zipfile.BadZipFile) as e:
            raise CommandError(f"无法读取种子包 {path}: {e}")

        try:
            manifest = json.loads(zf.read("manifest.json"))
        except KeyError:
            raise CommandError("种子包缺少 manifest.json")

        # ---- 包元数据（27号§七：pack_type/schema_ver 是契约字段，非装饰）----
        pack_type = manifest.get("pack_type", "INIT")
        schema_ver = str(manifest.get("schema_ver", ""))
        pack_id = str(manifest.get("version", "") or path.rsplit("/", 1)[-1])
        if pack_type not in {"INIT", "DELTA", "SNAP"}:
            raise CommandError(f"未知 pack_type: {pack_type}")

        # ---- schema 兼容窗口（27号§六.2，预检零容差的一部分）----
        from catalog.models_pack_log import (
            SUPPORTED_SCHEMA_VER,
            CatalogPackLog,
            schema_ver_supported,
        )

        _ok, _why = schema_ver_supported(schema_ver)
        if not _ok:
            raise CommandError(
                f"拒收: {_why}（实例支持 {SUPPORTED_SCHEMA_VER}，窗口=[MAJOR−1, MAJOR]）"
            )

        # ---- 幂等（包级）：同 pack_id 已登记 → no-op ----
        if CatalogPackLog.objects.filter(pack_id=pack_id).exists():
            self.stdout.write(self.style.WARNING(f"包 {pack_id} 已导入过，跳过（幂等）"))
            return

        # ---- 预检（零容差，全部通过才进入导入）----
        import_order = manifest.get("import_order", [])
        unknown = [n for n in import_order if n not in IMPORTERS]
        if unknown:
            if strict:
                raise CommandError(f"manifest.import_order 含未知条目: {unknown}")
            # G6 前向兼容：新总仓包包含本实例尚不支持的实体时跳过并告警（可断连升级）
            import_order = [n for n in import_order if n not in unknown]
            self.stdout.write(
                self.style.WARNING(
                    f"⚠️ 跳过未知实体（本实例导入器版本较旧，升级后可导入）: {unknown}"
                )
            )
        import_order = [n for n in import_order if f"{n}.json" in zf.namelist()]
        missing_files = [
            n
            for n in manifest.get("import_order", [])
            if n in IMPORTERS and f"{n}.json" not in zf.namelist()
        ]
        if missing_files:
            raise CommandError(f"种子包缺少数据文件: {missing_files}")
        for name in import_order:
            rows = json.loads(zf.read(f"{name}.json"))
            expected = (manifest.get("counts") or {}).get(name)
            if expected is not None and len(rows) != expected:
                raise CommandError(
                    f"{name} 条数与 manifest 不符（{len(rows)} != {expected}），包损坏"
                )

        # ---- 导入：单事务整体回滚（任何实体失败→库内零残留；评审 P0-2）----
        self.stdout.write(
            f"种子包版本: {pack_id}（{pack_type} schema={schema_ver or '?'}），开始灌入…"
        )
        total_created = total_updated = 0
        landed_counts: dict = {}
        try:
            with transaction.atomic():
                for name in import_order:
                    rows = json.loads(zf.read(f"{name}.json"))
                    created, updated = IMPORTERS[name](rows)
                    total_created += created
                    total_updated += updated
                    landed_counts[name] = len(rows)
                    self.stdout.write(f"  {name}: {len(rows)} 条（新建 {created}，更新 {updated}）")

                # 版本登记（F-21/I3：catalog_version 之源）——与导入同事务
                CatalogPackLog.objects.get_or_create(
                    pack_id=pack_id,
                    defaults={
                        "pack_type": pack_type,
                        "schema_ver": schema_ver,
                        "entity_counts": landed_counts,
                    },
                )
        except Exception as e:
            raise CommandError(f"导入失败（已整体回滚，库内零残留）: {e}")

        self.stdout.write(
            self.style.SUCCESS(f"✅ 种子包灌入完成：新建 {total_created}，更新 {total_updated}")
        )

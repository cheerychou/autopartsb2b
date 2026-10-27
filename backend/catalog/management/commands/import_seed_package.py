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

from catalog.models import Brand, VehicleModel, VehicleSeries
from catalog.models_category import Category, CategorySPU, PositionDict
from catalog.models_entity_names import EntityName
from catalog.models_fitment import SPUFitment
from catalog.models_product import SPU, SPUInterchange


def _pick(row, *fields):
    return {f: row[f] for f in fields if f in row}


def _upsert(model, *, lookup: dict, pk_field: str, pk_value, defaults: dict):
    """业务唯一键幂等 upsert；行带包内 UUID 且该键首次出现时以包内 UUID 建行
    （接入适配，copy-ledger R-A1++ 登记）。已存在行仅更新 defaults、不触碰主键
    （幂等重导零漂移；27号§5.2 UUID 主键随包下发，entity_names 依赖它指向实体）。"""
    if pk_value and not model.objects.filter(**lookup).exists():
        return model.objects.create(**lookup, **defaults, **{pk_field: pk_value}), True
    return model.objects.update_or_create(**lookup, defaults=defaults)


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


def _import_entity_names(rows):
    """entity_names（27号§四：泛化多市场命名表；market=GLOBAL/ru，ru 为首行数据）。

    幂等键 = 自然键（entity_type+entity_id+market+locale+name_type+name）——不取
    name_id 作主（总仓换 ID 不应产生重复行）。v1 读 JSON 形态（与既有 importer 同构；
    27号§四包结构示意 CSV——CDD3 期 1 实际出包若为 CSV，届时加适配器，预检会以
    "缺数据文件"显式失败而非静默跳过）。
    """
    created = updated = 0
    for r in rows:
        _, was_created = EntityName.objects.update_or_create(
            entity_type=r["entity_type"],
            entity_id=str(r["entity_id"]),
            market=r.get("market", "GLOBAL"),
            locale=r.get("locale", "ru-RU"),
            name_type=r.get("name_type", "official"),
            name=r["name"],
            defaults=_pick(r, "source", "status"),
        )
        created, updated = created + was_created, updated + (not was_created)
    return created, updated


# 27号§5.2 接入适配（copy-ledger R-A1++ 登记项）：包内 UUID 主键预绑定——
# (model, 业务码字段, UUID字段, 骨架必填字段)。行带 *_id 且业务码首次出现时，
# 先以包内 UUID 建骨架行（随后既有按码 upsert 在同事务内补全字段）；
# entity_names 的 entity_id 由此才能与实体行对上。骨架必填仅防 NOT NULL。
UUID_BINDINGS = {
    "brands": (Brand, "brand_code", "brand_id", ("brand_name", "brand_type", "brand_level")),
    "vehicle_series": (
        VehicleSeries,
        "series_code",
        "series_id",
        (
            "series_name",
            "brand_id",
            "brand_code",
            "brand_name",
            "series_level",
            "series_segment",
            "series_type",
            "series_positioning",
            "launch_year",
        ),
    ),
    "vehicle_models": (
        VehicleModel,
        "model_code",
        "model_id",
        (
            "model_name",
            "series_id",
            "series_code",
            "series_name",
            "brand_id",
            "brand_code",
            "brand_name",
        ),
    ),
    "categories": (Category, "category_code", "category_id", ("category_name", "category_type")),
    "spus": (SPU, "spu_code", "spu_id", ("spu_name", "brand_id", "product_type")),
}


def _bind_pack_uuids(entity: str, rows):
    """骨架行建行（包内 UUID 主键落库）。FK 字段（拷贝域有 brand_id 作字段名的写法）
    须把包内 UUID 字符串解析为实例；attname 形态（series_id）原样透传即可。"""
    for r in rows:
        model, code_field, pk_field, skeleton_fields = UUID_BINDINGS[entity]
        code, pk = r.get(code_field), r.get(pk_field)
        if not (code and pk) or model.objects.filter(**{code_field: code}).exists():  # type: ignore
            continue
        kwargs = {}
        for f in skeleton_fields:
            value = r.get(f)
            if value is None:
                continue
            try:
                field = model._meta.get_field(f)
            except Exception:
                kwargs[f] = value  # 非 FK 字段名——attname/冗余列，原样透传（字符串即可）
                continue
            if field.is_relation:
                value = field.remote_field.model.objects.get(pk=value)  # type: ignore[union-attr]
                kwargs[field.name] = value  # FK 字段名走描述符（实例校验），勿塞 attname
            else:
                kwargs[f] = value
        model.objects.create(**{code_field: code, pk_field: pk, **kwargs})  # type: ignore


def _import_vehicle_series(rows):
    """车系（R-A1++ 新增实体：按车找件主链）。幂等键=series_code；
    brand_code/brand_name 冗余列以父表为准（27号§5.0-7）。"""
    created = updated = 0
    for r in rows:
        brand = Brand.objects.get(brand_code=r["brand_code"])
        _, was_created = _upsert(
            VehicleSeries,
            lookup={"series_code": r["series_code"]},
            pk_field="series_id",
            pk_value=r.get("series_id"),
            defaults={
                **_pick(
                    r,
                    "series_name",
                    "series_name_en",
                    "series_alias",
                    "vehicle_class",
                    "series_level",
                    "series_segment",
                    "series_type",
                    "series_positioning",
                    "series_status",
                    "launch_year",
                    "year_from",
                    "year_to",
                ),
                "brand_id": brand,
                "brand_code": brand.brand_code,
                "brand_name": brand.brand_name,
            },
        )
        created, updated = created + was_created, updated + (not was_created)
    return created, updated


def _import_vehicle_models(rows):
    """车型（R-A1++ 新增实体）。幂等键=model_code；series/brand 冗余列以父表为准。"""
    created = updated = 0
    for r in rows:
        series = VehicleSeries.objects.get(series_code=r["series_code"])
        brand = series.brand_id
        _, was_created = _upsert(
            VehicleModel,
            lookup={"model_code": r["model_code"]},
            pk_field="model_id",
            pk_value=r.get("model_id"),
            defaults={
                **_pick(
                    r,
                    "model_name",
                    "vehicle_class",
                    "model_level",
                    "status",
                    "listing_date",
                ),
                "series": series,
                "series_code": series.series_code,
                "series_name": series.series_name,
                "brand": brand,
                "brand_code": brand.brand_code,
                "brand_name": brand.brand_name,
            },
        )
        created, updated = created + was_created, updated + (not was_created)
    return created, updated


def _import_fitments(rows):
    """适配关系（R-A1++ 新增实体）。幂等键=包内 fitment_id（27号§5.2：UUID 主键随包
    下发；本表无业务唯一约束，UUID 即幂等键）——缺 UUID 的包属违约，显式拒收。"""
    created = updated = 0
    for r in rows:
        if not r.get("fitment_id"):
            raise CommandError("fitments 行缺 fitment_id（27号§5.2：UUID 主键随包下发）")
        spu = SPU.objects.get(spu_code=r["spu_code"])
        series = (
            VehicleSeries.objects.get(series_code=r["series_code"])
            if r.get("series_code")
            else None
        )
        submodel = (
            VehicleModel.objects.get(model_code=r["model_code"]) if r.get("model_code") else None
        )
        _, was_created = SPUFitment.objects.update_or_create(
            fitment_id=r["fitment_id"],
            defaults={
                **_pick(
                    r,
                    "qualifiers",
                    "match_level",
                    "priority",
                    "is_default",
                    "notes",
                    "year_from",
                    "year_to",
                    "fitment_type",
                    "fitment_level",
                    "data_source",
                    "verified_status",
                    "verified_by",
                    "status",
                ),
                "spu": spu,
                "series": series,
                "submodel": submodel,
            },
        )
        created, updated = created + was_created, updated + (not was_created)
    return created, updated


def _import_spu_interchanges(rows):
    """互换/交叉号（R-A1++ 新增实体）。幂等键=(source_spu, target_spu)——
    uniq_spu_interchange_pair 约束即业务唯一键（27号§5.3）。"""
    created = updated = 0
    for r in rows:
        source_spu = SPU.objects.get(spu_code=r["source_spu_code"])
        target_spu = SPU.objects.get(spu_code=r["target_spu_code"])
        _, was_created = SPUInterchange.objects.update_or_create(
            source_spu=source_spu,
            target_spu=target_spu,
            defaults=_pick(
                r,
                "interchange_type",
                "direction",
                "qualifier",
                "priority",
                "interchange_status",
                "notes",
            ),
        )
        created, updated = created + was_created, updated + (not was_created)
    return created, updated


IMPORTERS = {
    "brands": _import_brands,
    "vehicle_series": _import_vehicle_series,
    "vehicle_models": _import_vehicle_models,
    "position_dicts": _import_position_dicts,
    "categories": _import_categories,
    "spus": _import_spus,
    "category_spus": _import_category_spus,
    "spu_interchanges": _import_spu_interchanges,
    "fitments": _import_fitments,
    "entity_names": _import_entity_names,
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
            if n in IMPORTERS
            and (manifest.get("counts") or {}).get(n)
            and f"{n}.json" not in zf.namelist()
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
                # 27号§5.2 包内 UUID 主键预绑定（R-A1++）：先建骨架行，下方既有按码
                # upsert 补全——entity_names 的 UUID 指向因此与实体行对上
                for name in import_order:
                    if name in UUID_BINDINGS:
                        _bind_pack_uuids(name, json.loads(zf.read(f"{name}.json")))
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

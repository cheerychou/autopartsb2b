"""I1 目录查询服务（只读；契约见 docs/research/29号§三）。

约定：
- verified 门控：消费端默认 verified_only（源码 verified_only() 语义）；
  include_unverified 仅管理端数据员角色（RBAC 在调用方/视图层控制）；
- display_name 走 entity_names 回退链 ru→en→zh（27号定稿要点）；entity_names 表
  未建（CDD3 期 1 交付）前回退链退化为 *_ru(缺)→*_en→中文名——回退链实现位已收敛于此；
- 所有查询应带 catalog_version（=已应用数据包版本）返回，供缓存失效（29号§二）。
"""

from __future__ import annotations

import dataclasses

from django.db import models

from catalog.models import Brand, VehicleModel, VehicleSeries
from catalog.models_category import Category
from catalog.models_entity_names import EntityName
from catalog.models_fitment import SPUFitment
from catalog.models_product import SPU, SPUInterchange


def catalog_version() -> str:
    """已应用数据包版本（F-21 导入登记；未导入过返回 unknown）。"""
    from catalog.models_pack_log import CatalogPackLog

    return CatalogPackLog.current_version()


def resolve_name(obj, *, zh_field: str, en_field: str | None = None) -> str:
    """名称回退链 ru→en→zh（28a 定稿固定序）：entity_names（ru/GLOBAL，official→alias）
    → *_en 字段 → 中文名。

    entity_names 行经 attach_entity_names 预挂（_entity_name_rows）；未挂载/无行
    =语料未灌，退化为 en→zh 两段（接口形状不变，27号定稿要点）。
    """
    for row in getattr(obj, "_entity_name_rows", None) or []:
        if row.name:
            return row.name
    if en_field:
        en = getattr(obj, en_field, None)
        if en:
            return en
    return getattr(obj, zh_field) or ""


def resolved_locale(obj, *, zh_field: str, en_field: str | None = None) -> str:
    """如实返回 display_name 实际命中的回退链语言（评审：meta 不得宣称未发生的解析）。

    命中 entity_names 行时取该行 locale 语言段（GLOBAL 行可能是 en——不冒称 ru）。
    """
    for row in getattr(obj, "_entity_name_rows", None) or []:
        if row.name:
            return (row.locale or "ru")[:2]
    if en_field and getattr(obj, en_field, None):
        return "en"
    return "zh"


def name_chain(obj) -> list[dict]:
    """29号§二：I1 响应附 name_chain（前台标注"官方名/俄市俗称"的原料）；无行 → []。"""
    return [
        {
            "market": r.market,
            "locale": r.locale,
            "name_type": r.name_type,
            "name": r.name,
            "source": r.source,
        }
        for r in getattr(obj, "_entity_name_rows", None) or []
    ]


def attach_entity_names(entity_type: str, objs) -> list:
    """批量预挂 entity_names 行（_entity_name_rows；每页 1 查询防 N+1）。

    仅取 ru + GLOBAL 生效行（回退链 ru 段原料）；entity_id 为泛化 CharField——
    拷贝域模型禁加关系（铁律 2），故以 PK 字符串批量反查而非 ORM relation。
    """
    objs = list(objs)
    if not objs:
        return objs
    if entity_type == "spu":
        # SPU 卡片的 brand.display_name 同走回退链——brand 实例已随 select_related
        # 在内存（零额外查询），递归批量挂行（单次 IN 查询，仍防 N+1）
        brands = {o.brand_id for o in objs if getattr(o, "brand_id_id", None)}
        if brands:
            attach_entity_names("brand", list(brands))
    ids = {str(o.pk) for o in objs}
    rows = EntityName.objects.filter(
        status="active", entity_type=entity_type, entity_id__in=ids, market__in=["ru", "GLOBAL"]
    )
    by_id: dict[str, list] = {}
    for r in rows:
        by_id.setdefault(r.entity_id, []).append(r)
    for o in objs:
        o._entity_name_rows = sorted(by_id.get(str(o.pk), []), key=_name_row_priority)
    return objs


def _name_row_priority(row):
    """回退链内解析优先序：ru official → GLOBAL official → ru alias → GLOBAL alias。"""
    return (
        0 if row.market == "ru" else 1,
        0 if row.name_type == "official" else 1,
        row.created_at,
    )


@dataclasses.dataclass
class FitmentQuery:
    model_id: str
    category_id: str | None = None
    q: str | None = None
    page: int = 1
    page_size: int = 20
    verified_only: bool = True


def normalize_oe(raw: str) -> str:
    """OE 号规范化（29号 开放参数3 倾向：去空格/连字符/大小写不敏感）。"""
    return (raw or "").replace(" ", "").replace("-", "").replace("_", "").upper()


def list_brands():
    return Brand.objects.filter(brand_status="active").order_by("brand_letter", "brand_code")


def list_series(brand_id: str):
    return VehicleSeries.objects.filter(brand_id=brand_id, series_status="active").order_by(
        "series_code"
    )


def list_models(series_id: str):
    return (
        VehicleModel.objects.filter(series_id=series_id)
        .exclude(status="inactive")
        .select_related("engine_config", "trans_config", "drive_config")
        .order_by("model_code")
    )


def list_categories_tree():
    roots = Category.objects.filter(parent_id__isnull=True, category_status="active").order_by(
        "sort_order"
    )
    return roots


def fitment_spus(query: FitmentQuery):
    """按车找件：车型→适配→SPU 卡片（29号 I1-4）。

    verified 门控（评审 P0-3 修复）：include_unverified 不再由请求参数直接决定，
    而是由视图层按调用者角色（catalog:write = data_steward/owner）判定后传入——
    匿名传参无效。

    车型/适配数据未随当前包下发（CDD3 现包 8 实体不含 fitment 主链，
    G-02 期 1 补齐）时返回空集——接口行为先固定，数据到位即通。
    """
    qs = SPUFitment.objects.filter(
        status="active",
        submodel_id=query.model_id,
    ).select_related("spu__brand_id", "series", "submodel")
    if query.verified_only:
        qs = qs.verified_only()
    if query.category_id:
        qs = qs.filter(spu__category_spus__category_id=query.category_id)
    if query.q:
        qs = qs.filter(spu__spu_name__icontains=query.q)
    total = qs.count()
    rows = list(qs[(query.page - 1) * query.page_size : query.page * query.page_size])
    return total, rows


def oe_variants(raw: str) -> list[str]:
    """OE 号常见形态（去连字符/大写/原样）——库内形态取决于导入源，多形态 in 查询。"""
    raw = (raw or "").strip()
    oe = normalize_oe(raw)
    variants = {oe, raw.upper(), raw}
    return [v for v in variants if v]


def search_oe(raw: str, *, verified_only: bool = True):
    """OE 检索（29号 I1-6）：精确 OE + 交叉号命中两组。"""
    variants = oe_variants(raw)
    direct = SPU.objects.filter(oe_number__in=variants, spu_status="active").select_related(
        "brand_id"
    )
    if verified_only:
        pass  # SPU 层无 verified_status（在 SPUFitment/SPUSKUMapping 层），直查不过门控
    # 交叉号双向语义：互换任一侧 OE 命中，返回对侧 SPU（TWO_WAY/OE_TO_AFTERMARK 通用）
    hits = SPUInterchange.objects.filter(
        models.Q(target_spu__oe_number__in=variants) | models.Q(source_spu__oe_number__in=variants)
    )
    counterpart_ids: list[str] = []
    for xi in hits.select_related("source_spu", "target_spu"):
        src, tgt = xi.source_spu, xi.target_spu
        other = tgt if src.oe_number in variants or normalize_oe(src.oe_number) in variants else src
        if other.oe_number not in variants and normalize_oe(other.oe_number) not in variants:
            counterpart_ids.append(str(other.spu_id))
    xref = SPU.objects.filter(spu_id__in=counterpart_ids, spu_status="active").select_related(
        "brand_id"
    )
    return list(direct), list(xref)


def spu_detail(spu_id: str) -> SPU | None:
    return (
        SPU.objects.filter(spu_id=spu_id)
        .select_related("brand_id")
        .prefetch_related("attribute_values__attribute")
        .first()
    )


def spu_interchanges(spu_id: str):
    from catalog.models_product import SPUInterchange as XI

    return (
        XI.objects.filter(source_spu_id=spu_id)
        .select_related("target_spu__brand_id")
        .order_by("-priority")
    )


def picker_candidates(*, model_id=None, oe=None, category_id=None, q=None, verified_only=True):
    """I2 选件器（29号§四）：宽松多条件组合。

    verified_only=True 时排除"仅有未验证适配行"的 SPU（评审 P0-3：I2 不得无门控）。
    """
    qs = SPU.objects.filter(spu_status="active").select_related("brand_id")
    if oe:
        qs = qs.filter(oe_number__in=oe_variants(oe))
    if category_id:
        qs = qs.filter(category_spus__category_id=category_id)
    if q:
        qs = qs.filter(spu_name__icontains=q)
    if model_id:
        qs = qs.filter(fitments__submodel_id=model_id).distinct()
        if verified_only:
            qs = (
                qs.exclude(fitments__verified_status="unverified")
                .filter(fitments__verified_status="verified")
                .distinct()
            )
    return qs.order_by("spu_code")

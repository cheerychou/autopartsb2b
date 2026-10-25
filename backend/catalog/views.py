"""I1/I2 目录查询接口（只读；契约 docs/research/29号§三/§四）。

鉴权边界（29号§一）：本域视图不做 RBAC——买家前台匿名可查（guest 门控在
storefront 层）；include_unverified 仅管理端数据员（v1 信任内网 + S3 收紧）。
"""

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from catalog.models import Brand, VehicleModel, VehicleSeries
from catalog.models_category import Category
from catalog.models_fitment import SPUFitment
from catalog.models_product import SPU
from catalog.services import query as Q
from shared.permissions import has_permission


class BrandBrief(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ["brand_id", "brand_code", "display_name", "brand_letter", "brand_logo"]

    def get_display_name(self, obj):
        return Q.resolve_name(obj, zh_field="brand_name", en_field="brand_name_en")


class SeriesBrief(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = VehicleSeries
        fields = [
            "series_id",
            "series_code",
            "display_name",
            "vehicle_class",
            "year_from",
            "year_to",
        ]

    def get_display_name(self, obj):
        return Q.resolve_name(obj, zh_field="series_name", en_field="series_name_en")


class ModelBrief(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    spec_summary = serializers.SerializerMethodField()

    class Meta:
        model = VehicleModel
        fields = ["model_id", "model_code", "display_name", "spec_summary", "status"]

    def get_display_name(self, obj):
        return Q.resolve_name(obj, zh_field="model_name")

    def get_spec_summary(self, obj):
        parts = [
            getattr(obj.engine_config, "displacement", None),
            getattr(obj.trans_config, "trans_name", None),
            getattr(obj.drive_config, "drive_name", None),
        ]
        return " / ".join(p for p in parts if p)


class CategoryNode(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["category_id", "category_code", "display_name", "category_level", "node_type"]

    def get_display_name(self, obj):
        return Q.resolve_name(obj, zh_field="category_name", en_field="category_name_en")


class SpuCard(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    brand = serializers.SerializerMethodField()

    class Meta:
        model = SPU
        fields = [
            "spu_id",
            "spu_code",
            "display_name",
            "oe_number",
            "brand",
            "gtin",
            "harmonized_code",
            "spu_image",
        ]

    def get_display_name(self, obj):
        return Q.resolve_name(obj, zh_field="spu_name", en_field="spu_name_en")

    def get_brand(self, obj):
        return {"brand_id": str(obj.brand_id_id), "display_name": obj.brand_id.brand_name}


def _can_see_unverified(request) -> bool:
    """未验证目录数据可见性 = catalog:write 权限（data_steward/owner）；匿名/买家恒 False。"""
    return has_permission(request.user, "catalog:write")


def _meta(request, total=None, resolved_locale: str | None = None):
    """resolved_locale=实际解析语言（如实返回；评审：不得宣称请求头语言）。
    None 时退化为回退链首段 ru（entity_names 就位前的声明性缺省）。"""
    return {
        "total": total,
        "catalog_version": Q.catalog_version(),
        "locale": resolved_locale or "ru",
    }


@api_view(["GET"])
@permission_classes([])
def brands(request):
    """I1-1 品牌列表（找件入口）。"""
    qs = list(Q.list_brands())
    data = BrandBrief(qs, many=True).data
    loc = Q.resolved_locale(qs[0], zh_field="brand_name", en_field="brand_name_en") if qs else None
    return Response({"data": data, "meta": _meta(request, len(data), loc)})


@api_view(["GET"])
@permission_classes([])
def series(request, brand_id: str):
    """I1-2 车系列表。"""
    data = SeriesBrief(Q.list_series(brand_id), many=True).data
    return Response({"data": data, "meta": _meta(request, len(data))})


@api_view(["GET"])
@permission_classes([])
def models(request, series_id: str):
    """I1-3 车型列表（含配置摘要）。"""
    data = ModelBrief(Q.list_models(series_id), many=True).data
    return Response({"data": data, "meta": _meta(request, len(data))})


@api_view(["GET"])
@permission_classes([])
def categories_tree(request):
    """I1-5 类目树（scope 内；v1 全量后台类目树）。"""
    data = CategoryNode(Q.list_categories_tree(), many=True).data
    return Response({"data": data, "meta": _meta(request, len(data))})


@api_view(["GET"])
@permission_classes([])
def fitments(request):
    """I1-4 按车找件：车型→品类→适配件（29号§三）。"""
    model_id = request.query_params.get("model_id", "")
    if not model_id:
        return Response({"error": {"code": "400", "message": "model_id 必填"}}, status=400)
    query = Q.FitmentQuery(
        model_id=model_id,
        category_id=request.query_params.get("category_id") or None,
        q=request.query_params.get("q") or None,
        page=int(request.query_params.get("page", 1)),
        page_size=min(int(request.query_params.get("page_size", 20)), 100),
        # 评审 P0-3：include_unverified 绑角色（catalog:write=data_steward/owner），匿名传参无效
        verified_only=not _can_see_unverified(request),
    )
    total, rows = Q.fitment_spus(query)
    data = []
    for f in rows:
        item = SpuCard(f.spu).data
        item["fitment"] = {
            "fitment_id": str(f.fitment_id),
            "qualifiers": f.qualifiers,
            "fitment_type": f.fitment_type,
            "year_from": f.year_from,
            "year_to": f.year_to,
            "verified_status": f.verified_status,
        }
        data.append(item)
    return Response({"data": data, "meta": _meta(request, total)})


@api_view(["GET"])
@permission_classes([])
def search_oe(request):
    """I1-6 OE 检索：精确 + 交叉号两组（自有货号检索在 commerce，由前台聚合）。"""
    q = request.query_params.get("q", "")
    if len(Q.normalize_oe(q)) < 4:
        return Response({"error": {"code": "400", "message": "检索号过短"}}, status=400)
    direct, xref = Q.search_oe(q)
    return Response(
        {
            "data": {
                "direct": SpuCard(direct, many=True).data,
                "cross_reference": SpuCard(xref, many=True).data,
            },
            "meta": _meta(request, len(direct) + len(xref)),
        }
    )


@api_view(["GET"])
@permission_classes([])
def spu_detail(request, spu_id: str):
    """I1-8 SPU 详情（属性值/适配摘要；价格由 commerce 挂关联键）。"""
    spu = Q.spu_detail(spu_id)
    if spu is None:
        return Response(
            {"error": {"code": "404", "message": "SPU 不存在或品类包范围外"}}, status=404
        )
    card = SpuCard(spu).data
    card["attributes"] = [
        {
            "attribute_code": v.attribute.attribute_code,
            "attribute_name": v.attribute.attribute_name,
            "value_text": v.value_text,
            "value_display": v.value_display,
            "value_number": str(v.value_number) if v.value_number is not None else None,
        }
        for v in spu.attribute_values.all()
    ]
    fits = SPUFitment.objects.filter(spu_id=spu_id, status="active").verified_only()[:20]
    card["fitment_summary"] = [
        {
            "submodel": str(f.submodel_id),
            "qualifiers": f.qualifiers,
            "year_from": f.year_from,
            "year_to": f.year_to,
        }
        for f in fits
    ]
    return Response({"data": card, "meta": _meta(request)})


@api_view(["GET"])
@permission_classes([])
def spu_interchanges(request, spu_id: str):
    """I1-7 交叉号展开（一个 OE → 多货号，F-04）。"""
    rows = Q.spu_interchanges(spu_id)
    data = [
        {
            "target_spu": SpuCard(r.target_spu).data,
            "interchange_type": r.interchange_type,
            "direction": r.direction,
            "priority": r.priority,
        }
        for r in rows
    ]
    return Response({"data": data, "meta": _meta(request, len(data))})


@api_view(["GET"])
@permission_classes([])
def picker_candidates(request):
    """I2-1 选件器候选检索（管理端组商品；include_unverified 仅数据员）。"""
    rows = Q.picker_candidates(
        model_id=request.query_params.get("model_id") or None,
        oe=request.query_params.get("oe") or None,
        category_id=request.query_params.get("category_id") or None,
        q=request.query_params.get("q") or None,
        verified_only=not _can_see_unverified(request),
    )[:100]
    return Response({"data": SpuCard(rows, many=True).data, "meta": _meta(request, len(rows))})


class CatalogViewSet(viewsets.ViewSet):
    """占位：DRF router 场景扩展位（I1 全部为函数视图 + 显式 schema）。"""

    @extend_schema(exclude=True)
    def list(self, *a, **kw):  # pragma: no cover
        return Response([])

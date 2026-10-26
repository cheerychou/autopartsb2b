"""S5 管理端端点：N2 赋码（F-16 贴标工作台/收货验码/按码出库/退货）+ F-17 报表。

RBAC（fail-closed 默认）：赋码/库存写权限档位 require_permission。
"""

import csv
import io

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response

from commerce import services_codes, services_reporting
from commerce.models_codes import CodeInstance, ImportBatch, MarkedCategoryDict
from commerce.models_product import Product
from shared.permissions import require_permission


class BatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportBatch
        fields = ["batch_id", "batch_no", "customs_declaration", "status", "created_at"]


class BatchInSerializer(serializers.Serializer):
    batch_no = serializers.CharField(max_length=32)
    customs_declaration = serializers.CharField(default="", max_length=64)


@extend_schema(request=BatchInSerializer)
@api_view(["POST"])
@require_permission("inventory:write")
def create_batch(request):
    """创建进口批次（贴标工作台第一步；F-16）。"""
    s = BatchInSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    try:
        batch = services_codes.create_batch(
            batch_no=s.validated_data["batch_no"],
            customs_declaration=s.validated_data["customs_declaration"],
        )
    except services_codes.CodeStateError as e:
        return Response(
            {"error": {"code": "409", "error_code": "BATCH_EXISTS", "message": str(e)}}, status=409
        )
    return Response({"data": BatchSerializer(batch).data}, status=201)


@api_view(["GET"])
@require_permission("inventory:read")
def batch_list(request):
    """批次列表（贴标工作台；新→旧，含在库码计数）。"""
    from django.db.models import Count

    batches = ImportBatch.objects.annotate(code_count=Count("codes")).order_by("-created_at")
    data = [
        {
            **BatchSerializer(b).data,
            "code_count": b.code_count,
        }
        for b in batches
    ]
    return Response({"data": data, "meta": {"total": len(data)}})


class CodeListInSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    gtin = serializers.CharField(default="", max_length=14)
    code_values = serializers.ListField(
        child=serializers.CharField(max_length=200), allow_empty=False
    )


@extend_schema(request=CodeListInSerializer)
@api_view(["POST"])
@require_permission("inventory:write")
def import_codes(request, batch_no: str):
    """F-16 贴标工作台：批次码清单导入（ЧЗ 导出/Excel 粘贴的码值列表）。

    支持从中国远程调用（25号§一.5：贴标在中国侧、核销在俄境）。
    """
    batch = get_object_or_404(ImportBatch, batch_no=batch_no)
    s = CodeListInSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    product = get_object_or_404(Product, product_id=s.validated_data["product_id"])
    # 受控品类校验：按 ТН ВЭД 字典（✅裁定 7——扩围改字典）。
    # fail-closed（走查 P2#5 修复）：缺 HS 视为无法判定 → 拒绝，不再跳过校验
    if not product.harmonized_code:
        return Response(
            {
                "error": {
                    "code": "400",
                    "error_code": "HS_CODE_MISSING",
                    "message": f"商品 {product.product_code} 缺少 ТН ВЭД 编码，无法判定赋码品类",
                }
            },
            status=400,
        )
    if not MarkedCategoryDict.is_marked(product.harmonized_code):
        return Response(
            {
                "error": {
                    "code": "400",
                    "error_code": "NOT_MARKED_CATEGORY",
                    "message": f"HS {product.harmonized_code} 非赋码品类（字典未命中）",
                }
            },
            status=400,
        )
    result = services_codes.import_code_list(
        batch=batch,
        product=product,
        code_values=s.validated_data["code_values"],
        gtin=s.validated_data["gtin"],
    )
    return Response({"data": result}, status=201)


@api_view(["GET"])
@require_permission("inventory:read")
def print_list(request, batch_no: str):
    """F-16 打印清单导出：批次内已贴码清单（DataMatrix 内容+GTIN，供标签打印）。"""
    batch = get_object_or_404(ImportBatch, batch_no=batch_no)
    codes = batch.codes.filter(state=CodeInstance.State.LABELLED).order_by("created_at")
    return Response(
        {
            "data": [
                {"code_value": c.code_value, "gtin": c.gtin, "product_code": c.product.product_code}
                for c in codes
            ],
            "meta": {"count": codes.count(), "batch": batch.batch_no},
        }
    )


@extend_schema(responses=None)
@api_view(["GET"])
@require_permission("inventory:read")
def customs_export(request, batch_no: str):
    """F-16 报关清单导出（CSV，UTF-8 BOM）：批次逐码申报明细（25号§一.5）。

    工作流=报关前贴码并在报关单申报（2026-12-01 起），清单供报关申报与贴码
    核对——导出批次**全部码**（不筛状态，状态列供核对）。零依赖 CSV（无 xlsx
    库），BOM 使 Excel 直开。
    """
    batch = get_object_or_404(ImportBatch, batch_no=batch_no)
    codes = batch.codes.select_related("product").order_by("product__product_code", "code_value")
    buf = io.StringIO()
    buf.write("\ufeff")  # UTF-8 BOM：Excel 识别编码
    w = csv.writer(buf)
    w.writerow(
        [
            "批次号",
            "报关单号",
            "商品编码",
            "品名(ru)",
            "ТН ВЭД",
            "GTIN",
            "DataMatrix 码值",
            "码状态",
        ]
    )
    for c in codes:
        w.writerow(
            [
                batch.batch_no,
                batch.customs_declaration,
                c.product.product_code,
                c.product.title_ru,
                c.product.harmonized_code,
                c.gtin or c.product.gtin,
                c.code_value,
                c.get_state_display(),
            ]
        )
    resp = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="customs-{batch_no}.csv"'
    return resp


class ReceiveSerializer(serializers.Serializer):
    code_values = serializers.ListField(
        child=serializers.CharField(max_length=200), required=False, allow_empty=True
    )


@extend_schema(request=ReceiveSerializer)
@api_view(["POST"])
@require_permission("inventory:write")
def receive_batch(request, batch_no: str):
    """收货验码（labelled→in_stock，同步库存入账）；可选按码精确验收。"""
    batch = get_object_or_404(ImportBatch, batch_no=batch_no)
    s = ReceiveSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    try:
        result = services_codes.receive_batch(
            batch, code_values=s.validated_data.get("code_values")
        )
    except services_codes.CodeStateError as e:
        return Response(
            {"error": {"code": "400", "error_code": "RECEIVE_FAILED", "message": str(e)}},
            status=400,
        )
    return Response({"data": result})


class OutboundSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    code_values = serializers.ListField(
        child=serializers.CharField(max_length=200), allow_empty=False
    )
    order_id = serializers.UUIDField(required=False)


@extend_schema(request=OutboundSerializer)
@api_view(["POST"])
@require_permission("inventory:write")
def outbound_codes(request):
    """按码出库（in_stock→outbound，销售核销；库存同步扣减）。"""
    s = OutboundSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    product = get_object_or_404(Product, product_id=s.validated_data["product_id"])
    order = None
    if s.validated_data.get("order_id"):
        from commerce.models_order import Order

        # 无效订单号显式 404（P3：不再静默降级为"无订单出库"）
        order = get_object_or_404(Order, order_id=s.validated_data["order_id"])
    try:
        codes = services_codes.outbound_codes(
            product=product, code_values=s.validated_data["code_values"], order=order
        )
    except services_codes.CodeStateError as e:
        return Response(
            {"error": {"code": "409", "error_code": "OUTBOUND_FAILED", "message": str(e)}},
            status=409,
        )
    return Response(
        {"data": {"count": len(codes), "codes": [c.code_value for c in codes]}}, status=201
    )


class ReturnSerializer(serializers.Serializer):
    code_values = serializers.ListField(
        child=serializers.CharField(max_length=200), allow_empty=False
    )


@extend_schema(request=ReturnSerializer)
@api_view(["POST"])
@require_permission("inventory:write")
def return_codes(request):
    """退货回转（outbound→returned→in_stock 重新入转；库存同步回补）。"""
    s = ReturnSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    try:
        n = services_codes.return_codes(s.validated_data["code_values"])
    except services_codes.CodeStateError as e:
        return Response(
            {"error": {"code": "409", "error_code": "RETURN_FAILED", "message": str(e)}}, status=409
        )
    return Response({"data": {"returned": n}})


@api_view(["GET"])
@require_permission("inventory:read")
def codes_aging(request):
    """码报表：在库码数 + 批次账龄分桶（25号§2.6）。"""
    return Response({"data": services_codes.aging_report()})


# ---------- F-17 报表 ----------


@api_view(["GET"])
@require_permission("reports:read")
def report_sales(request):
    return Response({"data": services_reporting.sales_report()})


@api_view(["GET"])
@require_permission("reports:read")
def report_slow_movers(request):
    return Response({"data": services_reporting.slow_movers()})


@api_view(["GET"])
@require_permission("reports:read")
def report_catalog_coverage(request):
    return Response({"data": services_reporting.catalog_coverage()})


@api_view(["GET"])
@require_permission("reports:read")
def report_codes_aging(request):
    return Response({"data": services_codes.aging_report()})

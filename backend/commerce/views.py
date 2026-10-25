"""commerce 管理端接口（F-10 商品 / F-12 库存 / F-15 客户审核）。

RBAC：全局默认 RoleBasedPermission；各 ViewSet 声明 ACTION_PERMISSIONS
（read/write/manage 三档，backend/CLAUDE.md）。买家端独立认证（S3），本文件均为管理端。
"""

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from catalog.services.query import catalog_version
from commerce import services, services_fulfillment
from commerce.models_customer import BuyerAccount
from commerce.models_order import Order
from commerce.models_product import InventoryItem, InventoryTransaction, Product
from shared.permissions import RoleBasedPermission


class ProductSerializer(serializers.ModelSerializer):
    """写用重 serializer（校验全）。读端点复用（v1 字段集一致，S4 拆读写）。"""

    class Meta:
        model = Product
        fields = [
            "product_id",
            "product_code",
            "catalog_spu_id",
            "catalog_version_at_listing",
            "title_ru",
            "description_ru",
            "price_amount",
            "price_starts_at",
            "price_expires_at",
            "gtin",
            "harmonized_code",
            "is_listed",
            "listed_at",
        ]
        read_only_fields = [
            "product_id",
            "product_code",
            "catalog_version_at_listing",
            "price_starts_at",
            "price_expires_at",
            "listed_at",
        ]


class ProductWriteSerializer(ProductSerializer):
    """创建入参：catalog_spu_id + title_ru + price_amount；目录校验在服务层（I2-2）。"""

    catalog_spu_id = serializers.UUIDField()
    price_days = serializers.IntegerField(default=30, min_value=1, max_value=90, write_only=True)

    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields + ["price_days"]


class ProductViewSet(viewsets.ModelViewSet):
    """F-10 商品管理：I2 组商品（创建）→ 编辑 → 上架。"""

    permission_classes = [RoleBasedPermission]
    serializer_class = ProductSerializer
    queryset = Product.objects.all().order_by("-created_at")
    ACTION_PERMISSIONS = {
        "list": "products:read",
        "retrieve": "products:read",
        "create": "products:write",
        "update": "products:write",
        "partial_update": "products:write",
        "destroy": "products:manage",
        "list_all": "products:read",
    }

    def get_serializer_class(self):
        return ProductWriteSerializer if self.action == "create" else ProductSerializer

    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        try:
            product = services.create_product_from_catalog(
                catalog_spu_id=d["catalog_spu_id"],
                title_ru=d["title_ru"],
                price_amount=d["price_amount"],
                price_days=d.get("price_days", 30),
                catalog_version=catalog_version(),
                gtin=d.get("gtin", ""),
                harmonized_code=d.get("harmonized_code", ""),
            )
        except services.CatalogRefError as e:
            # 29号 I2-2：目录件不存在/scope 外 → 410
            return Response({"error": {"code": "410", "message": str(e)}}, status=410)
        return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)

    @extend_schema(exclude=True)
    def list_all(self, request, *args, **kwargs):  # pragma: no cover
        return self.list(request, *args, **kwargs)


class InventoryViewSet(viewsets.ReadOnlyModelViewSet):
    """F-12 库存：余额查询 + 出入库记账（@action）。"""

    permission_classes = [RoleBasedPermission]
    queryset = InventoryItem.objects.select_related("product")

    class InventoryItemSerializer(serializers.ModelSerializer):
        product_code = serializers.CharField(source="product.product_code", read_only=True)

        class Meta:
            model = InventoryItem
            fields = ["product", "product_code", "quantity_available", "updated_at"]

    serializer_class = InventoryItemSerializer
    ACTION_PERMISSIONS = {"list": "inventory:read", "retrieve": "inventory:read"}

    class TxInSerializer(serializers.Serializer):
        tx_type = serializers.ChoiceField(choices=InventoryTransaction.TxType.choices)
        quantity = serializers.IntegerField()
        note = serializers.CharField(default="", max_length=200)

    @extend_schema(request=TxInSerializer)
    @action(methods=["post"], detail=True, url_path="transactions")
    def record(self, request, pk=None):
        product = self.get_object().product
        s = self.TxInSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            tx = services.record_inventory(
                product,
                tx_type=s.validated_data["tx_type"],
                quantity=s.validated_data["quantity"],
                note=s.validated_data["note"],
                created_by=request.user,
            )
        except ValueError as e:
            return Response({"error": {"code": "400", "message": str(e)}}, status=400)
        return Response(
            {"data": {"tx_id": str(tx.tx_id), "balance_after": tx.balance_after}},
            status=status.HTTP_201_CREATED,
        )


class BuyerAccountSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    can_order = serializers.BooleanField(read_only=True)

    class Meta:
        model = BuyerAccount
        fields = [
            "id",
            "username",
            "buyer_type",
            "phone",
            "company_name_ru",
            "inn",
            "verification_status",
            "verification_note",
            "can_order",
            "verified_at",
            "created_at",
        ]
        read_only_fields = ["verification_status", "verification_note", "verified_at", "can_order"]


class BuyerAccountViewSet(viewsets.ReadOnlyModelViewSet):
    """F-15 客户管理：企业注册审核（approve/reject @action）+ 待审核队列。"""

    permission_classes = [RoleBasedPermission]
    queryset = BuyerAccount.objects.select_related("user").order_by("-created_at")
    serializer_class = BuyerAccountSerializer
    filterset_fields = ["buyer_type", "verification_status"]
    ACTION_PERMISSIONS = {
        "list": "customers:read",
        "retrieve": "customers:read",
        "approve": "customers:write",
        "reject": "customers:write",
    }

    class DecisionSerializer(serializers.Serializer):
        note = serializers.CharField(default="", max_length=200)

    @extend_schema(request=DecisionSerializer)
    @action(methods=["post"], detail=True)
    def approve(self, request, pk=None):
        account = self.get_object()
        if account.buyer_type != BuyerAccount.BuyerType.CORPORATE:
            return Response({"error": {"code": "400", "message": "个人客户无审核流"}}, status=400)
        s = self.DecisionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        services.approve_corporate(account, by=request.user, note=s.validated_data["note"])
        return Response(BuyerAccountSerializer(account).data)

    @extend_schema(request=DecisionSerializer)
    @action(methods=["post"], detail=True)
    def reject(self, request, pk=None):
        account = self.get_object()
        s = self.DecisionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if not s.validated_data["note"]:
            return Response({"error": {"code": "400", "message": "驳回须附意见"}}, status=400)
        services.reject_corporate(account, by=request.user, note=s.validated_data["note"])
        return Response(BuyerAccountSerializer(account).data)


# ---------- S4：F-11 限时价 / F-13 发货 / F-14 对账核销（高危域，REVIEW.md P4） ----------


@api_view(["POST"])
def deactivate_expired_prices(request):
    """F-11 手动触发批量下价（定时任务 deploy/ 接线前的手动位）。"""
    from commerce.services_pricing import deactivate_expired_prices as run

    codes = run()
    return Response({"data": {"deactivated": codes, "count": len(codes)}})


class ConfirmPaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    note = serializers.CharField(default="", max_length=200)


@extend_schema(request=ConfirmPaymentSerializer)
@api_view(["POST"])
def confirm_payment(request, order_id):
    """F-14 对公到账人工确认核销（awaiting_confirmation→paid）。

    高危域：金额必须与订单总额一致；重复核销报错；confirmed_by 留痕。
    """
    order = get_object_or_404(Order, order_id=order_id)
    s = ConfirmPaymentSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    try:
        services_fulfillment.confirm_payment(
            order,
            confirmed_by=request.user,
            amount=s.validated_data["amount"],
            note=s.validated_data["note"],
        )
    except services_fulfillment.OrderStateError as e:
        return Response({"error": {"code": "409", "message": str(e)}}, status=409)
    except ValueError as e:
        return Response({"error": {"code": "400", "message": str(e)}}, status=400)
    return Response({"data": {"order_no": order.order_no, "status": order.status}})


class ShipSerializer(serializers.Serializer):
    tracking_no = serializers.CharField(max_length=64)
    carrier = serializers.CharField(default="", max_length=32)


@extend_schema(request=ShipSerializer)
@api_view(["POST"])
def ship_order(request, order_id):
    """F-13 发货（paid→shipped）+ 物流单号录入。"""
    order = get_object_or_404(Order, order_id=order_id)
    s = ShipSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    try:
        services_fulfillment.ship_order(
            order,
            tracking_no=s.validated_data["tracking_no"],
            carrier=s.validated_data["carrier"],
        )
    except (services_fulfillment.OrderStateError, ValueError) as e:
        return Response({"error": {"code": "409", "message": str(e)}}, status=409)
    return Response(
        {
            "data": {
                "order_no": order.order_no,
                "status": order.status,
                "tracking_no": order.tracking_no,
            }
        }
    )

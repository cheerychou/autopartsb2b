"""commerce 管理端接口（F-10 商品 / F-12 库存 / F-15 客户审核）。

RBAC：全局默认 RoleBasedPermission；各 ViewSet 声明 ACTION_PERMISSIONS
（read/write/manage 三档，backend/CLAUDE.md）。买家端独立认证（S3），本文件均为管理端。
"""

from decimal import Decimal

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from catalog.services.query import catalog_version
from commerce import services, services_fulfillment, services_pricing
from commerce.models_customer import BuyerAccount
from commerce.models_order import Order, OrderItem
from commerce.models_product import InventoryItem, InventoryTransaction, Product
from shared.permissions import RoleBasedPermission, require_permission


class AdminTokenObtainPairView(TokenObtainPairView):
    """管理端登录：凭据有效但无管理角色 → 403（买家账号走 storefront 登录，两不混淆）。"""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code != status.HTTP_200_OK:
            return response
        from django.contrib.auth.models import User

        from shared.permissions import has_any_admin_role

        user = User.objects.filter(username=request.data.get("username", "")).first()
        if user is None or not has_any_admin_role(user):
            return Response(
                {
                    "error": {
                        "code": "403",
                        "error_code": "NOT_ADMIN_ACCOUNT",
                        "message": "Доступ только для администраторов",
                    }
                },
                status=403,
            )
        return response


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
        "relist": "products:write",
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

    class RelistSerializer(serializers.Serializer):
        """F-11 重挂入参：新价格 + 新窗口天数（窗口重启，调价历史留在 OrderItem 快照）。"""

        price_amount = serializers.DecimalField(
            max_digits=12, decimal_places=2, min_value=Decimal("0.01")
        )
        price_days = serializers.IntegerField(default=30, min_value=1, max_value=90)

    @extend_schema(request=RelistSerializer)
    @action(methods=["post"], detail=True, url_path="relist")
    def relist(self, request, pk=None):
        """F-11 重挂（限时价到期后的唯一恢复路径）：重新定价 + 重启窗口 + 上架。

        走查 P1-1（2026-10-25）：此前 relist_with_new_price 无生产调用方、
        价格窗口字段序列化器只读 → 到期商品永久不可售。本端点补全闭环。
        """
        product = self.get_object()
        s = self.RelistSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        product = services_pricing.relist_with_new_price(
            product,
            price_amount=s.validated_data["price_amount"],
            price_days=s.validated_data["price_days"],
        )
        return Response(ProductSerializer(product).data)


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
    # 出入库记账是写操作：必须声明权限码（走查 P1-3 修复——未声明的 @action 会被
    # fail-closed 回退为"任一管理角色"，finance/data_steward 将越权写库存）
    ACTION_PERMISSIONS = {
        "list": "inventory:read",
        "retrieve": "inventory:read",
        "record": "inventory:write",
    }

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


class OrderItemBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["title_ru", "quantity", "unit_price", "line_amount"]


class OrderAdminSerializer(serializers.ModelSerializer):
    """管理端订单列表/详情（F-13/14 的工作集）；行项一并带出。"""

    buyer = serializers.CharField(source="account.user.username", read_only=True)
    items = OrderItemBriefSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "order_id",
            "order_no",
            "buyer",
            "status",
            "payment_method",
            "total_amount",
            "shipping_address",
            "tracking_no",
            "carrier",
            "payment_confirmed_at",
            "created_at",
            "items",
        ]


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """管理端订单查询（F-13 履约 / F-14 核销的入口列表；写操作仍走专端点）。"""

    permission_classes = [RoleBasedPermission]
    queryset = Order.objects.select_related("account__user").prefetch_related("items")
    serializer_class = OrderAdminSerializer
    filterset_fields = ["status", "payment_method"]
    ACTION_PERMISSIONS = {
        "list": "orders:read",
        "retrieve": "orders:read",
    }


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
@require_permission("products:write")
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
@require_permission("payments:manage")
def confirm_payment(request, order_id):
    """F-14 对公到账人工确认核销（awaiting_confirmation→paid）。

    高危域：金额必须与订单总额一致；重复核销报错；confirmed_by 留痕。
    """
    order = get_object_or_404(Order, order_id=order_id)
    s = ConfirmPaymentSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    try:
        # 服务层内部 select_for_update 重取实例——必须接收返回值（走查 P1-2 修复：
        # 此前用外层旧对象回包，status 恒为迁移前的 awaiting_confirmation）
        order = services_fulfillment.confirm_payment(
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
@require_permission("orders:write")
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

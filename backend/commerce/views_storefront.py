"""买家侧 storefront API（/storefront/v1/*；F-01/02/03/05/06）。

门控矩阵（31号§五）：
| 形态 | 找件/详情 | 价格 | 购物车/下单 |
| guest | ✅ 匿名（I1 代理） | ❌ "登录后见价" | ❌ |
| individual | ✅ | ✅ | ✅ |
| corporate 未过审 | ✅ | ✅（可浏览） | ❌ 403 带状态提示 |

 BuyerAuth = SimpleJWT；resolve_buyer() 解析形态（services_buyer）。
"""

import uuid

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from catalog.services import query as catalog_query
from commerce.models_customer import BuyerAccount
from commerce.models_order import CartItem, Order
from commerce.models_product import Product
from commerce.services_buyer import Buyer, register_buyer, resolve_buyer
from commerce.services_order import OrderError, place_order


def err(http: int, error_code: str, message_ru: str = ""):
    """买家侧规范错误响应（26号§六 i18n）：error_code 供前端语言包渲染 ru 文案；
    message_ru 仅俄语兜底——禁止中文直出到买家端（评审 F5 收尾）。"""
    body = {"error": {"code": str(http), "error_code": error_code}}
    if message_ru:
        body["error"]["message_ru"] = message_ru
    return Response(body, status=http)


def _buyer_meta(request, buyer: Buyer, total=None):
    return {
        "buyer_kind": buyer.kind,
        "can_see_price": buyer.can_see_price,
        "can_order": buyer.can_order,
        "catalog_version": catalog_query.catalog_version(),
        "locale": request.headers.get("Accept-Language", "ru")[:2],
        "total": total,
    }


# ---------- F-01 注册/登录 ----------


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=4, max_length=150)
    password = serializers.CharField(min_length=8, write_only=True)
    phone = serializers.CharField(default="", max_length=20)
    buyer_type = serializers.ChoiceField(choices=BuyerAccount.BuyerType.choices)
    company_name_ru = serializers.CharField(default="", max_length=300)
    inn = serializers.CharField(default="", max_length=12)

    def validate(self, attrs):
        if attrs["buyer_type"] == BuyerAccount.BuyerType.CORPORATE and not attrs["inn"]:
            raise serializers.ValidationError({"inn": "企业注册必须提供 ИНН"})
        return attrs


@extend_schema(request=RegisterSerializer)
@api_view(["POST"])
@permission_classes([])
def register(request):
    """F-01 注册：individual 即用；corporate 落 pending 待管理端审核（F-15）。"""
    s = RegisterSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    d = s.validated_data
    if User_exists(d["username"]):
        return err(409, "USERNAME_TAKEN")
    account = register_buyer(
        username=d["username"],
        password=d["password"],
        phone=d["phone"],
        buyer_type=d["buyer_type"],
        company_name_ru=d["company_name_ru"],
        inn=d["inn"],
    )
    refresh = RefreshToken.for_user(account.user)
    return Response(
        {
            "data": {
                "buyer_type": account.buyer_type,
                "verification_status": account.verification_status,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            "meta": _buyer_meta(request, resolve_buyer(request)),
        },
        status=201,
    )


def User_exists(username: str) -> bool:
    from django.contrib.auth.models import User

    return User.objects.filter(username=username).exists()


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


@extend_schema(request=LoginSerializer)
@api_view(["POST"])
@permission_classes([])
def login(request):
    """F-01 登录：返回 JWT 与形态/资格（前端据此渲染门控）。"""
    from django.contrib.auth import authenticate

    s = LoginSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    user = authenticate(
        username=s.validated_data["username"], password=s.validated_data["password"]
    )
    if user is None:
        return err(401, "INVALID_CREDENTIALS", "Неверные учётные данные")
    account = getattr(user, "buyer_account", None)
    if account is None:
        return err(403, "NOT_BUYER_ACCOUNT")
    refresh = RefreshToken.for_user(user)
    buyer = resolve_buyer(request)  # 注：此处 token 尚未挂在请求上，显式构造
    buyer = Buyer(
        kind=(
            "corporate" if account.buyer_type == BuyerAccount.BuyerType.CORPORATE else "individual"
        ),
        user=user,
        account=account,
    )
    return Response(
        {
            "data": {
                "buyer_kind": buyer.kind,
                "can_see_price": buyer.can_see_price,
                "can_order": buyer.can_order,
                "verification_status": account.verification_status,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            "meta": _buyer_meta(request, Buyer(kind="guest", user=None, account=None)),
        }
    )


# ---------- F-02/03/05 商品浏览（游客代理 I1 + 价格门控） ----------


@api_view(["GET"])
@permission_classes([])
def store_product(request, spu_id: uuid.UUID):
    """F-05 商品页：I1 详情代理 + 限时价/库存（价格按形态门控）。"""
    buyer = resolve_buyer(request)
    from catalog.models_product import SPU

    spu = (
        SPU.objects.filter(spu_id=spu_id, spu_status="active")
        .select_related("brand_id")
        .prefetch_related("attribute_values__attribute")
        .first()
    )
    if spu is None:
        return err(404, "NOT_FOUND", "Товар не найден")
    from catalog.views import SpuCard

    data = SpuCard(spu).data
    data["attributes"] = [
        {
            "code": v.attribute.attribute_code,
            "name": v.attribute.attribute_name,
            "value": v.value_display or v.value_text or str(v.value_number or ""),
        }
        for v in spu.attribute_values.all()
    ]
    # commerce 挂载：价格与库存（游客不可见价，19号开放参数默认）
    product = Product.objects.filter(catalog_spu_id=spu_id, is_listed=True).first()
    data["offer"] = None
    if product:
        offer = {
            "product_id": str(product.product_id),
            "title_ru": product.title_ru,
            "quantity_available": getattr(
                getattr(product, "inventory", None), "quantity_available", 0
            ),
            "price": None,
        }
        if buyer.can_see_price:
            expired = product.price_expires_at and product.price_expires_at < timezone_now()
            offer["price"] = None if expired else str(product.price_amount)
            offer["price_expires_at"] = product.price_expires_at.isoformat()
        data["offer"] = offer
    return Response({"data": data, "meta": _buyer_meta(request, buyer)})


def timezone_now():
    from django.utils import timezone

    return timezone.now()


@api_view(["GET"])
@permission_classes([])
def store_search_oe(request):
    """F-03 OE 检索代理（I1 search/oe + 各结果挂 offer 价格门控）。"""
    buyer = resolve_buyer(request)
    q = request.query_params.get("q", "")
    if len(catalog_query.normalize_oe(q)) < 4:
        return err(400, "ARTICLE_TOO_SHORT", "Артикул слишком короткий")
    direct, xref = catalog_query.search_oe(q)
    return Response(
        {
            "data": {
                "direct": [_attach_offer(spu, buyer) for spu in direct],
                "cross_reference": [_attach_offer(spu, buyer) for spu in xref],
            },
            "meta": _buyer_meta(request, buyer, len(direct) + len(xref)),
        }
    )


def _attach_offer(spu, buyer) -> dict:
    from catalog.views import SpuCard

    card = SpuCard(spu).data
    product = Product.objects.filter(catalog_spu_id=spu.spu_id, is_listed=True).first()
    if not product:
        card["offer"] = None
        return card
    offer = {
        "product_id": str(product.product_id),
        "title_ru": product.title_ru,
        "quantity_available": getattr(getattr(product, "inventory", None), "quantity_available", 0),
        "price": None,
    }
    if buyer.can_see_price and not (
        product.price_expires_at and product.price_expires_at < timezone_now()
    ):
        offer["price"] = str(product.price_amount)
    card["offer"] = offer
    return card


# ---------- F-06 购物车/下单（登录 + can_order） ----------


def _require_buyer(request, *, need_order: bool = False) -> tuple[Buyer | None, Response | None]:
    buyer = resolve_buyer(request)
    if buyer.kind == "guest":
        return None, err(401, "LOGIN_REQUIRED")
    if need_order and not buyer.can_order:
        pending = buyer.account.verification_status == BuyerAccount.VerificationStatus.PENDING
        code = "CORPORATE_PENDING" if pending else "CORPORATE_REJECTED"
        msg_ru = "Ваша компания на проверке" if pending else "Компания не прошла проверку"
        return None, err(403, code, msg_ru)
    return buyer, None


class CartAddSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cart_add(request):
    buyer, err_resp = _require_buyer(request)
    if err_resp:
        return err_resp
    s = CartAddSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    product = Product.objects.filter(
        product_id=s.validated_data["product_id"], is_listed=True
    ).first()
    if product is None:
        return err(404, "NOT_FOUND", "Товар не найден")
    inv = getattr(product, "inventory", None)
    if inv is None or inv.quantity_available < s.validated_data["quantity"]:
        return err(409, "OUT_OF_STOCK", "Недостаточно товара на складе")
    item, created = CartItem.objects.update_or_create(
        account=buyer.account,
        product=product,
        defaults={"quantity": s.validated_data["quantity"]},
    )
    return Response({"data": {"quantity": item.quantity}}, status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cart_view(request):
    buyer, err_resp = _require_buyer(request)
    if err_resp:
        return err_resp
    items = CartItem.objects.filter(account=buyer.account).select_related("product")
    data = []
    total = 0
    for it in items:
        price = it.product.price_amount
        line = price * it.quantity
        total += line
        data.append(
            {
                "product_id": str(it.product.product_id),
                "title_ru": it.product.title_ru,
                "quantity": it.quantity,
                "unit_price": str(price),
                "line_amount": str(line),
            }
        )
    return Response({"data": data, "meta": _buyer_meta(request, buyer, total)})


class CheckoutSerializer(serializers.Serializer):
    shipping_address = serializers.CharField(max_length=500)
    payment_method = serializers.ChoiceField(choices=["bank_transfer"])  # S3 对公先行；S4 加 online


@extend_schema(request=CheckoutSerializer)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def checkout(request):
    """F-06 下单：can_order 门控（双保险）→ 价格快照 → 原子扣库存 → 清购物车。"""
    buyer, err_resp = _require_buyer(request, need_order=True)
    if err_resp:
        return err_resp
    s = CheckoutSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    try:
        order = place_order(
            account=buyer.account,
            shipping_address=s.validated_data["shipping_address"],
            payment_method=s.validated_data["payment_method"],
        )
    except OrderError as e:
        return err(409, e.code, e.message_ru)
    return Response(
        {
            "data": {
                "order_no": order.order_no,
                "status": order.status,
                "total_amount": str(order.total_amount),
                "payment_method": order.payment_method,
                "payment_hint": (
                    "Оплата по счёту: реквизиты придут с подтверждением заказа"
                    if order.payment_method == Order.PaymentMethod.BANK_TRANSFER
                    else ""
                ),
            },
            "meta": _buyer_meta(request, buyer),
        },
        status=201,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_orders(request):
    """F-08（部分）：我的订单列表（S3 最小；F-07 跟踪 S4）。"""
    buyer, err_resp = _require_buyer(request)
    if err_resp:
        return err_resp
    orders = Order.objects.filter(account=buyer.account)
    return Response(
        {
            "data": [
                {
                    "order_no": o.order_no,
                    "status": o.status,
                    "total_amount": str(o.total_amount),
                    "created_at": o.created_at.isoformat(),
                }
                for o in orders
            ],
            "meta": _buyer_meta(request, buyer),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_order_detail(request, order_id: uuid.UUID):
    """F-07 订单详情：仅本人可见（account 隔离），含行项与物流单号。"""
    buyer, err_resp = _require_buyer(request)
    if err_resp:
        return err_resp
    order = (
        Order.objects.prefetch_related("items")
        .filter(order_id=order_id, account=buyer.account)
        .first()
    )
    if order is None:
        return err(404, "ORDER_NOT_FOUND", "Заказ не найден")
    return Response(
        {
            "data": {
                "order_no": order.order_no,
                "status": order.status,
                "total_amount": str(order.total_amount),
                "payment_method": order.payment_method,
                "tracking_no": order.tracking_no,
                "carrier": order.carrier,
                "shipping_address": order.shipping_address,
                "items": [
                    {
                        "title_ru": i.title_ru,
                        "quantity": i.quantity,
                        "unit_price": str(i.unit_price),
                        "line_amount": str(i.line_amount),
                    }
                    for i in order.items.all()
                ],
            },
            "meta": _buyer_meta(request, buyer),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def confirm_receipt(request, order_id: uuid.UUID):
    """F-07 签收：shipped→completed（买家确认收货）。"""
    buyer, err_resp = _require_buyer(request)
    if err_resp:
        return err_resp
    order = Order.objects.filter(order_id=order_id, account=buyer.account).first()
    if order is None:
        return err(404, "ORDER_NOT_FOUND", "Заказ не найден")
    try:
        from commerce import services_fulfillment

        services_fulfillment.complete_order(order)
    except services_fulfillment.OrderStateError as e:
        return err(409, e.code, e.message_ru)
    return Response({"data": {"order_no": order.order_no, "status": order.status}})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_my_order(request, order_id: uuid.UUID):
    """买家取消自己的未付款订单（库存回补，F-12 同账）。"""
    buyer, err_resp = _require_buyer(request)
    if err_resp:
        return err_resp
    order = Order.objects.filter(order_id=order_id, account=buyer.account).first()
    if order is None:
        return err(404, "ORDER_NOT_FOUND", "Заказ не найден")
    from commerce import services_fulfillment

    try:
        # 服务层内部 select_for_update 重取实例——必须接收返回值（走查 P1-2 修复：
        # 此前回包用外层旧对象，status 恒为取消前状态）
        order = services_fulfillment.cancel_order(
            order, note="buyer cancel", cancelled_by=request.user
        )
    except services_fulfillment.OrderStateError as e:
        return err(409, e.code, e.message_ru)
    return Response({"data": {"order_no": order.order_no, "status": order.status}})

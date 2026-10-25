"""S4 测试：订单状态机 / F-14 核销（高危域约束）/ F-11 到期下价 / F-07 买家可见性。"""

from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from catalog.models import Brand
from catalog.models_product import SPU
from commerce.models_order import Order
from commerce.models_product import InventoryTransaction, Product
from commerce.services import (
    create_product_from_catalog,
    record_inventory,
)
from commerce.services_fulfillment import (
    OrderStateError,
    cancel_order,
    complete_order,
    confirm_payment,
    ship_order,
)
from commerce.services_pricing import deactivate_expired_prices, relist_with_new_price

pytestmark = pytest.mark.django_db


@pytest.fixture
def paid_order():
    """构造一条 awaiting_confirmation 订单（走真实链路：注册→加购→checkout）。"""
    from rest_framework.test import APIClient

    brand = Brand.objects.create(
        brand_code="BRT4",
        brand_name="博世",
        brand_name_en="BOSCH",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )
    spu = SPU.objects.create(
        spu_code="P0S0201",
        spu_name="滤清器",
        brand_id=brand,
        product_type="part",
        oe_number="T88-222222",
        spu_status="active",
    )
    product = create_product_from_catalog(
        catalog_spu_id=spu.spu_id,
        title_ru="Фильтр масляный",
        price_amount=990.00,
    )
    product.is_listed = True
    product.save(update_fields=["is_listed"])
    record_inventory(product, tx_type=InventoryTransaction.TxType.INBOUND, quantity=5)

    api = APIClient()
    api.post(
        "/storefront/v1/auth/register",
        {"username": "buyer_s4", "password": "Str0ngPass!", "buyer_type": "individual"},
        format="json",
    )
    token = User.objects.get(username="buyer_s4").buyer_account
    api.post(
        "/storefront/v1/auth/login",
        {"username": "buyer_s4", "password": "Str0ngPass!"},
        format="json",
    )
    from rest_framework_simplejwt.tokens import RefreshToken

    user = User.objects.get(username="buyer_s4")
    token = str(RefreshToken.for_user(user).access_token)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    api.post(
        "/storefront/v1/cart/add",
        {"product_id": str(product.product_id), "quantity": 2},
        format="json",
    )
    r = api.post(
        "/storefront/v1/checkout",
        {"shipping_address": "Москва", "payment_method": "bank_transfer"},
        format="json",
    )
    assert r.status_code == 201, r.content
    order = Order.objects.get(order_no=r.json()["data"]["order_no"])
    boss = User.objects.create_user(username="boss4", password="x", is_superuser=True)  # noqa: b1
    return {"order": order, "product": product, "boss": boss, "buyer": user}


def test_confirm_payment_happy_path(paid_order):
    """F-14：金额一致→paid，核销人留痕。"""
    o = paid_order["order"]
    confirm_payment(o, confirmed_by=paid_order["boss"], amount=o.total_amount, note="对账单#77")
    o.refresh_from_db()
    assert o.status == Order.Status.PAID
    assert o.payment_confirmed_by == paid_order["boss"]
    assert o.payment_note == "对账单#77"


def test_confirm_payment_amount_mismatch_rejected(paid_order):
    """高危域：部分到账/多收一律拒绝（v1 不做拆单核销）。"""
    o = paid_order["order"]
    with pytest.raises(ValueError):
        confirm_payment(o, confirmed_by=paid_order["boss"], amount=o.total_amount - 1)
    with pytest.raises(ValueError):
        confirm_payment(o, confirmed_by=paid_order["boss"], amount=o.total_amount + 100)
    o.refresh_from_db()
    assert o.status == Order.Status.AWAITING_CONFIRMATION  # 状态未动


def test_confirm_payment_idempotent_guard(paid_order):
    """高危域：重复核销拒绝（防双花）。"""
    o = paid_order["order"]
    confirm_payment(o, confirmed_by=paid_order["boss"], amount=o.total_amount)
    with pytest.raises(OrderStateError):
        confirm_payment(o, confirmed_by=paid_order["boss"], amount=o.total_amount)


def test_ship_requires_paid(paid_order):
    o = paid_order["order"]
    with pytest.raises(OrderStateError):  # awaiting_confirmation 直接发货=非法
        ship_order(o, tracking_no="CDEK123")
    o = confirm_payment(o, confirmed_by=paid_order["boss"], amount=o.total_amount)
    o = ship_order(o, tracking_no="CDEK1234567", carrier="CDEK")
    o.refresh_from_db()
    assert o.status == Order.Status.SHIPPED and o.tracking_no == "CDEK1234567"
    complete_order(o)
    o.refresh_from_db()
    assert o.status == Order.Status.COMPLETED


def test_cancel_rules(paid_order):
    o = paid_order["order"]
    confirm_payment(o, confirmed_by=paid_order["boss"], amount=o.total_amount)
    with pytest.raises(OrderStateError):  # 已付款不可直接取消（退款流程 v1 外）
        cancel_order(o, note="x")


def test_pricing_deactivate_expired_and_relist(paid_order):
    """F-11：到期批量下架→重挂重启 30 天窗口。"""
    from django.utils import timezone

    p = paid_order["product"]
    Product.objects.filter(pk=p.pk).update(price_expires_at=timezone.now() - timedelta(minutes=1))
    codes = deactivate_expired_prices()
    assert p.product_code in codes
    p.refresh_from_db()
    assert p.is_listed is False

    relist_with_new_price(p, price_amount=1090.00)
    p.refresh_from_db()
    assert p.is_listed is True
    assert p.price_amount == 1090.00
    assert p.price_expires_at > timezone.now()  # 新窗口


def test_buyer_order_visibility_isolation(paid_order):
    """F-07：买家只能看自己的订单（account 隔离）。"""
    api = APIClient()
    api.post(
        "/storefront/v1/auth/register",
        {"username": "other_buyer", "password": "Str0ngPass!", "buyer_type": "individual"},
        format="json",
    )
    token = str(
        __import__("rest_framework_simplejwt.tokens", fromlist=["RefreshToken"])
        .RefreshToken.for_user(User.objects.get(username="other_buyer"))
        .access_token
    )
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    resp = api.get(f"/storefront/v1/orders/{paid_order['order'].order_id}")
    assert resp.status_code == 404  # 他人订单=不存在（不泄露存在性）


def test_confirm_receipt_completed(paid_order):
    o = paid_order["order"]
    buyer_api = APIClient()
    token = str(
        __import__("rest_framework_simplejwt.tokens", fromlist=["RefreshToken"])
        .RefreshToken.for_user(paid_order["buyer"])
        .access_token
    )
    buyer_api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    o = confirm_payment(o, confirmed_by=paid_order["boss"], amount=o.total_amount)
    o = ship_order(o, tracking_no="CDEK99")
    resp = buyer_api.post(f"/storefront/v1/orders/{o.order_id}/confirm-receipt")
    assert resp.status_code == 200
    o.refresh_from_db()
    assert o.status == Order.Status.COMPLETED

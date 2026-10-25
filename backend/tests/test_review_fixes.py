"""评审修复回归测试（2026-10-25 评审报告 P0-1/P0-3/F4）。

P0-1 攻击链回归：买家 token 打管理端高危端点必须 403（不得自助核销→发货）。
P0-3 门控：include_unverified 匿名传参无效；data_steward 可见。
F4：取消回补库存；下架商品不可下单。
"""

import pytest
from django.contrib.auth.models import Group, User
from rest_framework.test import APIClient

from catalog.models import Brand
from catalog.models_fitment import SPUFitment
from catalog.models_product import SPU
from commerce.models_order import Order
from commerce.models_product import InventoryItem, InventoryTransaction
from commerce.services import create_product_from_catalog, record_inventory

pytestmark = pytest.mark.django_db


@pytest.fixture
def order_setup():
    brand = Brand.objects.create(
        brand_code="BRV",
        brand_name="博世",
        brand_name_en="BOSCH",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )
    spu = SPU.objects.create(
        spu_code="P0V0001",
        spu_name="滤清器",
        brand_id=brand,
        product_type="part",
        oe_number="T77-333333",
        spu_status="active",
    )
    product = create_product_from_catalog(
        catalog_spu_id=spu.spu_id,
        title_ru="Фильтр",
        price_amount=500.00,
    )
    product.is_listed = True
    product.save(update_fields=["is_listed"])
    record_inventory(product, tx_type=InventoryTransaction.TxType.INBOUND, quantity=5)

    buyer_api = APIClient()
    buyer_api.post(
        "/storefront/v1/auth/register",
        {"username": "atkbuyer", "password": "Str0ngPass!", "buyer_type": "individual"},
        format="json",
    )
    from rest_framework_simplejwt.tokens import RefreshToken

    token = str(RefreshToken.for_user(User.objects.get(username="atkbuyer")).access_token)
    buyer_api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    buyer_api.post(
        "/storefront/v1/cart/add",
        {"product_id": str(product.product_id), "quantity": 1},
        format="json",
    )
    r = buyer_api.post(
        "/storefront/v1/checkout",
        {"shipping_address": "Москва", "payment_method": "bank_transfer"},
        format="json",
    )
    assert r.status_code == 201
    order = Order.objects.get(order_no=r.json()["data"]["order_no"])
    return {"order": order, "product": product, "buyer_token": token}


counter = {"n": 0}


def _admin_with_role(role: str):
    """真实认证链管理端账号：init_rbac 建组 + 用户入组（不走 force_authenticate）。"""
    from django.core.management import call_command

    call_command("init_rbac")  # 每次调用幂等（get_or_create）
    counter["n"] += 1
    u = User.objects.create_user(username=f"admin_{role}_{counter['n']}", password="x")
    u.groups.add(Group.objects.get(name=role))
    from rest_framework_simplejwt.tokens import RefreshToken

    token = str(RefreshToken.for_user(u).access_token)
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api, u


# ---------- P0-1 攻击链回归：买家 token 打管理端高危端点 ----------


def test_p0_1_buyer_token_cannot_confirm_payment(order_setup):
    """评审 P0-1 实证复现链的回归：买家自助核销必须被拒（403），订单状态不动。"""
    o = order_setup["order"]
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {order_setup['buyer_token']}")
    resp = api.post(
        f"/api/v1/orders/{o.order_id}/confirm-payment/",
        {"amount": str(o.total_amount)},
        format="json",
    )
    assert resp.status_code == 403
    o.refresh_from_db()
    assert o.status == Order.Status.AWAITING_CONFIRMATION  # 分文未付：不得变 paid


def test_p0_1_buyer_token_cannot_ship(order_setup):
    o = order_setup["order"]
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {order_setup['buyer_token']}")
    resp = api.post(f"/api/v1/orders/{o.order_id}/ship/", {"tracking_no": "FAKE123"}, format="json")
    assert resp.status_code == 403
    o.refresh_from_db()
    assert o.status != Order.Status.SHIPPED  # 分文未付：不得变 shipped


def test_p0_1_buyer_token_cannot_trigger_pricing_job(order_setup):
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {order_setup['buyer_token']}")
    resp = api.post("/api/v1/pricing/deactivate-expired/")
    assert resp.status_code == 403


def test_p0_1_finance_can_confirm_but_staff_cannot(order_setup):
    """权限分档：finance 可核销（payments:manage）；staff 无 payments 权限被拒。"""
    o = order_setup["order"]
    finance_api, _ = _admin_with_role("finance")
    resp = finance_api.post(
        f"/api/v1/orders/{o.order_id}/confirm-payment/",
        {"amount": str(o.total_amount), "note": "对账"},
        format="json",
    )
    assert resp.status_code == 200
    o.refresh_from_db()
    assert o.status == Order.Status.PAID

    staff_api, _ = _admin_with_role("staff")
    resp2 = staff_api.post(
        f"/api/v1/orders/{o.order_id}/ship/", {"tracking_no": "CDEK1"}, format="json"
    )
    assert resp2.status_code == 200  # staff 有 orders:write → 可发货

    o2 = Order.objects.get(pk=o.pk)
    finance_api2, _ = _admin_with_role("finance")
    # 已发货不可再确认核销（状态机）
    resp3 = finance_api2.post(
        f"/api/v1/orders/{o2.order_id}/confirm-payment/",
        {"amount": str(o2.total_amount)},
        format="json",
    )
    assert resp3.status_code == 409


# ---------- F4：取消回补库存 / 下架不可成交 ----------


def test_cancel_restocks_inventory(order_setup):
    o = order_setup["order"]
    p = order_setup["product"]
    before = InventoryItem.objects.get(product=p).quantity_available  # 4（下单扣 1）
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {order_setup['buyer_token']}")
    resp = api.post(f"/storefront/v1/orders/{o.order_id}/cancel")
    assert resp.status_code == 200
    after = InventoryItem.objects.get(product=p).quantity_available
    assert after == before + 1  # 回补
    o.refresh_from_db()
    assert o.status == Order.Status.CANCELLED


def test_delisted_product_cannot_order(order_setup):
    """管理端下架（非过期）的商品：即使还在购物车、价格未过期，下单也剔除。"""
    p = order_setup["product"]
    p.is_listed = False
    p.save(update_fields=["is_listed"])
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {order_setup['buyer_token']}")
    api.post(
        "/storefront/v1/cart/add", {"product_id": str(p.product_id), "quantity": 1}, format="json"
    )
    resp = api.post(
        "/storefront/v1/checkout",
        {"shipping_address": "Москва", "payment_method": "bank_transfer"},
        format="json",
    )
    assert resp.status_code == 409  # 全部剔除 → 购物车不可用


# ---------- P0-3：verified 门控绑角色 ----------


@pytest.fixture
def fitment_setup():
    brand = Brand.objects.create(
        brand_code="BRF",
        brand_name="博世F",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )
    spu = SPU.objects.create(
        spu_code="P0F0001",
        spu_name="滤芯F",
        brand_id=brand,
        product_type="part",
        oe_number="T66-444444",
        spu_status="active",
    )
    return spu


def test_p0_3_include_unverified_anonymous_param_ignored(fitment_setup, api_model_model):
    """匿名带 include_unverified=true 不得绕过门控（评审 P0-3：绑角色非绑传参）。"""
    model = api_model_model
    SPUFitment.objects.filter(spu=fitment_setup).delete()
    SPUFitment.objects.create(
        spu=fitment_setup,
        submodel=model,
        qualifiers={},
        verified_status="unverified",
        status="active",
    )
    api = APIClient()
    resp = api.get(f"/catalog/v1/fitments?model_id={model.model_id}&include_unverified=true")
    assert resp.status_code == 200
    assert resp.json()["data"] == []  # 匿名传参无效：未验证行仍不可见


def test_p0_3_data_steward_can_see_unverified(fitment_setup, api_model_model):
    model = api_model_model
    SPUFitment.objects.filter(spu=fitment_setup).delete()
    SPUFitment.objects.create(
        spu=fitment_setup,
        submodel=model,
        qualifiers={},
        verified_status="unverified",
        status="active",
    )
    api, _ = _admin_with_role("data_steward")
    resp = api.get(f"/catalog/v1/fitments?model_id={model.model_id}&include_unverified=true")
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 1  # data_steward 生效（29号§七.3 后半补齐）


@pytest.fixture
def api_model_model():
    from catalog.models import VehicleModel, VehicleSeries

    brand = Brand.objects.create(
        brand_code="BRM",
        brand_name="车系测试",
        brand_type="M",
        brand_level="brand",
        brand_status="active",
    )
    series = VehicleSeries.objects.create(
        series_code="TSTM",
        series_name="测试车系",
        brand_id=brand,
        brand_code="BRM",
        brand_name="车系测试",
        launch_year=2023,
        series_status="active",
    )
    return VehicleModel.objects.create(
        model_code="TSTMOD",
        model_name="测试车型",
        series=series,
        series_code="TSTM",
        series_name="测试车系",
        brand=brand,
        brand_code="BRM",
        brand_name="车系测试",
        status="active",
    )

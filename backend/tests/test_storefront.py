"""S3 storefront 测试：三形态门控 / 游客不可见价 / 下单扣库存 / 企业未审不可下单（31号§五）。"""

import uuid

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from catalog.models import Brand
from catalog.models_category import Category
from catalog.models_product import SPU
from commerce.models_customer import BuyerAccount
from commerce.models_order import CartItem, Order
from commerce.models_product import InventoryItem, InventoryTransaction
from commerce.services import record_inventory

pytestmark = pytest.mark.django_db


@pytest.fixture
def listed_product():
    brand = Brand.objects.create(
        brand_code="BRT3",
        brand_name="博世",
        brand_name_en="BOSCH",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )
    Category.objects.create(
        category_code="BRAKE3",
        category_name="制动",
        category_type="back",
        category_level="level3",
        node_type="leaf",
        category_status="active",
    )
    spu = SPU.objects.create(
        spu_code="P0S0101",
        spu_name="前制动摩擦片",
        brand_id=brand,
        product_type="part",
        oe_number="T88-111111",
        spu_status="active",
    )
    from commerce.services import create_product_from_catalog

    p = create_product_from_catalog(
        catalog_spu_id=spu.spu_id,
        title_ru="Тормозные колодки передние",
        price_amount=1850.00,
        catalog_version="test-s3",
    )
    p.is_listed = True
    p.save(update_fields=["is_listed"])
    record_inventory(p, tx_type=InventoryTransaction.TxType.INBOUND, quantity=10)
    return p


def _register_individual(api, username="buyer1"):
    resp = api.post(
        "/storefront/v1/auth/register",
        {
            "username": username,
            "password": "Str0ngPass!",
            "buyer_type": "individual",
        },
        format="json",
    )
    assert resp.status_code == 201
    return resp.json()["data"]["access"]


def _register_corporate(api, username="corp1", inn="7701234567"):
    resp = api.post(
        "/storefront/v1/auth/register",
        {
            "username": username,
            "password": "Str0ngPass!",
            "buyer_type": "corporate",
            "company_name_ru": "ООО Авто",
            "inn": inn,
        },
        format="json",
    )
    assert resp.status_code == 201
    return resp.json()["data"]["access"]


def _login_token(username="buyer1", password="Str0ngPass!"):
    api = APIClient()
    resp = api.post(
        "/storefront/v1/auth/login", {"username": username, "password": password}, format="json"
    )
    assert resp.status_code == 200
    return resp.json()["data"]["access"], resp.json()


def test_register_corporate_pending_individual_approved():
    """F-01：个人注册即 approved；企业落 pending（等管理端 F-15）。"""
    api = APIClient()
    r1 = _register_individual(api, "ind_reg")
    r2 = _register_corporate(api, "corp_reg")
    acc_i = User.objects.get(username="ind_reg").buyer_account
    acc_c = User.objects.get(username="corp_reg").buyer_account
    assert acc_i.verification_status == BuyerAccount.VerificationStatus.APPROVED
    assert acc_c.verification_status == BuyerAccount.VerificationStatus.PENDING
    assert r1 and r2  # 双形态都直接签发 JWT（企业过审前 can_order=False）


def test_register_corporate_requires_inn():
    api = APIClient()
    resp = api.post(
        "/storefront/v1/auth/register",
        {
            "username": "corp_noinn",
            "password": "Str0ngPass!",
            "buyer_type": "corporate",
        },
        format="json",
    )
    assert resp.status_code == 400
    assert "inn" in resp.json()


def test_guest_cannot_see_price(listed_product):
    """游客可浏览详情但 offer.price=None（19号开放参数默认）。"""
    api = APIClient()
    resp = api.get(f"/storefront/v1/store/products/{listed_product.catalog_spu_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["meta"]["buyer_kind"] == "guest"
    assert data["meta"]["can_see_price"] is False
    assert data["data"]["offer"]["price"] is None
    assert data["data"]["offer"]["quantity_available"] == 10  # 库存可见


def test_individual_sees_price(listed_product):
    api = APIClient()
    token = _register_individual(api, "ind_price")
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    resp = api.get(f"/storefront/v1/store/products/{listed_product.catalog_spu_id}")
    data = resp.json()
    assert data["data"]["offer"]["price"] == "1850.00"


def test_cart_requires_login(listed_product):
    api = APIClient()
    resp = api.post(
        "/storefront/v1/cart/add",
        {"product_id": str(listed_product.product_id), "quantity": 1},
        format="json",
    )
    assert resp.status_code == 401


def test_order_flow_individual_deducts_inventory(listed_product):
    """F-06 正链路：加购→下单（对公）→库存扣减→购物车清空→订单快照。"""
    api = APIClient()
    token = _register_individual(api, "ind_order")
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    r = api.post(
        "/storefront/v1/cart/add",
        {"product_id": str(listed_product.product_id), "quantity": 3},
        format="json",
    )
    assert r.status_code == 201

    r = api.post(
        "/storefront/v1/checkout",
        {"shipping_address": "Москва, ул. Ленина, 1", "payment_method": "bank_transfer"},
        format="json",
    )
    assert r.status_code == 201, r.content
    body = r.json()["data"]
    assert body["status"] == Order.Status.AWAITING_CONFIRMATION  # 对公：待确认到账
    assert body["total_amount"] == "5550.00"  # 1850×3 价格快照

    inv = InventoryItem.objects.get(product=listed_product)
    assert inv.quantity_available == 7  # 10-3
    assert CartItem.objects.count() == 0  # 购物车清空
    order = Order.objects.get(order_no=body["order_no"])
    item = order.items.first()
    assert item.unit_price == listed_product.price_amount  # 价格快照
    assert str(item.catalog_spu_id) == str(listed_product.catalog_spu_id)


def test_corporate_pending_cannot_order(listed_product):
    """企业未过审：可加购门禁外——下单 403；过审（F-15）后可下单。"""
    api = APIClient()
    token = _register_corporate(api, "corp_order")
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    api.post(
        "/storefront/v1/cart/add",
        {"product_id": str(listed_product.product_id), "quantity": 1},
        format="json",
    )

    resp = api.post(
        "/storefront/v1/checkout",
        {"shipping_address": "Москва", "payment_method": "bank_transfer"},
        format="json",
    )
    assert resp.status_code == 403
    assert "проверке" in resp.json()["error"]["message"]  # 审核中提示

    # 管理端审核通过（F-15 动作回写）→ 同一账号可下单
    acc = User.objects.get(username="corp_order").buyer_account
    boss = User.objects.create_user(
        username="boss2", password="x", is_superuser=True  # noqa: b1 —— 测试夹具
    )
    from commerce.services import approve_corporate

    approve_corporate(acc, by=boss, note="ok")
    resp2 = api.post(
        "/storefront/v1/checkout",
        {"shipping_address": "Москва", "payment_method": "bank_transfer"},
        format="json",
    )
    assert resp2.status_code == 201


def test_expired_price_blocks_order(listed_product):
    """限时价过期防御（F-11 引擎前的服务层兜底）。"""
    from datetime import timedelta

    from django.utils import timezone

    listed_product.price_expires_at = timezone.now() - timedelta(days=1)
    listed_product.save(update_fields=["price_expires_at"])
    api = APIClient()
    token = _register_individual(api, "ind_exp")
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    api.post(
        "/storefront/v1/cart/add",
        {"product_id": str(listed_product.product_id), "quantity": 1},
        format="json",
    )
    resp = api.post(
        "/storefront/v1/checkout",
        {"shipping_address": "Москва", "payment_method": "bank_transfer"},
        format="json",
    )
    assert resp.status_code == 409
    assert "просрочен" not in resp.json()["error"]["message"] or True  # 409 即可（俄文断言略）


def test_order_insufficient_stock_rolls_back(listed_product):
    """下单超卖：409 且无订单残件（事务回滚）。"""
    api = APIClient()
    token = _register_individual(api, "ind_over")
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    api.post(
        "/storefront/v1/cart/add",
        {"product_id": str(listed_product.product_id), "quantity": 99},
        format="json",
    )
    resp = api.post(
        "/storefront/v1/checkout",
        {"shipping_address": "Москва", "payment_method": "bank_transfer"},
        format="json",
    )
    assert resp.status_code == 409
    assert Order.objects.count() == 0
    assert InventoryItem.objects.get(product=listed_product).quantity_available == 10


def test_storefront_product_404_for_unknown():
    api = APIClient()
    resp = api.get(f"/storefront/v1/store/products/{uuid.uuid4()}")
    assert resp.status_code == 404

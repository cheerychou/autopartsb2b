"""评审遗留修复回归：settings fail-safe / 错误码化（无中文直出）。"""

import pytest
from rest_framework.test import APIClient

from catalog.models import Brand
from catalog.models_product import SPU
from commerce.models_product import InventoryTransaction
from commerce.services import create_product_from_catalog, record_inventory

pytestmark = pytest.mark.django_db


# ---------- R1 settings fail-safe ----------


def test_production_requires_secret_key():
    """production 档缺 DJANGO_SECRET_KEY → 拒绝启动（fail-safe，非 dev 默认值上线）。"""
    import importlib
    import os

    from django.conf import settings

    assert not settings.DEBUG  # 前置：测试环境非 production
    saved = {
        k: os.environ.get(k) for k in ("DJANGO_ENV", "DJANGO_SECRET_KEY", "DJANGO_ALLOWED_HOSTS")
    }
    os.environ["DJANGO_ENV"] = "production"
    for k in ("DJANGO_SECRET_KEY", "DJANGO_ALLOWED_HOSTS"):
        os.environ.pop(k, None)
    try:
        with pytest.raises(RuntimeError, match="production 启动被拒绝"):
            importlib.reload(__import__("config.settings", fromlist=["settings"]))
    finally:
        for k, v in saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        importlib.reload(__import__("config.settings", fromlist=["settings"]))


def test_production_allows_with_full_env():
    import importlib
    import os

    saved = {
        k: os.environ.get(k) for k in ("DJANGO_ENV", "DJANGO_SECRET_KEY", "DJANGO_ALLOWED_HOSTS")
    }
    os.environ["DJANGO_ENV"] = "production"
    os.environ["DJANGO_SECRET_KEY"] = "real-key"
    os.environ["DJANGO_ALLOWED_HOSTS"] = "shop.example.ru, api.example.ru"
    try:
        mod = importlib.reload(__import__("config.settings", fromlist=["settings"]))
        assert mod.DEBUG is False
        assert mod.ALLOWED_HOSTS == ["shop.example.ru", "api.example.ru"]
    finally:
        for k, v in saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        importlib.reload(__import__("config.settings", fromlist=["settings"]))


# ---------- R2 错误码化：买家侧无中文直出、error_code 齐备 ----------


@pytest.fixture
def listed_product():
    brand = Brand.objects.create(
        brand_code="BRR",
        brand_name="博世",
        brand_name_en="BOSCH",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )
    spu = SPU.objects.create(
        spu_code="P0R0001",
        spu_name="滤清器R",
        brand_id=brand,
        product_type="part",
        oe_number="T55-666666",
        spu_status="active",
    )
    product = create_product_from_catalog(
        catalog_spu_id=spu.spu_id,
        title_ru="Фильтр",
        price_amount=700.00,
    )
    product.is_listed = True
    product.save(update_fields=["is_listed"])
    record_inventory(product, tx_type=InventoryTransaction.TxType.INBOUND, quantity=3)
    return product


def test_errors_carry_error_code_not_chinese(listed_product):
    """评审 F5 收尾：买家侧错误响应=HTTP code + error_code（+俄语兜底），无中文。"""
    api = APIClient()

    # 用户名冲突（409 + USERNAME_TAKEN）
    api.post(
        "/storefront/v1/auth/register",
        {"username": "dupu", "password": "Str0ngPass!", "buyer_type": "individual"},
        format="json",
    )
    r = api.post(
        "/storefront/v1/auth/register",
        {"username": "dupu", "password": "Str0ngPass!", "buyer_type": "individual"},
        format="json",
    )
    assert r.status_code == 409
    assert r.json()["error"]["error_code"] == "USERNAME_TAKEN"
    assert "已存在" not in r.content.decode()

    # 未登录加购：DRF 认证层 401（detail 包络，SimpleJWT WWW-Authenticate）
    r = api.post(
        "/storefront/v1/cart/add",
        {"product_id": str(listed_product.product_id), "quantity": 1},
        format="json",
    )
    assert r.status_code == 401

    # 未知商品（404 + NOT_FOUND，俄语兜底）
    r = api.get("/storefront/v1/store/products/00000000-0000-0000-0000-000000000000")
    body = r.json()["error"]
    assert body["error_code"] == "NOT_FOUND"
    assert body["message_ru"] == "Товар не найден"


def test_order_error_carries_code(listed_product):
    """OrderError 错误码贯通：加购 2 件下单成功后，库存 1 再购 5 → OUT_OF_STOCK。"""
    api = APIClient()
    api.post(
        "/storefront/v1/auth/register",
        {"username": "codebuyer", "password": "Str0ngPass!", "buyer_type": "individual"},
        format="json",
    )
    token = User_token("codebuyer")
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    api.post(
        "/storefront/v1/cart/add",
        {"product_id": str(listed_product.product_id), "quantity": 2},
        format="json",
    )
    r = api.post(
        "/storefront/v1/checkout",
        {"shipping_address": "Москва", "payment_method": "bank_transfer"},
        format="json",
    )
    assert r.status_code == 201

    api2 = APIClient()
    api2.post(
        "/storefront/v1/auth/register",
        {"username": "codebuyer2", "password": "Str0ngPass!", "buyer_type": "individual"},
        format="json",
    )
    api2.credentials(HTTP_AUTHORIZATION=f"Bearer {User_token('codebuyer2')}")
    # 加购时点即拦（cart_add 库存检查）——优于下单才报
    r2 = api2.post(
        "/storefront/v1/cart/add",
        {"product_id": str(listed_product.product_id), "quantity": 5},
        format="json",
    )
    assert r2.status_code == 409
    assert r2.json()["error"]["error_code"] == "OUT_OF_STOCK"


def User_token(username: str) -> str:
    from rest_framework_simplejwt.tokens import RefreshToken

    return str(RefreshToken.for_user(User_obj(username)).access_token)


def User_obj(username: str):
    from django.contrib.auth.models import User

    return User.objects.get(username=username)


def test_catalog_spu_id_unique(catalog_spu_factory):
    """评审二节：一个目录件=一个可售商品（唯一约束）。"""
    spu = catalog_spu_factory()
    create_product_from_catalog(catalog_spu_id=spu.spu_id, title_ru="A", price_amount=1)
    from django.db import IntegrityError

    with pytest.raises(IntegrityError):
        create_product_from_catalog(catalog_spu_id=spu.spu_id, title_ru="B", price_amount=2)


@pytest.fixture
def catalog_spu_factory():
    from itertools import count

    counter = count(1)
    brand = Brand.objects.create(
        brand_code="BRU",
        brand_name="唯一测试",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )

    def _make():
        n = next(counter)
        return SPU.objects.create(
            spu_code=f"P0U{n:04d}",
            spu_name=f"件{n}",
            brand_id=brand,
            product_type="part",
            oe_number=f"T{n:08d}",
            spu_status="active",
        )

    return _make

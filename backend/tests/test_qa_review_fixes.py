"""评审报告（2026-10-27）修复守卫：P1 JWT 寿命/refresh、P2 负价+verified 门控、
P3 未生效价展示。每条对应报告发现，防回归。
"""

from decimal import Decimal

import pytest
from django.conf import settings
from django.contrib.auth.models import Group, User
from django.core.management import call_command
from django.db import IntegrityError
from rest_framework.test import APIClient

from commerce.models_product import Product
from tests.test_catalog_api import seed_data  # noqa: F401（混合 verified 行的现成素材）
from tests.test_storefront import listed_product  # noqa: F401

pytestmark = pytest.mark.django_db


# ---------- P1：JWT 会话寿命 + 买家端 refresh ----------


def test_jwt_lifetime_configured():
    """SimpleJWT 默认 access 5 分钟（评审 P1：长操作中途掉线）→ 显式 60min/7d。"""
    assert settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds() == 3600
    assert settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].days == 7


def test_storefront_refresh_endpoint():
    """买家端 refresh 可达（/storefront/v1/auth/token/refresh）并签发新 access。"""
    api = APIClient()
    api.post(
        "/storefront/v1/auth/register",
        {"username": "refr_buyer", "password": "Str0ngPass!", "buyer_type": "individual"},
        format="json",
    )
    login = api.post(
        "/storefront/v1/auth/login",
        {"username": "refr_buyer", "password": "Str0ngPass!"},
        format="json",
    )
    refresh = login.json()["data"]["refresh"]
    r = api.post("/storefront/v1/auth/token/refresh", {"refresh": refresh}, format="json")
    assert r.status_code == 200
    assert r.json()["access"]


# ---------- P2：负价（serializer + CheckConstraint 双防线） ----------


def _staff_api() -> APIClient:
    call_command("init_rbac")
    u = User.objects.create_user(username="qa_staff", password="x")
    u.groups.add(Group.objects.get(name="staff"))
    api = APIClient()
    from rest_framework_simplejwt.tokens import RefreshToken

    api.credentials(HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(u).access_token)}")
    return api


def test_negative_price_rejected_by_api(listed_product):  # noqa: F811
    """API 层：min_value 拒绝（此前负价可上架成交）。"""
    p = listed_product
    r = _staff_api().patch(
        f"/api/v1/products/{p.product_id}/", {"price_amount": "-100.00"}, format="json"
    )
    assert r.status_code == 400


def test_negative_price_blocked_at_orm():
    """ORM 直写绕过 API 也被 CheckConstraint 拒（最后防线）。"""
    from catalog.models import Brand
    from catalog.models_product import SPU

    brand = Brand.objects.create(
        brand_code="BRQ1",
        brand_name="x",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )
    spu = SPU.objects.create(
        spu_code="P0Q9001",
        spu_name="x",
        brand_id=brand,
        product_type="part",
        oe_number="T99-999999",
        spu_status="active",
    )
    with pytest.raises(IntegrityError):
        Product.objects.create(
            product_code="P0Q9001",
            catalog_spu_id=spu.spu_id,
            title_ru="x",
            price_amount=Decimal("-1.00"),
            price_expires_at="2099-01-01T00:00:00Z",
        )


# ---------- P2：I2 verified 门控语义（混合行 SPU 不得整体隐藏） ----------


def test_picker_keeps_spu_with_mixed_verified_rows(seed_data):  # noqa: F811
    """SPU 同车型既有 verified 又有 unverified 行 → 仍应可见（按当前车型判）。

    回归：exclude(unverified) 行级排除曾把这类 SPU 整体隐藏（评审 P2 2026-10-27）。
    """
    d = seed_data
    resp = _staff_api().get(f"/catalog/v1/picker/candidates?model_id={d['model'].model_id}")
    assert resp.status_code == 200
    ids = [r["spu_id"] for r in resp.json()["data"]]
    assert str(d["spu"].spu_id) in ids


# ---------- P3：未生效价不展示 ----------


def test_unstarted_price_hidden_from_buyer(listed_product):  # noqa: F811
    """price_starts_at 在未来 → 买家端 offer.price 为 None（展示与成交口径一致）。"""
    p = listed_product
    from django.utils import timezone

    p.price_starts_at = timezone.now() + timezone.timedelta(days=1)
    p.save(update_fields=["price_starts_at"])
    api = APIClient()
    api.post(
        "/storefront/v1/auth/register",
        {"username": "unstr_buyer", "password": "Str0ngPass!", "buyer_type": "individual"},
        format="json",
    )
    from rest_framework_simplejwt.tokens import RefreshToken

    u = User.objects.get(username="unstr_buyer")
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(u).access_token)}")
    resp = api.get(f"/storefront/v1/store/products/{p.catalog_spu_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["offer"]["price"] is None

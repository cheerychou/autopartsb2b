"""S2 commerce 测试：软引用校验（I2-2）/ F-15 审核状态流 / F-12 库存记账 / RBAC 分档。"""

import uuid

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from catalog.models import Brand
from catalog.models_product import SPU
from commerce.models_customer import BuyerAccount
from commerce.models_product import InventoryItem, InventoryTransaction
from commerce.services import (
    CatalogRefError,
    approve_corporate,
    create_product_from_catalog,
    record_inventory,
    reject_corporate,
    resubmit_corporate,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def catalog_spu():
    brand = Brand.objects.create(
        brand_code="BRT2",
        brand_name="博世",
        brand_name_en="BOSCH",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )
    return SPU.objects.create(
        spu_code="P0S0001",
        spu_name="前制动摩擦片",
        brand_id=brand,
        product_type="part",
        oe_number="T99-000001",
        spu_status="active",
    )


@pytest.fixture
def staff_user():
    return User.objects.create_user(
        username="boss", password="x", is_superuser=True  # noqa: b1 —— 测试夹具
    )


# ---------- F-10 组商品（I2-2 软引用契约） ----------


def test_create_product_validates_catalog_ref(catalog_spu):
    """软引用校验：目录件存在 → 建品成功；不存在 → CatalogRefError（视图层 410）。"""
    p = create_product_from_catalog(
        catalog_spu_id=catalog_spu.spu_id,
        title_ru="Тормозные колодки передние",
        price_amount=1850.00,
        catalog_version="test-s1",
    )
    assert p.product_code.startswith("P")
    assert p.catalog_spu_id == catalog_spu.spu_id
    assert p.price_expires_at > p.price_starts_at  # 30 天限时价

    with pytest.raises(CatalogRefError):
        create_product_from_catalog(catalog_spu_id=uuid.uuid4(), title_ru="x", price_amount=1)


def test_product_catalog_ref_is_soft(client, catalog_spu, staff_user, settings):
    """域边界：删除目录 SPU 后商品仍独立存活（软引用不级联）。"""
    p = create_product_from_catalog(
        catalog_spu_id=catalog_spu.spu_id,
        title_ru="Колодки",
        price_amount=100,
    )
    spu = SPU.objects.get(spu_id=catalog_spu.spu_id)
    spu.delete()  # catalog 侧变动不级联 commerce
    p.refresh_from_db()
    assert p.title_ru == "Колодки"


# ---------- F-12 库存记账 ----------


@pytest.mark.django_db
def test_inventory_transactions_and_negative_guard(catalog_spu):
    p = create_product_from_catalog(catalog_spu_id=catalog_spu.spu_id, title_ru="x", price_amount=1)
    record_inventory(p, tx_type=InventoryTransaction.TxType.INBOUND, quantity=10)
    record_inventory(p, tx_type=InventoryTransaction.TxType.OUTBOUND, quantity=-3)
    assert InventoryItem.objects.get(product=p).quantity_available == 7
    assert InventoryTransaction.objects.filter(product=p).count() == 2

    with pytest.raises(ValueError):  # 超卖防护
        record_inventory(p, tx_type=InventoryTransaction.TxType.OUTBOUND, quantity=-100)
    # 失败不留残账（事务回滚）
    assert InventoryItem.objects.get(product=p).quantity_available == 7
    assert InventoryTransaction.objects.filter(product=p).count() == 2


# ---------- F-15 企业审核状态流 ----------


def _corporate(username="corp1"):
    u = User.objects.create_user(username=username, password="x")
    return BuyerAccount.objects.create(
        user=u,
        buyer_type=BuyerAccount.BuyerType.CORPORATE,
        company_name_ru="ООО Автозапчасть",
        inn="7701234567",
    )


@pytest.mark.django_db
def test_corporate_verification_flow(staff_user):
    """31号§五：注册→待审核→通过/驳回→重新提审；驳回态不可下单。"""
    acc = _corporate()
    assert acc.verification_status == BuyerAccount.VerificationStatus.PENDING
    assert not acc.can_order  # 待审核不可下单

    approve_corporate(acc, by=staff_user, note="ИНН проверен")
    acc.refresh_from_db()
    assert acc.can_order and acc.verified_by == staff_user

    reject_corporate(acc, by=staff_user, note="材料过期")
    acc.refresh_from_db()
    assert not acc.can_order

    resubmit_corporate(acc)  # 驳回后重新提审 → pending
    acc.refresh_from_db()
    assert acc.verification_status == BuyerAccount.VerificationStatus.PENDING

    with pytest.raises(ValueError):  # 非驳回态不可重复提审
        resubmit_corporate(acc)


@pytest.mark.django_db
def test_individual_skips_verification():
    u = User.objects.create_user(username="ind1", password="x")
    acc = BuyerAccount.objects.create(user=u, buyer_type=BuyerAccount.BuyerType.INDIVIDUAL)
    assert acc.verification_status == BuyerAccount.VerificationStatus.APPROVED  # 注册即用
    assert acc.can_order


# ---------- RBAC 分档（管理端接口不匿名；service 层门控正确性） ----------


@pytest.mark.django_db
def test_admin_endpoints_reject_anonymous(catalog_spu):
    """管理端接口走全局 RBAC 默认链：匿名 403（区别于 catalog I1 匿名放行）。"""
    anon = APIClient()
    assert anon.get("/api/v1/products/").status_code == 403
    assert anon.post("/api/v1/products/", {}, format="json").status_code == 403
    assert anon.get("/api/v1/buyer-accounts/").status_code == 403


@pytest.mark.django_db
def test_product_create_via_api_with_rbac(catalog_spu, staff_user):
    api = APIClient()
    api.force_authenticate(staff_user)
    resp = api.post(
        "/api/v1/products/",
        {
            "catalog_spu_id": str(catalog_spu.spu_id),
            "title_ru": "Тормозные колодки",
            "price_amount": "1850.00",
        },
        format="json",
    )
    assert resp.status_code == 201
    assert resp.json()["product_code"].startswith("P")
    assert resp.json()["catalog_version_at_listing"]  # 回填时点包版本已记录

    # 目录件不存在的 410 语义（29号 I2-2）
    resp2 = api.post(
        "/api/v1/products/",
        {"catalog_spu_id": str(uuid.uuid4()), "title_ru": "x", "price_amount": "1"},
        format="json",
    )
    assert resp2.status_code == 410


@pytest.mark.django_db
def test_corporate_approve_via_api(catalog_spu, staff_user):
    api = APIClient()
    api.force_authenticate(staff_user)
    acc = _corporate("corp2")
    resp = api.post(f"/api/v1/buyer-accounts/{acc.id}/approve/", {"note": "ok"}, format="json")
    assert resp.status_code == 200
    assert resp.json()["can_order"] is True

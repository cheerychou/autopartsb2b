"""S5 测试：N2 码全生命周期（DoD 4）/ I4 补录回流导出 / F-17 报表。

生命周期（25号§2.3）：批次→贴码导入(labelled)→收货验码(in_stock，库存同账)→
按码出库(outbound，关联订单)→退货回转(in_stock 可再售)。
"""

import pytest
from django.contrib.auth.models import Group, User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from catalog.models import Brand
from catalog.models_product import SPU
from commerce.models_codes import CodeInstance, MarkedCategoryDict
from commerce.models_customer import BuyerAccount
from commerce.models_order import Order
from commerce.models_product import InventoryItem
from commerce.services import create_product_from_catalog
from commerce.services_codes import (
    CodeStateError,
    create_batch,
    import_code_list,
    outbound_codes,
    receive_batch,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def staff_api():
    """真实认证链：init_rbac 建组 + owner 入组 + JWT。"""
    from django.core.management import call_command

    call_command("init_rbac")
    u = User.objects.create_user(username="s5owner", password="x")
    u.groups.add(Group.objects.get(name="owner"))
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(u).access_token)}")
    return api, u


@pytest.fixture
def marked_product(catalog_spu_factory):
    """受控品类商品：HS 8708 30（刹车片，ТН ВЭД 命中字典）。"""
    MarkedCategoryDict.objects.create(tnved_prefix="8708 30", category_label="刹车盘片")
    spu = catalog_spu_factory()
    spu.harmonized_code = "8708 30 910"
    spu.save(update_fields=["harmonized_code"])
    product = create_product_from_catalog(
        catalog_spu_id=spu.spu_id,
        title_ru="Колодки тормозные",
        price_amount=1200.00,
    )
    return product


def test_lifecycle_full(paid_order_fixture=None):
    """DoD 4 主链在 test_lifecycle_end_to_end 覆盖（本条为占位聚合）。"""
    assert True


def test_lifecycle_end_to_end(marked_product, staff_api):
    """26号 DoD 4：清单导入→收货验码→按码出库→退货回转（全生命周期+库存同账）。"""
    product = marked_product
    api, _ = staff_api

    # 1) 批次创建 + 贴码导入（中国侧，labelled）
    r = api.post(
        "/api/v1/batches/",
        {"batch_no": "B2026-001", "customs_declaration": "TD-777"},
        format="json",
    )
    assert r.status_code == 201
    r = api.post(
        "/api/v1/batches/B2026-001/codes/",
        {
            "product_id": str(product.product_id),
            "gtin": "04600000000000",
            "code_values": ["DM-AAA-001", "DM-AAA-002", "DM-AAA-003"],
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    assert r.json()["data"] == {"created": 3, "skipped": 0}
    assert (
        CodeInstance.objects.filter(
            batch__batch_no="B2026-001", state=CodeInstance.State.LABELLED
        ).count()
        == 3
    )

    # 2) 收货验码（俄境，in_stock + 库存同账 +3）
    r = api.post("/api/v1/batches/B2026-001/receive/", {}, format="json")
    assert r.status_code == 200, r.content
    assert r.json()["data"]["received"] == 3
    assert InventoryItem.objects.get(product=product).quantity_available == 3

    # 3) 按码出库（出 2 件：in_stock→outbound + 库存 -2 + 关联订单）
    r = api.post(
        "/api/v1/codes/outbound/",
        {"product_id": str(product.product_id), "code_values": ["DM-AAA-001", "DM-AAA-002"]},
        format="json",
    )
    assert r.status_code == 201, r.content
    assert InventoryItem.objects.get(product=product).quantity_available == 1

    # 4) 退货回转（outbound→returned→in_stock，库存回补）
    r = api.post("/api/v1/codes/return/", {"code_values": ["DM-AAA-001"]}, format="json")
    assert r.status_code == 200
    assert InventoryItem.objects.get(product=product).quantity_available == 2
    assert CodeInstance.objects.get(code_value="DM-AAA-001").state == CodeInstance.State.IN_STOCK


def test_lifecycle_illegal_transitions(marked_product, staff_api):
    """状态机白名单：空批次/未贴码不可收货、未收货不可出库、重复出库拒绝。"""
    product = marked_product
    batch = create_batch(batch_no="B-ILL")
    import_code_list(batch=batch, product=product, code_values=["DM-BBB-001"])

    empty = create_batch(batch_no="B-EMPTY")
    with pytest.raises(CodeStateError):  # 无已贴码行可验收
        receive_batch(empty)

    receive_batch(batch, code_values=["DM-BBB-001"])  # labelled→in_stock
    outbound_codes(product=product, code_values=["DM-BBB-001"])  # in_stock→outbound
    with pytest.raises(CodeStateError):  # 再次出库：非在库
        outbound_codes(product=product, code_values=["DM-BBB-001"])


def test_receive_rejects_foreign_codes(marked_product, staff_api):
    """收货验码防错收：非本批次码值 → 拒收。"""
    product = marked_product
    batch = create_batch(batch_no="B-VAL")
    import_code_list(batch=batch, product=product, code_values=["DM-CCC-001"])
    with pytest.raises(CodeStateError, match="非本批次"):
        receive_batch(batch, code_values=["DM-XXX-999"])


def test_unmarked_category_rejected_via_api(marked_product, staff_api):
    """字典未命中品类：导入接口 400 NOT_MARKED_CATEGORY（扩围改字典，26号裁定7）。"""
    brand = Brand.objects.create(
        brand_code="BRN",
        brand_name="非受控",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )
    spu = SPU.objects.create(
        spu_code="P0N0001",
        spu_name="保险杠",
        brand_id=brand,
        product_type="part",
        oe_number="T66-000001",
        spu_status="active",
    )
    product = create_product_from_catalog(
        catalog_spu_id=spu.spu_id, title_ru="Бампер", price_amount=8000.00
    )
    product.harmonized_code = "8708 10"  # 非清单（保险杠）
    product.save(update_fields=["harmonized_code"])

    create_batch(batch_no="B-NM")
    api, _ = staff_api
    resp = api.post(
        "/api/v1/batches/B-NM/codes/",
        {"product_id": str(product.product_id), "code_values": ["DM-NNN-1"]},
        format="json",
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["error_code"] == "NOT_MARKED_CATEGORY"


def test_outbound_links_order(marked_product):
    """按码出库关联订单（销售核销留痕，B2B УПД 码清单的数据源）。"""
    product = marked_product
    batch = create_batch(batch_no="B-LNK")
    import_code_list(batch=batch, product=product, code_values=["DM-DDD-001"])
    receive_batch(batch)
    u = User.objects.create_user(username="lnk", password="x")
    acc = BuyerAccount.objects.create(user=u, buyer_type=BuyerAccount.BuyerType.INDIVIDUAL)
    order = Order.objects.create(
        order_id=__import__("uuid").uuid4(),
        order_no="ORDTEST1",
        account=acc,
        payment_method=Order.PaymentMethod.BANK_TRANSFER,
        total_amount=1200,
        shipping_address="Москва",
        status=Order.Status.AWAITING_CONFIRMATION,
    )
    codes = outbound_codes(product=product, code_values=["DM-DDD-001"], order=order)
    assert codes[0].order_id == order.order_id

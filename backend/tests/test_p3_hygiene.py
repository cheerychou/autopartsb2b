"""P3 卫生清理回归测试（2026-10-26 批次）：

- 认证入口匿名限流（register/login/token，AuthRateThrottle）
- ship_order 行锁 + 状态机（与 confirm_payment 同防线）
- receive_batch 部分验收不再整批 in_stock
- outbound 无效 order_id 显式 404（不再静默降级）
- approve_corporate 状态前置（重复审批 400）
- fitments 分页参数防御（非数字 400 而非 500）
- login/register meta 反映登录后形态（原 meta 时序错/死调用）
"""

import uuid

import pytest
from django.contrib.auth.models import Group, User
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from commerce.models_customer import BuyerAccount
from commerce.models_order import Order
from commerce.services_codes import create_batch, import_code_list, receive_batch

pytestmark = pytest.mark.django_db


@pytest.fixture
def marked_product(catalog_spu_factory):
    """受控品类商品（承 test_codes 同名 fixture：HS 8708 30 命中字典）。"""
    from commerce.models_codes import MarkedCategoryDict
    from commerce.services import create_product_from_catalog

    MarkedCategoryDict.objects.create(tnved_prefix="8708 30", category_label="刹车盘片")
    spu = catalog_spu_factory()
    spu.harmonized_code = "8708 30 910"
    spu.save(update_fields=["harmonized_code"])
    return create_product_from_catalog(
        catalog_spu_id=spu.spu_id,
        title_ru="Колодки тормозные",
        price_amount=1200.00,
    )


@pytest.fixture
def staff_api():
    """真实认证链：init_rbac 建组 + owner 入组 + JWT（承 test_codes 模式）。"""
    from django.core.management import call_command

    call_command("init_rbac")
    u = User.objects.create_user(username="p3owner", password="x")
    u.groups.add(Group.objects.get(name="owner"))
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(u).access_token)}")
    return api, u


def _register(api, username, buyer_type="individual", **extra):
    return api.post(
        "/storefront/v1/auth/register",
        {"username": username, "password": "Str0ngPass!", "buyer_type": buyer_type, **extra},
        format="json",
    )


def test_auth_throttle_429_on_register():
    """P3：认证入口匿名限流——低速率下第 3 次注册 429。

    用 mock.patch 直改类快照 THROTTLE_RATES（禁 override_settings(REST_FRAMEWORK)——
    会毒化 import 期类快照，见 conftest 顶部说明）。
    """
    from unittest import mock

    from shared.permissions import AuthRateThrottle

    cache.clear()
    with mock.patch.object(AuthRateThrottle, "THROTTLE_RATES", {"auth": "2/min"}):
        api = APIClient()
        codes = [_register(api, f"thr_{i}").status_code for i in range(3)]
        assert codes[:2] == [201, 201]
        assert codes[2] == 429  # 超速 → 限流，而非放行


def test_login_meta_reflects_buyer():
    """P3（meta 时序）：login/register 的 meta 反映登录/注册后形态（原恒 guest+死调用）。"""
    api = APIClient()
    r = _register(api, "meta_user")
    assert r.json()["meta"]["buyer_kind"] == "individual"
    r2 = api.post(
        "/storefront/v1/auth/login",
        {"username": "meta_user", "password": "Str0ngPass!"},
        format="json",
    )
    body = r2.json()
    assert body["data"]["buyer_kind"] == "individual"
    assert body["meta"]["buyer_kind"] == "individual"  # 修复点：原 meta 恒 guest
    assert body["meta"]["can_see_price"] is True


def _make_corporate(username: str) -> BuyerAccount:
    u = User.objects.create_user(username=username, password="x")
    return BuyerAccount.objects.create(
        user=u, buyer_type=BuyerAccount.BuyerType.CORPORATE, inn="7701234567"
    )


def test_approve_corporate_rejects_double_approve(staff_api):
    """P3（状态前置）：已 approved 再审批 → 400（原静默覆盖审核意见）。"""
    api, _ = staff_api
    acc = _make_corporate("dbl_corp")
    r1 = api.post(f"/api/v1/buyer-accounts/{acc.id}/approve/", {"note": "first"}, format="json")
    assert r1.status_code == 200
    r2 = api.post(f"/api/v1/buyer-accounts/{acc.id}/approve/", {"note": "second"}, format="json")
    assert r2.status_code == 400
    acc.refresh_from_db()
    assert acc.verification_note == "first"  # 首次意见未被覆盖


def _order(account: BuyerAccount, *, status: str) -> Order:
    return Order.objects.create(
        order_id=uuid.uuid4(),
        order_no=f"ORDP3{status[:4].upper()}",
        account=account,
        payment_method=Order.PaymentMethod.BANK_TRANSFER,
        shipping_address="Москва",
        total_amount=100,
        status=status,
    )


def test_ship_order_awaiting_rejected_then_paid_ships_once():
    """P3（行锁）：ship_order 行锁重读——仅 paid 可发货，发货后重复发货拒绝。"""
    from commerce.services_fulfillment import OrderStateError, ship_order

    u = User.objects.create_user(username="ship_buyer", password="x")
    acc = BuyerAccount.objects.create(user=u, buyer_type=BuyerAccount.BuyerType.INDIVIDUAL)
    awaiting = _order(acc, status=Order.Status.AWAITING_CONFIRMATION)
    with pytest.raises(OrderStateError):
        ship_order(awaiting, tracking_no="CDEK-1")

    paid = _order(acc, status=Order.Status.PAID)
    shipped = ship_order(paid, tracking_no="CDEK-2", carrier="CDEK")
    assert shipped.status == Order.Status.SHIPPED
    with pytest.raises(OrderStateError):  # 重复发货：状态机+行锁双防
        ship_order(shipped, tracking_no="CDEK-2b")


def test_receive_batch_partial_keeps_batch_labeled(marked_product):
    """P3（部分验收语义）：部分验码后批次保持 labeled，收完才 in_stock。"""
    from commerce.models_codes import CodeInstance, ImportBatch

    product = marked_product
    batch = create_batch(batch_no="B-P3-PART")
    import_code_list(batch=batch, product=product, code_values=["DM-P3-001", "DM-P3-002"])
    receive_batch(batch, code_values=["DM-P3-001"])
    batch.refresh_from_db()
    assert batch.status == ImportBatch.Status.LABELED  # 修复点：原恒 in_stock
    assert CodeInstance.objects.get(code_value="DM-P3-002").state == CodeInstance.State.LABELLED
    receive_batch(batch, code_values=["DM-P3-002"])
    batch.refresh_from_db()
    assert batch.status == ImportBatch.Status.IN_STOCK


def test_outbound_invalid_order_404(marked_product, staff_api):
    """P3：无效 order_id → 404（原静默降级为无订单出库）。"""
    product = marked_product
    api, _ = staff_api
    batch = create_batch(batch_no="B-P3-OUT")
    import_code_list(batch=batch, product=product, code_values=["DM-P3-101"])
    receive_batch(batch)
    r = api.post(
        "/api/v1/codes/outbound/",
        {
            "product_id": str(product.product_id),
            "code_values": ["DM-P3-101"],
            "order_id": str(uuid.uuid4()),  # 不存在的订单
        },
        format="json",
    )
    assert r.status_code == 404


def test_fitments_bad_pagination_400():
    """P3（分页防御）：page/page_size 非数字/非正数 → 400 BAD_PAGINATION（原 500）。"""
    api = APIClient()
    model_id = uuid.uuid4()  # 不存在的车型即可：分页校验先于业务查询
    for q in ("page=abc", "page=0", "page_size=-3", "page_size=abc"):
        r = api.get(f"/catalog/v1/fitments?model_id={model_id}&{q}")
        assert r.status_code == 400, q
        assert r.json()["error"]["error_code"] == "BAD_PAGINATION"

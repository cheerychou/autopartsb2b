"""F-14 收单流水端点（ENG-003 缺口①）：payments 权限码 + 派生视图守卫。

流水=已核销订单派生（v1 无独立支付流水表）；重点验证权限矩阵
（finance/owner 可读、staff 不可——ENG-003 缺口⑦b 拍板维持）与金额/过滤正确性。
"""

from decimal import Decimal

import pytest
from django.contrib.auth.models import Group, User
from rest_framework.test import APIClient

from commerce.models_order import Order
from commerce.services_fulfillment import confirm_payment
from tests.test_fulfillment import paid_order  # noqa: F401（复用真实链路夹具）

pytestmark = pytest.mark.django_db


def api_with_role(role: str) -> APIClient:
    from django.core.management import call_command
    from rest_framework_simplejwt.tokens import RefreshToken

    call_command("init_rbac")
    u = User.objects.create_user(username=f"u_{role}", password="x")
    u.groups.add(Group.objects.get(name=role))
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(u).access_token)}")
    return api


def test_anonymous_and_staff_denied():
    """权限矩阵：匿名 401；staff 无 payments:read → 403（ENG-003 矩阵口径）。"""
    assert APIClient().get("/api/v1/payments/").status_code == 401
    assert api_with_role("staff").get("/api/v1/payments/").status_code == 403


def test_unconfirmed_order_not_listed(paid_order):  # noqa: F811
    """未核销（awaiting_confirmation）不进流水——流水=核销动作记录。"""
    r = api_with_role("finance").get("/api/v1/payments/")
    assert r.status_code == 200
    assert r.json()["data"] == {"rows": [], "count": 0, "total_amount": "0.00"}


def test_finance_reads_flow_row(paid_order):  # noqa: F811
    """finance 可读；行字段=核销留痕（金额恒等于订单总额）。"""
    o = paid_order["order"]
    boss = paid_order["boss"]
    confirm_payment(o, confirmed_by=boss, amount=o.total_amount, note="对账单#77")
    r = api_with_role("finance").get("/api/v1/payments/")
    assert r.status_code == 200
    d = r.json()["data"]
    assert d["count"] == 1 and d["total_amount"] == str(o.total_amount)
    row = d["rows"][0]
    assert row["order_no"] == o.order_no
    assert row["amount"] == str(o.total_amount)
    assert row["buyer"] == "buyer_s4"
    assert row["confirmed_by"] == "boss4"
    assert row["note"] == "对账单#77"
    assert row["payment_method"] == "bank_transfer"
    assert row["order_status"] == Order.Status.PAID


def test_owner_allowed_and_date_filter(paid_order):  # noqa: F811
    """owner 可读；date_from/date_to 按核销日过滤 + 合计只算区间内。"""
    o = paid_order["order"]
    # 服务层 select_for_update 重取——必须接返回值（P1-2 同型：旧对象核销时间恒 None）
    o = confirm_payment(o, confirmed_by=paid_order["boss"], amount=o.total_amount)
    api = api_with_role("owner")
    assert api.get("/api/v1/payments/").status_code == 200
    # 起点在未来 → 空；终点在过去 → 空；今天 → 恰 1 行
    assert api.get("/api/v1/payments/?date_from=2099-01-01").json()["data"]["count"] == 0
    assert api.get("/api/v1/payments/?date_to=2020-01-01").json()["data"]["count"] == 0
    today = o.payment_confirmed_at.date().isoformat()
    r = api.get(f"/api/v1/payments/?date_from={today}&date_to={today}")
    d = r.json()["data"]
    assert d["count"] == 1 and Decimal(d["total_amount"]) == o.total_amount


def test_bad_date_param_rejected(paid_order):  # noqa: F811
    assert api_with_role("finance").get("/api/v1/payments/?date_from=2027/01/01").status_code == 400

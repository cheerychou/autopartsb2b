"""函数视图权限执行回归（P0 修复守卫，2026-10-26）。

背景：DRF api_view 只拷贝固定五属性，@require_permission 写在函数上的
ACTION_PERMISSIONS 从未到达视图——函数视图此前仅有认证门槛（401），
角色码判定形同虚设（staff 可核销到账/看报表/操作码批次）。修复=权限码
烧进 permission 子类（b1_required_code）。本文件锁死「staff 应 403」语义，
防再次静默退化（此前无任何角色 403 断言，缺口存活至payments 开发期才暴露）。
"""

import pytest
from django.contrib.auth.models import Group, User
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def api_with_role(role: str, name: str = "") -> APIClient:
    from django.core.management import call_command
    from rest_framework_simplejwt.tokens import RefreshToken

    call_command("init_rbac")
    u = User.objects.create_user(username=name or f"u_{role}", password="x")
    if role:
        u.groups.add(Group.objects.get(name=role))
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(u).access_token)}")
    return api


STAFF_FORBIDDEN = [
    ("GET", "/api/v1/payments/", "payments:read"),
    ("GET", "/api/v1/reports/sales/", "reports:read"),
    ("GET", "/api/v1/reports/slow-movers/", "reports:read"),
    ("GET", "/api/v1/reports/catalog-coverage/", "reports:read"),
    ("GET", "/api/v1/reports/codes-aging/", "reports:read"),
]


@pytest.mark.parametrize(
    "method,url,_code", STAFF_FORBIDDEN, ids=[c for _, _, c in STAFF_FORBIDDEN]
)
def test_staff_forbidden_on_function_views(method, url, _code):
    """staff 无码 → 403（修复前全部 200——P0 缺口守卫）。"""
    r = api_with_role("staff").get(url)
    assert r.status_code == 403, f"{url} 应拒绝 staff（权限码 {_code}）"


def test_anonymous_401_unchanged():
    assert APIClient().get("/api/v1/reports/sales/").status_code == 401


def test_finance_still_allowed():
    """修复不误伤：finance 有 reports:read/payments:read → 200。"""
    api = api_with_role("finance")
    assert api.get("/api/v1/reports/sales/").status_code == 200
    assert api.get("/api/v1/payments/").status_code == 200


def test_owner_star_wildcard_still_allowed():
    """owner {'*'} 通配路径不受烧码改动影响。"""
    api = api_with_role("owner")
    assert api.get("/api/v1/reports/codes-aging/").status_code == 200


def test_buyer_account_cannot_reach_admin_views():
    """买家账号（无管理角色）→ 403 而非 200（has_any_admin_role 分支）。"""
    User.objects.create_user(username="plain_buyer", password="x")
    from rest_framework_simplejwt.tokens import RefreshToken

    api = APIClient()
    u = User.objects.get(username="plain_buyer")
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(u).access_token)}")
    assert api.get("/api/v1/reports/sales/").status_code == 403

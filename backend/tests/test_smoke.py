"""冒烟：项目可导入、RBAC 机制可用（S0 出口判据的最小验证）。"""

import pytest
from django.contrib.auth.models import User


def test_settings_loads():
    from django.conf import settings

    assert "catalog" in settings.INSTALLED_APPS
    assert "commerce" in settings.INSTALLED_APPS


@pytest.mark.django_db
def test_rbac_superuser_maps_to_owner():
    """S0 最小实现：superuser → owner 角色 → 通配权限。"""
    from shared.permissions import has_permission, has_role

    user = User.objects.create_user(
        username="boss",
        password="x",
        is_superuser=True,  # noqa: b1 —— 测试夹具
    )
    assert has_role(user, "owner")
    assert has_permission(user, "orders:manage")


@pytest.mark.django_db
def test_rbac_anonymous_denied():
    from django.contrib.auth.models import AnonymousUser

    from shared.permissions import has_permission

    assert not has_permission(AnonymousUser(), "catalog:read")

"""B1-RU RBAC（裁剪版）——承 CDD3 RoleBasedPermission 机制（copy-ledger 模式承袭）。

裁剪点（相对 CDD3 v2.0）：
- 角色 23→4（owner/staff/finance/data_steward，31号§五）；
- 无租户门控（SKU-B 单租户私有化）；
- 买家三形态（guest/individual/corporate）不进 RBAC，走独立买家认证（S3 接入）。

硬性约定（backend/CLAUDE.md）：
- 本类是唯一 DRF 权限类；禁止新建权限类、禁止 IsAuthenticated 裸用；
- 权限码风格 `module:action`，分档 read/write/manage。
"""

from __future__ import annotations

from rest_framework.permissions import BasePermission

# 单一角色真相源：shared/management/commands/init_rbac.py
ROLES = ("owner", "staff", "finance", "data_steward")

# 角色默认权限集（module:action；init_rbac 据此落库，运行时以库为准）
ROLE_PERMISSIONS: dict[str, set[str]] = {
    "owner": {"*"},
    "staff": {
        "catalog:read",
        "orders:read",
        "orders:write",
        "products:read",
        "products:write",
        "inventory:read",
        "inventory:write",
        "customers:read",
        "customers:write",
    },
    "finance": {
        "orders:read",
        "orders:manage",
        "payments:read",
        "payments:write",
        "payments:manage",
        "reports:read",
    },
    # 数据员：目录补录/回流 + 未验证数据可见（29号§六）
    "data_steward": {
        "catalog:read",
        "catalog:write",
        "products:read",
    },
}


class RoleBasedPermission(BasePermission):
    """声明式权限：ViewSet 声明 ACTION_PERMISSIONS，本类统一解释。

    用法（唯一标准，勿自创）：
        class OrderViewSet(ModelViewSet):
            permission_classes = [RoleBasedPermission]
            ACTION_PERMISSIONS = {"list": "orders:read", "create": "orders:write", ...}
    """

    message = "当前角色无权执行该操作。"

    def has_permission(self, request, view) -> bool:
        required = getattr(view, "ACTION_PERMISSIONS", {}).get(getattr(view, "action", None))
        if required is None:
            # 未声明权限表的 ViewSet 默认只读放行认证用户（更严由各 ViewSet 自行声明）
            return bool(request.user and request.user.is_authenticated)
        return has_permission(request.user, required)


def has_permission(user, code: str) -> bool:
    """检查用户是否拥有权限码（运行时以 RBAC 库为准，此处为最小实现 S0）。"""
    if not (user and user.is_authenticated):
        return False
    if user.is_superuser:  # noqa: b1 —— RBAC 机制内部兜底，业务代码禁止模仿（backend/CLAUDE.md）
        return True
    role_codes = _roles_of(user)
    for role in role_codes:
        perms = ROLE_PERMISSIONS.get(role, set())
        if "*" in perms or code in perms:
            return True
        # module:* 通配（如 owner 的模块级授权）
        module = code.split(":", 1)[0]
        if f"{module}:*" in perms:
            return True
    return False


def has_role(user, code: str) -> bool:
    return code in _roles_of(user)


def _roles_of(user) -> list[str]:
    """S0 最小实现：superuser=owner 兜底；角色表随 S2（F-15/客户管理）落库替换本函数。"""
    if getattr(user, "is_superuser", False):  # noqa: b1 —— 同上，机制内部
        return ["owner"]
    return []

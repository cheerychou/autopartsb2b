"""B1-RU RBAC（裁剪版）——承 CDD3 RoleBasedPermission 机制（copy-ledger 模式承袭）。

裁剪点（相对 CDD3 v2.0）：
- 角色 23→4（owner/staff/finance/data_steward，31号§五）；
- 无租户门控（SKU-B 单租户私有化）；
- 买家三形态（guest/individual/corporate）不进 RBAC，走独立买家认证（S3 接入）。

硬性约定（backend/CLAUDE.md）：
- 本类是唯一 DRF 权限类；禁止新建权限类、禁止 IsAuthenticated 裸用；
- 权限码风格 `module:action`，分档 read/write/manage。

⚠️ FAIL-CLOSED（2026-10-25 评审修复，P0-1）：本类对**未声明**权限要求的视图一律拒绝
（默认 staff 级）。任何业务端点必须显式声明：ViewSet 用 ACTION_PERMISSIONS，
函数视图用 @require_permission(code)。匿名/公开端点必须显式标记
@public_access 或 @buyer_access——"没写权限"不再是放行理由。
（漏洞史：S4 曾因 fail-open + 裸 api_view 导致买家可自助核销发货，评审 P0-1。）
"""

from __future__ import annotations

from rest_framework.permissions import BasePermission
from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """register / login / 凭证签发端点的匿名暴力破解防线（P3）。

    用固定 scope 子类而非 ScopedRateThrottle+throttle_scope：KNW-B1-EXP-001——
    api_view 只拷贝官方属性表，函数视图挂 throttle_scope 会被静默丢弃。
    速率 = REST_FRAMEWORK.DEFAULT_THROTTLE_RATES["auth"]（env: B1RU_AUTH_THROTTLE_RATE）。
    """

    scope = "auth"


# 单一角色真相源：shared/management/commands/init_rbac.py（落库为 Django Groups）
ROLES = ("owner", "staff", "finance", "data_steward")
ADMIN_ROLES = set(ROLES)

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
    """声明式权限（FAIL-CLOSED）：三档访问级，未声明 = staff 级（最严）。

    - b1_access == "public"：匿名放行（仅限明确公开端点：买家浏览/注册登录）；
    - b1_access == "buyer"：须认证；具体资格（can_order 等）由视图内部
      resolve_buyer 判定（storefront 购物车/下单等）；
    - 其余（缺省）：staff 级——须任一管理角色，并满足 ACTION_PERMISSIONS
      声明的权限码（函数视图用 @require_permission 声明）。
    """

    message = "当前账号无权执行该操作。"

    def has_permission(self, request, view) -> bool:
        # ---- fail-closed：未声明 ACTION_PERMISSIONS 的视图一律按 staff 级判 ----
        # （公开/买家端点用 DRF 原生 permission_classes([]) / [IsAuthenticated] 声明，
        #   不经过本类的 fail-closed 分支）
        if not (request.user and request.user.is_authenticated):
            return False
        if not has_any_admin_role(request.user):
            return False  # 买家/无关账号：拒绝（评审 P0-1 回归点）
        required = _required_code(view)
        if required is None:
            return True
        return has_permission(request.user, required)


def _required_code(view) -> str | None:
    table = getattr(view, "ACTION_PERMISSIONS", None) or {}
    return table.get(getattr(view, "action", None) or "__view__") or table.get("__view__")


# ---------- 函数视图声明装饰器（与 RoleBasedPermission 配套，禁止绕过） ----------


def require_permission(code: str):
    """管理端函数视图权限声明（用法：@require_permission 置于 @api_view **之下**——
    DRF 官方机制：此处设置的 ACTION_PERMISSIONS/permission_classes 会被 api_view
    拷贝进 WrappedAPIView 视图类，RoleBasedPermission 据此判定）。
    禁止裸 @api_view 声明业务端点（评审 P0-1）。"""
    from rest_framework.decorators import permission_classes as drf_permission_classes

    def deco(view):
        view.ACTION_PERMISSIONS = {"__view__": code}
        return drf_permission_classes([RoleBasedPermission])(view)

    return deco


def has_permission(user, code: str) -> bool:
    """权限码判定（角色→权限集；角色以 Django Groups 落库，init_rbac 为真相源）。"""
    if not (user and user.is_authenticated):
        return False
    if user.is_superuser:  # noqa: b1 —— RBAC 机制内部兜底，业务代码禁止模仿（backend/CLAUDE.md）
        return True
    for role in _roles_of(user):
        perms = ROLE_PERMISSIONS.get(role, set())
        if "*" in perms or code in perms:
            return True
        module = code.split(":", 1)[0]
        if f"{module}:*" in perms:
            return True
    return False


def has_any_admin_role(user) -> bool:
    if not (user and user.is_authenticated):
        return False
    if user.is_superuser:  # noqa: b1 —— 机制内部
        return True
    return bool(ADMIN_ROLES & set(_roles_of(user)))


def has_role(user, code: str) -> bool:
    return code in _roles_of(user)


def _roles_of(user) -> list[str]:
    """角色来源 = Django Groups（init_rbac 创建并分配；评审二节：RBAC 不得停留于装饰）。
    superuser 兜底 owner（部署运维账户，机制内部——业务代码禁判该字段）。"""
    if not (user and user.is_authenticated):
        return []
    if user.is_superuser:  # noqa: b1 —— 机制内部
        return ["owner"]
    names = set(user.groups.values_list("name", flat=True))
    return sorted(ADMIN_ROLES & names)

---
doc_id: KNW-B1-EXP-001
title: DRF api_view 策略属性只认官方列表——自定义装饰器属性会被静默丢弃
category: knowledge
domain: EXP
status: active
updated_at: 2026-10-25
---

# KNW-B1-EXP-001 DRF api_view 策略属性陷阱

**终态**：函数视图的自定义元数据（如 `b1_access`）经 `@xxx` 设在 raw function 上会被 `@api_view` 静默丢弃——DRF 只拷贝官方策略属性（authentication_classes/permission_classes 等）到 WrappedAPIView；且官方策略装饰器（@permission_classes 等）**必须放在 @api_view 之下**，放之上会被 DRF 顺序检查直接 TypeError。

**何时读**：给 api_view 函数视图写任何自定义装饰器/权限标记时。

**教训全文**：
1. `@api_view` 应用时只把官方策略属性从函数拷进 WrappedAPIView 类；自定义属性（`b1_access="buyer"` 之类）不在此列——设了等于没设，权限判定读到的是 None；
2. 官方策略装饰器在 @api_view **之下**（后应用、作用于 raw function）是合法的（属性被拷贝）；在**之上**会触发 DRF 的 `_check_decorator_order` TypeError；
3. 本项目解法（2026-10-25 评审 F1）：`shared/permissions.py` 的 `@require_permission(code)`——设 `ACTION_PERMISSIONS` + `permission_classes=[RoleBasedPermission]`（都在官方拷贝列表内）；公开/买家端点直接用官方 `@permission_classes([])` / `[IsAuthenticated]`；
4. 识别信号：权限判定"读到 None"却代码看着正确 → 先查装饰器相对 @api_view 的位置与属性是否在官方列表内。

**实证**：评审 P0-1 修复过程三轮装饰顺序调整（storefront 403 六连、`view.cls` AttributeError、DRF 顺序 TypeError）。

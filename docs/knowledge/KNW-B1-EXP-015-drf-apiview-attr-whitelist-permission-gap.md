---
doc_id: KNW-B1-EXP-015
title: DRF api_view 属性白名单吞掉 ACTION_PERMISSIONS——函数视图角色判定整体失效（P0）与「无 403 断言」测试盲区
category: knowledge
domain: EXP
status: active
updated_at: 2026-10-26
---

# KNW-B1-EXP-015 DRF api_view 属性白名单与「无 403 断言」盲区（P0 实证）

**终态**（2026-10-26，收单流水开发期暴露）：

1. **现象**：新增 `payment_list`（`@require_permission("payments:read")`）的
   守卫测试断言 staff 应 403——实测 **200**。对照探针证实存量端点
   `reports/sales`、`reports/slow-movers` 对 staff 同样 200：**所有
   `@require_permission` 函数视图的角色判定从未生效**，运行时仅有认证门槛
   （401 来自 RoleBasedPermission 未认证分支）。最重暴露面：
   `confirm_payment`（payments:manage）staff 可核销到账。
2. **根因**：`require_permission` 把权限码写在**函数属性**
   `view.ACTION_PERMISSIONS = {"__view__": code}` 上，依赖「api_view 会把它
   拷进 WrappedAPIView」——但 DRF `api_view` 只拷贝固定五属性
   （renderer/parser/authentication/throttle/**permission_classes**），
   `permission_classes=[RoleBasedPermission]` 生效了（所以 401 有），
   `ACTION_PERMISSIONS` 丢了 → `_required_code(view)` 返回 None →
   「未声明 = staff 级」分支实际放行**任一管理角色**。docstring 里
   「DRF 官方机制：会被 api_view 拷贝进视图类」是错误认知——只对白名单内
   属性成立。ViewSet 路径不受影响（ACTION_PERMISSIONS 是类属性，直接可读）。
3. **修法**：权限码**烧进 permission 子类**，不依赖视图属性传递——
   `require_permission` 生成 `class RequiredPermission(RoleBasedPermission):
   b1_required_code = code`，判定处 `_required_code(view) or
   getattr(self, "b1_required_code", None)`（ViewSet 类属性路径保持优先）。
   守卫：`tests/test_permission_enforcement.py` 锁死 staff-403 语义。
4. **测试盲区（比 bug 本身更教训）**：缺口存活数周、跨 5 次评审——因为
   **从没有一条「staff 打 X 端点应 403」的断言**。既有权限测试只测匿名 401
   （那来自认证门槛，怎么测都绿）；ENG-003 矩阵的「角色可用」列核对的是
   `ROLE_PERMISSIONS` **常量定义**，不是运行时行为。「常量核对」≠「链路实证」。
   **纪律**：新增权限码或端点时，守卫测试必须覆盖三种身份（匿名 401/无码
   角色 403/有码角色 200）——`test_permission_enforcement.py` 为模板。
   另：矩阵拍板（⑦b「staff 无 reports:read」）当时基于常量事实，运行时
   并不成立；修复后才与拍板意图一致——拍板前若涉权限，先跑探针再拍。

**关联**：[EXP-009](KNW-B1-EXP-009-sqlite-test-blind-spots-pg-tier.md)（同族：测试档盲区）｜[ENG-003](../engineering/B1RU-ENG-003-admin-func-role-matrix.md)（矩阵运行时假设修正）｜backend/shared/permissions.py（修复落点）

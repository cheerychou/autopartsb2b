---
doc_id: KNW-B1-EXP-002
title: 权限类 fail-open + 共用 JWT = 买家自助核销的资金级漏洞
category: knowledge
domain: EXP
status: active
updated_at: 2026-10-25
---

# KNW-B1-EXP-002 权限 fail-open 是资金级漏洞

**终态**：RoleBasedPermission 曾对未声明 ACTION_PERMISSIONS 的视图"默认放行认证用户"（fail-open），S4 三个高危端点（核销/发货/下价）又是裸 @api_view 无声明，而买家与管理端共用 SimpleJWT——合成完整攻击链：**买家分文未付即可自助核销→发货拿到货**（评审 P0-1 已实证复现）。修复=权限类改 FAIL-CLOSED（未声明一律 staff 级拒绝）+ 三端点 @require_permission + 买家 token 回归测试。

**何时读**：写/改任何权限判定、新增任何端点、或评审交易链路时。

**教训全文**：
1. **fail-closed 是权限类的唯一正确默认**。"未声明=只读放行"的注释是自我安慰——实现不区分读写，POST 照样过；
2. **共用签发体系时，"管理端接口"不设防就是对所有持 token 的人设防失效**——买家的 token 在管理端点上是合法凭证，不存在"对方不知道 URL"的安全假设；
3. **测试盲区纪律**：安全测试必须覆盖"错误身份持有合法凭证"（买家 token 打管理端），只测匿名拒绝不够——匿名没有凭证，恰恰漏掉最致命路径。本条已固化为 `tests/test_review_fixes.py` 的攻击链回归；
4. 注释自称"高危域人工必审"不构成防线——评审原话："这正是 P4 审查应该抓住的东西"，但 P4 依赖人来看，代码必须先 fail-closed。

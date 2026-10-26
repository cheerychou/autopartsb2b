---
doc_id: KNW-B1-EXP-011
title: UI 级走查三连发现——BrowserRouter 缺失整树崩/i18next 单花括号占位符/brand 回退链断，S6"完成"的边界
category: knowledge
domain: EXP
status: active
updated_at: 2026-10-26
---

# KNW-B1-EXP-011 UI 级走查：build 绿 ≠ 页面可用（storefront 三连修复）

**终态**（2026-10-26，UI 级走查批次）：S6 前端两端落地（775a622）后从未做过运行时
走查——本轮 headless Chrome + 截图图像分析一次抓出 **3 个用户可见缺陷**，全部
「build 绿 + smoke 测试绿」掩盖：

1. **storefront 整树白屏**：`App.tsx` 用 `<Routes>` 但 `main.tsx` 漏包
   `<BrowserRouter>`（admin 有、storefront 漏）——react-router 无上下文渲染抛错，
   root 空。smoke 测试只测 i18n 不 mount App → 未暴露。
2. **i18next 占位符不替换**（«В наличии: {n} шт.» 直出）：i18next 默认分隔符是
   **双花括号 `{{n}}`**，语言包写了单花括号 `{n}`（Vue 风格）——4 处
   （welcome/inStock/generic × ru/zh）。组件传参完全正确也不起作用。
3. **brand.display_name 不走回退链**：`SpuCard.get_brand` 直取 `brand_name` 源名
   （zh），entity_names 里 brand 的 ru 名（«Чери»）不生效；而 I1 brands 端点正常
   ——同实体两端点名不一致。修法：`attach_entity_names("spu", ...)` 顺带挂 brand
   （brand 已随 select_related 在内存，递归批量 1 查询防 N+1）+ `get_brand` 走
   `resolve_name(zh_field="brand_name", en_field="brand_name_en")`。

**走查方法**（无 playwright 依赖，可复跑）：
两端 `pnpm build`（TS 层）→ dev 栈（vite 代理目标 env 化 `B1RU_API_TARGET`，
宿主 8000 被占时指 8001）→ headless Chrome
`--headless --dump-dom --virtual-time-budget=10000`（dump-dom 查 root 渲染 +
关键文案；`--screenshot` + 图像分析看视觉层）→ 发现即修 → **dump-dom 复验文案**
（«В наличии: 50 шт.» / «Чери»）→ 全量回归。

**何时读**：前端页面"build 过但跑起来不对"；写 i18n 占位符前；动 SPU 卡片/brand
名展示；怀疑 S6 类「页面落地」声明的实际可用性时。

**处置纪律**：
1. 「页面落地」的完成声明必须含**运行时渲染证据**（dump-dom 或截图），build 绿
   只证明类型/语法——与 KNW-010「验收脚本必须硬断言」同族；
2. i18next 占位符一律 `{{var}}`；code review 语言包时 grep 单花括号占位；
3. 新 SPA 应用接线三件套（BrowserRouter/QueryClientProvider/I18nProvider）对齐
   既有应用清单，本例漏的就是三件套之一；
4. 同一实体在多端点的 display_name 必须同源（resolve_name）——展示名走
   entity_names 回退链是 27号定稿的契约，不是可选优化。

关联：[KNW-B1-EXP-010](KNW-B1-EXP-010-dod1-offline-verification.md)（硬断言纪律）、
[KNW-B1-EXP-007](KNW-B1-EXP-007-m1-demo-pack-drill.md)（演示数据）。

---
doc_id: KNW-B1-INDEX
title: B1-RU 经验教训册索引
category: B1RU
domain: knowledge
status: active
updated_at: 2026-10-25
---

# B1-RU 经验教训册（KNW-B1）

> 机制承 CDD3 `docs/knowledge/`（KNW 编号体系）。写码前按领域先查对应条目（根 CLAUDE.md 硬性要求）；新教训蒸馏后入册，原文/过程留在 PR 与 research 文档。

## 条目索引

| 编号 | 主题 | 何时读 |
|---|---|---|
| [KNW-B1-EXP-001](KNW-B1-EXP-001-drf-api-view-attribute-trap.md) | DRF api_view 策略属性只认官方列表，自定义装饰器属性被静默丢弃 | 给 api_view 函数视图写自定义装饰器/权限标记时 |
| [KNW-B1-EXP-002](KNW-B1-EXP-002-rbac-fail-open-fund-loss.md) | 权限 fail-open + 共用 JWT = 买家自助核销的资金级漏洞 | 写/改权限判定、新增端点、评审交易链路时 |
| [KNW-B1-EXP-003](KNW-B1-EXP-003-verification-claim-inflation.md) | 聚合式验收声明（"全过"）注水——逐条对照+勘误格式 | 写 commit/文档/汇报中"完成/验收"字样时 |
| [KNW-B1-EXP-004](KNW-B1-EXP-004-copy-django-domain-adaptation.md) | 受控拷贝 Django 模型域的接入适配三件套 | 跨项目拷贝模型域；makemigrations "No changes" 时 |
| [KNW-B1-EXP-005](KNW-B1-EXP-005-data-assertion-baseline.md) | 数据断言必须带基准日期与库别（两次被现实修正） | 写含数字的结论；引用 CDD3 库状态时 |
| [KNW-B1-EXP-006](KNW-B1-EXP-006-sprint-branch-commit-discipline.md) | 快节奏 Sprint 的分支与提交纪律 | 每个 Sprint 开工第一分钟；写 commit message 时 |

## 种子参考（CDD3 侧同域教训，本项目遇到对应任务时先去 CDD3 仓读原文）

| 场景 | CDD3 条目 |
|---|---|
| CI 计费/部署 | KNW-EXP-004 |
| 系统调试误判 | KNW-EXP-003 |
| Docker 缓存/构建 | KNW-EXP-009/012/013 |
| Token 体系变更 | KNW-EXP-017 |
| API 类型同步漂移 | KNW-EXP-010 |
| 跨境部署迭代 | KNW-EXP-006 |

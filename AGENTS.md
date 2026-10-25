# B1-RU 俄语区中国汽配商城

**任何 AI 宿主（Claude/ZCode/Trae 等）在本仓库工作前必读：[CLAUDE.md](CLAUDE.md)。**

## 本仓库是什么

B2B 汽配交易系统（B1-RU）：给"把中国汽配卖到俄罗斯"的运营者的私有化部署俄语商城。Django 单体（catalog 目录域 + commerce 交易域）+ React 两前端（俄语 storefront / 中文 admin）。

## 工作规则

- 全局约定/铁律/禁止模式：根 [CLAUDE.md](CLAUDE.md)
- 后端规则：[backend/CLAUDE.md](backend/CLAUDE.md)
- 前端规则：[frontend/CLAUDE.md](frontend/CLAUDE.md)
- 评审策略：[REVIEW.md](REVIEW.md)
- 项目技能（工作流骨架，优先于自由发挥）：`.zcode/skills/`——`b1-guardrails`（编码护栏）、`new-backend-viewset`（新建接口）、`new-frontend-page`（新建页面）、`pre-check-before-pr`（提交预检）

## 文档地图

| 想了解 | 去哪里 |
|---|---|
| 产品范围/裁定链 | `docs/research/26-B1-RU-v1产品范围说明书.md`（范围基准） |
| 数据包契约（跨境 I3/I4） | `docs/research/27-*.md`（定稿 v1.1） |
| 实例内接口契约（I1/I2） | `docs/research/29-*.md` |
| 工程方案与排期 | `docs/research/31-*.md` |
| 拷贝了 CDD3 哪些东西 | `docs/engineering/copy-ledger.md` |
| 经验教训 | `docs/knowledge/`（KNW-B1-*） |

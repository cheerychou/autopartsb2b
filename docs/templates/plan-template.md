# Plan: <变更标题>

> 本模板对应《The AI-native SDLC playbook》Stage 3 的 `plan.md`（来源 https://claude.com/blog/the-ai-native-sdlc-playbook）。
> **使用方法**：复制本文件为 `plan.md`，随 PR 提交，作为评审"对照计划审 diff"的依据（见根级 `REVIEW.md` 的"对照计划评审"）。
> 实现偏离计划时，在同一 commit 内更新本文件。非平凡改动（改多个文件 / 涉及高危域 / 有风险）必须附计划。
> 分析依据见 `docs/knowledge/KNW-EXP-024-ai-native-sdlc-playbook-analysis.md`。

## 变更目标

<!-- 一句话：要解决什么问题，达成什么结果；链接 intent.md / spec.md（若有） -->

## 影响文件

<!-- 列出将改动的文件（后端 / 前端 / 共享包），标注模块 -->
- [ ] 后端：`backend/store_services/<模块>/`
- [ ] 前端：`frontend/store-web/`
- [ ] 共享包：`frontend/packages/shared-*/ `

## 实施顺序

<!-- 分步，标注每步的依赖与验证点 -->
1. ...
2. ...

## 风险

<!-- 最可能出问题的地方 + 缓解方式（如 rate-limit、schema 漂移、订阅门控边界） -->

## 证明（测试）

<!-- 哪些测试/命令证明改动正确；给出可量化的通过标准（"应该能过"不算验证） -->
- [ ] `pytest <path> -q` 全绿
- [ ] `pnpm --filter <app> test:run` 全绿
- [ ] `make pre-check` 通过
- [ ] 页面实开预览 / 端点清单双向比对（防前后端契约静默失效，见 KNW-EXP-032）

## 偏离记录

<!-- 实现与计划不一致时记录：为何偏离、如何收敛 -->

---
doc_id: B1RU-ENG-001
title: CDD3 拷贝台账（copy-ledger）
category: B1RU
domain: ENG
status: active
updated_at: 2026-10-25
---

# CDD3 拷贝台账（copy-ledger）

> 纪律依据：22号§四受控拷贝（拷贝清单化/只加不改/schema 对齐）；拷贝基准 = **CDD3 PR #1079 合并后的 main 头**（28a Q1），每次拷贝登记 commit hash。**台账未登记的 CDD3 来源代码 = 违规。**

## 登记格式

| # | 日期 | 来源路径（CDD3） | 目标路径（本仓） | 来源 commit | 剥离/修改项 | 执行人 |
|---|---|---|---|---|---|---|

## 已执行拷贝

| # | 日期 | 来源路径（CDD3） | 目标路径（本仓） | 来源 commit | 剥离/修改项 | 执行人 |
|---|---|---|---|---|---|---|
| R-B1 | 2026-10-25 | `frontend/packages/ui-registry/`（src+public+registry.json+README+package.json） | `frontend/packages/b1-atoms/` | ⚠️ CDD3 本地仓未含 PR #1079，暂以当时 HEAD 登记（#1079 合并后 R-A1 时点统一补基准） | 包名改 `@cdd/b1-atoms`；描述改 B1-RU | AI（S0） |
| R-B2 | 2026-10-25 | `frontend/packages/shared-ui/src` + package.json | `frontend/packages/b1-shared-ui/` | 同上 | **剥离**：123 个 `*.d.ts` 编译产物、13 个 `__tests__/`（CDD3 环境绑定，S1 按需恢复）；包名改 `@cdd/b1-shared-ui`；lint/test script 移除（由消费应用跑） | AI（S0） |
| R-B2 | 2026-10-25 | `frontend/packages/shared-http/src` + package.json | `frontend/packages/b1-shared-http/` | 同上 | 包名改 `@cdd/b1-shared-http`；注释内包名同步 | AI（S0） |
| R-B2 | 2026-10-25 | `frontend/packages/eslint-config/` | `frontend/packages/eslint-config/` | 同上 | 包名改 `@cdd/b1-eslint-config`；**保留内部规则命名空间 `cdd/*`**（功能性命名，S1 接入应用时一致引用）；剥离 `.mimosa/` | AI（S0） |

## 待执行（队列，来自 30号§六）

| # | 动作 | 来源 | 前置 | 状态 |
|---|---|---|---|---|
| R-A1 | catalog 域 + 根 models.py 车型谱系（27号§5.1 勘定清单） | `backend/data_platform/` | ❓ PR #1079 合并 | 挂起 |
| R-A2 | RBAC 机制 + 认证中心 + shared 中间件（单租户裁剪） | `store_services/middleware/`、`shared/` | 无 | 待执行 |
| R-A3 | Makefile/pytest/mypy/coverage 基线/lock 机制 | `backend/` | 无 | 部分已承模式（Makefile/pre-commit 本仓重写，见下"模式承袭"） |
| R-B1 | ui-registry 全量 + 分发机制 + drift 检查 | `frontend/packages/ui-registry/`、`scripts/check-atom-drift.sh` | 无 | 待执行 |
| R-B2 | shared-ui 通用类 + shared-http + eslint-config + tokens.json | `frontend/packages/` | 无 | 待执行 |

## 模式承袭（非代码拷贝，机制/文案参考 CDD3 后重写，逐项登记以免争议）

| 日期 | 参照物（CDD3） | 本仓产物 | 说明 |
|---|---|---|---|
| 2026-10-25 | CLAUDE.md×3 / AGENTS.md / REVIEW.md | 同名文件 | 结构照抄、内容按 B1-RU 业务重写 |
| 2026-10-25 | .pre-commit-config.yaml | 同名文件 | 裁剪：去 类型同步 hook（依赖未就绪）/doc-naming/dead-links/index-reconcile；新增 b1-banned-patterns |
| 2026-10-25 | scripts/ci/check-banned-patterns.sh | 同名脚本 | 模式重写：规则集改为 B1-RU 清单 |
| 2026-10-25 | Makefile / docker-compose.dev.yml / .github/workflows/ci-test.yml | 同名文件 | 裁剪重写：服务集与命令按本仓结构 |
| 2026-10-25 | .zcode/skills/ 四技能 | 同名四技能（b1-guardrails 等） | 骨架照抄、内容重写 |
| 2026-10-25 | FND-GOV-001/002/004 + doc hooks | B1RU-GOV-001 + scripts/ci/doc-* | 机制照抄、编号改 B1RU 前缀 |

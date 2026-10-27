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
| R-A1 | 2026-10-25 | `backend/data_platform/`：models.py + choices.py + models_category/padb/product/fitment/terminology/epc/vin_cache.py + brand_letter.py + management/commands/import_seed_package.py | `backend/catalog/` | **基准=origin/main `f9d40417`**（含 PR #1079 `f396dbcc`；本地 HEAD `5bd54e32` 未触及 data_platform，已核实 diff 为空） | **接入适配（非模型修改）**：①apps.py `label="data_platform"`（FK 字符串引用解析）；②import 路径 `data_platform.`→`catalog.`；③models.py 剥 SeedPackageExecution（28a Q1）；④导入命令剥 labor_spus/labor_part_bindings/administrative_divisions 三实体（27号§一不入包清单）；⑤db_table 前缀保留 `data_platform_`；⑥模型结构零修改 | AI（S1） |
| R-A1 | 2026-10-25 | —— | `backend/catalog/migrations/0001_init_catalog_domain.py` | —— | 本仓首次生成（非拷贝）；表名沿用 CDD3 前缀 | AI（S1） |
| R-A1+ | 2026-10-25 | 接入适配补充（同 R-A1 基准）：①import_seed_package.py 增 **--strict / 默认 skip-unknown+告警**（G6 前向兼容，28a Q6 对称实现）；②命令尾部快照登记 **SeedPackageExecution→CatalogPackLog**（F-21/I3 版本登记之源，catalog_version）；③`ready()` 显式注册 models_* 子集（承 CDD3 DataPlatformConfig.ready 机制） | `backend/catalog/` | f9d40417 | 均"接入适配"非模型修改 | AI（S1） |
| 新增 | 2026-10-25 | ——（本仓新建，非拷贝） | `catalog/models_pack_log.py` + `migrations/0002_add_pack_log.py`；`catalog/services/query.py`（I1 服务层：名称回退链/verified 门控/OE 多形态/双向交叉号）；`catalog/views.py`+`urls.py`（I1 九端点+I2 选件器，匿名放行） | —— | 29号契约的 S1 实现 | AI（S1） |
| 新增 | 2026-10-26 | ——（本仓新建，非拷贝） | `catalog/models_entity_names.py`+`migrations/0004`；I3 importer `entity_names`；`shared/licensing.py`+`make_license`/`license_status`；`commerce` 下价命令；`deploy/scheduler/`；I1/storefront name_chain 附挂 | —— | D1-B/D2-B+C/D3-A 决策落地（31号§八）：EntityName 为 27号§四契约表非拷贝；目录数据/交易域模型零改动 | AI（D 决策轮） |
| R-A1++ | 2026-10-26 | 接入适配（基准同 R-A1 `f9d40417`）：`import_seed_package.py` 新增 vehicle_series/vehicle_models/fitments/spu_interchanges 四实体导入 + 包内 UUID 主键预绑定（27号§5.2，entity_names 挂接依赖）+ DELTA 缺文件预检修正（counts>0 才要求文件） | `backend/catalog/management/commands/import_seed_package.py` | f9d40417 | **只加不改**：既有五实体 importer 零改动；新增 `_upsert` helper + `UUID_BINDINGS`/`_bind_pack_uuids` + 四个新 importer + IMPORTERS 注册 | AI（M1 收口） |
| 新增 | 2026-10-26 | ——（本仓新建，非拷贝） | `catalog/management/commands/make_demo_pack.py`；`commerce/management/commands/seed_demo_commerce.py`；`tests/test_demo_pack.py`；`deploy/demo/m1-alpha-drill.sh` | —— | 26号§九 DoD2/DoD3 演练前置件（M1） | AI（M1 收口） |
| R-B2 补遗 | 2026-10-26 | 剥离补做：b1-shared-ui `src/` 内 122 个 `*.d.ts.map` 编译产物（原 R-B2 只剥 `*.d.ts`，map 漏网入库；s0-s4 评审 P3 清单） | 删除 + frontend/.gitignore 新增 `packages/b1-shared-ui/src/**/*.d.ts.map` | 同 R-B2 基准 | 纯删除+忽略规则；src 源码零改动 | AI（M1 P3） |
| R-A1++补遗 | 2026-10-26 | 接入适配（同 R-A1 基准）：`catalog/views.py` F-23 staged_fitments/export-feed 由内联 has_permission 改统一 `@require_permission` 机制（匿名 403→401，已认证无权 403 不变）；fitments 分页参数防御；认证入口（register/login/admin token）加 AuthRateThrottle 匿名限流（shared/permissions 新增类 + settings DEFAULT_THROTTLE_RATES） | `backend/catalog/views.py`；`backend/shared/permissions.py`；`backend/config/settings.py` | f9d40417 | 统一权限机制化+安全卫生；权限判定语义不变；**同批 commerce 高危域改动（8d626af：ship_order 行锁/receive_batch 部分验收/aging_report N+1）2026-10-26 人工评审通过**——ship_order 行锁有 PG 并发测试实证（5e7a964 test_pg_concurrency），连带核查 record_inventory 库存行锁完备；批次状态无行锁滞留 labeled 为已知非阻塞边界 | AI（M1 P3）+人工评审 |
| 剥离记录 | 2026-10-25 | export_standalone_seed.py **不拷贝**（总仓侧出包工具，B1-RU 只消费包） | —— | —— | 出包能力在 CDD3（ADT-DP-007 承接） | AI（S1） |
| 新增 | 2026-10-26 | ——（本仓新建，非拷贝） | `catalog/admin.py`+`commerce/admin.py`（D6-A Django admin 兜底落地：StagedFitment/EntityName 可编辑，ImportBatch 可编辑+CodeInstance 只读；**hub 模型不注册**防误改）；`/batches/{batch_no}/customs-export/`（F-16 报关清单 CSV 导出，25号§一.5，2026-12-01 合规）+ CodesPage 下载按钮 | —— | 矩阵缺口③⑤闭环（[ENG-003](B1RU-ENG-003-admin-func-role-matrix.md)） | AI（P0 修复） |
| F-24 盘点 | 2026-10-26 | `frontend/data-platform-web/`（85 页）已完成**立项盘点**（[B1RU-ENG-002](B1RU-ENG-002-f24-copy-survey.md)）：v1 建议独立 steward-web 最小集（暂存工作台+回流导出新建 2 页，hub 只读浏览参考重写 3~4 页，其余 ~77 页不拷贝）；i18n 硬编码中文为最大隐藏工作量；待委托方拍板 v1 范围 | —— | c6ac830e（新头，已重核） | 待执行 | 拷贝以「模式承袭」为主（数据流重定向 I1/staging），非整页拷贝 | AI（F-24 盘点） |
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

## 基准证据链（评审 2026-10-25 要求：可复核 hash）

- 拷贝执行时声明基准：origin/main `f9d4041755b3f19a2ed505024993fb62d83e4807`（含 PR #1079=`f396dbcc`）；
- 实际拷贝来源工作树 HEAD：`5bd54e325eae505d68b9a99aae0d6494046c6796`（已核实 `git diff f9d40417..5bd54e32 -- backend/data_platform` 为空——两版本 data_platform 无差异）；
- CDD3 仓后续推进（2026-10-25 21:20）：`b587c1b8`——**此时尚未拉取**，下次拷贝（S5 前）先 fetch 并以新 main 头重新核对；
- 复核命令（在 CDD3 仓执行）：`git log origin/main -1 --format="%H"` + `git diff <登记基准>..HEAD --stat -- backend/data_platform`。

## 评审后剔除（2026-10-25 评审 F5）

| 来源 | 剔除物 | 理由 |
|---|---|---|
| catalog/serializers_fitment.py | 整文件删除（228 行） | 全仓零消费者（I1 服务层自带投影），拷贝死代码违背受控拷贝目的；如需序列化面对照上游按需重拷 |
| catalog/management/commands/export_standalone_seed.py | 已于 S1 剔除（见上） | 总仓侧工具 |

## 类型标注补遗（2026-10-27，mypy 清零批次）

| 文件 | 变更 | 性质 |
|---|---|---|
| catalog/models.py:124 | `compute_brand_letter(...)` 调用行加 `# type: ignore[arg-type]`（guard 已确保非 None，django-stubs 无法跨属性收窄） | 行注释，零行为变化 |
| catalog/management/commands/import_seed_package.py:228/241/245 | 动态模型注册表（UUID_BINDINGS）3 处 `# type: ignore[attr-defined,union-attr]` | 行注释，零行为变化 |

> 拷贝纪律说明：`type: ignore` 行注释不触碰模型结构与导入逻辑，属「接入适配」级最小侵入；
> 对应上游（CDD3 data_platform）若未来同步，此 4 行注释随行携带、不产生合并冲突面。

## 剔除（2026-10-27，QA 评审 P3）

| 来源 | 剔除物 | 理由 |
|---|---|---|
| b1-shared-http/src/auth-client.ts + __tests__/auth-client.test.ts + index.ts 导出 | 整文件删除 | CDD3 session 模型（/auth/token/、tenant、双信封）与本仓 SimpleJWT Bearer 契约完全不符；两端零消费；留存会误导后来者当认证入口。401 刷新走 client.ts 既有拦截器（refreshToken 回调 opt-in，两端已于 2026-10-27 接线） |

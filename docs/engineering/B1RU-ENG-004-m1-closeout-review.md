---
doc_id: B1RU-ENG-004
title: M1 收口对照表——31号出口判据 × 26号 DoD 逐项盘点
category: B1RU
domain: ENG
status: active
updated_at: 2026-10-26
---

# B1RU-ENG-004 M1 收口对照表

> 目的：按 [31号§四](../research/31-工程启动件-monorepo骨架技术栈P0排期.md) 出口判据与 [26号§九](../research/26-B1-RU-v1产品范围说明书.md) DoD 逐项盘点 M1 完成度，明确「收口」与「挂账」边界。核对日期 2026-10-26 @ `e118563`。证据均为 ✅ 已核实（测试文件/commit hash 可反查）。

## 一、M1 出口三件套（31号§四「M1 收口」行）

| 出口项 | 判据 | 状态 | 证据 |
|---|---|---|---|
| 全流程演示 | 内部 alpha 全链演示 | ✅ | `deploy/demo/m1-alpha-drill.py` 九步（游客找件→价控→注册→403 门控→审核→对公下单→核销→发货→签收），已在 DoD 1 断网容器内实证跑通（d614baf） |
| DoD 1 断网自足验证 | 停外网出向买家全流程可用 | ✅ | L1 零外联静态审计 + L2 docker internal 网络 drill 六步硬断言全绿（`dod1-offline-drill.sh`，EXP-010） |
| DoD 3 包更新演练 | 数据包导入与版本更新（幂等、schema 校验） | ⚠️ 挂账 | 兜底包全验（见§三）；**正式演练待 CDD3 D5 真包**（外部依赖，唯一硬挂账） |

## 二、S0–S5 切片出口判据对照（31号§四）

| Sprint | 出口判据 | 状态 | 证据 |
|---|---|---|---|
| S0 工程骨架 | pre-check 全绿；两空应用可起；类型管线 round-trip | ✅ | pre-check 全绿（2026-10-26 复跑）；api-types 一键生成 + drift 检测入 pre-check（5ca1eff）；CI 4 job（禁止模式/后端/前端/文档） |
| S1 catalog 域 | 29号§七验收 5 用例过；导入真实测试包断网可查 | ✅*/⚠️ | I1 九端点验收 + I2 选件器（test_catalog_api.py：brands/series_models/fitments_gate/oe_groups/spu_detail/interchanges/i2_picker）；I3 幂等+预检零容差（test_i3_import_idempotent / unknown_entity_skip_and_strict）；copy-ledger 登记（ENG-001）；自建演示包 INIT-0001/DELTA-0002 已验（make_demo_pack + test_demo_pack）。*「真实测试包」以自建兜底包代替，CDD3 真包随 DoD 3 挂账 |
| S2 commerce 基础 | 管理端可组 SKU 挂价（选件器回填 catalog_spu_id） | ✅ | F-10 `/products`（I2 组 SKU+挂价+限时价）/ F-12 `/inventory`+流水 / F-15 `/buyers` 审核——admin-web 三页 + 回归 |
| S3 storefront | 双语前台按车找件→下单全流程（对公） | ✅ | F-01~06 ru/zh 双语；e2e corporate-flow（游客无价/注册见价/pending 下单 403 门控）；m1-alpha-drill ①–⑥ 步 |
| S4 交易闭环 | DoD 2 真实试单路径（内测） | ✅ | F-07/08/11/13/14 全落地；e2e admin-fulfillment（核销→发货→跨端签收→Завершён）；限时价引擎+到期下价（test_pricing_scheduler + deploy/scheduler）；drill ⑥–⑨ 步 |
| S5 赋码+报表+I4 | DoD 4 码生命周期 + DoD 6 补录回流演练 | ✅ | 见§三 DoD 4/6 行 |

## 三、26号§九 DoD 1–6 全景

| DoD | 内容 | 状态 | 证据 |
|---|---|---|---|
| 1 | 断网自足验证 | ✅ | 见§一 |
| 2 | 真实试单 ≥1 笔（找件→限时价→对公→履约→对账） | ⚠️ 事件挂账 | 路径全通（drill 九步 + e2e 5 例 UI 级）；「真实」试单=内测事件本身，非开发项 |
| 3 | 数据包导入与版本更新演练 | ⚠️ 外部挂账 | 幂等/schema 窗口/预检零容差/DELTA 全测过 + 自建兜底包演练；**正式演练等 D5 真包+俄语正式语料** |
| 4 | 受控品类码实例全生命周期演练 | ✅ | test_codes.py：lifecycle_end_to_end（导入→验码→按码出库→退货回转）+ 非法迁移守卫 + 异码拒收 + 未受控品类拒绝 |
| 5 | 限时价到期自动下价验证 | ✅ | test_pricing_scheduler + `deactivate_expired_prices` + deploy/scheduler（systemd timer/cron，D1-B 决策） |
| 6 | 补录暂存与回流导出演练 | ✅ | staging/fitments 全链 + `export-feed` FEED 包导出（test_staging_create_and_export_feed）+ Django admin 兜底注册（a5d181a，缺口⑤已修） |

## 四、挂账与例外清单（收口不等于无事）

| # | 事项 | 性质 | 去向 |
|---|---|---|---|
| 1 | DoD 3 正式演练 | 外部依赖（D5 真包/正式语料） | 到位后复跑，M1 唯一硬挂账 |
| 2 | DoD 2 真实试单 | 内测事件 | 内测首周完成即闭环 |
| 3 | ~~ENG-003 P1：收单流水端点+页~~ **✅ 已修（2026-10-26）**：/payments/ 端点+admin-web 页+回归 | 功能缺口 | ENG-003 缺口①已闭环 |
| 4 | ~~ENG-003 缺口⑥：账号管理流程~~ **✅ 已补（2026-10-26）**：deploy/README §3「账号管理」小节 | 内测前置 | 同日闭环（owner 建号界面留 M2） |
| 5 | 支付网关/在线支付/账期 | 范围外（D4 未定；对公先行不阻塞） | 委托方拍板后立项 |
| 6 | 内测观察 3 项（黑名单老客/staff 报表/缺货展示） | 观察项 | ENG-003 内测观察清单 |
| 7 | **P0 函数视图权限执行缺口** **✅ 已修（2026-10-26）**：`@require_permission` 函数视图角色判定从未生效（DRF api_view 属性白名单），开发期暴露修复，无生产实例影响 | 安全（EXP-015） | EXP-015 + 三身份守卫测试已落 |

> S0–S5 评审遗留两项（search_oe 门控 / I1 schema 留档）已于 2026-10-26 收口：前者=SPU 级无 verified 语义（空转参数删除，语义落档 `catalog/services/query.py` search_oe docstring）；后者已被 schema.yml 入库+drift 检测机制覆盖（5ca1eff）。

> **离线安装手册执行级走查已完成（2026-10-26）**：真起栈复演 §1→§4 全链（health/导入/license 四态/备份），抓到并修复四断链——备份卷名前缀漂移（空 tar 静默丢数据，compose 显式 `name: b1ru_pgdata`）、`--env-file` 不自动继承（手册统一约定+全命令补齐）、备份镜像 alpine 非交付清单（换 postgres:16-alpine）、systemd/cron 宿主 venv 假设（改 docker compose exec -T 容器形态）。交付物挂载 `deploy/data/ → /data:ro` 转正 DoD1 演练实测模式。详见 KNW-B1-EXP-016；deploy/ 变更属 P4 高危域已提请人工评审。**✅ 人工评审通过（2026-10-27，委托方确认，commit `ecacbaf`）。**

## 五、结论

**M1 开发出口达成**：S0–S5 全部出口判据通过（S1 的「真实测试包」以自建兜底包等价覆盖），DoD 1/4/5/6 闭环，三件套 2/3。收口挂账均为**非开发依赖**：DoD 3 等 D5 外部包、DoD 2 等内测事件。**内测可开始**——前置条件（账号开号流程）随本批 deploy/README 补充闭环。

## 关联

[ENG-003](B1RU-ENG-003-admin-func-role-matrix.md)（功能×角色矩阵+缺口清单）｜[ENG-002](B1RU-ENG-002-f24-copy-survey.md)（F-24 拍板）｜26号§九｜31号§四｜deploy/README（账号流程 §3）

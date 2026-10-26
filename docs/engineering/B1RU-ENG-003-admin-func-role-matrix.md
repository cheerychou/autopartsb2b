---
doc_id: B1RU-ENG-003
title: 管理端功能×业务角色矩阵——F-10~17/F-20~24 全量对照与缺口清单
category: B1RU
domain: ENG
status: active
updated_at: 2026-10-26
---

# B1RU-ENG-003 管理端功能×业务角色矩阵

> 目的：管理端「功能全集 × 角色全集 × 界面载体」一张表，孵化期防遗漏。证据源：26号§4.2/§4.3（功能定义）、`shared/permissions.py` ROLE_PERMISSIONS（权限现状，✅ 已核实）、admin-web 路由（App.tsx，✅）、端点清单（urls.py，✅）。核对日期 2026-10-26 @ `cf03f9a`。

## 一、业务角色全集

| 角色 | 现实岗位 | 权限集（ROLE_PERMISSIONS ✅） | 登录面 |
|---|---|---|---|
| `owner` | 店主/店长 | `*`（全权） | admin-web |
| `staff` | 运营/仓管 | catalog:r · orders:r+w · products:r+w · inventory:r+w · customers:r+w | admin-web |
| `finance` | 财务 | orders:r+manage · **payments:r+w+manage** · reports:r | admin-web |
| `data_steward` | 数据员 | catalog:r+w · products:r | admin-web + Django admin（F-23 兜底，D6） |
| （体系外）Django superuser | 我方运维 | Django 全量（不入 RBAC；D6 兜底操作面 + 部署运维） | /admin/ |
| 边界参照：买家 3 形态 | guest/individual/corporate | 不进 RBAC（独立买家 JWT 双形态，F-15 审核态门控） | storefront |

## 二、功能×载体×角色矩阵

### 商城管理端（26号§4.2，F-10~17）

| 功能 | 界面载体 | 后端端点 | 角色可用 | 状态 |
|---|---|---|---|---|
| F-10 商品管理 | admin-web `/products` | /api/v1/products（I2 选件器组 SKU+挂价+限时价） | owner·staff | ✅ |
| F-11 限时价引擎 | 同上（价格+到期展示）+ deploy/scheduler 自动下价 | /pricing/deactivate-expired + /{id}/relist | owner·staff | ✅ |
| F-12 库存 | admin-web `/inventory`（+流水页） | /inventory + /{id}/transactions | owner·staff | ✅（⚠️「库存↔适配联动」未实现，见缺口⑦） |
| F-13 订单履约 | admin-web `/orders`（发货）+ `/codes`（受控品类按码扫码出库） | /orders/{id}/ship + /codes/outbound | owner·staff·finance(只读) | ✅ |
| F-14 收款对账 | admin-web `/orders`（到账确认） | /orders/{id}/confirm-payment | owner·**finance** | ⚠️ 部分——**缺口①** |
| F-15 客户管理 | admin-web `/buyers`（审核通过/驳回） | /buyer-accounts/ + approve/reject | owner·staff | ⚠️ 部分——**缺口②**（分级=P1 明确；黑名单范围未定义） |
| F-16 贴标工作台 | admin-web `/codes`：批次导入→标签打印（print-list，网页可达支持中国远程操作）→收货验码→按码出库→退货回转 | /batches 系列 + /codes/* | owner·staff | ⚠️ 部分——**缺口③（合规 deadline）** |
| F-17 报表 | admin-web `/reports` | /reports/sales · slow-movers · catalog-coverage · codes-aging | owner·finance·staff(r?) | ✅（staff 无 reports:read——是否有意，见缺口⑦备注） |

### 目录域（26号§4.3，F-20~24）

| 功能 | 界面载体 | 后端 | 角色可用 | 状态 |
|---|---|---|---|---|
| F-20 目录模型 | ——（数据模型本身，catalog 模块） | —— | —— | ✅（受控拷贝 R-A1，只加不改） |
| F-21 数据包导入 | **无界面——CLI 兜底**（`import_seed_package`） | 管理 | owner·data_steward（CLI 权限即 OS 权限） | ⚠️ **缺口④**（M2 载体决策） |
| F-22 只读查询 | 无独立界面（I1 供两前端消费，匿名+data_steward 门控） | /catalog/v1/* | guest…data_steward | ✅ |
| F-23 补录暂存/回流 | **Django admin 兜底（D6-A）** | /staging/fitments GET/POST + /staging/export-feed | data_steward（catalog:write ✅） | ⚠️ **缺口⑤：Django admin 零注册——兜底是空头支票** |
| F-24 目录管理界面 | M2（[ENG-002 盘点](B1RU-ENG-002-f24-copy-survey.md)已出；倾向 admin 兜底→同域轻页面） | —— | data_steward | 📋 规划中 |

### 运维项（26号未显式编号，孵化必需）

| 项 | 现状 | 状态 |
|---|---|---|
| 账号管理（建号/分配角色/改密） | **无界面**；CLI `createsuperuser` + `init_rbac --assign` | ⚠️ **缺口⑥**（内测可 CLI，需流程文档） |
| 审计日志（谁核销/发货） | 关键动作留痕字段（confirmed_by 等）✅；系统级审计无 | 📋 P1 候选 |
| 订单到达提醒 | 无（运营靠刷新） | 📋 P1 候选 |
| 多仓 | 域模型 warehouse 已复用，单仓运行 | ✅ v1 设计如此 |

## 三、缺口清单（按优先级）

| # | 缺口 | 证据 | 优先级 | 建议处置 |
|---|---|---|---|---|
| ③ | ~~F-16 报关清单导出缺失~~ **✅ 已修（2026-10-26）**：`/batches/{batch_no}/customs-export/` CSV（UTF-8 BOM，逐码申报行）+ CodesPage 下载按钮 + 回归 tests/test_customs_export.py | 同左 | ~~P0~~ 已闭环 | —— |
| ⑤ | ~~Django admin 零注册~~ **✅ 已修（2026-10-26）**：catalog/admin.py 注册 StagedFitment+EntityName（可编辑），commerce/admin.py 注册 ImportBatch（可编辑）+CodeInstance（只读）；**hub 数据模型不注册**（只读纪律防误改） | 同左 | ~~P0~~ 已闭环 | —— |
| ① | **收单流水查询缺失**：`payments:read/write/manage` 权限码存在但**无任何 /payments/ 端点与界面**（finance 的核心日常=看流水） | ✅ 已核实 | P1（M2 内） | 收单流水列表端点（从 InventoryTransaction/Order 派生）+ finance 可见页 |
| ④ | F-21 包导入无界面（CLI） | D6/26号 M8 | P1（M2 载体决策） | Django admin 自定义 action 或同域轻页面（与 F-24 路线合并决策） |
| ⑥ | 账号管理无界面无流程文档 | ✅ 已核实 | P1 | 内测：CLI 流程写进 deploy/README；M2：owner 建号页（customers 权限外提） |
| ② | F-15 黑名单范围未定义未实现 | 26号 F-15 提及无 P1 标注 | P2（委托方拍板范围） | v1 以 reject（驳回=不可下单）近似；拉黑老客另立项 |
| ⑦ | F-12「库存↔适配联动」未实现；staff 无 reports:read 是否有意 | 26号 F-12 说明 | P2 | 内测反馈后定：联动=0 库存自动隐藏适配件？reports 角色归属问委托方 |

## 四、孵化期防遗漏机制（本表怎么维护）

1. **每次 commit 涉 admin-web 页面或 permissions.py 权限集，须同步本表**（评审必查项）；
2. 新功能先在§二加行（含角色列），再写代码——角色归属前置明确，避免「先实现后想谁能用」；
3. 缺口清单每条必须带证据链接（26号条目/核实命令）与优先级依据（deadline/阻断性）；
4. P1 候选（审计/通知/多仓）不入 v1 承诺，M2 内测后按反馈转正或继续挂起。

## 关联

26号§4.2/§4.3｜25号§一.5（报关 deadline）｜[ENG-002](B1RU-ENG-002-f24-copy-survey.md)（F-24 盘点）｜[ENG-001](B1RU-ENG-001-copy-ledger.md)｜shared/permissions.py（单一真相源）

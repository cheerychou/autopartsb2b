---
doc_id: B1RU-ENG-002
title: F-24 数据员界面立项盘点——CDD3 data-platform-web 拷贝清单与最小可用集
category: B1RU
domain: ENG
status: active
updated_at: 2026-10-26
---

# B1RU-ENG-002 F-24 立项盘点：CDD3 data-platform-web 拷贝清单

> 立项依据：26号 F-24「派生自 CDD3 admin，管理端②不重复建设数据编辑」+ D6-A（排 M1 后，内测期暂存 API + Django admin 兜底）+ 27号§十 I4 契约。本盘点为立项材料，**不改变 D6 排期**。
> 职责澄清（铁律 1）：F-24 管「补录暂存/回流 + hub 只读浏览」，**不管目录主数据**（生产在 CDD3 总仓，不交付）、**不管商家所售产品**（= commerce F-10，已在 admin-web）。

## 一、派生源现状

| 项 | 值 |
|---|---|
| 来源 | `frontend/data-platform-web/`（CDD3 数据平台管理前端） |
| 基准 | CDD3 origin/main `c6ac830e`（2026-10-26 14:15）——比 B1 拷贝基准 `f9d40417` 新，登记以新头为准 |
| 体量 | **85 页**（不含测试）+ components/services ~5,900 行；单页 300~630 行 |
| 技术栈 | 与 B1 同源 ✅（React + Vite + @base-ui/react + @phosphor + @cdd/shared-* ↔ b1-*） |
| ⚠️ i18n | **摆设**：i18next 资源仅 1 个 key，85 页全是硬编码中文——ru/zh 双语化 = 全部文案重写进语言包 |

## 二、页面映射（85 页 → F-24 v1 需求）

| F-24 需求（27号§十） | CDD3 对应 | 判定 |
|---|---|---|
| **暂存工作台**：暂存行 CRUD/提交（F-23 状态机：暂存→导出→待审核→采纳/驳回） | **无对应**——I4 是 B1 实例侧新造，CDD3 无暂存概念 | **新建**（对齐 B1 staging API） |
| **回流导出**：FEED 包触发/下载（B1RU-CAT-{SCOPE}-FEED-{SEQ}.tar.gz + corrections.json） | DataExportPage（总仓**出包** UI，方向相反） | 仅参考交互形态，**新建**（接 B1 export-feed） |
| hub 只读浏览：品牌/车系/车型 | BrandManagement(454行)/SeriesManagement/ModelManagement(594行) | **参考重写**（数据层换 B1 I1，去编辑，带 hub/local 标识 + ru 名） |
| hub 只读浏览：适配/交叉号/位置字典 | SPUFitmentManagement(634行)/ProductInterchange(299行)/PositionDict | 同上 |
| 其余 ~77 页（DTC/知识图谱/维修案例/数据源同步/OEM 许可/分析报表/Labor/企业设置/SKU 管理…） | —— | **不拷贝**（总仓职能或 B1 范围外；Labor 三页 27号§一已裁出包清单） |

## 三、关键判断

1. **数据流重定向是主要改造，不是界面裁剪**：CDD3 页面直连其内部写 API；B1 侧 catalog 对 hub 只读，写只有 staging——浏览页的数据层全部换 I1，编辑能力全部换 staging API（现仅 `staging/fitments` GET/POST + `export-feed`）。整文件拷贝后大改违背受控拷贝本意（最小化），故浏览页按**模式承袭**（结构/交互范式参考，代码重写）登记，不整页拷贝。
2. **双语化放大一切**：任何被复用的页面都要把硬编码中文全部迁入 ru/zh 语言包（1 页约 40~80 条文案）。
3. **RBAC 对齐**：F-24 主角色 = B1 既有 `data_steward`（owner 兜底），登录/守卫复用 B1 既有模式（不拷 CDD3 的 ProtectedRoute/权限模型）。

## 四、v1 形态方案（供立项评审）

**✅ 已拍板（2026-10-26 委托方确认，三问全按推荐）：不新增第四前端**（23号裁定交付形态=两前端）。演进：**Django admin 兜底（现状，已落地注册）→ 反馈驱动补后端同域轻页面（`/steward/` 路径，非独立 SPA 工程）→ 独立界面仅在外部强制要求时评估**。暂存实体 v1 保持 fitments，首轮 FEED 闭环后按真实纠错分布扩展。

**方案 A（备选，未采纳）**：独立第三前端（工作名 steward-web，数据员端 ru/zh；不进 admin-web——铁律 1）。工作量估算留档参考：

| 范围 | 页面 | 量级 |
|---|---|---|
| 新建 | 暂存工作台（列表/表单/提交）、回流导出 | ~2 页 / 800 行 |
| 参考重写 | hub 只读浏览：品牌、车型、适配（+交叉号可选） | 3~4 页 / ~1,500 行 |
| 基建 | 壳（Layout/登录/守卫，承 B1 既有模式）、i18n 框架 | ~500 行 |
| 合计 | | **~2,800 行 / 6~7 页，约 2 周级** |

**范围外**（渐进补）：series/model/position 独立浏览页、corrections.json 编辑器（v1 由暂存行备注替代）、P1 自动上传（27号§十.5）。

## 五、三问拍板结果（✅ 2026-10-26 委托方确认，全部按推荐方案）

1. **v1 范围 = 继续 Django admin 兜底至 M2 中后**，内测反馈驱动再补同域轻页面（D6-A 现状延续，不阻塞内测）；
2. **应用数 = 不新增第四前端**（维持 23号裁定两前端）；`steward-web` 命名作废，方案 A 独立前端仅为工作量留档；
3. **暂存实体 = v1 仅 fitments**，首轮 FEED 闭环后按真实纠错分布扩展。

## 关联

[copy-ledger](B1RU-ENG-001-copy-ledger.md)（本盘点已同步登记待执行队列）｜26号§4.3｜27号§十｜23号§增补（总仓不交付）｜D6 决策（31号§八）

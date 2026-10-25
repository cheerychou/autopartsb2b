# B1-RU 工程启动件：Monorepo 骨架 · 技术栈 · P0 排期

> 时间：2026-10-25 ｜ 性质：**M1 开发的工程启动方案**——依据 [30号](30-CDD3工程资产盘点与复用清单.md) 复用清单，将 26号 P0 功能落为可开工的仓库骨架、技术栈决策与迭代排期
> 上游：[23号](23-B1-RU三应用架构-拆分边界与接口.md)（三模块架构）｜[24号](24-产品形态决策记录-SKU-B私有化部署与数据订阅.md)（单体交付/升级三步）｜[26号](26-B1-RU-v1产品范围说明书.md)（P0 功能/里程碑）｜[27号](27-数据包契约草案-总仓到实例目录数据管线.md)（I3/I4）｜[29号](29-实例内接口契约-I1目录查询与I2选件器.md)（I1/I2）
> 证据分级：✅ 已裁定 ｜ 🟡 建议项（开工前确认）｜ ❓ 阻塞依赖

## 一、仓库拓扑与骨架

**独立仓库 = 本仓库（autopartsb2b）**，代码与既有 docs/ 同居一仓（研究→工程连续追溯，延续 CDD3"docs 在 repo 内"治理习惯）。目标结构：

```
autopartsb2b/
├── CLAUDE.md                  # 根级 AI harness（R-D1，三层之首）
├── AGENTS.md / REVIEW.md / CONTRIBUTING.md
├── Makefile                   # 一键命令入口（make dev / test / pre-check，承 CDD3 模式）
├── docker-compose.dev.yml     # 本地开发（pg+redis+backend 两前端）
├── deploy/                    # 客户侧交付单元（docker-compose 单体 + 迁移只向前，24号）
├── .pre-commit-config.yaml    # R-D2：black/isort/flake8 + 禁止模式 + 类型同步 + 文档 hook
├── .github/workflows/ci.yml   # R-D2：ci-test 裁剪版（lint/test/coverage/类型同步/禁止模式）
├── .zcode/skills/             # R-D1：b1-guardrails / new-backend-viewset / new-frontend-page / pre-check-before-pr
├── docs/
│   ├── research/              # 既有 01–31 号（过程层）
│   ├── engineering/           # 制品层起点：copy-ledger.md（拷贝台账，22号§四.1）+ 本启动件归档
│   ├── knowledge/             # KNW-B1-* 空册开张（R-C1）
│   └── templates/plan-template.md
├── backend/                   # Django 单体（一个部署单元 ✅24号裁定5）
│   ├── config/                # settings（单租户运行，多租户底座默认关闭🟡）
│   ├── catalog/               # 模块①：CDD3 目录域受控派生（R-A1，❓待 PR #1079）
│   │   └── （models/serializers_fitment 派生 + 包导入 I3 + 补录暂存 I4 + 只读查询 I1/I2）
│   ├── commerce/              # 模块②：交易域（商品/订单/收单/库存/客户/赋码/限时价/对账）
│   ├── shared/                # RBAC（裁剪版）+ 中间件 + 校验（R-A2）
│   ├── schema.yml             # OpenAPI 导出 → 前端类型生成（承 CDD3 管线）
│   └── tests/ + factories.py + pytest.ini/mypy.ini/coverage-baseline.json（R-A3）
└── frontend/                  # pnpm monorepo（R-B 系列）
    ├── storefront-web/        # 应用①：买家商城（中俄双语 ru/zh；新建，F-01~08）
    ├── admin-web/             # 应用②：管理端（中俄双语 ru/zh；新建，F-10~17；组件范式承 shared-ui）
    └── packages/
        ├── b1-atoms/          # ui-registry 全量派生（27 atoms + shadcn 分发机制 + drift 检查）
        ├── b1-shared-ui/      # 通用类拷贝（common/form/feedback/layout/data-display）
        ├── b1-shared-http/    # HTTP 边界（camelCase 转换/信封/authStorage）
        └── eslint-config/
```

**模块↔应用对齐 23号**：storefront/commerce/catalog 三模块中的 storefront 是前端应用、commerce 是后端交易域、catalog 是后端目录域；单体后端两 app（catalog+commerce）+ 两前端，一个 docker-compose 拉起（✅ 24号交付结构）。

## 二、技术栈定稿（对齐 CDD3 以最大化复用，✅ 30号盘点）

| 层 | 选型 | 复用来源 |
|---|---|---|
| 后端 | Python 3.13 · Django/DRF · PostgreSQL · Redis · Celery | CDD3 同栈（CLAUDE.md 声明） |
| API 纪律 | snake_case 线格式 · OpenAPI schema → TS 类型生成（禁手写） | CDD3 类型同步管线 |
| RBAC | RoleBasedPermission + ACTION_PERMISSIONS（角色集裁剪：老板/店员/财务/数据员 🟡；买家双认证形态🟡） | store_services/middleware |
| 前端 | React 19.2.x（单一版本线）· TypeScript · Vite · Tailwind | CDD3 web 线 |
| 组件底座 | Base UI（@base-ui/react）+ b1-atoms registry（shadcn 分发） | ui-registry |
| 业务组件 | StandardListPage / DataTable / SearchForm / Form(rhf+zod) / DetailPageLayout 三范式 | shared-ui |
| 状态/数据 | Zustand（客户端）+ react-query v5 useQueryData/useMutateData（服务端） | CDD3 范式 |
| i18n | react-i18next（两端均 ru+zh 双语言包、可切换，默认 ① ru / ② zh；目录名走 entity_names 回退链 ru→en→zh，27号） | 接线机制 |
| 图标/Token | @phosphor-icons + Icons 注册表；tokens.json（俄语西里尔字体栈核验 🟡） | 直接拷贝 |
| 部署 | docker-compose 单部署单元；升级=拉镜像→跑迁移→导包（✅24号）；断网自足（仅支付网关+ЧЗ API 外联） | 24号纪律 |

## 三、工程治理启动件（S0 交付物，全部不依赖 CDD3 侧）

| # | 交付物 | 内容 | 来源 |
|---|---|---|---|
| H1 | 三级 CLAUDE.md | 根（全局约定/关键业务规则：订单 vs 码实例、hub vs local 数据/禁止模式/完成声明/记忆纪律）+ backend（服务结构/RBAC/API 规范）+ frontend（组件体系/表单范式/数据获取/i18n） | 30号 R-D1 |
| H2 | .zcode/skills ×4 | b1-guardrails、new-backend-viewset（catalog 只读 I1 接口首个受益者）、new-frontend-page、pre-check-before-pr | 30号 R-D1 |
| H3 | pre-commit + CI + Makefile + docker-compose.dev | 裁剪清单见 30号 R-D2；CI 必上：lint/test/coverage 基线/类型同步/禁止模式 | 30号 R-D2 |
| H4 | 文档治理 | B1RU 编号 + frontmatter 规范 + 3 个文档 hook（frontmatter/命名/死链）+ KNW-B1 空册 + copy-ledger.md | 30号 R-C1 |
| H5 | 前端 packages | b1-atoms/b1-shared-ui/b1-shared-http/eslint-config 拷贝落地 + drift 检查接线 | 30号 R-B1/B2 |
| H6 | backend 底座 | Django 工程 + RBAC 裁剪 + 认证 + shared 中间件 + 质量工具链 + schema→类型管线打通 | 30号 R-A2/A3 |

## 四、P0 功能排期（M1 内部切片，26号 F 编号 → Sprint）

> 节奏假设：AI 原生开发，每 Sprint 1–2 周；顺序按依赖链排，允许并行；G-02 首包数据未到前用 CDD3 现库导出测试包（500 行级）驱动开发🟡。

| Sprint | 内容 | F 编号 | 出口判据 | 依赖 |
|---|---|---|---|---|
| **S0 工程骨架** | H1–H6 全部 + 仓库结构落地 | — | `make pre-check` 全绿；两空应用可起；类型管线 round-trip 演示 | 无 |
| **S1 catalog 域** | 受控拷贝落地（copy-ledger 归档）+ I1 全部端点 + I2 选件器 + F-21 包导入（INIT/DELTA/幂等/校验，27号§七） | F-20/21/22/23/24 | 29号§七验收 5 用例过；导入真实测试包断网可查 | ❓ PR #1079 合并 |
| **S2 commerce 基础** | F-10 商品管理（I2 组 SKU）/ F-12 库存（warehouse 模式）/ F-15 客户（企业审核） | F-10/12/15 | 管理端可组 SKU 挂价（选件器回填 catalog_spu_id） | S1 |
| **S3 storefront** | F-01 注册登录（ru/zh） / F-02 按车找件 / F-03 OE 检索 / F-04 交叉号 / F-05 详情（限时价标识）/ F-06 购物车+**对公转账先行** | F-01~06 | 双语前台按车找件→下单全流程（对公） | S1；在线支付❓网关 |
| **S4 交易闭环** | F-11 限时价引擎（30 天）/ F-13 履约 / F-14 收款对账 / F-07 订单跟踪 / F-08 个人中心 | F-07/08/11/13/14 | 26号§九 DoD 2 真实试单路径（内测） | S2+S3 |
| **S5 赋码+报表+I4** | N2 导入式（码实例状态机/贴标工作台 F-16/收货验码/按码出库/退货回转）+ F-17 报表 + **I4 补录暂存/回流导出（排期漏项补录，评审 2026-10-25）** | F-16/17/23 + 25号 P0 | 26号§九 DoD 4 码全生命周期演练 + DoD 6 补录回流演练 | S4 |
| **M1 收口** | 内部 alpha：全流程演示 + 断网自足验证（DoD 1）+ 包更新演练（DoD 3） | — | 26号 M1 出口 | S1–S5 |

**关键路径**：S0→S1→(S2‖S3)→S4→S5。**外部阻塞两项**：①PR #1079（卡 S1 拷贝，CDD3 侧推进中）；②支付网关选型（❓，卡 S3 在线支付——对公转账先行不阻塞，26号§4.6）。G-02 首包（CDD3 期 1 末段）不卡开发、卡首客部署（M2）。

## 五、角色集与权限起点（🟡 开工前确认）

- 管理端：`owner`（老板）/`staff`（店员）/`finance`（财务）/`data_steward`（数据员，include_unverified 权限，29号§六）——4 角色 × ACTION_PERMISSIONS 分档（read/write/manage）；
- 商城端：**三种角色**（🟢 2026-10-25 委托方修正）——
  - `guest` 游客：免登录浏览——按车找件/目录/OE 检索可见（引流钩子，15号角色矩阵"查适配不注册"）；**价格与下单需注册**；可见深度为 19号 M1 开放参数🟡；
  - `buyer_individual` 个人客户：注册即用；
  - `buyer_corporate` 企业客户：注册后**须经管理端审核认证**（F-15 企业注册审核通过）方可下单/享企业价（分级价 P1）——审核动作在管理端完成、回写买家账号状态；
  - 三者均不进管理端 RBAC，走独立买家认证（JWT 双形态🟡；游客=匿名只读）；
- 初始即建 `init_rbac` 管理命令（承 CDD3 单一真相源纪律）。

**对工程的两点直接影响**：① I1 目录查询接口须支持匿名访问（游客浏览），门控与缓存约定不变（29号§二，鉴权层在 storefront 而非 catalog）；② F-15 增加一个显式状态流：企业注册 → 待审核 → 通过/驳回（通过前 buyer_corporate 可浏览不可下单）。

## 六、风险与开放项

| # | 风险/开放项 | 应对 |
|---|---|---|
| 1 | PR #1079 合并时点不确定 → S1 顺延 | S0/H 系列先行（零依赖）；S2 可与 S1 部分并行（用接口契约 mock catalog）🟡 |
| 2 | 支付网关未定 | S3 对公先行；网关合同列入商务轨道（与供给锚同批推进） |
| 3 | shared-ui 拷贝携带隐性业务依赖（customer/vehicle 卡片等混入） | 拷贝时按 30号§三分类白名单执行，copy-ledger 逐项登记 |
| 4 | 俄语文案与 i18n 冷启动 | 语言包随 Sprint 就位（两端均 ru+zh 全量，默认 ① ru / ② zh）；目录数据俄语名走 entity_names（CDD3 期 1） |
| 5 | 单维护者风险（09号§四） | H4 的 KNW 册 + copy-ledger + CLAUDE.md 三层即为此设计，S0 强制完成 |
| 6 | 26号§十/27号§十二余留开放参数（license 校验机制等） | license 校验机制不阻塞 S0–S5（SKU-B 断网纪律下为实例侧本地校验，开发期定） |

## 七、启动动作（建议本仓库下一步执行序）

1. `git` 新建 `engineering/kickoff` 分支；2. 落 S0：仓库骨架 + H1–H6；3. copy-ledger 首批登记（R-B1/B2 可立即执行——不依赖 #1079）；4. R-A1 挂起待 #1079，期间以 mock 驱动 S2；5. 每 Sprint 出口跑 26号 DoD 对应条目并在 KNW/变更记录留痕。

---

*关联：上游 [30号](30-CDD3工程资产盘点与复用清单.md)（复用清单=本文依据）、[26号](26-B1-RU-v1产品范围说明书.md)（范围与 DoD）、[29号](29-实例内接口契约-I1目录查询与I2选件器.md)（S1 验收基线）、[27号](27-数据包契约草案-总仓到实例目录数据管线.md)（F-21 规格）。本文经委托方确认后即开工 S0。*

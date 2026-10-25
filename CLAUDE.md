# B1-RU 项目全局约定

**沟通语言：所有对话、回复、代码注释均使用中文。**

## 项目概述

俄语区中国汽配 B2B 商城（SKU-B 形态：私有化部署单体应用 + 数据订阅）。Monorepo 架构。

技术栈：Django/DRF（后端）+ React 19/TypeScript/Vite/Base UI/Zustand/react-query（前端）。
部署：docker-compose 单部署单元；**断网自足**（导入数据包后完全离线运行，仅支付网关与 ЧЗ 赋码 API 允许外联）。
范围基准：`docs/research/26-B1-RU-v1产品范围说明书.md`；工程方案：`docs/research/31-工程启动件-monorepo骨架技术栈P0排期.md`。

## 目录结构

```
autopartsb2b/
├── backend/                # Django 单体后端（一个部署单元）
│   ├── catalog/            #   目录域：CDD3 受控派生（只读查询 I1/I2 + 数据包导入 I3 + 补录暂存 I4）
│   ├── commerce/           #   交易域：商品/订单/收单/库存/客户/赋码/限时价/对账
│   ├── shared/             #   共享：RBAC/中间件/校验
│   └── config/             #   settings（单租户运行）
├── frontend/               # pnpm monorepo
│   ├── storefront-web/     #   俄语买家商城（F-01~08）
│   ├── admin-web/          #   中文管理端（F-10~17）
│   └── packages/           #   b1-atoms / b1-shared-ui / b1-shared-http / eslint-config
├── docs/
│   ├── research/           # 研究过程层（01–31 号，归档不删）
│   ├── engineering/        # 工程制品层（copy-ledger 拷贝台账等）
│   └── knowledge/          # KNW-B1 经验教训册
└── deploy/                 # 客户侧交付单元（docker-compose + 迁移脚本）
```

## 三条铁律（违反即打回）

1. **域边界**：catalog 只读不碰交易（价格/库存/订单全在 commerce）；commerce 对目录件只持 `catalog_spu_id` 软引用；数据编辑只在 catalog 自带界面（F-24），管理端②不做数据编辑 UI。接口契约见 `docs/research/29-实例内接口契约-I1目录查询与I2选件器.md`。
2. **受控拷贝**：凡从 CDD3 拷贝的代码，必须在 `docs/engineering/copy-ledger.md` 登记（来源 commit hash + 文件清单 + 剥离项）；**只加不改**——不修改拷贝域模型结构，新字段开扩展表或 JSON 字段。
3. **断网自足**：买家全部路径（浏览/找件/下单/对公）不得引入在线依赖；外联仅限支付网关与 ЧЗ API（25号§2.4），新增外联须委托方批准。

## 关键业务规则

### 游客 vs 个人客户 vs 企业客户（绝不能混）

- **游客（guest）**：免登录浏览按车找件/目录/OE 检索（引流钩子）；**价格与下单需注册**；
- **个人客户（buyer_individual）**：注册即用；
- **企业客户（buyer_corporate）**：注册后须经管理端审核（F-15：待审核→通过/驳回）方可下单/享企业价；通过前可浏览不可下单。
- 易错点：企业审核是**管理端动作回写买家账号状态**，不是买家自助升级；游客可见深度是开放参数（19号 M1），默认价格不可见。

### 订单（Order）vs 码实例（CodeInstance）

- **订单**：交易结算单元（commerce/orders）；
- **码实例**：受控品类（N2 赋码）每件商品的物理码（DataMatrix），独立状态机（订/贴/入转/在库/出转/退回）——它随商品出入库流转，但**不是订单的一部分**，是库存维度的附属实体；
- 易错点：出库核销按码实例扫码（订单驱动），退货回转的是码实例不是订单；未受控品类（如碰撞件）没有码实例，不要为它们建码记录。

### hub 数据 vs local 数据

- **hub**：总仓数据包下发的目录数据（origin=hub，不可在实例内删除性编辑，纠错走回流 I4）；
- **local**：实例内补录的数据（origin=local，即时生效，可回流总仓采纳）；
- 查询结果合并展示，local 行带"自补"标识，不设覆盖语义（27号§5.2）。

## 全局命令

后端（`backend/` 目录，激活 venv）：`make dev / migrate / test / pre-check`
前端（`frontend/` 目录）：`pnpm --filter <app> dev / build / test:run / lint / type-check`；快捷 `pnpm dev:store` / `pnpm dev:admin`
⚠️ 禁用 `pnpm <cmd> -w <app>` 语法（pnpm 11 下透传给 vite 当 --watch，吞掉退出码 → 假绿，CDD3 2026-09-26 实证）

## 代码规范检查清单（PR Review 必查）

- [ ] `permission_classes = [IsAuthenticated]` — 禁止，用 `[RoleBasedPermission]` + `ACTION_PERMISSIONS`
- [ ] `is_staff` / `is_superuser` 用于业务逻辑 — 禁止，用 `has_role()/has_permission()`
- [ ] `localStorage.setItem('auth_token',` — 禁止，用 `authStorage.setToken()`
- [ ] 业务代码直接调 `camelizeKeys/snakeizeKeys` — 禁止，转换只准在 b1-shared-http 边界层
- [ ] 手写页面标题 `<h1>` / 头部 action 放「保存」按钮 — 禁止，标题走 PageHeader、保存唯一位置=FormFooter
- [ ] 后端序列化器 camelCase 字段名 — 禁止，线格式统一 snake_case
- [ ] 新建组件前未 Grep `@cdd/b1-shared-ui`（先查后写）— 禁止
- [ ] 目录数据在 commerce 内复制/缓存（应查 catalog I1）— 禁止
- [ ] 对 hub 数据做 UPDATE/DELETE（应走补录暂存+回流）— 禁止

## 文档完成声明规范

文档标记"已完成"必须附代码证据：`✅ 已完成 | commit: <短hash> · 日期`；commit message 引用文档编号（如 `feat(commerce): 限时价引擎 (26号F-11)`）便于 `git log --grep` 反查。禁止只有日期的完成声明。

## 开发前置检查清单

- [ ] **改 catalog 域前先读**：`docs/research/27-数据包契约草案-总仓到实例目录数据管线.md`（I3 导入协议）+ `docs/engineering/copy-ledger.md`（哪些文件是拷贝域）
- [ ] **改交易/支付/赋码前先读**：26号§4.5/4.6 + `docs/knowledge/` 对应 KNW 条目
- [ ] **先查后写**：组件 Grep `@cdd/b1-shared-ui`；页面/工具 SearchCodebase 同类实现
- [ ] **区分事实与推断**：代码现状判断标注 `✅ 已验证：[命令+输出]` 或 `⚠️ 推断`，禁止推断包装为事实
- [ ] **新建文档前分流三问**：当前事实（制品层）还是过程思考（research/_archive）？已有权威文档可挂靠？结论可蒸馏进 KNW？
- [ ] 大批量替换（>10 处）先 3–5 文件小样本试跑 + 构建验证

## AI 记忆写入纪律

- 索引行 ≤200 字符（主题+终态+何时需要读）；细节落主题文件
- 项目级技术教训蒸馏进 `docs/knowledge/`（KNW-B1 编号）；git 历史/PR/KNW 已记录的不入记忆

## 已知问题

- 仓库路径含中文（`~/应用开发/autopartsb2b`）——Node 工具链个别场景（如 hvigor）有兼容问题，本项目无鸿蒙线，风险低；如遇工具链怪异行为优先怀疑路径
- CDD3 拷贝基准：**PR #1079 合并后的 CDD3 main 头**——合并前 catalog 域拷贝（S1）不得开始（31号§四）

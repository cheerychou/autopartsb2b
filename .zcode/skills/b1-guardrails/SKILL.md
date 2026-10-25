---
name: b1-guardrails
description: B1-RU 俄语汽配商城项目的全局工程护栏速查。在本项目写或改任何代码时加载，防止违反项目硬性约定。涵盖三铁律、禁止模式、业务实体区分（游客/个人/企业客户、订单/码实例、hub/local）、废弃警告、开发与提交红线。当用户在本项目进行任何编码工作时触发。
---

# B1-RU 全局工程护栏

B1-RU 是俄语区中国汽配 B2B 商城（Django/DRF 单体 catalog+commerce + React 19 两前端 storefront/admin）。本 skill 是写任何本项目代码时必须遵守的全局护栏。详细骨架见 `new-backend-viewset` 和 `new-frontend-page` skill。上游裁定：`docs/research/26号`（范围）、`27号`（数据包契约）、`29号`（接口契约）、`31号`（工程方案）。

## 三铁律（违反即打回）

1. **域边界**：catalog 只读（零交易字段）；commerce 不复制目录数据（只持 `catalog_spu_id` 软引用，查 catalog I1）；数据编辑只在 catalog 自带界面；管理端不做数据编辑 UI；
2. **受控拷贝**：CDD3 拷贝文件（见 `docs/engineering/copy-ledger.md`）只加不改——不改模型结构，新字段开扩展表或 JSON 字段；
3. **断网自足**：买家路径零在线依赖；外联仅限支付网关 + ЧЗ API；新增外联须委托方批准。

## 禁止模式（PR Review 必查）

| 禁止写法 | 正确写法 |
|---------|---------|
| `permission_classes = [IsAuthenticated]` | `[RoleBasedPermission]` + `ACTION_PERMISSIONS` |
| `is_staff` / `is_superuser` 用于业务逻辑 | `has_role(user, code)` |
| `localStorage.setItem('auth_token', ...)` | `authStorage.setToken()`（b1-shared-http） |
| 业务代码调 `camelizeKeys/snakeizeKeys` | 转换只在 b1-shared-http 边界（service 层一律 camelCase） |
| 手写 `<h1>` 页面标题 / 头部 action 放保存按钮 | PageHeader / FormFooter（唯一位置） |
| 后端序列化器 camelCase 字段 | 线格式统一 snake_case |
| 手写 TS 接口类型 | 从 schema 生成的 `api-types.ts` 取 |
| 硬编码界面文案 | 语言包（storefront=ru / admin=zh） |
| 硬编码赋码品类/ТН ВЭД 码 | 可配置字典（is_marked_category） |
| 对 hub 数据 UPDATE/DELETE | 补录暂存 → 回流 I4 |
| 在 commerce 缓存/复制目录数据 | 调 catalog I1（缓存键含 catalog_version） |
| 裸改码实例状态字段 | 状态机服务层方法（订/贴/入转/在库/出转/退回） |
| 新建 DRF 权限类 | ActionPermission 三档（read/write/manage） |

## 业务实体区分（最高频混淆点）

**三种买家形态**（storefront）：
- `guest` 游客：匿名浏览找件（I1 匿名访问）；不可见价格、不可下单；
- `buyer_individual`：注册即用；
- `buyer_corporate`：**须管理端 F-15 审核通过**方可下单/企业价；审核=管理端动作回写状态，非买家自助升级；未过审显示"待审核"页而非 403。

**订单 vs 码实例**：订单=结算单元；码实例=受控品类每件商品的物理码（独立状态机，随库存流转）。出库核销按码扫码由订单驱动；未受控品类（碰撞件）无码实例。

**hub vs local**：hub=包下发（只读，纠错走回流）；local=实例补录（即时生效，可回流）；合并展示、local 带"自补"标识、无覆盖语义。

**数据包 vs 类型生成**：包 schema_ver 与代码版本双轨（27号§六）；前端类型从后端 schema 生成（pre-push 校验双应用同源）。

## 开发与提交红线

- 提交前必跑 `make pre-check`（见 `pre-check-before-pr` skill）
- 改 catalog 模型前：读 27号契约 + copy-ledger（是否拷贝域）+ CDD3 上游是否已有同名实现
- 新组件先 Grep `@cdd/b1-shared-ui`（先查后写）；新页面先找同类页面参考
- 迁移只向前兼容（私有化 N 实例升级）
- 完成声明必须带 commit 证据（根 CLAUDE.md 文档规范）

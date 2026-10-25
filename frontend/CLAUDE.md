# 前端开发规则（B1-RU）

全局约定见根级 `CLAUDE.md`。本文档为前端专属规则。

## 应用结构

| 应用 | 语言 | 说明 | 目录 |
|------|------|------|------|
| storefront-web | 俄语（默认 ru） | 买家商城：按车找件/商品/购物车/订单（F-01~08） | `storefront-web/` |
| admin-web | 中文（zh） | 管理端：商品/订单/库存/赋码/对账（F-10~17） | `admin-web/` |
| packages/b1-atoms | — | 原子组件唯一源（shadcn registry，Base UI 底座；拷贝自 CDD3 ui-registry） | `packages/b1-atoms/` |
| packages/b1-shared-ui | — | 通用业务组件（DataTable/StandardListPage/Form 系/反馈/布局） | `packages/b1-shared-ui/` |
| packages/b1-shared-http | — | HTTP 边界（snake↔camel 转换/信封解包/authStorage） | `packages/b1-shared-http/` |
| packages/eslint-config | — | ESLint 规则集 | `packages/eslint-config/` |

## 快速导航

| 我想做什么 | 去哪里找 |
|-----------|---------|
| 商城找件页 | `storefront-web/src/pages/catalog/` |
| 管理端列表页样板 | `admin-web/src/pages/`（StandardListPage 范式） |
| 添加 API 调用 | `<app>/src/services/api/<module>/`（类型从生成文件取，禁手写） |
| 修改 HTTP 客户端 | `<app>/src/services/http.ts`（实例配置） |
| 原子组件修改 | `packages/b1-atoms/src/`（唯一源 → shadcn build → add --overwrite 分发） |

## 组件体系

**双轨组件**：原子组件（b1-atoms 分发至各应用 `components/ui/*`）+ 业务组件（`@cdd/b1-shared-ui`），禁止交叉导入。

**原子组件唯一源纪律**（承 CDD3）：改原子组件必须改 `b1-atoms` 唯一源 → `pnpm exec shadcn build` → 各应用 `shadcn add --diff` 审查后 `--overwrite`；禁止直接改应用内 `components/ui/*` 不回写源头。底座 **Base UI**——禁止 radix 引入（ESLint error）。

**页面三范式**（`@cdd/b1-shared-ui`）：
- 列表页 → `StandardListPage`（内置 SearchForm/DataTable 分页/状态筛选；新建按钮居左辅助操作居右）
- 表单页 → `<Form>`(rhf) + zod schema + `<FormSection>`（分组）+ `<FormFooter>`（提交唯一位置，sticky 吸底）
- 详情页 → `DetailPageLayout`（勿双嵌 PageContainer；FormSection 默认 columns=4）

**数据获取**：react-query v5，统一 `useQueryData`/`useMutateData`；禁止手写 `useState+useEffect` 加载。状态反馈：加载 Spinner/DataTable loading、空态 EmptyState、错误 ErrorState（不展示技术堆栈）。

## 前后端命名边界

service 层类型/请求体**一律写 camelCase**；wire 传输自动 snake_case——由 `services/http.ts` 实例的 `snakeCaseRequest: true` + `camelCaseResponse: true` 在 b1-shared-http 边界统一转换。禁止在 service/组件层手工 `toSnake/toCamel`（双层转换互相背刺）。接口类型从后端 schema 生成的 `api-types.ts` 取，禁止手写。

## i18n 规范

- storefront-web：默认 `ru`；admin-web：默认 `zh`；全部界面文案走语言包（`src/i18n/`），**禁止硬编码文案**（26号§六）
- 目录数据展示名不走语言包——走 I1 响应的 entity_names 回退链（ru→en→zh，27号定稿），响应含 `name_chain` 供标注"官方名/俄市俗称"
- 俄语文案注意：西里尔字符宽度比中文/拉丁宽，容器宽度走 tokens.json 五档（dialog 480/detail 896/standard 1280/wide 1536）

## 商城端三种买家形态（storefront-web）

| 形态 | 可做 | 不可做 |
|---|---|---|
| guest 游客 | 浏览按车找件/目录/OE 检索（匿名，I1 匿名访问） | 见价格、下单（19号开放参数默认） |
| buyer_individual | 注册即用：价格、购物车、下单 | 企业价（P1） |
| buyer_corporate | 同上 + 企业价（P1，审核通过后） | 未过审（待审核/驳回）时下单 |

- 审核状态由后端 `verification_status` 字段驱动前台门控；前端不自行判断"企业资料完整性"
- 路由守卫：下单/支付路径检查认证态；企业未过审显示"待审核"页而非 403

## 图标 / Motion / Token

- 图标：`@phosphor-icons/react`（默认 bold），经 `Icons` 语义注册表导入；禁止 lucide-react
- 字号/字重/动效：Tailwind 原生工具类（`text-sm`/`duration-200`），不定义自定义语义类名
- Token：`tokens.json`（container 五档/间距语义）；改 Token 先读 CDD3 KNW-EXP-017 同类教训

## 命令

```bash
pnpm --filter storefront-web dev      # 俄语商城
pnpm --filter admin-web dev           # 管理端
pnpm --filter <app> build / test:run / lint / type-check
pnpm build:all                        # CI 用
```

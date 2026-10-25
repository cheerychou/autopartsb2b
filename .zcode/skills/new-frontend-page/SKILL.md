---
name: new-frontend-page
description: 在 B1-RU 前端新建页面（storefront 商城页 / admin 管理端列表页、表单页、详情页）时使用。内嵌组件三范式、数据获取、i18n、命名边界护栏与代码骨架。当用户要求"新建列表页/表单页/详情页/商城页""做一个 XX 管理页面"时触发。
---

# 新建前端页面（B1-RU storefront / admin）

为两前端生成符合项目规范的页面。**直接套用骨架，不要从空白页面开始**。护栏来自 `frontend/CLAUDE.md`。

## 何时使用 / 触发边界

- ✅ 新建列表页/表单页/详情页/商城找件页/商品页 → 用本 skill
- ❌ 现有页面加字段/改样式 → 直接改文件；改前确认用的哪个布局组件（坑：DetailPageLayout 勿双嵌 PageContainer、FormSection 默认 columns=4——CDD3 KNW-SW/KNW-UI 同类教训适用）
- ❌ 做新组件 → 先 Grep `@cdd/b1-shared-ui` 与 b1-atoms（先查后写红线）

## 第一步：定应用与范式

| 页面形态 | 范式 | 语言 |
|---|---|---|
| admin 管理端列表（商品/订单/客户/码批次…） | `StandardListPage` + `DataTable` + `SearchForm` | zh |
| admin 表单（组商品/库存调整/审核） | `<Form>`(rhf)+zod + `FormSection` + `FormFooter` | zh |
| admin 详情（订单详情/码实例轨迹） | `DetailPageLayout` + `SystemInfoRow` | zh |
| storefront 商城页（找件/商品/购物车/订单跟踪） | 电商布局（非管理端三范式；参考 shared-ui 可组合件自由布局） | ru |

## 骨架：admin 列表页

```tsx
import { StandardListPage, DataTable, StatusFilter } from '@cdd/b1-shared-ui';
import { useQueryData } from '@cdd/b1-shared-ui';           // react-query 封装
import { ordersApi } from '@/services/api/orders';            // 类型从生成的 api-types 取（camelCase）
// HTTP 边界自动 snake↔camel；禁止手工 toSnake/toCamel

export function OrdersPage() {
  const { data, loading } = useQueryData(['orders', filter], () => ordersApi.list(filter));
  return (
    <StandardListPage
      title="订单管理"                                        // 唯一标题通道（禁手写 h1）
      action={{ label: '新建', onClick: () => navigate('new') }}  // 居左；辅助操作居右
      statusFilter={...}
    >
      <DataTable columns={columns} data={data?.items} loading={loading} />
    </StandardListPage>
  );
}
```

## 骨架：storefront 找件页（含游客门控）

```tsx
// 游客可浏览（I1 匿名）；价格区域按认证态渲染：
//   guest → "登录后见价"（19号开放参数默认）；individual → 价格；corporate 未过审 → 待审核提示
const { data } = useQueryData(['fitments', modelId, categoryId], () =>
  catalogApi.fitments({ model_id: modelId, category_id: categoryId }));
// display_name 直接用 I1 响应（entity_names 回退链已解析）；文案走 i18n ru 语言包，禁硬编码
```

## 收尾四件（缺一打回）

1. 文案全部入语言包（`src/i18n/{ru|zh}/`）；
2. 类型来自 `@/generated/api-types`；接口没建先走 `new-backend-viewset`（schema 三连）；
3. 状态反馈三态齐：loading（Spinner/DataTable loading）/ EmptyState / ErrorState（不展示技术堆栈）；
4. 商城页检查买家形态门控（guest/corporate 待审核），管理端检查 ACTION 权限码前端映射。

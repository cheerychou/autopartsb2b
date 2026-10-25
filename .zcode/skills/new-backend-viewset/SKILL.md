---
name: new-backend-viewset
description: 在 B1-RU 后端新建 API（ViewSet + serializer + URL）时使用。内嵌 RBAC 三件套、防 N+1、读写分离 serializer、域边界（catalog 只读）与 URL 注册护栏与代码骨架。当用户要求"新建接口/API/ViewSet""做一个 XX 的 CRUD""加一个 XX 接口"时触发。
---

# 新建后端接口（B1-RU ViewSet + serializer + URL）

为本项目后端生成符合规范的接口。**直接套用以下骨架**。护栏来自 `backend/CLAUDE.md` 与 29号契约。

## 何时使用 / 触发边界

- ✅ 新建 CRUD/只读接口（commerce 域居多）、I1/I2 目录查询扩展 → 用本 skill
- ❌ 存量接口加字段 → 只改 serializer(+模型)，然后走 `pre-check-before-pr` schema 三连；勿重写成骨架形态
- ❌ 改数据包导入协议（I3）/ 回流（I4）→ 高危域：先读 27号对应章节 + REVIEW.md 高危域清单，人工拍板后动手

## 动手前三个分岔口

| 分岔口 | 决策 | 依据 |
|---|---|---|
| 哪个模块 | 目录查询/适配/交叉号/类目 → catalog（只读）；商品/订单/库存/客户/赋码/对账 → commerce；两者都沾 → 拆开，commerce 持 catalog_spu_id 软引用 | 三铁律 1（根 CLAUDE.md） |
| 谁能看 | 管理端 → RBAC ACTION_PERMISSIONS；商城端 → 买家认证三形态（guest 匿名只读/individual/corporate 审核态） | backend/CLAUDE.md RBAC 章 |
| 数据来源 | 目录数据 → 查 catalog（禁止复制）；交易数据 → commerce 自有模型 | b1-guardrails |

## 骨架：ViewSet（commerce 示例）

```python
from rest_framework import viewsets
from shared.permissions import RoleBasedPermission

class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [RoleBasedPermission]

    ACTION_PERMISSIONS = {
        "list": "orders:read",
        "retrieve": "orders:read",
        "create": "orders:write",
        "update": "orders:write",
        "partial_update": "orders:write",
        "destroy": "orders:manage",
    }

    queryset = Order.objects.select_related("customer").prefetch_related("items__sku")  # 防 N+1

    def get_serializer_class(self):
        # 读写分离：写用重 serializer（校验全），读用轻 serializer（展示字段）
        return OrderWriteSerializer if self.action in {"create", "update", "partial_update"} else OrderReadSerializer
```

## 骨架：catalog 只读接口（I1 扩展示例）

```python
from rest_framework import viewsets
from catalog.services.fitment_query import FitmentQueryService

class CatalogFitmentViewSet(viewsets.GenericViewSet):
    """I1 目录查询：全端只读；鉴权在 storefront 层（guest 匿名放行由路由/中间件配置）"""
    permission_classes = []  # catalog 只读无 RBAC；敏感度由调用方门控（29号§一）

    def list(self, request):
        verified_only = request.query_params.get("include_unverified") != "true"  # data_steward 除外——鉴权在调用方
        svc = FitmentQueryService(verified_only=verified_only, locale=resolve_locale(request))
        ...
    # 响应包络：{"data": [...], "meta": {"total", "catalog_version", "locale"}}（29号§二）
    # 错误：scope 越界 410（27号§八）；display_name 走 entity_names 回退链 ru→en→zh
```

## 收尾三件（缺一打回）

1. URL 注册到 `config/urls.py`（前缀 `/catalog/v1/*` 或 `/api/v1/*`）；
2. schema 重导出 + 前端两应用类型再生成（`make schema`，见 pre-check skill 3.5 三连）；
3. 测试：`tests/` 加用例（factories.py 工厂；catalog 查询须含 verified 门控用例）。

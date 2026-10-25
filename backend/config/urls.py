"""B1-RU URL 注册（管理入口 + 双域路由挂载点）。"""

from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView

from commerce import urls as commerce_urls


def health(_request):
    """部署健康探针（deploy/ 交付单元使用）。"""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    # OpenAPI schema → 前端类型生成（make schema）
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    # 目录域只读接口（I1/I2，29号契约；匿名可查——买家门控在 storefront 层）
    path("catalog/v1/", include("catalog.urls")),
    # 交易域接口（commerce，RBAC 默认权限链）
    path("api/v1/", include("commerce.urls")),
    # S4 管理端：限时价下架/对账核销/发货（RBAC 默认链，高危域人工必审 REVIEW.md）
    path("api/v1/", include(commerce_urls.admin_patterns)),
    # 买家侧 storefront API（S3；游客匿名+三形态门控在视图层）
    path("storefront/v1/", include(commerce_urls.storefront_patterns)),
]

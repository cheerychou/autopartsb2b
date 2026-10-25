"""B1-RU URL 注册（管理入口 + 双域路由挂载点）。"""

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path
from drf_spectacular.views import SpectacularAPIView


def health(_request):
    """部署健康探针（deploy/ 交付单元使用）。"""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    # OpenAPI schema → 前端类型生成（make schema）
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    # 目录域只读接口（I1/I2，29号契约；视图随 S1 catalog 拷贝后挂载）
    # path("catalog/v1/", include("catalog.urls")),
    # 交易域接口（随 S2 挂载）
    # path("api/v1/", include("commerce.urls")),
]

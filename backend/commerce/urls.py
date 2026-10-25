"""commerce 管理端路由（前缀 /api/v1，RBAC 全局默认）。"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from commerce import views

router = DefaultRouter()
router.register("products", views.ProductViewSet, basename="products")
router.register("inventory", views.InventoryViewSet, basename="inventory")
router.register("buyer-accounts", views.BuyerAccountViewSet, basename="buyer-accounts")

urlpatterns = [path("", include(router.urls))]

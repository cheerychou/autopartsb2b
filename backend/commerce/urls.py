"""commerce 管理端路由（前缀 /api/v1，RBAC 全局默认）。"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from commerce import views, views_storefront

router = DefaultRouter()
router.register("products", views.ProductViewSet, basename="products")
router.register("inventory", views.InventoryViewSet, basename="inventory")
router.register("buyer-accounts", views.BuyerAccountViewSet, basename="buyer-accounts")

urlpatterns = [path("", include(router.urls))]

storefront_patterns = [
    path("auth/register", views_storefront.register),
    path("auth/login", views_storefront.login),
    path("store/products/<uuid:spu_id>", views_storefront.store_product),
    path("store/search/oe", views_storefront.store_search_oe),
    path("cart", views_storefront.cart_view),
    path("cart/add", views_storefront.cart_add),
    path("checkout", views_storefront.checkout),
    path("orders", views_storefront.my_orders),
    path("orders/<uuid:order_id>", views_storefront.my_order_detail),
    path("orders/<uuid:order_id>/confirm-receipt", views_storefront.confirm_receipt),
]

admin_patterns = [
    path("pricing/deactivate-expired", views.deactivate_expired_prices),
    path("orders/<uuid:order_id>/confirm-payment", views.confirm_payment),
    path("orders/<uuid:order_id>/ship", views.ship_order),
]

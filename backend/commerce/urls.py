"""commerce 管理端路由（前缀 /api/v1，RBAC 全局默认）。"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from commerce import views, views_codes, views_storefront

router = DefaultRouter()
router.register("products", views.ProductViewSet, basename="products")
router.register("inventory", views.InventoryViewSet, basename="inventory")
router.register("buyer-accounts", views.BuyerAccountViewSet, basename="buyer-accounts")
router.register("orders", views.OrderViewSet, basename="orders")

urlpatterns = [path("", include(router.urls))]

storefront_patterns = [
    path("auth/register", views_storefront.register),
    path("auth/login", views_storefront.login),
    path("store/products/<uuid:spu_id>", views_storefront.store_product),
    path("store/search/oe", views_storefront.store_search_oe),
    path("cart", views_storefront.cart_view),
    path("cart/add", views_storefront.cart_add),
    path("cart/remove", views_storefront.cart_remove),
    path("checkout", views_storefront.checkout),
    path("orders", views_storefront.my_orders),
    path("orders/<uuid:order_id>", views_storefront.my_order_detail),
    path("orders/<uuid:order_id>/confirm-receipt", views_storefront.confirm_receipt),
    path("orders/<uuid:order_id>/cancel", views_storefront.cancel_my_order),
]

admin_patterns = [
    # 管理端登录（SimpleJWT；仅管理角色——买家走 storefront 登录）
    path("auth/token", views.AdminTokenObtainPairView.as_view()),
    path("auth/token/refresh", TokenRefreshView.as_view()),
    path("pricing/deactivate-expired/", views.deactivate_expired_prices),
    path("orders/<uuid:order_id>/confirm-payment/", views.confirm_payment),
    path("orders/<uuid:order_id>/ship/", views.ship_order),
    # S5 N2 赋码（F-16/25号，导入式 v1）；POST /batches/=创建（既有契约），GET 列表另路
    path("batches/", views_codes.create_batch),
    path("batches/list/", views_codes.batch_list),
    path("batches/<str:batch_no>/codes/", views_codes.import_codes),
    path("batches/<str:batch_no>/print-list/", views_codes.print_list),
    path("batches/<str:batch_no>/receive/", views_codes.receive_batch),
    path("codes/outbound/", views_codes.outbound_codes),
    path("codes/return/", views_codes.return_codes),
    path("codes/aging/", views_codes.codes_aging),
    # F-17 报表
    path("reports/sales/", views_codes.report_sales),
    path("reports/slow-movers/", views_codes.report_slow_movers),
    path("reports/catalog-coverage/", views_codes.report_catalog_coverage),
    path("reports/codes-aging/", views_codes.report_codes_aging),
]

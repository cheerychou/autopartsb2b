"""I1/I2 路由（前缀 /catalog/v1，29号§二）。"""

from django.urls import path

from catalog import views

urlpatterns = [
    path("brands", views.brands),
    path("brands/<uuid:brand_id>/series", views.series),
    path("series/<uuid:series_id>/models", views.models),
    path("categories/tree", views.categories_tree),
    path("fitments", views.fitments),
    path("search/oe", views.search_oe),
    path("spus/<uuid:spu_id>", views.spu_detail),
    path("spus/<uuid:spu_id>/interchanges", views.spu_interchanges),
    path("picker/candidates", views.picker_candidates),
]

"""commerce 的 Django app 配置。"""

from django.apps import AppConfig


class CommerceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "commerce"
    verbose_name = "交易域"

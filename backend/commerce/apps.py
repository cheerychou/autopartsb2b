"""commerce app 配置。"""

from django.apps import AppConfig


class CommerceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "commerce"
    verbose_name = "交易域"

    def ready(self):
        # 拆分模型文件显式注册（同 catalog；KNW-B1-EXP-004）
        import commerce.models_codes  # noqa: F401
        import commerce.models_customer  # noqa: F401
        import commerce.models_order  # noqa: F401
        import commerce.models_product  # noqa: F401

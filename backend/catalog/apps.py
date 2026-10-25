"""catalog 的 Django app 配置。

label="data_platform" 是受控拷贝的接入适配（copy-ledger R-A1）：拷贝模型的 FK 字符串
引用（"data_platform.SPU" 等）与显式 db_table 前缀保持与 CDD3 上游一致，保证可合并性。

ready() 显式导入各模型模块——机制承 CDD3 DataPlatformConfig.ready()（Django 只自动
发现 models.py，models_* 拆分文件必须显式注册）。
"""

from django.apps import AppConfig


class CatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "catalog"
    label = "data_platform"
    verbose_name = "目录域（CDD3 受控派生，只读）"

    def ready(self):
        import catalog.models  # noqa: F401
        import catalog.models_category  # noqa: F401
        import catalog.models_epc  # noqa: F401
        import catalog.models_fitment  # noqa: F401
        import catalog.models_pack_log  # noqa: F401  (本仓扩展表，非拷贝)
        import catalog.models_padb  # noqa: F401
        import catalog.models_product  # noqa: F401
        import catalog.models_terminology  # noqa: F401
        import catalog.models_vin_cache  # noqa: F401

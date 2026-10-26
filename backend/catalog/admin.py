"""Django admin 注册（D6-A 兜底界面：F-23 补录暂存 + entity_names 维护）。

范围纪律：仅注册数据员（data_steward）兜底工作所需的模型；目录 hub 数据模型
（SPU/Brand/车型/适配）**不注册**——hub 只读纪律（铁律 1：对 hub 数据
UPDATE/DELETE 禁止，纠错走暂存+回流），防止 admin 误改主数据。
正式 F-24 界面路线见 docs/engineering/B1RU-ENG-002（admin 兜底 → 同域轻页面）。
"""

from django.contrib import admin

from catalog.models_entity_names import EntityName
from catalog.models_staging import StagedFitment


@admin.register(StagedFitment)
class StagedFitmentAdmin(admin.ModelAdmin):
    """补录暂存行：数据员兜底录入/维护（list 过滤状态；status 迁移仍走导出流程）。"""

    list_display = ("spu", "status", "year_from", "year_to", "created_at")
    list_filter = ("status",)
    search_fields = ("spu__spu_code", "spu__spu_name", "note")


@admin.register(EntityName)
class EntityNameAdmin(admin.ModelAdmin):
    """entity_names 维护：ru 语料兜底增改（回退链数据源，27号定稿）。"""

    list_display = ("entity_type", "entity_id", "locale", "name_type", "name", "status")
    list_filter = ("entity_type", "locale", "name_type", "status")
    search_fields = ("entity_id", "name")

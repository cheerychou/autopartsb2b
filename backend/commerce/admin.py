"""Django admin 注册（D6-A 兜底界面：批次/码实例运营查视）。

ImportBatch 可编辑（补录报关单号等运营字段）；CodeInstance 只读——码实例状态
迁移只经服务层（N2 纪律），admin 改状态=绕过状态机，禁止。
"""

from django.contrib import admin

from commerce.models_codes import CodeInstance, ImportBatch


@admin.register(ImportBatch)
class ImportBatchAdmin(admin.ModelAdmin):
    list_display = ("batch_no", "customs_declaration", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("batch_no", "customs_declaration")


@admin.register(CodeInstance)
class CodeInstanceAdmin(admin.ModelAdmin):
    """只读查视：状态列供运营核对（编辑禁用——状态机唯一入口是服务层）。"""

    list_display = ("code_value", "product", "batch", "state")
    list_filter = ("state",)
    search_fields = ("code_value",)

    def has_change_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

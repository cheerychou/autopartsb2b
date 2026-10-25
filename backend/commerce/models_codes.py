"""N2 赋码模型（Честный знак 导入式，25号§2.6 规格；S5/DoD 4）。

品类范围=可配置字典（✅裁定 7：ТН ВЭД 匹配，扩围只改字典不改代码）；
码实例状态机（25号§2.3）：
    ordered(订码) → labelled(已贴码，报关前·中国侧) → in_stock(入转·收货验码)
    → outbound(出转·销售核销) → returned(退回) → in_stock(重新入转可再售)
状态迁移只经 services_codes 的方法（backend/CLAUDE.md：禁止裸改状态字段）。
ЧЗ API 直连（订码缓冲/入转/出转/退货重入转）为 P1——v1 导入式先行（码清单进出）。
"""

from django.db import models

from commerce.models_product import Product


class MarkedCategoryDict(models.Model):
    """赋码品类字典：ТН ВЭД 前缀命中即受控（25号§2.2 清单；扩围改字典）。"""

    tnved_prefix = models.CharField(max_length=10, unique=True, verbose_name="ТН ВЭД 前缀")
    category_label = models.CharField(
        max_length=100, verbose_name="品类名", help_text="如 滤清器/火花塞/刹车盘片/轮毂/玻璃"
    )
    is_active = models.BooleanField(default=True, verbose_name="生效")

    class Meta:
        db_table = "commerce_marked_category"
        ordering = ["tnved_prefix"]

    @classmethod
    def is_marked(cls, harmonized_code: str) -> bool:
        """按 HS/ТН ВЭД 前缀匹配（最长前缀命中）。"""
        code = (harmonized_code or "").replace(" ", "")
        for row in cls.objects.filter(is_active=True).order_by("-tnved_prefix"):
            if code.startswith(row.tnved_prefix):
                return True
        return False

    def __str__(self):
        return f"{self.tnved_prefix} {self.category_label}"


class ImportBatch(models.Model):
    """进口批次（25号§2.6：报关单关联 + 码清单导入 + 收货核对）。"""

    class Status(models.TextChoices):
        LABELED = "labeled", "已贴码(报关前)"
        IN_STOCK = "in_stock", "已入境入库"
        CLOSED = "closed", "已结清"

    batch_id = models.UUIDField(primary_key=True, editable=False)
    batch_no = models.CharField(max_length=32, unique=True, verbose_name="批次号")
    customs_declaration = models.CharField(
        max_length=64, blank=True, default="", verbose_name="报关单号"
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.LABELED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "commerce_import_batch"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.batch_no}[{self.status}]"


class CodeInstance(models.Model):
    """码实例：受控品类每件商品的物理码（一物一码；状态机见模块 docstring）。"""

    class State(models.TextChoices):
        ORDERED = "ordered", "已订码"
        LABELLED = "labelled", "已贴码"
        IN_STOCK = "in_stock", "在库"
        OUTBOUND = "outbound", "已出转"
        RETURNED = "returned", "已退回"

    code_id = models.UUIDField(primary_key=True, editable=False)
    code_value = models.CharField(max_length=200, unique=True, verbose_name="DataMatrix 内容")
    gtin = models.CharField(max_length=14, blank=True, default="")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="code_instances")
    batch = models.ForeignKey(ImportBatch, on_delete=models.PROTECT, related_name="codes")
    state = models.CharField(max_length=10, choices=State.choices, default=State.ORDERED)
    order = models.ForeignKey(
        "commerce.Order",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="codes",
        verbose_name="销售订单（出转关联）",
    )
    state_changed_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "commerce_code_instance"
        indexes = [models.Index(fields=["state"]), models.Index(fields=["batch"])]

    def __str__(self):
        return f"{self.code_value[:24]}…[{self.state}]"

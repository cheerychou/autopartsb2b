"""commerce 商品模型（F-10 商品管理）。

域边界（三铁律 1）：
- 本表引用目录件用 catalog_spu_id **UUID 软引用**（非硬 FK——域解耦，29号§四 I2-2）；
  完整性由选件回填时的存在性校验保证，不靠数据库约束；
- 价格/库存/限时价/图片/俄语文案全部在本域，禁止回查复制目录数据；
- N2 赋码相关字段（GTIN/HS 码）从 I1 响应回填，来源仍是 catalog SPU（不入包语义见 27号）。
"""

from django.db import models


class Product(models.Model):
    """可售商品：目录件（catalog_spu_id）+ 运营信息（价格/库存/限时价/文案）。

    30 天限时价（✅裁定 2/26号 F-11）：price_amount + price_starts_at + price_expires_at；
    到期自动下价由服务层方法处理（F-11 引擎，S4）。
    """

    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "待审核"
        APPROVED = "approved", "已认证"
        REJECTED = "rejected", "已驳回"

    product_id = models.UUIDField(primary_key=True, editable=False)
    product_code = models.CharField(max_length=16, unique=True, verbose_name="商品编码")

    # 目录件软引用（29号 I2-2：回填时校验存在且在 scope 内，410 拒绝）
    catalog_spu_id = models.UUIDField(db_index=True, verbose_name="目录 SPU ID")
    catalog_version_at_listing = models.CharField(
        max_length=64,
        blank=True,
        default="",
        verbose_name="上架时的数据包版本",
        help_text="选件回填时点的 catalog_version，供追溯（软引用不锁定历史版本）",
    )

    # 俄语商城文案（commerce 自有数据，B 类——不入包，22号§二）
    title_ru = models.CharField(max_length=300, verbose_name="俄语标题")
    description_ru = models.TextField(blank=True, default="", verbose_name="俄语详情")

    price_amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="限时价(₽)")
    price_starts_at = models.DateTimeField(null=True, blank=True, verbose_name="价格生效")
    price_expires_at = models.DateTimeField(verbose_name="价格到期（30 天限时价）")

    # N2 赋码（25号§2.6）：品类字典匹配在赋码模块（S5），此处只存回填结果
    gtin = models.CharField(max_length=14, blank=True, default="", verbose_name="GTIN")
    harmonized_code = models.CharField(
        max_length=15, blank=True, default="", verbose_name="HS编码(ТН ВЭД)"
    )

    is_listed = models.BooleanField(default=False, verbose_name="上架")
    listed_at = models.DateTimeField(null=True, blank=True, verbose_name="上架时间")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "commerce_product"
        ordering = ["-created_at"]
        # 一个目录件同时只挂一个可售商品（storefront offer 查询单值语义；
        # 评审二节：若一对一是有意设计就该上 unique）
        constraints = [
            models.UniqueConstraint(fields=["catalog_spu_id"], name="uniq_product_catalog_spu"),
        ]
        indexes = [models.Index(fields=["catalog_spu_id"]), models.Index(fields=["is_listed"])]

    def __str__(self):
        return f"{self.product_code} · {self.title_ru}"


class InventoryItem(models.Model):
    """库存（F-12）：出入库记账用 warehouse 域模型模式（CDD3 复用判定，23号§七）。

    v1 最小形态：按商品记账可用量；出入库流水在 InventoryTransaction（不可变 append-only）。
    对接客户自有仓（26号§五.4：不做自营 WMS）——本表是商城可售口径的账，不是仓内实物账。
    """

    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="inventory")
    quantity_available = models.IntegerField(default=0, verbose_name="可售数量")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "commerce_inventory"

    def __str__(self):
        return f"{self.product.product_code} × {self.quantity_available}"


class InventoryTransaction(models.Model):
    """出入库流水（append-only，禁止 UPDATE/DELETE——对账依据）。"""

    class TxType(models.TextChoices):
        INBOUND = "inbound", "入库"
        OUTBOUND = "outbound", "出库"
        ADJUST = "adjust", "调整"

    tx_id = models.UUIDField(primary_key=True, editable=False)
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="transactions")
    tx_type = models.CharField(max_length=8, choices=TxType.choices)
    quantity = models.IntegerField(verbose_name="数量（出库为负）")
    balance_after = models.IntegerField(verbose_name="变动后余额")
    note = models.CharField(max_length=200, blank=True, default="")
    created_by = models.ForeignKey("auth.User", null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "commerce_inventory_tx"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_tx_type_display()} {self.quantity} · {self.product.product_code}"

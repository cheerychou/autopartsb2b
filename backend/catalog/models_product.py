"""
商品模型 - 管理SPU/SKU商品信息、适配关系
"""

import uuid

from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Q

from .choices import SOURCE_TIER_CHOICES, STATUS_CHOICES, VERIFIED_STATUS_CHOICES
from .models import ProprietaryTier

User = get_user_model()


class SPU(models.Model):
    """
    SPU（Standard Product Unit）- 标准产品单元
    管理商品的基础信息，不包含销售属性
    """

    PRODUCT_TYPE_CHOICES = [
        ("part", "零部件"),
        ("accessory", "配件"),
        ("consumable", "耗材"),
        ("tool", "工具"),
        ("equipment", "设备"),
        ("material", "材料"),
    ]

    spu_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="SPU主键")
    spu_code = models.CharField(max_length=7, unique=True, verbose_name="SPU编码")
    spu_name = models.CharField(max_length=200, verbose_name="SPU名称")
    spu_name_en = models.CharField(
        max_length=200, blank=True, null=True, verbose_name="SPU英文名称"
    )
    spu_alias = models.JSONField(default=list, blank=True, verbose_name="SPU别名")
    brand_id = models.ForeignKey(
        "data_platform.Brand",
        on_delete=models.CASCADE,
        verbose_name="所属品牌ID",
        related_name="spus",
    )
    product_type = models.CharField(
        max_length=20, choices=PRODUCT_TYPE_CHOICES, verbose_name="商品类型"
    )
    spu_status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="draft", verbose_name="SPU状态"
    )
    data_source = models.CharField(max_length=50, default="manual", verbose_name="数据源标识")
    crawl_time = models.DateTimeField(null=True, blank=True, verbose_name="采集时间")
    standardized = models.BooleanField(default=False, verbose_name="标准化状态")
    data_hash = models.CharField(max_length=64, blank=True, verbose_name="哈希标识")

    spu_description = models.TextField(blank=True, null=True, verbose_name="SPU描述")
    spu_keywords = models.JSONField(default=list, blank=True, verbose_name="SPU关键词")
    spu_image = models.JSONField(default=list, blank=True, verbose_name="SPU图片列表")
    spu_video = models.URLField(blank=True, null=True, verbose_name="SPU视频URL")
    spu_documents = models.JSONField(default=list, blank=True, verbose_name="SPU文档列表")
    base_attributes = models.JSONField(default=dict, blank=True, verbose_name="基础属性")
    # 品类冗余索引（PRD-DP-VHC-004 M3/D3）：适用品类范围，跨品类件多值；
    # 加速过滤用，适配真值仍以 SPUFitment→车型链推导为准，冲突时以 fitment 为准
    applicable_vehicle_classes = models.JSONField(
        default=list,
        blank=True,
        verbose_name="适用品类范围",
        help_text="取值 = VehicleClass 枚举（passenger/bus/light_truck/medium_truck/heavy_truck/trailer/motorcycle/powersports）",
    )
    proprietary_tier = models.CharField(
        max_length=20,
        choices=ProprietaryTier.choices,
        default=ProprietaryTier.PUBLIC,
        verbose_name="专有级别",
        help_text="REF-DP-STD-005：数据资产授权治理维度；17VIN 预采集链路写入 third_party_paid",
    )
    technical_parameters = models.JSONField(default=dict, blank=True, verbose_name="技术参数")
    quality_standard = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="质量标准"
    )
    certification_info = models.JSONField(default=list, blank=True, verbose_name="认证信息")
    warranty_info = models.JSONField(default=dict, blank=True, verbose_name="质保信息")

    # ---- PIES P0 字段 ----
    gtin = models.CharField(
        max_length=14,
        blank=True,
        null=True,
        verbose_name="GTIN/UPC/EAN",
        help_text="国际商品条码",
    )
    harmonized_code = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        verbose_name="HS编码",
        help_text="海关协调编码 Harmonized System Code",
    )
    moq = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="最小起订量",
        help_text="Minimum Order Quantity",
    )

    # ---- OE 号(FND-DS-CH-002 §6:OE 号在 SPU 层,与 OEM 品牌共同构成 SPU 同一性)----
    oe_number = models.CharField(
        max_length=100,
        blank=True,
        default="",
        db_index=True,
        verbose_name="OE号",
        help_text="该 SPU 对应的原厂零件编号(OEM 定义);同一 OEM + 同一 OE 号 = 同一 SPU",
    )

    sort_weight = models.IntegerField(default=0, verbose_name="排序权重")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_spus",
        verbose_name="创建人",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="updated_spus",
        verbose_name="更新人",
    )

    class Meta:
        db_table = "data_platform_spu"
        verbose_name = "SPU"
        verbose_name_plural = "SPU"
        ordering = ["sort_weight", "spu_code"]
        indexes = [
            models.Index(fields=["spu_code"]),
            models.Index(fields=["spu_name"]),
            models.Index(fields=["brand_id"]),
            models.Index(fields=["product_type"]),
            models.Index(fields=["spu_status"]),
            models.Index(fields=["gtin"]),
            models.Index(fields=["harmonized_code"]),
            models.Index(fields=["oe_number"]),
            # D1b/D2a 批：导入命令逐行 data_hash 定位（81,594+406,360 行）；
            # 生产已手工 CONCURRENTLY 补建同名索引，此声明使模型/migration 与物理对齐
            models.Index(fields=["data_hash"], name="data_plat_spu_data_hash_idx"),
        ]
        constraints = [
            # R1(FND-DS-CH-002 §4.2):SPU 同一性 = (OEM, OE) 二元组
            # 同一 OEM + 同一 OE 号 = 同一 SPU;condition 排除空串(过渡期未回填的 SPU)
            models.UniqueConstraint(
                fields=["brand_id", "oe_number"],
                condition=~Q(oe_number=""),
                name="uniq_spu_brand_oe_number",
            ),
        ]

    def __str__(self):
        return f"{self.spu_code} - {self.spu_name}"


class SKU(models.Model):
    """
    SKU（Stock Keeping Unit）- 库存单元
    继承SPU的基础属性，扩展销售属性
    """

    sku_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="SKU主键")
    sku_code = models.CharField(max_length=8, unique=True, verbose_name="SKU编码")
    sku_name = models.CharField(max_length=200, verbose_name="SKU名称")
    sku_name_en = models.CharField(
        max_length=200, blank=True, null=True, verbose_name="SKU英文名称"
    )
    sku_status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="draft", verbose_name="SKU状态"
    )
    data_source = models.CharField(max_length=50, default="manual", verbose_name="数据源标识")
    crawl_time = models.DateTimeField(null=True, blank=True, verbose_name="采集时间")
    standardized = models.BooleanField(default=False, verbose_name="标准化状态")
    data_hash = models.CharField(max_length=64, blank=True, verbose_name="哈希标识")

    sales_attributes = models.JSONField(default=dict, blank=True, verbose_name="销售属性")
    sku_image = models.JSONField(default=list, blank=True, verbose_name="SKU图片列表")
    sku_description = models.TextField(blank=True, null=True, verbose_name="SKU描述")
    sku_specifications = models.JSONField(default=dict, blank=True, verbose_name="SKU规格")
    barcode = models.CharField(max_length=50, blank=True, null=True, verbose_name="条形码")
    qr_code = models.CharField(max_length=50, blank=True, null=True, verbose_name="二维码")
    weight = models.DecimalField(
        max_digits=10, decimal_places=3, null=True, blank=True, verbose_name="重量(kg)"
    )
    volume = models.DecimalField(
        max_digits=10, decimal_places=3, null=True, blank=True, verbose_name="体积(m³)"
    )
    length = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="长度(cm)"
    )
    width = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="宽度(cm)"
    )
    height = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="高度(cm)"
    )
    package_type = models.CharField(max_length=50, blank=True, null=True, verbose_name="包装类型")
    package_quantity = models.IntegerField(null=True, blank=True, verbose_name="包装数量")

    # ---- PIES P0 字段 ----
    gtin = models.CharField(
        max_length=14,
        blank=True,
        null=True,
        verbose_name="SKU级GTIN",
        help_text="该SKU的国际商品条码",
    )
    country_of_origin = models.CharField(
        max_length=3,
        blank=True,
        null=True,
        verbose_name="原产国",
        help_text="ISO 3166-1 alpha-3",
    )

    sort_weight = models.IntegerField(default=0, verbose_name="排序权重")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_skus",
        verbose_name="创建人",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="updated_skus",
        verbose_name="更新人",
    )

    # ---- 多品牌 SKU 适配链路（VIN → OE → 多品牌 SKU）----
    # SKU 自己的品牌（区别于 SPU 的品牌——一个 SPU 下可有不同品牌的 SKU）
    sku_brand = models.ForeignKey(
        "data_platform.Brand",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="skus",
        verbose_name="SKU品牌",
        help_text="SKU 自有品牌（如博世/TRW/Brembo），为空时继承 SPU 品牌",
    )
    # 生产厂号（制造商零件号，如博世 0986AB4765）
    manufacturer_part_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="生产厂号",
        db_index=True,
        help_text="制造商零件号（Mfr Part Number）",
    )
    # 来源权威性档位（FND-DS-CH-003 公理②）
    # T0=OEM 原厂件，T1=Tier1 供应商，T2=逆向小厂（默认）
    # 判定：品牌为主（按 sku_brand）+ 来源微调（按 data_source）
    source_tier = models.CharField(
        max_length=2,
        choices=SOURCE_TIER_CHOICES,
        default="T2",
        verbose_name="来源权威性",
        help_text="T0=OEM原厂件 / T1=Tier1供应商 / T2=逆向小厂（默认）",
    )

    class Meta:
        db_table = "data_platform_sku"
        verbose_name = "SKU"
        verbose_name_plural = "SKU"
        ordering = ["sort_weight", "sku_code"]
        indexes = [
            models.Index(fields=["sku_code"]),
            models.Index(fields=["sku_name"]),
            models.Index(fields=["sku_status"]),
            models.Index(fields=["barcode"]),
            models.Index(fields=["qr_code"]),
            models.Index(fields=["gtin"]),
            models.Index(fields=["sku_brand"]),
            models.Index(fields=["manufacturer_part_number"]),
            models.Index(fields=["source_tier"]),
        ]

    @property
    def primary_spu(self):
        """主 SPU（FND-DS-CH-004 §6.3 primary_spu 推导策略）

        is_primary 已删除（公理④），用 verified_status 推导主 SPU:
        verified > unverified > disputed（取最可信的关联作主）。

        注意:此 property 会产生查询，**不应在循环里调用**。
        批量场景用 prefetch_related(Prefetch("spu_links", ...)) 预加载。
        """
        link = self.spu_links.select_related("spu__brand_id").order_by("-verified_status").first()
        return link.spu if link else None

    @property
    def spus(self):
        """所有关联的 SPU（N:M）"""
        return SPU.objects.filter(sku_links__sku=self)

    def __str__(self):
        return f"{self.sku_code} - {self.sku_name}"


class SPUSKUMapping(models.Model):
    """
    SPU-SKU 多对多关联表

    FND-DS-CH-003 公理③:SPU 与 SKU 是多对多关系（N:M）
    FND-DS-CH-003 公理④:关联必须带验证状态（SPU 是数据治理权威基准）
    FND-DS-CH-002 §1.1 (v0.3):替代旧的 SKU.spu_id 单值外键
    FND-DS-CH-004 §4:N:M 关联表设计

    设计原则:映射表 + 验证状态。
    - 权威性在 SKU.source_tier（公理②，商品本身的权威）
    - 验证状态在本表 verified_status（公理④，关联的可信度）
    - 两者正交:商品权威 ≠ 关联权威
    - 不存 is_primary（"主 SPU"无业务根基，已删除，见 FND-DS-CH-003 §2.4.2）
    """

    link_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="关联主键")
    spu = models.ForeignKey(
        SPU,
        on_delete=models.CASCADE,
        related_name="sku_links",
        verbose_name="SPU",
    )
    sku = models.ForeignKey(
        SKU,
        on_delete=models.CASCADE,
        related_name="spu_links",
        verbose_name="SKU",
    )
    verified_status = models.CharField(
        max_length=12,
        choices=VERIFIED_STATUS_CHOICES,
        default="unverified",
        db_index=True,
        verbose_name="验证状态",
        help_text="unverified=待验证 / verified=已验证 / disputed=有争议",
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_spu_sku_mapping"
        verbose_name = "SPU-SKU关联"
        verbose_name_plural = "SPU-SKU关联"
        ordering = ["spu", "sort_order", "link_id"]
        indexes = [
            models.Index(fields=["spu"]),
            models.Index(fields=["sku"]),
            models.Index(fields=["verified_status"]),
        ]
        constraints = [
            # 防止同一对 SPU-SKU 重复关联
            models.UniqueConstraint(
                fields=["spu", "sku"],
                name="uniq_spu_sku",
            ),
        ]

    def __str__(self):
        return f"{self.spu.spu_code} ↔ {self.sku.sku_code} [{self.verified_status}]"


class PackageLevel(models.Model):
    """
    PIES Package Segment — 包装层级
    每个 SKU 可定义 4 层包装：单品 → 内包 → 箱包 → 托盘
    """

    LEVEL_CHOICES = [
        ("EACH", "单品"),
        ("INNER", "内包装"),
        ("CASE", "箱包装"),
        ("PALLET", "托盘"),
    ]

    package_level_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, verbose_name="包装层级主键"
    )
    sku_id = models.ForeignKey(
        SKU,
        on_delete=models.CASCADE,
        verbose_name="所属SKU",
        related_name="package_levels",
    )
    level = models.CharField(
        max_length=10,
        choices=LEVEL_CHOICES,
        verbose_name="包装层级",
    )
    quantity_per_parent = models.IntegerField(
        default=1,
        verbose_name="上级包含数量",
        help_text="该层级的一级包装含多少个本级单元",
    )
    length = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="长度(mm)",
    )
    width = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="宽度(mm)",
    )
    height = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="高度(mm)",
    )
    net_weight = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name="净重(g)",
    )
    gross_weight = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name="毛重(g)",
    )
    gtin = models.CharField(
        max_length=14,
        blank=True,
        null=True,
        verbose_name="包装级GTIN",
        help_text="该包装层级的独立 GTIN",
    )
    is_fragile = models.BooleanField(
        default=False,
        verbose_name="易碎品",
    )
    is_stackable = models.BooleanField(
        default=True,
        verbose_name="可堆叠",
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_package_level"
        verbose_name = "包装层级"
        verbose_name_plural = "包装层级"
        ordering = ["sku_id", "sort_order", "level"]
        indexes = [
            models.Index(fields=["sku_id"]),
            models.Index(fields=["gtin"]),
        ]

    def __str__(self):
        return f"{self.sku_id.sku_code} [{self.level}]"


class SPUInterchange(models.Model):
    """
    SPU 互换关系(FND-DS-CH-002 §7.2:互换挂 SPU 层,不是 SKU 层)
    EA-DA-010 G3:本表替代旧 ProductInterchange(SKU↔SKU),改为 SPU↔SPU
    """

    INTERCHANGE_TYPE_CHOICES = [
        ("OE_TO_AFTERMARKET", "OE转售后"),
        ("CROSS_BRAND", "跨品牌互换"),
        ("SUPERSESSION", "新旧替代"),
    ]

    DIRECTION_CHOICES = [
        ("ONE_WAY", "单向"),
        ("TWO_WAY", "双向"),
    ]

    interchange_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        verbose_name="互换关系主键",
    )
    source_spu = models.ForeignKey(
        SPU,
        on_delete=models.CASCADE,
        related_name="source_interchanges",
        verbose_name="源SPU",
        help_text="被替换的 SPU",
    )
    target_spu = models.ForeignKey(
        SPU,
        on_delete=models.CASCADE,
        related_name="target_interchanges",
        verbose_name="目标SPU",
        help_text="替换成的 SPU",
    )
    interchange_type = models.CharField(
        max_length=20,
        choices=INTERCHANGE_TYPE_CHOICES,
        verbose_name="互换类型",
    )
    direction = models.CharField(
        max_length=10,
        choices=DIRECTION_CHOICES,
        default="TWO_WAY",
        verbose_name="互换方向",
    )
    qualifier = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="限定条件",
        help_text="互换适用的限定条件(如仅限特定车型/年款)",
    )
    priority = models.IntegerField(
        default=0,
        verbose_name="推荐优先级",
        help_text="数值越大优先级越高",
    )
    verified_by = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="验证来源",
    )
    interchange_status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="active",
        verbose_name="互换状态",
    )
    notes = models.TextField(blank=True, null=True, verbose_name="备注说明")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_spu_interchanges",
        verbose_name="创建人",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="updated_spu_interchanges",
        verbose_name="更新人",
    )

    class Meta:
        db_table = "data_platform_spu_interchange"
        verbose_name = "SPU互换"
        verbose_name_plural = "SPU互换"
        ordering = ["priority", "interchange_id"]
        indexes = [
            models.Index(fields=["source_spu"]),
            models.Index(fields=["target_spu"]),
            models.Index(fields=["interchange_type"]),
        ]
        constraints = [
            # 防止同一对 SPU 重复关联
            # (ONE_WAY 时 (A→B) 和 (B→A) 视为不同关系,二元组唯一即可)
            models.UniqueConstraint(
                fields=["source_spu", "target_spu"],
                name="uniq_spu_interchange_pair",
            ),
        ]

    def __str__(self):
        arrow = "→" if self.direction == "ONE_WAY" else "↔"
        return f"{self.source_spu.spu_code} {arrow} {self.target_spu.spu_code} [{self.interchange_type}]"


class ProductAsset(models.Model):
    """
    PIES Digital Assets Segment — 产品数字资产
    管理产品图片、视频、文档、3D 模型等数字资源
    """

    ASSET_TYPE_CHOICES = [
        ("IMAGE", "图片"),
        ("VIDEO", "视频"),
        ("DOCUMENT", "文档"),
        ("3D_MODEL", "3D模型"),
        ("DIAGRAM", "安装图/示意图"),
    ]

    ASSET_PURPOSE_CHOICES = [
        ("PRIMARY", "主图"),
        ("GALLERY", "图库"),
        ("INSTALLATION", "安装说明"),
        ("SPECIFICATION", "规格参数图"),
        ("COMPARISON", "对比图"),
        ("PACKAGING", "包装图"),
        ("CERTIFICATE", "证书/认证"),
        ("OTHER", "其他"),
    ]

    asset_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        verbose_name="资产主键",
    )
    owner_type = models.CharField(
        max_length=10,
        choices=[("SPU", "SPU"), ("SKU", "SKU")],
        verbose_name="归属类型",
        help_text="资产归属 SPU 还是 SKU",
    )
    spu = models.ForeignKey(
        SPU,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="assets",
        verbose_name="关联SPU",
    )
    sku = models.ForeignKey(
        SKU,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="assets",
        verbose_name="关联SKU",
    )
    asset_type = models.CharField(
        max_length=15,
        choices=ASSET_TYPE_CHOICES,
        verbose_name="资产类型",
    )
    asset_purpose = models.CharField(
        max_length=15,
        choices=ASSET_PURPOSE_CHOICES,
        default="GALLERY",
        verbose_name="资产用途",
    )
    file_url = models.URLField(verbose_name="文件URL")
    file_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="原始文件名",
    )
    file_size = models.BigIntegerField(
        null=True,
        blank=True,
        verbose_name="文件大小(字节)",
    )
    mime_type = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="MIME类型",
    )
    width = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="宽度(px)",
        help_text="图片/视频宽度",
    )
    height = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="高度(px)",
        help_text="图片/视频高度",
    )
    duration = models.FloatField(
        null=True,
        blank=True,
        verbose_name="时长(秒)",
        help_text="视频/音频时长",
    )
    thumbnail_url = models.URLField(
        blank=True,
        null=True,
        verbose_name="缩略图URL",
    )
    alt_text = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="替代文本",
        help_text="无障碍描述文本",
    )
    caption = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="图注/标题",
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序权重")
    is_featured = models.BooleanField(
        default=False,
        verbose_name="是否精选",
        help_text="标记为精选/封面资产",
    )
    asset_status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="active",
        verbose_name="资产状态",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_assets",
        verbose_name="创建人",
    )

    class Meta:
        db_table = "data_platform_product_asset"
        verbose_name = "产品资产"
        verbose_name_plural = "产品资产"
        ordering = ["owner_type", "sort_order", "asset_id"]
        indexes = [
            models.Index(fields=["spu"]),
            models.Index(fields=["sku"]),
            models.Index(fields=["asset_type"]),
            models.Index(fields=["asset_purpose"]),
            models.Index(fields=["is_featured"]),
        ]

    def __str__(self):
        owner = self.spu_code_display or self.sku_code_display or "—"
        return f"{owner} [{self.asset_type}] {self.file_name or self.file_url[:30]}"

    @property
    def spu_code_display(self):
        return self.spu.spu_code if self.spu else None

    @property
    def sku_code_display(self):
        return self.sku.sku_code if self.sku else None


class PriceBreak(models.Model):
    """
    PIES Price Break Segment — 阶梯价格
    按购买数量区间定义不同价格层级
    """

    PRICE_TYPE_CHOICES = [
        ("LIST", "零售价/目录价"),
        ("WHOLESALE", "批发价"),
        ("COST", "成本价"),
        ("MAP", "最低广告价"),
        ("MSRP", "建议零售价"),
        ("TRANSFER", "调拨价"),
        ("DEALER_4S", "4S店原厂价"),
    ]

    CURRENCY_CHOICES = [
        ("CNY", "人民币"),
        ("USD", "美元"),
        ("EUR", "欧元"),
    ]

    UOM_CHOICES = [
        ("EA", "每个"),
        ("SET", "每套"),
        ("PAIR", "每对"),
        ("BOX", "每盒"),
        ("CASE", "每箱"),
    ]

    price_break_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        verbose_name="阶梯价格主键",
    )
    sku = models.ForeignKey(
        SKU,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="price_breaks",
        verbose_name="关联SKU",
    )
    # ---- 17VIN 4S 价资产模式（EA-DA-004 PA2）----
    # 4S 价（=原厂件价）采集自 4006，按 OE 号查询。
    # owner_type=SKU 但 sku 可空（原厂 SKU 尚未建好时价格先沉淀，
    # 待 OE→SKU 解析后回填 sku FK）。
    oe_number = models.CharField(
        max_length=100,
        blank=True,
        default="",
        db_index=True,
        verbose_name="OE号",
        help_text="4S价采集来源 OE 号（资产模式下作查询键，=原厂 manufacturer_part_number）",
    )
    supplier_brand = models.ForeignKey(
        "data_platform.Brand",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="dealer_4s_prices",
        verbose_name="4S报价品牌",
        help_text="4006 返回的 Brand，关联 autohome 品牌库（匹配不到则为空）",
    )
    supplier_brand_text = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="4S报价品牌名",
        help_text="4006 返回的 Brand 原文（关联不到 Brand 表时的兜底）",
    )
    price_type = models.CharField(
        max_length=10,
        choices=PRICE_TYPE_CHOICES,
        verbose_name="价格类型",
    )
    currency = models.CharField(
        max_length=3,
        choices=CURRENCY_CHOICES,
        default="CNY",
        verbose_name="币种",
    )
    price_uom = models.CharField(
        max_length=10,
        choices=UOM_CHOICES,
        default="EA",
        verbose_name="计价单位",
    )
    break_quantity = models.IntegerField(
        verbose_name="起始数量",
        help_text="该价格生效的最低购买数量",
    )
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="单价",
    )
    effective_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="生效日期",
    )
    expiry_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="失效日期",
    )
    price_status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="active",
        verbose_name="价格状态",
    )
    proprietary_tier = models.CharField(
        max_length=20,
        choices=ProprietaryTier.choices,
        default=ProprietaryTier.THIRD_PARTY_PAID,
        verbose_name="专有级别",
        help_text="PriceBreak 全量来自 17VIN 付费采集（4S 价 4006），默认 third_party_paid（REF-DP-STD-005）",
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_price_breaks",
        verbose_name="创建人",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="updated_price_breaks",
        verbose_name="更新人",
    )

    class Meta:
        db_table = "data_platform_price_break"
        verbose_name = "阶梯价格"
        verbose_name_plural = "阶梯价格"
        ordering = ["price_type", "break_quantity"]
        indexes = [
            models.Index(fields=["sku"]),
            models.Index(fields=["price_type"]),
            models.Index(fields=["currency"]),
            models.Index(fields=["effective_date"]),
            models.Index(fields=["expiry_date"]),
        ]
        constraints = [
            # 4S 价采集去重：同 OE + 同价格类型 + 同报价品牌只保留一条（重复采集 upsert）
            # condition 限定仅对 17VIN 采集的 4S 价（oe_number 非空）生效，不影响手工录入价格
            models.UniqueConstraint(
                fields=["oe_number", "price_type", "supplier_brand_text"],
                condition=~Q(oe_number=""),
                name="uniq_dealer_4s_by_oe_brand",
            ),
        ]

    def __str__(self):
        owner = (self.sku.sku_code if self.sku else None) or self.oe_number or "—"
        return f"{owner} {self.price_type} ≥{self.break_quantity}: ¥{self.price}"

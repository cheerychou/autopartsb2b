"""
类目模型 - 管理前后台类目体系、类目属性、类目映射
"""

import uuid

from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Q

from .choices import STATUS_CHOICES

User = get_user_model()

ACES_DATA_TYPE_CHOICES = [
    ("numeric", "Numeric"),
    ("alphanumeric", "Alphanumeric"),
    ("measurement", "Measurement"),
    ("coded_list", "CodedList"),
]


class Category(models.Model):
    """
    类目主实体 - 管理前后台类目的标准化信息
    """

    CATEGORY_TYPE_CHOICES = [
        ("front", "前台类目"),
        ("back", "后台类目"),
    ]

    LEVEL_CHOICES = [
        ("level1", "一级类目"),
        ("level2", "二级类目"),
        ("level3", "三级类目"),
    ]

    category_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="类目主键")
    category_code = models.CharField(max_length=10, unique=True, verbose_name="类目编码")
    category_name = models.CharField(max_length=100, verbose_name="类目名称")
    category_name_en = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="类目英文名称"
    )
    aces_pcdb_code = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="PCdb编码",
        help_text="ACES PCdb 2.0 PartTerminology ID 国际编码映射",
    )
    category_type = models.CharField(
        max_length=10, choices=CATEGORY_TYPE_CHOICES, verbose_name="类目类型"
    )
    category_level = models.CharField(max_length=10, choices=LEVEL_CHOICES, verbose_name="类目级别")
    parent_id = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="child_categories",
        verbose_name="父类目ID",
    )
    icon_url = models.URLField(blank=True, null=True, verbose_name="类目图标URL")
    sort_order = models.IntegerField(default=0, verbose_name="排序权重")
    category_status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="draft", verbose_name="类目状态"
    )
    NODE_TYPE_CHOICES = [
        ("category", "分类节点"),
        ("leaf", "叶子/标准名称"),
    ]
    node_type = models.CharField(
        max_length=20,
        choices=NODE_TYPE_CHOICES,
        default="category",
        verbose_name="节点类型",
        db_index=True,
        help_text=(
            "leaf = 商品实体（SPU/LaborSPU/ChemicalSPU/ToolSPU）挂载点，即标准名称所在节点；"
            "category = 仅用于分组的分类节点。叶子可位于任意层级，由商品挂载点决定，不由层数决定。"
            "见 PRD-DP-CAT-003 §2.5"
        ),
    )
    data_source = models.CharField(max_length=50, default="manual", verbose_name="数据源标识")
    crawl_time = models.DateTimeField(null=True, blank=True, verbose_name="采集时间")
    standardized = models.BooleanField(default=False, verbose_name="标准化状态")
    data_hash = models.CharField(max_length=64, blank=True, verbose_name="哈希标识")

    category_description = models.TextField(blank=True, null=True, verbose_name="类目简介")
    category_keywords = models.JSONField(default=list, blank=True, verbose_name="类目关键词")
    category_image = models.URLField(blank=True, null=True, verbose_name="类目图片URL")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_categories",
        verbose_name="创建人",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="updated_categories",
        verbose_name="更新人",
    )

    class Meta:
        db_table = "data_platform_category"
        verbose_name = "类目"
        verbose_name_plural = "类目"
        ordering = ["sort_order", "category_code"]
        indexes = [
            models.Index(fields=["category_code"]),
            models.Index(fields=["category_name"]),
            models.Index(fields=["category_type"]),
            models.Index(fields=["category_level"]),
            models.Index(fields=["category_status"]),
            models.Index(fields=["parent_id"]),
            models.Index(fields=["aces_pcdb_code"]),
        ]

    def __str__(self):
        return f"{self.category_code} - {self.category_name}"


class CategoryAttribute(models.Model):
    """
    类目属性模板 - 管理类目关联的属性定义
    """

    ATTRIBUTE_TYPE_CHOICES = [
        ("text", "文本"),
        ("number", "数字"),
        ("select", "单选"),
        ("multi_select", "多选"),
        ("boolean", "布尔"),
        ("date", "日期"),
        ("datetime", "日期时间"),
        ("image", "图片"),
        ("file", "文件"),
    ]

    INPUT_TYPE_CHOICES = [
        ("input", "输入框"),
        ("textarea", "文本域"),
        ("select", "下拉选择"),
        ("radio", "单选框"),
        ("checkbox", "复选框"),
        ("date_picker", "日期选择器"),
        ("upload", "文件上传"),
    ]

    attribute_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="属性主键")
    attribute_code = models.CharField(max_length=50, unique=True, verbose_name="属性编码")
    attribute_name = models.CharField(max_length=100, verbose_name="属性名称")
    attribute_name_en = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="属性英文名称"
    )
    category_id = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        verbose_name="所属类目ID",
        related_name="attributes",
    )
    attribute_type = models.CharField(
        max_length=20, choices=ATTRIBUTE_TYPE_CHOICES, verbose_name="属性类型"
    )
    input_type = models.CharField(
        max_length=20, choices=INPUT_TYPE_CHOICES, verbose_name="输入类型"
    )
    is_required = models.BooleanField(default=False, verbose_name="是否必填")
    is_multiple = models.BooleanField(default=False, verbose_name="是否多值")
    default_value = models.TextField(blank=True, null=True, verbose_name="默认值")
    options = models.JSONField(default=list, blank=True, verbose_name="选项列表")
    group = models.ForeignKey(
        "data_platform.AttributeGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="category_attributes",
        verbose_name="所属属性组",
    )
    aces_data_type = models.CharField(
        max_length=20,
        choices=ACES_DATA_TYPE_CHOICES,
        null=True,
        blank=True,
        verbose_name="ACES数据类型",
    )
    uom = models.CharField(max_length=50, blank=True, default="", verbose_name="计量单位")
    validation_rule = models.TextField(blank=True, null=True, verbose_name="验证规则")
    placeholder = models.CharField(max_length=200, blank=True, null=True, verbose_name="占位符")
    sort_order = models.IntegerField(default=0, verbose_name="排序权重")
    attribute_status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="active", verbose_name="属性状态"
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_attributes",
        verbose_name="创建人",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="updated_attributes",
        verbose_name="更新人",
    )

    class Meta:
        db_table = "data_platform_category_attribute"
        verbose_name = "类目属性"
        verbose_name_plural = "类目属性"
        ordering = ["sort_order", "attribute_code"]
        indexes = [
            models.Index(fields=["attribute_code"]),
            models.Index(fields=["attribute_name"]),
            models.Index(fields=["category_id"]),
            models.Index(fields=["attribute_type"]),
        ]

    def __str__(self):
        return f"{self.attribute_code} - {self.attribute_name}"


class CategoryAttributeLink(models.Model):
    """
    类目属性叶引用表（PRD-DP-CAT-004 v0.54 字典制定案）：
    attribute_code 全局唯一（CategoryAttribute 一词条一行，category_id=首次定义叶），
    跨叶共享字段（外径/材质/认证/活塞直径等）通过本表建立「叶→词条」引用，
    避免「各叶各抄一份定义」造成的同词漂移与词条冗余。

    同一 (category, attribute) 唯一；sort_order 为该叶问卷内的展示顺序。
    """

    link_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="引用主键")
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="attribute_links",
        verbose_name="类目叶",
    )
    attribute = models.ForeignKey(
        CategoryAttribute,
        on_delete=models.CASCADE,
        related_name="category_links",
        verbose_name="属性词条",
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")

    class Meta:
        db_table = "data_platform_category_attribute_link"
        verbose_name = "类目属性叶引用"
        verbose_name_plural = "类目属性叶引用"
        ordering = ["category", "sort_order"]
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["attribute"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["category", "attribute"],
                name="uniq_category_attribute_link",
            ),
        ]

    def __str__(self):
        return f"{self.category.category_code} ← {self.attribute.attribute_code}"


class SPUAttributeValue(models.Model):
    """
    SPU 属性值表 -「品类=名词、规格=属性」的 SPU 级取值落点
    （PRD-DP-CAT-003 v0.50）：单独建表而非 SPU.base_attributes JSONField，
    以获得唯一约束、可索引过滤与来源追踪；管理端属性沿用自建
    CategoryAttribute 轨（同 PAdb ACES 轨并行，互不混用）。
    """

    SOURCE_CHOICES = [
        ("name_parse", "品名解析"),
        ("manual", "人工录入"),
        ("source_import", "源数据导入"),
    ]

    value_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="属性值主键")
    spu = models.ForeignKey(
        "data_platform.SPU",
        on_delete=models.CASCADE,
        related_name="attribute_values",
        verbose_name="SPU",
    )
    attribute = models.ForeignKey(
        CategoryAttribute,
        on_delete=models.CASCADE,
        related_name="spu_values",
        verbose_name="属性",
    )
    # select/text/boolean 型存值（select 存 value_code，如 winter；boolean 存 true/false）
    value_text = models.CharField(max_length=200, blank=True, default="", verbose_name="文本值")
    # 面向展示的中文取值（如「冬季」「子午线」），text 型与 value_text 同值
    value_display = models.CharField(max_length=200, blank=True, default="", verbose_name="展示值")
    # number 型数值（断面宽/扁平比/轮圈直径），英寸制规格不落此列防单位混用
    value_number = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="数值"
    )
    source = models.CharField(
        max_length=30,
        choices=SOURCE_CHOICES,
        default="name_parse",
        verbose_name="取值来源",
        help_text="解析命令只覆盖 name_parse 来源的行，人工录入等其他来源不被自动覆盖",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_spu_attribute_value"
        verbose_name = "SPU属性值"
        verbose_name_plural = "SPU属性值"
        ordering = ["spu", "attribute"]
        constraints = [
            models.UniqueConstraint(
                fields=["spu", "attribute"],
                name="uniq_spu_attribute_value",
            ),
        ]
        indexes = [
            models.Index(fields=["attribute", "value_text"]),
            models.Index(fields=["source"]),
        ]

    def __str__(self):
        return f"{self.spu.spu_code} · {self.attribute.attribute_code} = {self.value_text or self.value_number}"


class CategoryMapping(models.Model):
    """
    前后台类目映射 - 管理前台类目与后台类目的映射关系
    """

    MAPPING_TYPE_CHOICES = [
        ("one_to_one", "一对一"),
        ("one_to_many", "一对多"),
        ("many_to_one", "多对一"),
        ("many_to_many", "多对多"),
    ]

    mapping_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="映射主键")
    front_category_id = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="front_mappings",
        verbose_name="前台类目ID",
    )
    back_category_id = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="back_mappings",
        verbose_name="后台类目ID",
    )
    mapping_type = models.CharField(
        max_length=20, choices=MAPPING_TYPE_CHOICES, verbose_name="映射类型"
    )
    mapping_status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="active", verbose_name="映射状态"
    )
    priority = models.IntegerField(default=0, verbose_name="优先级")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_mappings",
        verbose_name="创建人",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="updated_mappings",
        verbose_name="更新人",
    )

    class Meta:
        db_table = "data_platform_category_mapping"
        verbose_name = "类目映射"
        verbose_name_plural = "类目映射"
        ordering = ["priority", "mapping_id"]
        indexes = [
            models.Index(fields=["front_category_id"]),
            models.Index(fields=["back_category_id"]),
            models.Index(fields=["mapping_type"]),
        ]

    def __str__(self):
        return f"{self.front_category_id.category_name} -> {self.back_category_id.category_name}"


class PositionDict(models.Model):
    """安装位置字典 - ACES PCdb Position 概念"""

    POSITION_GROUP_CHOICES = [
        ("lateral", "左右"),
        ("longitudinal", "前后"),
        ("vertical", "上下"),
        ("axial", "轴向"),
        ("other", "其他"),
    ]

    position_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="位置主键")
    position_code = models.CharField(max_length=20, unique=True, verbose_name="位置编码")
    position_name = models.CharField(max_length=50, verbose_name="位置名称")
    position_name_en = models.CharField(
        max_length=50, blank=True, null=True, verbose_name="位置英文名"
    )
    position_group = models.CharField(
        max_length=20,
        choices=POSITION_GROUP_CHOICES,
        default="other",
        verbose_name="位置分组",
    )
    description = models.CharField(max_length=200, blank=True, null=True, verbose_name="说明")
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_position_dict"
        verbose_name = "安装位置字典"
        verbose_name_plural = "安装位置字典"
        ordering = ["position_group", "sort_order", "position_code"]
        indexes = [
            models.Index(fields=["position_code"]),
            models.Index(fields=["position_group"]),
        ]

    def __str__(self):
        return f"[{self.position_group}] {self.position_code} - {self.position_name}"


class CategorySPU(models.Model):
    """
    类目-SPU 多对多关联表
    FND-DS-CH-002 §3.3:Category ↔ SPU 是多对多关系
    EA-DA-010 G6/M2:本表承载多对多关系,延续 SPU.category_id 的"主类目"语义(is_primary)
    """

    link_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="关联主键")
    category = models.ForeignKey(
        "data_platform.Category",
        on_delete=models.CASCADE,
        related_name="category_spus",
        verbose_name="类目",
    )
    spu = models.ForeignKey(
        "data_platform.SPU",
        on_delete=models.CASCADE,
        related_name="category_links",
        verbose_name="SPU",
    )
    is_primary = models.BooleanField(
        default=False,
        verbose_name="是否主类目",
        help_text="一个 SPU 至多有一个主类目(对应原 SPU.category_id 的单一性语义)",
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_category_spu"
        verbose_name = "类目SPU关联"
        verbose_name_plural = "类目SPU关联"
        ordering = ["category", "sort_order", "link_id"]
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["spu"]),
            models.Index(fields=["is_primary"]),
        ]
        constraints = [
            # 防止同一对 Category-SPU 重复关联
            models.UniqueConstraint(
                fields=["category", "spu"],
                name="uniq_category_spu",
            ),
            # 每个 SPU 至多一个主类目(部分唯一约束)
            models.UniqueConstraint(
                fields=["spu"],
                condition=Q(is_primary=True),
                name="uniq_spu_primary_category",
            ),
        ]

    def __str__(self):
        primary_tag = " ★" if self.is_primary else ""
        return f"{self.category.category_name} ↔ {self.spu.spu_code}{primary_tag}"

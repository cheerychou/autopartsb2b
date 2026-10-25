"""
PAdb 产品属性数据库模型 - ACES 标准化产品属性定义 (PCdb/PAdb)
"""

import uuid

from django.contrib.auth import get_user_model
from django.db import models

from .choices import STATUS_CHOICES

User = get_user_model()

ACES_DATA_TYPE_CHOICES = [
    ("numeric", "Numeric"),
    ("alphanumeric", "Alphanumeric"),
    ("measurement", "Measurement"),
    ("coded_list", "CodedList"),
]


class AttributeGroup(models.Model):
    """
    PAdb 属性组 - 分组管理产品属性
    如：尺寸参数、性能参数、材质信息、电气参数 等
    """

    group_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="属性组主键")
    group_code = models.CharField(max_length=50, unique=True, verbose_name="属性组编码")
    group_name = models.CharField(max_length=100, verbose_name="属性组名称")
    group_name_en = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="属性组英文名称"
    )
    description = models.TextField(blank=True, null=True, verbose_name="描述")
    sort_order = models.IntegerField(default=0, verbose_name="排序权重")
    group_status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="active",
        verbose_name="属性组状态",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_attribute_groups",
        verbose_name="创建人",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="updated_attribute_groups",
        verbose_name="更新人",
    )

    class Meta:
        db_table = "data_platform_attribute_group"
        verbose_name = "属性组"
        verbose_name_plural = "属性组"
        ordering = ["sort_order", "group_code"]
        indexes = [
            models.Index(fields=["group_code"]),
            models.Index(fields=["group_name"]),
            models.Index(fields=["group_status"]),
        ]

    def __str__(self):
        return f"{self.group_code} - {self.group_name}"


class PAdbAttribute(models.Model):
    """
    PAdb 属性定义 - ACES 标准产品属性主表
    定义跨类目的标准化产品属性（尺寸、性能、材质等）
    """

    attribute_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="属性主键")
    attribute_code = models.CharField(max_length=50, unique=True, verbose_name="属性编码")
    attribute_name = models.CharField(max_length=100, verbose_name="属性名称")
    attribute_name_en = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="属性英文名称"
    )
    group = models.ForeignKey(
        AttributeGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attributes",
        verbose_name="所属属性组",
    )
    aces_data_type = models.CharField(
        max_length=20,
        choices=ACES_DATA_TYPE_CHOICES,
        verbose_name="ACES数据类型",
    )
    uom = models.CharField(max_length=50, blank=True, default="", verbose_name="计量单位")
    description = models.TextField(blank=True, null=True, verbose_name="属性描述")
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
        related_name="created_padb_attributes",
        verbose_name="创建人",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="updated_padb_attributes",
        verbose_name="更新人",
    )

    class Meta:
        db_table = "data_platform_padb_attribute"
        verbose_name = "PAdb属性"
        verbose_name_plural = "PAdb属性"
        ordering = ["sort_order", "attribute_code"]
        indexes = [
            models.Index(fields=["attribute_code"]),
            models.Index(fields=["attribute_name"]),
            models.Index(fields=["group"]),
            models.Index(fields=["aces_data_type"]),
        ]

    def __str__(self):
        return f"{self.attribute_code} - {self.attribute_name}"


class AttributeValue(models.Model):
    """
    PAdb 属性值 - CodedList 类型属性的标准化枚举值
    如：Material 属性的取值 Steel / Aluminum / Plastic
    """

    value_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="属性值主键")
    attribute = models.ForeignKey(
        PAdbAttribute,
        on_delete=models.CASCADE,
        related_name="values",
        verbose_name="所属属性",
    )
    value_code = models.CharField(max_length=50, verbose_name="值编码")
    value_name = models.CharField(max_length=200, verbose_name="值名称")
    value_name_en = models.CharField(
        max_length=200, blank=True, null=True, verbose_name="值英文名称"
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序权重")
    is_active = models.BooleanField(default=True, verbose_name="是否启用")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_attribute_value"
        verbose_name = "属性值"
        verbose_name_plural = "属性值"
        ordering = ["attribute", "sort_order", "value_code"]
        constraints = [
            models.UniqueConstraint(
                fields=["attribute", "value_code"],
                name="unique_attribute_value_code",
            )
        ]
        indexes = [
            models.Index(fields=["attribute"]),
            models.Index(fields=["value_code"]),
        ]

    def __str__(self):
        return f"{self.attribute.attribute_code}:{self.value_code} - {self.value_name}"


class PartTerminologyToAttribute(models.Model):
    """
    PAdb 类目属性映射 - ACES PartTerminologyToAttribute 表
    定义每个 PCdb 类目需要哪些 PAdb 属性
    """

    mapping_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="映射主键")
    category = models.ForeignKey(
        "data_platform.Category",
        on_delete=models.CASCADE,
        related_name="padb_mappings",
        verbose_name="所属类目",
    )
    attribute = models.ForeignKey(
        PAdbAttribute,
        on_delete=models.CASCADE,
        related_name="category_mappings",
        verbose_name="关联属性",
    )
    is_required = models.BooleanField(default=False, verbose_name="是否必填")
    sort_order = models.IntegerField(default=0, verbose_name="排序权重")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_part_terminology_to_attribute"
        verbose_name = "类目属性映射"
        verbose_name_plural = "类目属性映射"
        ordering = ["category", "sort_order"]
        constraints = [
            models.UniqueConstraint(
                fields=["category", "attribute"],
                name="unique_category_attribute_mapping",
            )
        ]
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["attribute"]),
        ]

    def __str__(self):
        return f"{self.category.category_name} → {self.attribute.attribute_name}"

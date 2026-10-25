"""
FP05 标准与术语库 - 行业术语、别名、OEM映射、国家标准
模型来源：原 terminology app 合并至 data_platform
"""

import uuid

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class IndustryTerm(models.Model):
    """行业术语 - 标准化的汽车后市场术语主实体"""

    TERM_TYPE_CHOICES = [
        ("PART", "配件"),
        ("LABOR", "工时"),
        ("FAULT", "故障"),
        ("MEASUREMENT", "测量值"),
        ("TOOL", "工具"),
        ("SYSTEM", "系统"),
        ("MATERIAL", "材料"),
    ]

    STATUS_CHOICES = [
        ("draft", "草稿"),
        ("active", "启用"),
        ("deprecated", "已废弃"),
        ("replaced_by", "已被替代"),
    ]

    term_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="术语主键")
    term_code = models.CharField(max_length=6, unique=True, verbose_name="术语编码")
    standard_name_zh = models.CharField(max_length=200, verbose_name="标准中文名")
    standard_name_en = models.CharField(
        max_length=200, blank=True, null=True, verbose_name="标准英文名"
    )
    category = models.CharField(max_length=50, verbose_name="分类")
    sub_category = models.CharField(max_length=50, blank=True, null=True, verbose_name="子分类")
    term_type = models.CharField(max_length=20, choices=TERM_TYPE_CHOICES, verbose_name="术语类型")
    definition = models.TextField(blank=True, null=True, verbose_name="术语定义")
    gbt5624_ref = models.CharField(
        max_length=50, blank=True, null=True, verbose_name="GB/T 5624 引用"
    )
    source_standard = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="来源标准"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="draft", verbose_name="状态"
    )
    replaced_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replaces",
        verbose_name="替换为",
    )
    sort_weight = models.IntegerField(default=0, verbose_name="排序权重")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_industry_terms",
        verbose_name="创建人",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="updated_industry_terms",
        verbose_name="更新人",
    )

    class Meta:
        db_table = "data_platform_industry_term"
        verbose_name = "行业术语"
        verbose_name_plural = "行业术语"
        ordering = ["sort_weight", "term_code"]
        indexes = [
            models.Index(fields=["term_code"]),
            models.Index(fields=["standard_name_zh"]),
            models.Index(fields=["term_type"]),
            models.Index(fields=["category"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.term_code} - {self.standard_name_zh}"


class TermAlias(models.Model):
    """术语别名 - 同一术语的不同叫法"""

    ALIAS_TYPE_CHOICES = [
        ("OEM", "主机厂术语"),
        ("BRAND", "品牌商术语"),
        ("TRADE", "行业俗称"),
        ("ABBR", "缩写"),
        ("REGIONAL", "地方叫法"),
        ("LEGACY", "历史叫法"),
    ]

    FREQUENCY_CHOICES = [
        ("high", "高频"),
        ("medium", "中频"),
        ("low", "低频"),
    ]

    STATUS_CHOICES = [
        ("active", "启用"),
        ("deprecated", "已废弃"),
    ]

    alias_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="别名主键")
    term = models.ForeignKey(
        IndustryTerm,
        on_delete=models.CASCADE,
        related_name="aliases",
        verbose_name="所属术语",
    )
    alias_name = models.CharField(max_length=200, verbose_name="别名")
    alias_type = models.CharField(
        max_length=20, choices=ALIAS_TYPE_CHOICES, verbose_name="别名类型"
    )
    source_brand = models.CharField(
        max_length=4,
        blank=True,
        null=True,
        verbose_name="来源/OEM品牌",
        help_text="OEM类型时必填，如 BMW / TYTA",
    )
    usage_frequency = models.CharField(
        max_length=10,
        choices=FREQUENCY_CHOICES,
        default="medium",
        verbose_name="使用频率",
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="active", verbose_name="状态"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_term_alias"
        verbose_name = "术语别名"
        verbose_name_plural = "术语别名"
        ordering = ["-usage_frequency", "alias_name"]
        indexes = [
            models.Index(fields=["alias_name"]),
            models.Index(fields=["alias_type"]),
            models.Index(fields=["source_brand"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.alias_name} → {self.term.standard_name_zh}"


class OEMTermMapping(models.Model):
    """OEM 术语映射 - 主机厂术语到标准术语的多对多映射"""

    mapping_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="映射主键")
    term = models.ForeignKey(
        IndustryTerm,
        on_delete=models.CASCADE,
        related_name="oem_mappings",
        verbose_name="标准术语",
    )
    oem_brand_code = models.CharField(max_length=4, verbose_name="OEM品牌")
    oem_term_name = models.CharField(max_length=200, verbose_name="OEM术语名")
    oem_term_code = models.CharField(
        max_length=50, blank=True, null=True, verbose_name="OEM术语编码"
    )
    oem_category = models.CharField(max_length=50, blank=True, null=True, verbose_name="OEM分类")
    data_source = models.CharField(max_length=200, blank=True, null=True, verbose_name="数据来源")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_oem_term_mapping"
        verbose_name = "OEM术语映射"
        verbose_name_plural = "OEM术语映射"
        ordering = ["oem_brand_code", "oem_term_name"]
        indexes = [
            models.Index(fields=["oem_brand_code"]),
            models.Index(fields=["oem_term_name"]),
            models.Index(fields=["term", "oem_brand_code"]),
        ]

    def __str__(self):
        return f"{self.oem_brand_code}: {self.oem_term_name} → {self.term.standard_name_zh}"


class NationalStandard(models.Model):
    """国家标准 - 汽车后市场相关标准文件"""

    STANDARD_TYPE_CHOICES = [
        ("national", "国标"),
        ("industry", "行标"),
        ("association", "团标"),
        ("local", "地标"),
    ]

    STATUS_CHOICES = [
        ("current", "现行"),
        ("replaced", "被替代"),
        ("abolished", "废止"),
    ]

    standard_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="标准主键")
    standard_code = models.CharField(max_length=30, unique=True, verbose_name="标准编号")
    standard_name = models.CharField(max_length=300, verbose_name="标准名称")
    standard_type = models.CharField(
        max_length=20, choices=STANDARD_TYPE_CHOICES, verbose_name="标准类型"
    )
    issuing_body = models.CharField(max_length=200, blank=True, null=True, verbose_name="发布机构")
    issue_date = models.DateField(null=True, blank=True, verbose_name="发布日期")
    effective_date = models.DateField(null=True, blank=True, verbose_name="实施日期")
    abolish_date = models.DateField(null=True, blank=True, verbose_name="废止日期")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="current", verbose_name="状态"
    )
    replaced_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replaces_standard",
        verbose_name="替换为",
    )
    summary = models.TextField(blank=True, null=True, verbose_name="摘要")
    full_text_url = models.URLField(max_length=500, blank=True, null=True, verbose_name="全文URL")
    sort_weight = models.IntegerField(default=0, verbose_name="排序权重")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_national_standard"
        verbose_name = "国家标准"
        verbose_name_plural = "国家标准"
        ordering = ["sort_weight", "standard_code"]
        indexes = [
            models.Index(fields=["standard_code"]),
            models.Index(fields=["standard_type"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.standard_code} - {self.standard_name}"


class StandardToTerm(models.Model):
    """标准-术语关联 - 标准中引用了哪些术语"""

    link_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="关联主键")
    standard = models.ForeignKey(
        NationalStandard,
        on_delete=models.CASCADE,
        related_name="term_links",
        verbose_name="标准",
    )
    term = models.ForeignKey(
        IndustryTerm,
        on_delete=models.CASCADE,
        related_name="standard_links",
        verbose_name="术语",
    )
    section_ref = models.CharField(max_length=50, blank=True, null=True, verbose_name="章节号")
    original_text = models.TextField(blank=True, null=True, verbose_name="标准原文")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_standard_to_term"
        verbose_name = "标准-术语关联"
        verbose_name_plural = "标准-术语关联"
        ordering = ["standard", "section_ref"]
        indexes = [
            models.Index(fields=["standard", "term"]),
        ]

    def __str__(self):
        return f"{self.standard.standard_code} §{self.section_ref} → {self.term.standard_name_zh}"

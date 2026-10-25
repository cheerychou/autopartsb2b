"""
PP05 配件适配关系引擎 - Qdb 限定条件适配体系
模型来源：原 fitment_engine app 合并至 data_platform
"""

import uuid

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class QualifierDimension(models.Model):
    """限定条件维度 - 定义适配判断的维度类型（如发动机、变速箱、驱动方式等）"""

    DATA_TYPE_CHOICES = [
        ("string", "字符串"),
        ("number", "数值"),
        ("boolean", "布尔"),
        ("enum", "枚举"),
    ]

    DIMENSION_GROUP_CHOICES = [
        ("Vehicle", "车辆属性"),
        ("Position", "位置"),
        ("Attribute", "产品属性"),
        ("Condition", "条件"),
        ("Region", "区域"),
    ]

    dimension_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="维度主键")
    dimension_code = models.CharField(max_length=30, unique=True, verbose_name="维度编码")
    dimension_name = models.CharField(max_length=100, verbose_name="维度名称")
    dimension_name_en = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="维度英文名"
    )
    dimension_group = models.CharField(
        max_length=20, choices=DIMENSION_GROUP_CHOICES, verbose_name="维度分组"
    )
    data_type = models.CharField(
        max_length=20,
        choices=DATA_TYPE_CHOICES,
        default="enum",
        verbose_name="数据类型",
    )
    description = models.TextField(blank=True, null=True, verbose_name="维度说明")
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    is_required = models.BooleanField(default=False, verbose_name="是否必填")
    target_table = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name="关联配置表",
        help_text="如 EngineConfig / TransmissionConfig / BodyConfig",
    )
    target_field = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name="关联配置字段",
        help_text="如 engine_code / trans_code / body_code",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_qualifier_dimension"
        verbose_name = "限定条件维度"
        verbose_name_plural = "限定条件维度"
        ordering = ["dimension_group", "sort_order", "dimension_code"]
        indexes = [
            models.Index(fields=["dimension_code"]),
            models.Index(fields=["dimension_group"]),
        ]

    def __str__(self):
        return f"[{self.dimension_group}] {self.dimension_code} - {self.dimension_name}"


class QualifierValue(models.Model):
    """限定条件值 - 维度下的可选值，支持层级"""

    value_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="值主键")
    dimension = models.ForeignKey(
        QualifierDimension,
        on_delete=models.CASCADE,
        related_name="values",
        verbose_name="所属维度",
    )
    value_code = models.CharField(max_length=50, verbose_name="值编码")
    value_name = models.CharField(max_length=100, verbose_name="值名称")
    value_name_en = models.CharField(max_length=100, blank=True, null=True, verbose_name="值英文名")
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
        verbose_name="父值",
        help_text="支持层级，如 Engine Family > EA888",
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="扩展信息",
        help_text="如发动机的排量范围、马力范围等",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_qualifier_value"
        verbose_name = "限定条件值"
        verbose_name_plural = "限定条件值"
        ordering = ["dimension", "sort_order", "value_code"]
        indexes = [
            models.Index(fields=["dimension", "value_code"]),
            models.Index(fields=["value_code"]),
        ]

    def __str__(self):
        return f"{self.dimension.dimension_code}:{self.value_code} - {self.value_name}"


class SPUFitmentQuerySet(models.QuerySet):
    """SPUFitment 查询集（EA-DA-008 §7.3：门店消费过滤统一封装）"""

    def verified_only(self):
        """门店消费专用：只放行已采信行。

        门控语义（ADT-DP-001 P0-2）：未验证数据不对门店可见，
        verified 天然排除 unverified 与 disputed。
        """
        return self.filter(verified_status="verified")


class SPUFitment(models.Model):
    """SPU 适配关系 - 核心实体，JSONB 存储限定条件"""

    MATCH_LEVEL_CHOICES = [
        ("FULL_MATCH", "完全匹配"),
        ("PARTIAL_MATCH", "部分匹配"),
        ("CONDITIONAL_MATCH", "条件匹配"),
        ("NO_MATCH", "不匹配"),
    ]

    OPERATOR_CHOICES = [
        ("EQUALS", "等于"),
        ("NOT_EQUALS", "不等于"),
        ("IN_LIST", "在列表中"),
        ("NOT_IN_LIST", "不在列表中"),
        ("BETWEEN", "介于"),
        ("GREATER_THAN", "大于"),
        ("LESS_THAN", "小于"),
        ("CONTAINS", "包含"),
        ("EXISTS", "存在"),
        ("NOT_EXISTS", "不存在"),
    ]

    fitment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="适配主键")
    spu = models.ForeignKey(
        "data_platform.SPU",
        on_delete=models.CASCADE,
        related_name="fitments",
        verbose_name="SPU",
    )
    brand = models.ForeignKey(
        "data_platform.Brand",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="spu_fitments",
        verbose_name="适用品牌",
        help_text="NULL = 所有品牌通用",
    )
    series = models.ForeignKey(
        "data_platform.VehicleSeries",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="spu_fitments",
        verbose_name="适用车系",
    )
    qualifiers = models.JSONField(
        default=dict,
        verbose_name="限定条件",
        help_text="Qdb 限定条件集，如 {'ENGINE': 'B48', 'YEAR_FROM': 2019, 'POSITION': 'FRONT'}",
    )
    match_level = models.CharField(
        max_length=20,
        choices=MATCH_LEVEL_CHOICES,
        default="FULL_MATCH",
        verbose_name="匹配级别",
    )
    priority = models.IntegerField(
        default=0,
        verbose_name="优先级",
        help_text="值越大优先级越高，同一 SPU 多条适配时使用",
    )
    is_default = models.BooleanField(default=False, verbose_name="默认适配")
    notes = models.TextField(blank=True, null=True, verbose_name="备注")
    submodel = models.ForeignKey(
        "data_platform.VehicleModel",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="spu_fitments",
        verbose_name="适用车型",
    )
    year_from = models.IntegerField(null=True, blank=True, verbose_name="年款起")
    year_to = models.IntegerField(null=True, blank=True, verbose_name="年款止")
    fitment_type = models.CharField(
        max_length=20,
        choices=[
            ("DIRECT", "直接适配"),
            ("INDIRECT", "间接适配(需改装)"),
            ("WITH_MODIFICATION", "需修改"),
        ],
        default="DIRECT",
        verbose_name="适配类型",
    )
    fitment_level = models.CharField(
        max_length=20,
        choices=[
            ("PERFECT", "完美"),
            ("GOOD", "良好"),
            ("FAIR", "一般"),
            ("NOT_RECOMMENDED", "不推荐"),
        ],
        default="GOOD",
        verbose_name="适配级别",
    )
    vin_from = models.CharField(max_length=17, null=True, blank=True, verbose_name="VIN起")
    vin_to = models.CharField(max_length=17, null=True, blank=True, verbose_name="VIN止")
    data_source = models.CharField(
        max_length=30,
        choices=[
            ("oem_catalog", "OEM目录"),
            ("supplier", "供应商"),
            ("data_service", "数据服务"),
            ("manual", "人工录入"),
            ("seventeen_vin", "17VIN预采集"),
        ],
        default="manual",
        verbose_name="数据来源",
    )
    verified_status = models.CharField(
        max_length=20,
        choices=[
            ("unverified", "未验证"),
            ("verified", "已验证"),
            ("disputed", "有争议"),
        ],
        default="unverified",
        verbose_name="验证状态",
    )
    verified_at = models.DateTimeField(null=True, blank=True, verbose_name="验证时间")
    verified_by = models.CharField(max_length=100, null=True, blank=True, verbose_name="验证来源")
    status = models.CharField(
        max_length=20,
        choices=[
            ("active", "在用"),
            ("inactive", "停用"),
            ("archived", "归档"),
        ],
        default="active",
        verbose_name="状态",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    objects = SPUFitmentQuerySet.as_manager()

    class Meta:
        db_table = "data_platform_spu_fitment"
        verbose_name = "SPU适配关系"
        verbose_name_plural = "SPU适配关系"
        ordering = ["spu", "-priority"]
        indexes = [
            models.Index(fields=["spu"]),
            models.Index(fields=["brand"]),
            models.Index(fields=["series"]),
            models.Index(fields=["submodel"]),
            models.Index(fields=["match_level"]),
            models.Index(fields=["fitment_type"]),
            models.Index(fields=["verified_status"]),
            models.Index(fields=["status"]),
            models.Index(fields=["is_default"]),
        ]

    def __str__(self):
        parts = [str(self.spu)]
        if self.brand:
            parts.append(str(self.brand))
        if self.series:
            parts.append(str(self.series))
        return " → ".join(parts)


class FitmentFootnote(models.Model):
    """适配脚注 - 对适配关系的补充说明和例外条件"""

    FOOTNOTE_TYPE_CHOICES = [
        ("EXCEPT", "排除"),
        ("REQUIRES", "需要"),
        ("NOTE", "说明"),
        ("WARNING", "警告"),
    ]

    footnote_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="脚注主键")
    fitment = models.ForeignKey(
        SPUFitment,
        on_delete=models.CASCADE,
        related_name="footnotes",
        verbose_name="所属适配",
    )
    footnote_type = models.CharField(
        max_length=20, choices=FOOTNOTE_TYPE_CHOICES, verbose_name="脚注类型"
    )
    description = models.TextField(verbose_name="描述")
    condition_expression = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        verbose_name="条件表达式",
        help_text="结构化条件，如 {'operator': 'EXCEPT', 'field': 'BODY_TYPE', 'value': 'WAGON'}",
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_fitment_footnote"
        verbose_name = "适配脚注"
        verbose_name_plural = "适配脚注"
        ordering = ["fitment", "sort_order"]

    def __str__(self):
        return f"[{self.footnote_type}] {self.description[:60]}"


class PartTypeQualifierTemplate(models.Model):
    """配件类型限定条件模板 - 定义某类配件需要哪些限定维度"""

    template_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="模板主键")
    category = models.ForeignKey(
        "data_platform.Category",
        on_delete=models.CASCADE,
        related_name="qualifier_templates",
        verbose_name="适用类目",
        help_text="后台类目，如 制动系统 > 制动摩擦片",
    )
    dimension = models.ForeignKey(
        QualifierDimension,
        on_delete=models.CASCADE,
        related_name="part_type_templates",
        verbose_name="限定维度",
    )
    is_required = models.BooleanField(default=False, verbose_name="是否必填")
    default_value = models.CharField(max_length=100, blank=True, null=True, verbose_name="默认值")
    default_operator = models.CharField(
        max_length=20,
        choices=[
            ("EQUALS", "等于"),
            ("NOT_EQUALS", "不等于"),
            ("IN_LIST", "在列表中"),
            ("NOT_IN_LIST", "不在列表中"),
            ("BETWEEN", "介于"),
        ],
        default="EQUALS",
        verbose_name="默认操作符",
    )
    description = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        verbose_name="说明",
        help_text="为什么需要这个限定维度",
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_part_type_qualifier_template"
        verbose_name = "配件类型限定条件模板"
        verbose_name_plural = "配件类型限定条件模板"
        ordering = ["category", "sort_order"]
        unique_together = [["category", "dimension"]]
        indexes = [
            models.Index(fields=["category"]),
        ]

    def __str__(self):
        return f"{self.category} → {self.dimension} {'*' if self.is_required else ''}"


class FitmentValidationBatch(models.Model):
    """适配抽样验证批次（ADT-DP-001 P1-b 轻量批次：非完整工单系统）。

    设计要点：
    - 样本不建关联表——单条真值就是 SPUFitment.verified_status
      （验证工作台 action 在维护它），批次只存"哪些 ID"+ conclude 时点快照；
    - 创建即完成抽样（无草稿态），状态机精简三态：reviewing → concluded/cancelled；
    - 不做"同条件唯一"（同一来源连续两轮抽验是合法运营动作）。
    """

    STATUS_CHOICES = [
        ("reviewing", "验证中"),
        ("concluded", "已结论"),
        ("cancelled", "已取消"),
    ]

    batch_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="批次主键")
    batch_code = models.CharField(max_length=40, unique=True, verbose_name="批次编码")
    name = models.CharField(max_length=100, verbose_name="批次名称")
    sampling = models.JSONField(
        default=dict,
        verbose_name="抽样条件快照",
        help_text='生成时冻结，如 {"data_source": "...", "brand_id": "...", "category_id": "..."}',
    )
    sample_ids = models.JSONField(
        default=list,
        verbose_name="样本 fitment_id 列表",
        help_text="有序字符串数组（≤1000），可复现",
    )
    sample_size = models.IntegerField(verbose_name="样本量")
    pass_threshold = models.FloatField(
        default=0.95,
        verbose_name="通过率阈值",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="reviewing",
        verbose_name="状态",
    )
    conclusion = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="结论快照",
        help_text='{"total", "verified", "disputed", "unverified", "pass_rate", '
        '"threshold", "result", "concluded_at"}',
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fitment_validation_batches",
        verbose_name="创建人",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    concluded_at = models.DateTimeField(null=True, blank=True, verbose_name="结论时间")

    class Meta:
        db_table = "data_platform_fitment_validation_batch"
        verbose_name = "适配抽样验证批次"
        verbose_name_plural = "适配抽样验证批次"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.batch_code} {self.name} [{self.status}]"

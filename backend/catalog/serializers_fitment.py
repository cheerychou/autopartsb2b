"""PP05 配件适配关系引擎序列化器"""

from rest_framework import serializers

from .models_fitment import (
    FitmentFootnote,
    PartTypeQualifierTemplate,
    QualifierDimension,
    QualifierValue,
    SPUFitment,
)


class QualifierValueSerializer(serializers.ModelSerializer):
    """限定条件值序列化器"""

    children = serializers.SerializerMethodField(read_only=True)
    dimension_name = serializers.CharField(source="dimension.dimension_name", read_only=True)

    class Meta:
        model = QualifierValue
        fields = "__all__"
        read_only_fields = ["value_id", "created_at", "updated_at"]

    def get_children(self, obj):
        return QualifierValueSerializer(obj.children.all(), many=True).data


class QualifierValueListSerializer(serializers.ModelSerializer):
    """限定条件值列表序列化器"""

    dimension_name = serializers.CharField(source="dimension.dimension_name", read_only=True)

    class Meta:
        model = QualifierValue
        fields = [
            "value_id",
            "dimension",
            "dimension_name",
            "value_code",
            "value_name",
            "value_name_en",
            "parent",
            "sort_order",
        ]


class QualifierDimensionSerializer(serializers.ModelSerializer):
    """限定条件维度序列化器"""

    values = QualifierValueSerializer(many=True, read_only=True)
    dimension_group_display = serializers.CharField(
        source="get_dimension_group_display", read_only=True
    )

    class Meta:
        model = QualifierDimension
        fields = "__all__"
        read_only_fields = ["dimension_id", "created_at", "updated_at"]


class QualifierDimensionListSerializer(serializers.ModelSerializer):
    """限定条件维度列表序列化器"""

    dimension_group_display = serializers.CharField(
        source="get_dimension_group_display", read_only=True
    )

    class Meta:
        model = QualifierDimension
        fields = [
            "dimension_id",
            "dimension_code",
            "dimension_name",
            "dimension_name_en",
            "dimension_group",
            "dimension_group_display",
            "data_type",
            "is_required",
            "target_table",
            "target_field",
            "sort_order",
        ]


class FitmentFootnoteSerializer(serializers.ModelSerializer):
    """适配脚注序列化器"""

    class Meta:
        model = FitmentFootnote
        fields = "__all__"
        read_only_fields = ["footnote_id", "created_at", "updated_at"]


class SPUFitmentSerializer(serializers.ModelSerializer):
    """SPU适配关系序列化器"""

    spu_name = serializers.CharField(source="spu.spu_name", read_only=True)
    spu_code = serializers.CharField(source="spu.spu_code", read_only=True)
    brand_name = serializers.CharField(source="brand.brand_name", read_only=True)
    series_name = serializers.CharField(source="series.series_name", read_only=True)
    model_name = serializers.CharField(source="submodel.model_name", read_only=True, default="")
    footnotes = FitmentFootnoteSerializer(many=True, read_only=True)
    match_level_display = serializers.CharField(source="get_match_level_display", read_only=True)
    fitment_type_display = serializers.CharField(source="get_fitment_type_display", read_only=True)
    fitment_level_display = serializers.CharField(
        source="get_fitment_level_display", read_only=True
    )
    data_source_display = serializers.CharField(source="get_data_source_display", read_only=True)
    verified_status_display = serializers.CharField(
        source="get_verified_status_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    # FND-DS-CH-002 §6.4:oe_number 在 SPU 层,通过 spu 反查
    oe_number = serializers.SerializerMethodField()

    class Meta:
        model = SPUFitment
        fields = "__all__"
        read_only_fields = ["fitment_id", "created_at", "updated_at"]

    def get_oe_number(self, obj):
        return obj.spu.oe_number if obj.spu else ""


class SPUFitmentListSerializer(serializers.ModelSerializer):
    """SPU适配关系列表序列化器"""

    spu_name = serializers.CharField(source="spu.spu_name", read_only=True)
    spu_code = serializers.CharField(source="spu.spu_code", read_only=True)
    brand_name = serializers.CharField(source="brand.brand_name", read_only=True)
    series_name = serializers.CharField(source="series.series_name", read_only=True)
    model_name = serializers.CharField(source="submodel.model_name", read_only=True, default="")
    match_level_display = serializers.CharField(source="get_match_level_display", read_only=True)
    fitment_type_display = serializers.CharField(source="get_fitment_type_display", read_only=True)
    # FND-DS-CH-002 §6.4:oe_number 在 SPU 层,通过 spu 反查
    oe_number = serializers.SerializerMethodField()

    class Meta:
        model = SPUFitment
        fields = [
            "fitment_id",
            "spu",
            "spu_name",
            "spu_code",
            "brand",
            "brand_name",
            "series",
            "series_name",
            "submodel",
            "model_name",
            "year_from",
            "year_to",
            "fitment_type",
            "fitment_type_display",
            "fitment_level",
            "match_level",
            "match_level_display",
            "oe_number",
            "is_default",
            "priority",
            "verified_status",
            "status",
            "notes",
        ]

    def get_oe_number(self, obj):
        return obj.spu.oe_number if obj.spu else ""


class FitmentQuerySerializer(serializers.Serializer):
    """正向适配查询请求 - 车辆 → 配件"""

    brand_code = serializers.CharField(required=False, allow_blank=True)
    series_code = serializers.CharField(required=False, allow_blank=True)
    model_id = serializers.UUIDField(required=False)
    year = serializers.IntegerField(required=False)
    engine = serializers.CharField(required=False, allow_blank=True)
    transmission = serializers.CharField(required=False, allow_blank=True)
    drive_type = serializers.CharField(required=False, allow_blank=True)
    body_type = serializers.CharField(required=False, allow_blank=True)
    position = serializers.CharField(required=False, allow_blank=True)
    category_id = serializers.UUIDField(required=False)
    extra_qualifiers = serializers.JSONField(required=False, default=dict)


class ReverseFitmentQuerySerializer(serializers.Serializer):
    """反向适配查询请求 - 配件 → 车辆"""

    spu_id = serializers.UUIDField(required=False)
    oe_number = serializers.CharField(required=False, allow_blank=True)
    brand_code = serializers.CharField(required=False, allow_blank=True)


class CrossReferenceQuerySerializer(serializers.Serializer):
    """交叉引用查询 - OE号 → 替代件"""

    oe_number = serializers.CharField(required=True)
    brand_code = serializers.CharField(required=False, allow_blank=True)


class FitmentBatchActionSerializer(serializers.Serializer):
    """验证动作批量入参（采信/争议/重置共用）。

    max_length=100 控制逐条 save+行锁的事务总时长；
    serializer 化让 schema → 前端 api-types 链路有类型可用。
    """

    ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
        min_length=1,
        max_length=100,
    )
    comment = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")


class PartTypeQualifierTemplateSerializer(serializers.ModelSerializer):
    """配件类型限定条件模板序列化器"""

    dimension_name = serializers.CharField(source="dimension.dimension_name", read_only=True)
    dimension_code = serializers.CharField(source="dimension.dimension_code", read_only=True)
    category_name = serializers.CharField(source="category.category_name", read_only=True)

    class Meta:
        model = PartTypeQualifierTemplate
        fields = "__all__"
        read_only_fields = ["template_id", "created_at", "updated_at"]

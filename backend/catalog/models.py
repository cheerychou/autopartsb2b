import uuid

from django.contrib.auth import get_user_model
from django.db import models

from catalog.brand_letter import compute_brand_letter

User = get_user_model()


class Brand(models.Model):
    """
    品牌主实体 - 管理汽车后市场全链条的品牌标准化信息
    """

    STATUS_CHOICES = [
        ("draft", "草稿"),
        ("pending", "待审核"),
        ("active", "启用"),
        ("inactive", "停用"),
        ("archived", "归档"),
    ]

    BRAND_TYPE_CHOICES = [
        ("M", "汽车制造商"),
        ("S", "零部件供应商"),
        ("V", "服务商品牌"),
        ("P", "用品品牌"),
        ("T", "技术品牌"),
    ]

    BRAND_LEVEL_CHOICES = [
        ("group", "集团"),
        ("brand", "品牌"),
        ("sub_brand", "子品牌"),
        ("series", "系列"),
    ]

    brand_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="品牌主键")
    brand_code = models.CharField(max_length=8, unique=True, verbose_name="品牌编码")
    brand_name = models.CharField(max_length=100, verbose_name="品牌名称")
    brand_name_en = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="品牌英文名称"
    )
    brand_alias = models.JSONField(default=list, blank=True, verbose_name="品牌别名")
    brand_type = models.CharField(
        max_length=10, choices=BRAND_TYPE_CHOICES, verbose_name="品牌类型"
    )
    brand_level = models.CharField(
        max_length=20, choices=BRAND_LEVEL_CHOICES, verbose_name="品牌层级"
    )
    parent_brand_id = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="child_brands",
        verbose_name="父品牌ID",
    )
    brand_status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="draft", verbose_name="品牌状态"
    )
    brand_letter = models.CharField(
        max_length=1,
        blank=True,
        default="",
        verbose_name="拼音首字母",
        help_text="A-Z，按品牌中文名拼音首字回填（pypinyin）；门店列表排序/分组依据",
    )
    data_source = models.CharField(max_length=50, default="manual", verbose_name="数据源标识")
    source_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="源端ID",
        help_text="外部系统中的原始ID，如autohome brand_id",
    )
    crawl_time = models.DateTimeField(null=True, blank=True, verbose_name="采集时间")
    standardized = models.BooleanField(default=False, verbose_name="标准化状态")
    data_hash = models.CharField(max_length=64, blank=True, verbose_name="哈希标识")

    brand_country = models.CharField(max_length=50, verbose_name="品牌国别")
    brand_owner = models.CharField(max_length=200, blank=True, null=True, verbose_name="品牌所有人")
    establish_year = models.IntegerField(null=True, blank=True, verbose_name="成立年份")
    official_website = models.URLField(blank=True, null=True, verbose_name="品牌官网")
    brand_description = models.TextField(blank=True, null=True, verbose_name="品牌简介")
    brand_story = models.TextField(blank=True, null=True, verbose_name="品牌故事")
    brand_values = models.JSONField(default=list, blank=True, verbose_name="品牌价值观")
    brand_slogan = models.CharField(max_length=200, blank=True, null=True, verbose_name="品牌口号")
    brand_logo = models.URLField(blank=True, null=True, verbose_name="品牌logo")
    brand_colors = models.JSONField(default=list, blank=True, verbose_name="品牌色系")
    brand_fonts = models.JSONField(default=dict, blank=True, verbose_name="品牌字体")

    application_scope = models.JSONField(default=list, verbose_name="应用范围")
    # deprecated 意向（PRD-DP-VHC-004 M4）：品类维度已下沉至车系级
    # VehicleSeries.vehicle_class；本字段历史写入恒为空数组，勿再依赖。
    vehicle_types = models.JSONField(default=list, verbose_name="适用车型")
    industry_segments = models.JSONField(default=list, verbose_name="适用行业")
    target_markets = models.JSONField(default=list, verbose_name="目标市场")
    service_regions = models.JSONField(default=list, verbose_name="服务区域")

    level_depth = models.IntegerField(default=0, verbose_name="层级深度")
    sort_weight = models.IntegerField(default=0, verbose_name="排序权重")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_brands",
        verbose_name="创建人",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="updated_brands",
        verbose_name="更新人",
    )

    def save(self, *args, **kwargs):
        # brand_letter 导入时自动计算（EA-DA-020 §六遗留；已有字母不覆盖）
        if self.brand_name and not self.brand_letter:
            self.brand_letter = compute_brand_letter(
                self.brand_name, self.brand_name_en  # type: ignore[arg-type]
            )
        super().save(*args, **kwargs)

    class Meta:
        db_table = "data_platform_brand"
        verbose_name = "品牌"
        verbose_name_plural = "品牌"
        ordering = ["sort_weight", "brand_code"]
        indexes = [
            models.Index(fields=["brand_code"]),
            models.Index(fields=["brand_name"]),
            models.Index(fields=["brand_type"]),
            models.Index(fields=["brand_status"]),
            models.Index(fields=["parent_brand_id"]),
        ]

    def __str__(self):
        return f"{self.brand_code} - {self.brand_name}"


class VehicleClass(models.TextChoices):
    """
    车辆品类（PRD-DP-VHC-004 §3.1）。

    分类锚点：GB/T 15089-2001《机动车辆及挂车分类》+ ACES VCdb vehicleType 对照。
    落 VehicleSeries（主字段）/VehicleModel（冗余）；null = 未分类（合法态，
    不设 unknown/commercial 兜底值）。新增取值须修订 PRD-DP-VHC-004，
    禁止各源适配器私自造值。
    """

    PASSENGER = "passenger", "乘用车（GB/T 15089 M1）"
    BUS = "bus", "客车（M2/M3）"
    LIGHT_TRUCK = "light_truck", "轻型货车（N1，GVM≤3.5t）"
    MEDIUM_TRUCK = "medium_truck", "中型货车（N2）"
    HEAVY_TRUCK = "heavy_truck", "重型货车（N3，含牵引/自卸）"
    TRAILER = "trailer", "挂车（O）"
    MOTORCYCLE = "motorcycle", "摩托车（L）"
    POWERSPORTS = "powersports", "动力运动（非道路，ATV/雪车等）"


class ProprietaryTier(models.TextChoices):
    """
    数据资产专有级别（REF-DP-STD-005 §2.5：未来任何数据授权模式的共同前置）。

    - public：公开渠道采集（汽车之家/febi 等），永不设防；
    - oem_proprietary：OEM 专有数据（DTC/维修资料/4S 内部价等），未来签约
      授权后按品牌/scope 设防；
    - third_party_paid：向第三方付费取得（17VIN 预采集），受与供方的合同
      约束（转售/分发条款）。

    存量默认 public（事实正确：现库均为公开采集）；17VIN 链路写入
    third_party_paid。新增级别须修订 REF-DP-STD-005。
    """

    PUBLIC = "public", "公开采集"
    OEM_PROPRIETARY = "oem_proprietary", "OEM 专有"
    THIRD_PARTY_PAID = "third_party_paid", "第三方付费"


class VehicleSeries(models.Model):
    """
    车系主实体 - 管理汽车车系的标准化信息
    """

    STATUS_CHOICES = [
        ("draft", "草稿"),
        ("pending", "待审核"),
        ("active", "启用"),
        ("inactive", "停用"),
        ("archived", "归档"),
    ]

    SERIES_LEVEL_CHOICES = [
        ("entry", "入门级"),
        ("mainstream", "主流级"),
        ("flagship", "旗舰级"),
        ("performance", "性能级"),
        ("new_energy", "新能源专属"),
    ]

    SERIES_SEGMENT_CHOICES = [
        ("A00", "微型车"),
        ("A0", "小型车"),
        ("A", "紧凑型车"),
        ("B", "中型车"),
        ("C", "中大型车"),
        ("D", "大型车"),
        ("SUV", "SUV"),
        ("MPV", "MPV"),
    ]

    SERIES_TYPE_CHOICES = [
        ("sedan", "轿车"),
        ("suv", "SUV"),
        ("mpv", "MPV"),
        ("sports", "跑车"),
        ("pickup", "皮卡"),
        ("microvan", "微面"),
    ]

    SERIES_POSITIONING_CHOICES = [
        ("economy", "经济"),
        ("family", "家用"),
        ("business", "商务"),
        ("sport", "运动"),
        ("luxury", "豪华"),
    ]

    series_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="车系主键")
    series_code = models.CharField(max_length=12, unique=True, verbose_name="车系编码")
    series_name = models.CharField(max_length=100, verbose_name="车系名称")
    series_name_en = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="车系英文名称"
    )
    series_alias = models.JSONField(default=list, blank=True, verbose_name="车系别名")
    brand_id = models.ForeignKey(
        Brand,
        on_delete=models.CASCADE,
        verbose_name="所属品牌ID",
        related_name="vehicle_series",
    )
    brand_code = models.CharField(max_length=8, verbose_name="品牌编码")
    brand_name = models.CharField(max_length=100, verbose_name="品牌名称")
    series_level = models.CharField(
        max_length=20, choices=SERIES_LEVEL_CHOICES, verbose_name="车系级别"
    )
    series_status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="draft", verbose_name="车系状态"
    )
    data_source = models.CharField(max_length=50, default="manual", verbose_name="数据源标识")
    source_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="源端ID",
        help_text="外部系统中的原始ID，如autohome series_id",
    )
    crawl_time = models.DateTimeField(null=True, blank=True, verbose_name="采集时间")
    standardized = models.BooleanField(default=False, verbose_name="标准化状态")
    data_hash = models.CharField(max_length=64, blank=True, verbose_name="哈希标识")

    series_segment = models.CharField(
        max_length=10, choices=SERIES_SEGMENT_CHOICES, verbose_name="车系级别"
    )
    series_type = models.CharField(
        max_length=20, choices=SERIES_TYPE_CHOICES, verbose_name="车系类型"
    )
    vehicle_class = models.CharField(
        max_length=20,
        choices=VehicleClass.choices,
        null=True,
        blank=True,
        verbose_name="车辆品类",
        help_text="PRD-DP-VHC-004：品类主轴，null=未分类；series_type/segment 为乘用车语境细分，与本字段正交",
    )
    proprietary_tier = models.CharField(
        max_length=20,
        choices=ProprietaryTier.choices,
        default=ProprietaryTier.PUBLIC,
        verbose_name="专有级别",
        help_text="REF-DP-STD-005：数据资产授权治理维度；存量公开采集数据为 public",
    )
    series_positioning = models.CharField(
        max_length=20, choices=SERIES_POSITIONING_CHOICES, verbose_name="车系定位"
    )
    series_generation = models.CharField(
        max_length=20, blank=True, null=True, verbose_name="车系代际"
    )
    launch_year = models.IntegerField(verbose_name="上市年份")
    discontinue_year = models.IntegerField(null=True, blank=True, verbose_name="停产年份")
    year_from = models.IntegerField(null=True, blank=True, verbose_name="生产起始年份")
    year_to = models.IntegerField(null=True, blank=True, verbose_name="生产结束年份")
    price_range = models.JSONField(default=dict, verbose_name="指导价范围")
    series_description = models.TextField(blank=True, null=True, verbose_name="车系简介")
    series_highlights = models.JSONField(default=list, blank=True, verbose_name="车系亮点")

    sort_weight = models.IntegerField(default=0, verbose_name="排序权重")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_series",
        verbose_name="创建人",
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="updated_series",
        verbose_name="更新人",
    )

    class Meta:
        db_table = "data_platform_vehicle_series"
        verbose_name = "车系"
        verbose_name_plural = "车系"
        ordering = ["sort_weight", "series_code"]
        indexes = [
            models.Index(fields=["series_code"]),
            models.Index(fields=["series_name"]),
            models.Index(fields=["brand_id"]),
            models.Index(fields=["series_level"]),
            models.Index(fields=["series_status"]),
            models.Index(fields=["series_type"]),
            models.Index(fields=["vehicle_class"]),
        ]

    def __str__(self):
        return f"{self.series_code} - {self.series_name}"


# ============================================================
# V2 新增：车辆配置维度模型（FP02 VCdb 对标）
# ============================================================


class ModelYear(models.Model):
    """年款 - 独立维度"""

    year_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="年款主键")
    year_code = models.CharField(max_length=10, unique=True, verbose_name="年款编码")
    year_label = models.CharField(max_length=50, verbose_name="年款名称")
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "vehicle_model_year"
        verbose_name = "年款"
        verbose_name_plural = "年款"
        ordering = ["sort_order", "year_code"]

    def __str__(self):
        return self.year_label


class FuelTypeDict(models.Model):
    """燃油类型字典"""

    fuel_type_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, verbose_name="燃油类型主键"
    )
    fuel_type_code = models.CharField(max_length=20, unique=True, verbose_name="燃油编码")
    fuel_type_name = models.CharField(max_length=50, verbose_name="燃油名称")
    sort_order = models.IntegerField(default=0, verbose_name="排序")

    class Meta:
        db_table = "vehicle_fuel_type_dict"
        verbose_name = "燃油类型"
        verbose_name_plural = "燃油类型"
        ordering = ["sort_order", "fuel_type_code"]

    def __str__(self):
        return self.fuel_type_name


class EngineConfig(models.Model):
    """发动机配置"""

    ASPIRATION_CHOICES = [
        ("NATURAL", "自然吸气"),
        ("TURBO", "涡轮增压"),
        ("SUPERCHARGED", "机械增压"),
        ("TWIN_TURBO", "双涡轮增压"),
        ("TWIN_CHARGED", "双增压"),
    ]

    CYLINDER_ARRANGEMENT_CHOICES = [
        ("INLINE", "直列"),
        ("V", "V型"),
        ("FLAT", "水平对置"),
        ("W", "W型"),
        ("ROTARY", "转子"),
    ]

    engine_config_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, verbose_name="发动机配置主键"
    )
    engine_code = models.CharField(max_length=24, unique=True, verbose_name="发动机编码")
    engine_name = models.CharField(max_length=100, verbose_name="发动机名称")
    displacement = models.CharField(max_length=20, blank=True, null=True, verbose_name="排量描述")
    displacement_cc = models.IntegerField(null=True, blank=True, verbose_name="排量(cc)")
    fuel_type = models.ForeignKey(
        FuelTypeDict,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="engines",
        verbose_name="燃油类型",
    )
    aspiration = models.CharField(
        max_length=20,
        choices=ASPIRATION_CHOICES,
        default="NATURAL",
        verbose_name="进气方式",
    )
    max_power_kw = models.IntegerField(null=True, blank=True, verbose_name="最大功率(kW)")
    max_torque_nm = models.IntegerField(null=True, blank=True, verbose_name="最大扭矩(Nm)")
    cylinder_count = models.IntegerField(null=True, blank=True, verbose_name="气缸数")
    cylinder_arrangement = models.CharField(
        max_length=20,
        choices=CYLINDER_ARRANGEMENT_CHOICES,
        null=True,
        blank=True,
        verbose_name="气缸排列",
    )
    battery_capacity_kwh = models.DecimalField(
        max_digits=6,
        decimal_places=1,
        null=True,
        blank=True,
        verbose_name="电池容量(kWh)",
    )
    motor_count = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="电机数量",
    )
    motor_type = models.CharField(
        max_length=30,
        null=True,
        blank=True,
        verbose_name="电机类型",
    )
    system_power_kw = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="综合系统功率(kW)",
    )
    description = models.TextField(blank=True, null=True, verbose_name="发动机说明")
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "vehicle_engine_config"
        verbose_name = "发动机配置"
        verbose_name_plural = "发动机配置"
        ordering = ["sort_order", "engine_code"]

    def __str__(self):
        return f"{self.engine_code} - {self.engine_name}"


class TransmissionConfig(models.Model):
    """变速箱配置"""

    TRANS_TYPE_CHOICES = [
        ("MT", "手动"),
        ("AT", "自动"),
        ("CVT", "无级变速"),
        ("DCT", "双离合"),
        ("AMT", "电控机械自动"),
    ]

    trans_config_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, verbose_name="变速箱配置主键"
    )
    trans_code = models.CharField(max_length=10, unique=True, verbose_name="变速箱编码")
    trans_name = models.CharField(max_length=100, verbose_name="变速箱名称")
    trans_type = models.CharField(
        max_length=20, choices=TRANS_TYPE_CHOICES, verbose_name="变速箱类型"
    )
    gear_count = models.IntegerField(null=True, blank=True, verbose_name="档位数")
    description = models.TextField(blank=True, null=True, verbose_name="说明")
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "vehicle_transmission_config"
        verbose_name = "变速箱配置"
        verbose_name_plural = "变速箱配置"
        ordering = ["sort_order", "trans_code"]

    def __str__(self):
        return self.trans_name


class DriveConfig(models.Model):
    """驱动配置"""

    DRIVE_TYPE_CHOICES = [
        ("FWD", "前轮驱动"),
        ("RWD", "后轮驱动"),
        ("AWD", "全时四驱"),
        ("4WD", "分时四驱"),
    ]

    drive_config_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, verbose_name="驱动配置主键"
    )
    drive_code = models.CharField(max_length=10, unique=True, verbose_name="驱动编码")
    drive_name = models.CharField(max_length=50, verbose_name="驱动名称")
    drive_type = models.CharField(
        max_length=20, choices=DRIVE_TYPE_CHOICES, verbose_name="驱动方式"
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "vehicle_drive_config"
        verbose_name = "驱动配置"
        verbose_name_plural = "驱动配置"
        ordering = ["sort_order", "drive_code"]

    def __str__(self):
        return self.drive_name


class BrakeConfig(models.Model):
    """制动配置"""

    BRAKE_TYPE_CHOICES = [
        ("DISC", "盘式"),
        ("DRUM", "鼓式"),
    ]

    FRONT_BRAKE_DETAIL_CHOICES = [
        ("VENTILATED_DISC", "通风盘式"),
        ("SOLID_DISC", "实心盘式"),
        ("DRUM", "鼓式"),
        ("CERAMIC", "陶瓷盘式"),
    ]

    PARKING_BRAKE_CHOICES = [
        ("ELECTRONIC", "电子驻车"),
        ("MECHANICAL", "机械手刹"),
        ("FOOT", "脚刹"),
    ]

    brake_config_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, verbose_name="制动配置主键"
    )
    brake_code = models.CharField(max_length=16, unique=True, verbose_name="制动编码")
    brake_name = models.CharField(max_length=100, verbose_name="制动配置名称")
    front_brake_type = models.CharField(
        max_length=20, choices=BRAKE_TYPE_CHOICES, verbose_name="前制动类型"
    )
    front_brake_detail = models.CharField(
        max_length=20,
        choices=FRONT_BRAKE_DETAIL_CHOICES,
        default="VENTILATED_DISC",
        verbose_name="前制动器详情",
    )
    rear_brake_type = models.CharField(
        max_length=20, choices=BRAKE_TYPE_CHOICES, verbose_name="后制动类型"
    )
    parking_brake_type = models.CharField(
        max_length=20,
        choices=PARKING_BRAKE_CHOICES,
        default="ELECTRONIC",
        verbose_name="驻车制动类型",
    )
    description = models.TextField(blank=True, null=True, verbose_name="说明")
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "vehicle_brake_config"
        verbose_name = "制动配置"
        verbose_name_plural = "制动配置"
        ordering = ["sort_order", "brake_code"]

    def __str__(self):
        return self.brake_name


class SuspensionConfig(models.Model):
    """悬架与转向配置"""

    FRONT_SUSP_CHOICES = [
        ("MCPHERSON", "麦弗逊式独立悬架"),
        ("DOUBLE_WISHBONE", "双叉臂式独立悬架"),
        ("MULTI_LINK_FRONT", "多连杆式独立悬架"),
        ("AIR_FRONT", "空气悬架"),
        ("LEAF_SPRING_FRONT", "钢板弹簧非独立悬架"),
    ]

    REAR_SUSP_CHOICES = [
        ("MULTI_LINK", "多连杆式独立悬架"),
        ("TORSION_BEAM", "扭力梁式非独立悬架"),
        ("DOUBLE_WISHBONE_REAR", "双叉臂式独立悬架"),
        ("AIR_REAR", "空气悬架"),
        ("LEAF_SPRING", "钢板弹簧非独立悬架"),
        ("TRAILING_ARM", "拖曳臂式非独立悬架"),
    ]

    STEERING_CHOICES = [
        ("ELECTRIC", "电动助力"),
        ("HYDRAULIC", "液压助力"),
        ("ELECTRO_HYDRAULIC", "电子液压助力"),
        ("NONE", "无助力"),
    ]

    susp_config_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, verbose_name="悬架配置主键"
    )
    susp_code = models.CharField(max_length=6, unique=True, verbose_name="悬架编码")
    susp_name = models.CharField(max_length=100, verbose_name="悬架配置名称")
    front_suspension = models.CharField(
        max_length=20, choices=FRONT_SUSP_CHOICES, default="MCPHERSON", verbose_name="前悬架类型"
    )
    rear_suspension = models.CharField(
        max_length=20, choices=REAR_SUSP_CHOICES, default="MULTI_LINK", verbose_name="后悬架类型"
    )
    steering_assist = models.CharField(
        max_length=20, choices=STEERING_CHOICES, default="ELECTRIC", verbose_name="助力类型"
    )
    description = models.TextField(blank=True, null=True, verbose_name="说明")
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "vehicle_suspension_config"
        verbose_name = "悬架配置"
        verbose_name_plural = "悬架配置"
        ordering = ["sort_order", "susp_code"]

    def __str__(self):
        return self.susp_name


class BodyConfig(models.Model):
    """车身配置"""

    BODY_TYPE_CHOICES = [
        ("SEDAN", "三厢轿车"),
        ("HATCHBACK", "两厢掀背"),
        ("SUV", "SUV"),
        ("MPV", "MPV"),
        ("COUPE", "双门轿跑"),
        ("WAGON", "旅行车"),
        ("PICKUP", "皮卡"),
        ("CONVERTIBLE", "敞篷车"),
        ("LIFTBACK", "溜背车"),
        ("ROADSTER", "双座跑车"),
    ]

    body_config_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, verbose_name="车身配置主键"
    )
    body_code = models.CharField(max_length=12, unique=True, verbose_name="车身编码")
    body_name = models.CharField(max_length=100, verbose_name="车身配置名称")
    body_type = models.CharField(max_length=20, choices=BODY_TYPE_CHOICES, verbose_name="车身类型")
    door_count = models.IntegerField(default=4, verbose_name="车门数")
    seat_count = models.IntegerField(default=5, verbose_name="座位数")
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "vehicle_body_config"
        verbose_name = "车身配置"
        verbose_name_plural = "车身配置"
        ordering = ["sort_order", "body_code"]

    def __str__(self):
        return self.body_name


class VehicleModel(models.Model):
    """
    车型 - 具体年款配置（品牌 → 车系 → 车型）。

    统一车型表（原 VehicleModelBasic 的数据已迁入本表，两表已合并）。
    """

    MODEL_LEVEL_CHOICES = [
        ("entry", "入门版"),
        ("mid", "中配版"),
        ("high", "高配版"),
        ("top", "顶配版"),
        ("limited", "限量版"),
    ]

    STATUS_CHOICES = [
        ("draft", "草稿"),
        ("active", "启用"),
        ("inactive", "停用"),
    ]

    model_id = models.UUIDField(primary_key=True, default=uuid.uuid4, verbose_name="车型主键")
    model_code = models.CharField(max_length=16, unique=True, verbose_name="车型编码")
    model_name = models.CharField(max_length=200, verbose_name="车型名称")
    series = models.ForeignKey(
        VehicleSeries,
        on_delete=models.CASCADE,
        related_name="vehicle_models",
        verbose_name="所属车系",
    )
    series_code = models.CharField(max_length=12, verbose_name="车系编码")
    series_name = models.CharField(max_length=100, verbose_name="车系名称")
    brand = models.ForeignKey(
        Brand,
        on_delete=models.CASCADE,
        related_name="vehicle_models",
        verbose_name="所属品牌",
    )
    brand_code = models.CharField(max_length=8, verbose_name="品牌编码")
    brand_name = models.CharField(max_length=100, verbose_name="品牌名称")
    data_source = models.CharField(max_length=50, default="manual", verbose_name="数据源标识")
    source_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="源端ID",
        help_text="外部系统中的原始ID，如autohome spec_id",
    )
    data_hash = models.CharField(
        max_length=64, blank=True, default="", verbose_name="哈希标识", db_index=True
    )
    model_year = models.ForeignKey(
        ModelYear,
        on_delete=models.SET_NULL,
        null=True,
        related_name="vehicle_models",
        verbose_name="年款",
    )
    engine_config = models.ForeignKey(
        EngineConfig,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vehicle_models",
        verbose_name="发动机配置",
    )
    trans_config = models.ForeignKey(
        TransmissionConfig,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vehicle_models",
        verbose_name="变速箱配置",
    )
    drive_config = models.ForeignKey(
        DriveConfig,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vehicle_models",
        verbose_name="驱动配置",
    )
    brake_config = models.ForeignKey(
        BrakeConfig,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vehicle_models",
        verbose_name="制动配置",
    )
    suspension_config = models.ForeignKey(
        SuspensionConfig,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vehicle_models",
        verbose_name="悬架配置",
    )
    body_config = models.ForeignKey(
        BodyConfig,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vehicle_models",
        verbose_name="车身配置",
    )
    guide_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="指导价"
    )
    seat_count = models.IntegerField(
        null=True, blank=True, verbose_name="座位数", help_text="从 autohome condition 数组解析"
    )
    # ===== Tier 1: 底盘车身参数（autohome paramconflist titleid 映射） =====
    length_mm = models.IntegerField(
        null=True, blank=True, verbose_name="车长(mm)", help_text="titleid=21"
    )
    width_mm = models.IntegerField(
        null=True, blank=True, verbose_name="车宽(mm)", help_text="titleid=22"
    )
    height_mm = models.IntegerField(
        null=True, blank=True, verbose_name="车高(mm)", help_text="titleid=23"
    )
    wheelbase_mm = models.IntegerField(
        null=True, blank=True, verbose_name="轴距(mm)", help_text="titleid=24"
    )
    front_track_mm = models.IntegerField(
        null=True, blank=True, verbose_name="前轮距(mm)", help_text="titleid=25"
    )
    rear_track_mm = models.IntegerField(
        null=True, blank=True, verbose_name="后轮距(mm)", help_text="titleid=26"
    )
    curb_weight_kg = models.IntegerField(
        null=True, blank=True, verbose_name="整备质量(kg)", help_text="titleid=19"
    )
    gross_weight_kg = models.IntegerField(
        null=True, blank=True, verbose_name="满载质量(kg)", help_text="titleid=20"
    )
    fuel_tank_capacity_l = models.IntegerField(
        null=True, blank=True, verbose_name="油箱容积(L)", help_text="titleid=33"
    )
    cargo_volume_l = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name="行李厢容积",
        help_text="titleid=34, 如 356-1100",
    )
    # ===== Tier 1: 性能参数 =====
    acceleration_0100 = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="0-100加速(s)",
        help_text="titleid=15",
    )
    max_speed_kmh = models.IntegerField(
        null=True, blank=True, verbose_name="最高车速(km/h)", help_text="titleid=16"
    )
    fuel_consumption_wltc = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="WLTC油耗(L/100km)",
        help_text="titleid=17",
    )
    # ===== Tier 1: 基础描述字段 =====
    manufacturer = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="制造商", help_text="titleid=4"
    )
    # 原 vehicle_class（车型级别，titleid=5）已更名 vehicle_level，
    # 腾出 vehicle_class 供品类冗余字段使用（PRD-DP-VHC-004 M2）
    vehicle_level = models.CharField(
        max_length=50, null=True, blank=True, verbose_name="车型级别", help_text="titleid=5"
    )
    vehicle_class = models.CharField(
        max_length=20,
        choices=VehicleClass.choices,
        null=True,
        blank=True,
        verbose_name="车辆品类",
        help_text="冗余自所属车系 VehicleSeries.vehicle_class，导入时带下；冲突时以车系为准（PRD-DP-VHC-004 §8 R4）",
    )
    listing_date = models.CharField(
        max_length=30, null=True, blank=True, verbose_name="上市时间", help_text="titleid=8"
    )
    # ===== Tier 2: 安全装备（JSON，布尔列表 ●/○/-） =====
    safety_features = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="安全装备",
        help_text="titleid 72-93, 格式 {'abs':'●','esp':'●',...}",
    )
    driver_assist_features = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="驾驶辅助",
        help_text="titleid 94-114, 格式 {'acc':'○','lane_keeping':'●',...}",
    )
    # ===== Tier 3: 舒适与科技配置（JSON） =====
    comfort_features = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="舒适与科技配置",
        help_text="titleid 115-192, 格式 {'sunroof':'●','heated_seats':'○',...}",
    )
    # V2: 统一装备特征（内容匹配，不区分安全/舒适/驾驶辅助）
    features = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="装备特征(V2)",
        help_text="所有 ●/○/- 特征，key=值内容。跨车型稳定。",
    )
    option_packages = models.JSONField(
        default=list, blank=True, verbose_name="选装包", help_text="以'包含：'开头的选装包列表"
    )
    model_level = models.CharField(
        max_length=20,
        choices=MODEL_LEVEL_CHOICES,
        default="mid",
        verbose_name="配置级别",
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="draft", verbose_name="状态"
    )
    description = models.TextField(blank=True, null=True, verbose_name="车型说明")
    highlights = models.JSONField(default=list, blank=True, verbose_name="配置亮点")
    sort_order = models.IntegerField(default=0, verbose_name="排序权重")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "vehicle_model"
        verbose_name = "车型"
        verbose_name_plural = "车型"
        ordering = ["sort_order", "model_code"]
        indexes = [
            models.Index(fields=["model_code"]),
            models.Index(fields=["series"]),
            models.Index(fields=["brand"]),
            models.Index(fields=["model_year"]),
            models.Index(fields=["status"]),
            models.Index(fields=["vehicle_class"]),
        ]

    def __str__(self):
        return f"{self.model_code} - {self.model_name}"


class BedConfig(models.Model):
    """货箱配置 (VCdb BedConfig) — 皮卡/卡车货箱"""

    BED_TYPE_CHOICES = [
        ("STANDARD", "标准货箱"),
        ("SHORT", "短货箱"),
        ("LONG", "长货箱"),
        ("FLARESIDE", "外扩货箱"),
        ("STEPSIDE", "阶梯货箱"),
        ("DUALIE", "双后轮货箱"),
        ("CHASSIS_CAB", "底盘驾驶室"),
    ]

    MATERIAL_CHOICES = [
        ("STEEL", "钢制"),
        ("ALUMINUM", "铝合金"),
        ("COMPOSITE", "复合材料"),
    ]

    bed_config_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        verbose_name="货箱配置主键",
    )
    bed_code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="货箱编码",
    )
    bed_name = models.CharField(
        max_length=100,
        verbose_name="货箱配置名称",
    )
    bed_type = models.CharField(
        max_length=20,
        choices=BED_TYPE_CHOICES,
        verbose_name="货箱类型",
    )
    bed_length_mm = models.DecimalField(
        max_digits=8,
        decimal_places=1,
        null=True,
        blank=True,
        verbose_name="货箱长度(mm)",
    )
    bed_width_mm = models.DecimalField(
        max_digits=8,
        decimal_places=1,
        null=True,
        blank=True,
        verbose_name="货箱宽度(mm)",
    )
    bed_depth_mm = models.DecimalField(
        max_digits=8,
        decimal_places=1,
        null=True,
        blank=True,
        verbose_name="货箱深度(mm)",
    )
    material = models.CharField(
        max_length=20,
        choices=MATERIAL_CHOICES,
        blank=True,
        verbose_name="材质",
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "vehicle_bed_config"
        verbose_name = "货箱配置"
        verbose_name_plural = "货箱配置"
        ordering = ["sort_order", "bed_code"]

    def __str__(self):
        return self.bed_name


class SteeringConfig(models.Model):
    """转向配置 (VCdb Steering) — 转向系统类型"""

    STEERING_TYPE_CHOICES = [
        ("RACK_PINION", "齿轮齿条式"),
        ("RECIRCULATING_BALL", "循环球式"),
        ("ELECTRIC", "电动助力"),
        ("HYDRAULIC", "液压助力"),
        ("ELECTRO_HYDRAULIC", "电液助力"),
        ("MANUAL", "手动转向"),
    ]

    steering_config_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        verbose_name="转向配置主键",
    )
    steering_code = models.CharField(
        max_length=10,
        unique=True,
        verbose_name="转向编码",
    )
    steering_name = models.CharField(
        max_length=100,
        verbose_name="转向配置名称",
    )
    steering_type = models.CharField(
        max_length=20,
        choices=STEERING_TYPE_CHOICES,
        verbose_name="转向类型",
    )
    power_assist = models.BooleanField(
        default=True,
        verbose_name="助力转向",
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "vehicle_steering_config"
        verbose_name = "转向配置"
        verbose_name_plural = "转向配置"
        ordering = ["sort_order", "steering_code"]

    def __str__(self):
        return self.steering_name


class SpringConfig(models.Model):
    """悬挂弹簧配置 (VCdb Spring Type) — 弹簧类型"""

    SPRING_TYPE_CHOICES = [
        ("COIL", "螺旋弹簧"),
        ("LEAF", "钢板弹簧"),
        ("TORSION_BAR", "扭杆弹簧"),
        ("AIR", "空气弹簧"),
        ("RUBBER", "橡胶弹簧"),
        ("HYDRO_PNEUMATIC", "液压气动弹簧"),
    ]

    SPRING_POSITION_CHOICES = [
        ("FRONT", "前悬挂"),
        ("REAR", "后悬挂"),
    ]

    spring_config_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        verbose_name="弹簧配置主键",
    )
    spring_code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="弹簧编码",
    )
    spring_name = models.CharField(
        max_length=100,
        verbose_name="弹簧配置名称",
    )
    spring_type = models.CharField(
        max_length=20,
        choices=SPRING_TYPE_CHOICES,
        verbose_name="弹簧类型",
    )
    spring_position = models.CharField(
        max_length=10,
        choices=SPRING_POSITION_CHOICES,
        verbose_name="安装位置",
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "vehicle_spring_config"
        verbose_name = "弹簧配置"
        verbose_name_plural = "弹簧配置"
        ordering = ["sort_order", "spring_code"]

    def __str__(self):
        return self.spring_name


class GVWRModel(models.Model):
    """车辆总重等级 (VCdb GVWR) — 车辆额定总重"""

    gvwr_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        verbose_name="GVWR主键",
    )
    gvwr_code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="GVWR编码",
    )
    gvwr_name = models.CharField(
        max_length=100,
        verbose_name="GVWR名称",
    )
    weight_min_kg = models.IntegerField(
        verbose_name="最小总重(kg)",
        help_text="等级范围下限",
    )
    weight_max_kg = models.IntegerField(
        verbose_name="最大总重(kg)",
        help_text="等级范围上限",
    )
    gvwr_class = models.CharField(
        max_length=10,
        blank=True,
        verbose_name="GVWR等级",
        help_text="美国DOT车辆分类等级 (Class 1-8)",
    )
    description = models.TextField(
        blank=True,
        verbose_name="描述",
    )
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "vehicle_gvwr"
        verbose_name = "车辆总重等级"
        verbose_name_plural = "车辆总重等级"
        ordering = ["sort_order", "weight_min_kg"]

    def __str__(self):
        return f"{self.gvwr_name} ({self.weight_min_kg}-{self.weight_max_kg}kg)"

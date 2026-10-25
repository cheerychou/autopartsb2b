"""
VinDecodeCache — VIN 解码结果持久化缓存

「缓存即资产」架构的 L3 层（EA-DA-002 §7.1）。
VIN 是静态映射（一辆车的 VIN 终身对应一个配置），可长期缓存，永不主动过期。
第三方/Mock 解码结果回写此表，下次同 VIN 零成本命中。

设计要点：
- vin 作主键（唯一、终身不变，省一次索引）
- FK 关联本地 Brand/Series/VehicleModel（与 autohome 车型库对齐）
- 冗余快照字段（brand_name 等）兜底展示，车型库未命中时仍可用
- raw_response 保留第三方原始返回，供数据治理/再解析
- hit_count 量化缓存价值，decoded_at 记录回写时间
"""

from django.db import models


class VinDecodeCache(models.Model):
    """VIN 解析结果缓存 —— 第三方/Mock 查询结果的沉淀资产"""

    # VIN 作主键（17 位，唯一，终身不变）
    vin = models.CharField(
        max_length=17,
        primary_key=True,
        verbose_name="车架号VIN",
        help_text="ISO 3779 标准 17 位车架号，作主键",
    )

    # 解析结果 —— 优先 FK 关联本地车型库（autohome 采集）
    brand = models.ForeignKey(
        "data_platform.Brand",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vin_cache_entries",
        verbose_name="关联品牌",
    )
    series = models.ForeignKey(
        "data_platform.VehicleSeries",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vin_cache_entries",
        verbose_name="关联车系",
    )
    vehicle_model = models.ForeignKey(
        "data_platform.VehicleModel",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vin_cache_entries",
        verbose_name="关联车型",
    )

    # 冗余快照字段（车型库未命中时的兜底展示与后续匹配）
    brand_name = models.CharField(max_length=100, blank=True, verbose_name="品牌名称")
    series_name = models.CharField(max_length=100, blank=True, verbose_name="车系名称")
    model_name = models.CharField(max_length=200, blank=True, verbose_name="车型名称")
    year = models.IntegerField(null=True, blank=True, verbose_name="年款")
    engine_model = models.CharField(max_length=100, blank=True, verbose_name="发动机型号")
    displacement = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="排量(L)",
    )
    fuel_type = models.CharField(max_length=30, blank=True, verbose_name="燃油类型")
    transmission = models.CharField(max_length=50, blank=True, verbose_name="变速箱")

    # 治理字段
    raw_response = models.JSONField(
        verbose_name="第三方原始返回", help_text="保留原始响应供治理/再解析"
    )
    data_source = models.CharField(
        max_length=30,
        default="mock",
        verbose_name="数据来源",
        help_text="mock/jisuapi/che300/juhe/autohome/manual",
    )
    confidence = models.FloatField(default=1.0, verbose_name="置信度")
    decoded_at = models.DateTimeField(auto_now=True, verbose_name="解析时间")
    hit_count = models.IntegerField(
        default=0,
        verbose_name="命中次数",
        help_text="每次本地命中自增，量化缓存价值",
    )

    class Meta:
        db_table = "data_platform_vin_decode_cache"
        verbose_name = "VIN解析缓存"
        verbose_name_plural = "VIN解析缓存"
        indexes = [
            models.Index(fields=["brand"]),
            models.Index(fields=["series"]),
            models.Index(fields=["data_source"]),
        ]

    def __str__(self):
        return f"{self.vin} ({self.brand_name} {self.model_name})"

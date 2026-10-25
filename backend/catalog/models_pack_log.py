"""数据包版本登记（F-21/I3 配套，27号§七.6）。

v1 新增表（"只加不改"纪律允许的扩展表，copy-ledger 登记）：
记录已应用的数据包，catalog_version 取最新一条的 pack_id——I1 响应 meta
与前台缓存失效键（29号§二）。语义对齐 CDD3 SeedPackageExecution（26号§5.4）。
"""

from django.db import models


class CatalogPackLog(models.Model):
    """已应用数据包登记：一行 = 一次成功导入。"""

    pack_id = models.CharField(max_length=64, unique=True, verbose_name="包ID")
    pack_type = models.CharField(max_length=8, verbose_name="INIT/DELTA/SNAP")
    schema_ver = models.CharField(max_length=16, blank=True, default="", verbose_name="schema版本")
    checksum = models.CharField(max_length=64, blank=True, default="", verbose_name="包校验和")
    entity_counts = models.JSONField(default=dict, blank=True, verbose_name="各实体影响行数")
    imported_at = models.DateTimeField(auto_now_add=True, verbose_name="导入时间")

    class Meta:
        db_table = "catalog_pack_log"
        ordering = ["-imported_at"]

    @classmethod
    def current_version(cls) -> str:
        row = cls.objects.order_by("-imported_at").first()
        return row.pack_id if row else "unknown"

    def __str__(self):
        return f"{self.pack_id} @ {self.imported_at:%Y-%m-%d %H:%M}"

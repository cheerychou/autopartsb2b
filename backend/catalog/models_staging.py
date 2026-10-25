"""F-23 补录暂存（I4 前半，27号§十）。

运营方数据员在 catalog 内补录/纠错的适配数据 → 暂存（origin=local，本地即时生效需
另经确认，v1 人工流：暂存→导出→总仓审核）→ FEED 变更集导出（I4 后半=上传总仓，
人工通道 P1 自动化）。

契约（27号§十）：变更集与 DELTA 同构（origin=local），另含 corrections.json（对 hub
数据的纠错建议）；总仓审核采纳后随下版包回发。
"""

import uuid

from django.db import models

from catalog.models_fitment import SPUFitment


class StagedFitment(models.Model):
    """补录暂存行：实例内新增/修改的适配关系（origin=local 语义）。"""

    staged_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    spu = models.ForeignKey(
        "data_platform.SPU", on_delete=models.CASCADE, related_name="staged_fitments"
    )
    series = models.ForeignKey(
        "data_platform.VehicleSeries",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    qualifiers = models.JSONField(default=dict, blank=True)
    year_from = models.IntegerField(null=True, blank=True)
    year_to = models.IntegerField(null=True, blank=True)
    note = models.CharField(max_length=200, blank=True, default="")
    # 回流状态机：draft → exported（导出后等待总仓审核；通过前只在本地生效）
    status = models.CharField(max_length=10, default="draft")  # draft | exported
    linked_fitment = models.ForeignKey(
        SPUFitment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name="已生效的本地适配行",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "catalog_staged_fitment"
        ordering = ["-created_at"]

    def __str__(self):
        return f"staged:{self.spu_id} {self.note or self.qualifiers}"


class FeedExportLog(models.Model):
    """FEED 变更集导出登记（对称于 CatalogPackLog；27号§十）。"""

    feed_id = models.CharField(max_length=64, unique=True, verbose_name="变更集ID")
    row_count = models.IntegerField()
    exported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "catalog_feed_export_log"
        ordering = ["-exported_at"]

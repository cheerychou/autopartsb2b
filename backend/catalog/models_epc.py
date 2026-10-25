"""
EpcCatalog — 主机厂原厂 EPC（电子配件目录）四级目录树

「预采集编排策略」的 P0 落库目标（EA-DA-004 §5.2）。
预采集从 17VIN 接口 5101–5104 采集四级目录，写入此表。

设计要点：
- 四级自关联（parent），对标 17VIN 的 cata1/cata2/cata3/cata4 层级
- 按 epc 标识隔离（17VIN 的 Brand→Epc，如 toyota/bmw 各有独立目录树）
- catalog_code 存 17VIN 的 cata_code（如 "0901_090562C-0001"）
- 与 PCdb Category 完全独立，不混表（EA-DA-003 §7.2.6 决策）
"""

import uuid

from django.db import models

from .models import ProprietaryTier


class EpcCatalog(models.Model):
    """主机厂原厂 EPC 四级目录节点"""

    LEVEL_CHOICES = [
        ("level1", "一级目录"),
        ("level2", "二级目录"),
        ("level3", "三级目录"),
        ("level4", "四级目录"),
    ]

    STATUS_CHOICES = [
        ("active", "在用"),
        ("inactive", "停用"),
        ("archived", "归档"),
    ]

    catalog_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        verbose_name="目录主键",
    )

    # ---- 17VIN 标识（预采集来源对齐）----
    epc = models.CharField(
        max_length=50,
        verbose_name="EPC标识",
        help_text="17VIN 的品牌EPC标识，如 toyota/bmw/vw，按品牌隔离目录树",
    )
    proprietary_tier = models.CharField(
        max_length=20,
        choices=ProprietaryTier.choices,
        default=ProprietaryTier.THIRD_PARTY_PAID,
        verbose_name="专有级别",
        help_text="EpcCatalog 全量来自 17VIN 付费预采集（5101-5104），默认 third_party_paid（REF-DP-STD-005）",
    )
    catalog_code = models.CharField(
        max_length=100,
        verbose_name="目录编码",
        help_text="17VIN 的 cata_code，如 '0901'（一级）或 '0901_090562C-0001'（多级拼接）",
    )

    # ---- 层级结构 ----
    level = models.CharField(
        max_length=10,
        choices=LEVEL_CHOICES,
        verbose_name="目录级别",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
        verbose_name="父目录",
        help_text="一级目录 parent=NULL；二/三/四级指向上一级",
    )
    # 冗余存全路径编码，免递归查询（如 '09>0901>0901_090562C>0901_090562C-0001'）
    full_path = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="全路径编码",
        help_text="从根到当前节点的编码路径，'>' 分隔，用于免递归检索整棵树",
    )

    # ---- 名称 ----
    name_zh = models.CharField(max_length=200, verbose_name="目录中文名")
    name_en = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="目录英文名",
    )

    # ---- 17VIN 上下文快照（关联哪辆车/哪个车型）----
    # 预采集是以 VIN 为触发点的，记录来源 VIN 便于追溯
    source_vin = models.CharField(
        max_length=17,
        blank=True,
        verbose_name="采集来源VIN",
        help_text="预采集触发该目录的 VIN，便于追溯数据来源",
    )
    # 17VIN 解码返回的 epc_id（某原厂 EPC 下的细分车型 id）
    epc_id = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="EPC细分车型ID",
        help_text="17VIN 的 epc_id，某原厂 EPC 下的细分车型标识",
    )

    # ---- 治理字段 ----
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="active",
        verbose_name="状态",
    )
    data_source = models.CharField(
        max_length=30,
        default="seventeen_vin",
        verbose_name="数据来源",
        help_text="seventeen_vin（预采集）/ manual（人工）",
    )
    fetched_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="采集时间",
        help_text="该目录节点首次采集入库的时间",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = "data_platform_epc_catalog"
        verbose_name = "EPC目录"
        verbose_name_plural = "EPC目录"
        # 同一 EPC 下同一层级编码唯一
        constraints = [
            models.UniqueConstraint(
                fields=["epc", "catalog_code", "level"],
                name="uniq_epc_catalog_code_per_level",
            ),
        ]
        indexes = [
            models.Index(fields=["epc"]),
            models.Index(fields=["level"]),
            models.Index(fields=["parent"]),
            models.Index(fields=["source_vin"]),
            models.Index(fields=["full_path"]),
        ]

    def __str__(self):
        return f"[{self.epc}] {self.level}: {self.name_zh}"

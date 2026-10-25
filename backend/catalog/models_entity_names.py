"""多市场命名表 entity_names（27号§四 定稿契约；总仓 ADT-DP-007 的实例侧落地，本仓新建非拷贝）。

键 = entity_type + entity_id + market + locale + name + name_type（28a R2.1 泛化拍板）：
- market：`GLOBAL`=市场无关默认；`ru` 为第一行数据（多市场复用免费获得）；
- name_type：official（官方名）/ alias（俗称）；source：official / market（俗称来源）；
- I1 名称解析回退链 **ru→en→zh 固定序**（28a 定稿要点，收敛在 services/query.resolve_name）。

语料随 I3 数据包下发（27号：翻译成果总仓加工，不在门店维护）；entity_names 行进入
包内时由 import_seed_package 灌入（本 importer 为 JSON 形态——27号§四包结构示意 CSV，
CDD3 期 1 实际出包若为 CSV 届时加适配器；skip-unknown 前向兼容保证旧包不炸）。
"""

import uuid

from django.db import models

MARKET_GLOBAL = "GLOBAL"
MARKET_RU = "ru"


class EntityName(models.Model):
    """一条实体命名（某实体在某市场/locale 下的一种名称）。"""

    name_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # entity_type：brand/series/model/category/spu（27号§四"…"可扩展；本仓 v1 用此五种）
    entity_type = models.CharField(max_length=16, verbose_name="实体类型")
    # entity_id：各实体 UUID 主键的字符串化（泛化键，跨实体统一，不建 FK——拷贝域模型禁改）
    entity_id = models.CharField(max_length=64, db_index=True, verbose_name="实体主键")
    market = models.CharField(
        max_length=16, default=MARKET_GLOBAL, verbose_name="市场", help_text="GLOBAL=市场无关默认"
    )
    locale = models.CharField(max_length=16, verbose_name="locale", help_text="如 ru-RU/en/zh-CN")
    name = models.CharField(max_length=300, verbose_name="名称")
    name_type = models.CharField(
        max_length=8, default="official", verbose_name="名称类型", help_text="official/alias"
    )
    source = models.CharField(
        max_length=16, default="official", verbose_name="来源", help_text="official/market"
    )
    status = models.CharField(max_length=8, default="active", verbose_name="状态")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "catalog_entity_name"
        # 幂等自然键（I3 update_or_create 依据；同实体同市场同类型同名=一行）
        unique_together = [
            ["entity_type", "entity_id", "market", "locale", "name_type", "name"],
        ]
        indexes = [models.Index(fields=["entity_type", "entity_id", "market", "status"])]
        ordering = ["market", "name_type", "created_at"]

    def __str__(self):
        return f"{self.entity_type}:{self.entity_id[:8]}[{self.market}/{self.name_type}]{self.name}"

"""数据包版本登记（F-21/I3 配套，27号§七.6）。

v1 新增表（"只加不改"纪律允许的扩展表，copy-ledger 登记）：
记录已应用的数据包，catalog_version 取最新一条的 pack_id——I1 响应 meta
与前台缓存失效键（29号§二）。语义对齐 CDD3 SeedPackageExecution（26号§5.4）。
"""

from django.db import models

# 实例支持的目录 schema 版本锚点（27号§三 schema 双轨）：随实例代码能力升级而升。
# 兼容窗口 = [MAJOR−1, MAJOR]（27号§六.1）——导入命令据此放行/拒收。
SUPPORTED_SCHEMA_VER = "1.0"


def schema_ver_supported(pack_schema_ver: str) -> tuple[bool, str]:
    """27号§六.2 导入时校验：窗口内放行；高于窗口=须先升级应用；低于窗口=陈旧包拒收。

    返回 (是否放行, 拒收原因)；无法解析的 schema_ver 一律不放行（预检零容差）。
    """
    raw = str(pack_schema_ver or "").strip()
    try:
        major = int(raw.split(".", 1)[0])
    except ValueError:
        return False, f"包 schema_ver 无法解析: {raw or '(缺省)'}"
    supported_major = int(SUPPORTED_SCHEMA_VER.split(".", 1)[0])
    if major > supported_major:
        return False, f"包 schema_ver={raw} 高于实例支持窗口，请先升级应用（27号§六.2）"
    if major < supported_major - 1:
        return False, f"包 schema_ver={raw} 低于实例支持窗口（陈旧包拒收，27号§六.2）"
    return True, ""


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

"""I4 补录暂存/回流导出服务（27号§十；v1 人工通道）。

导出 = 将 status=draft 的暂存行打包为 FEED 变更集（tar.gz，与 DELTA 同构：
manifest + data/fitments.json，origin=local）+ 登记导出、暂存行置 exported。
上传与总仓审核为人工通道（G-04），P1 自动化。
"""

from __future__ import annotations

import io
import json
import tarfile
import uuid
from datetime import datetime

from django.db import transaction

from catalog.models_pack_log import CatalogPackLog
from catalog.models_staging import FeedExportLog, StagedFitment


def _feed_id() -> str:
    return f"FEED-{datetime.now():%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"


@transaction.atomic
def export_feed() -> tuple[str, bytes]:
    """打包 draft 暂存行为 FEED 变更集（tar.gz）；无 draft 行时抛 ValueError。"""
    rows = list(StagedFitment.objects.filter(status="draft").select_related("spu"))
    if not rows:
        raise ValueError("无待导出的补录暂存行")

    feed_id = _feed_id()
    payload = {
        "manifest": {
            "feed_id": feed_id,
            "pack_type": "FEED",
            "origin": "local",
            "produced_at": datetime.now().isoformat(),
            "row_count": len(rows),
        },
        "fitments": [
            {
                "origin": "local",
                "staged_id": str(r.staged_id),
                "spu_id": str(r.spu.spu_id),
                "oe_number": r.spu.oe_number,
                "series_code": getattr(r.series, "series_code", ""),
                "qualifiers": r.qualifiers,
                "year_from": r.year_from,
                "year_to": r.year_to,
                "note": r.note,
                "verified_status": "unverified",  # 回流后由总仓抽验授予（R3.3）
            }
            for r in rows
        ],
    }

    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tf:
        meta = json.dumps(payload["manifest"], ensure_ascii=False).encode()
        info = tarfile.TarInfo("manifest.json")
        info.size = len(meta)
        tf.addfile(info, io.BytesIO(meta))
        data = json.dumps(payload["fitments"], ensure_ascii=False).encode()
        info = tarfile.TarInfo("data/fitments.json")
        info.size = len(data)
        tf.addfile(info, io.BytesIO(data))

    FeedExportLog.objects.create(feed_id=feed_id, row_count=len(rows))
    StagedFitment.objects.filter(status="draft").update(status="exported")
    return feed_id, buf.getvalue()


def catalog_version() -> str:
    """回流不改变 catalog_version（那是下行包的事）——占位对齐 27号语义。"""
    return CatalogPackLog.current_version()


def new_staging_id() -> str:
    return str(uuid.uuid4())

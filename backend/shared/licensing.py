"""B1-RU 离线 license（D3-A 裁定 2026-10-26；26号开放参数"订阅状态实例侧校验+离线宽限"收口）。

机制（刻意收小，与"不远程锁死"裁定一致——26号§八.4）：
- 文件：JSON `{"payload": {...}, "signature": <b64>}`，Ed25519 验签（公钥随代码分发，
  私钥在开发商/运营方侧，签发用 manage.py make_license）；
- payload：licensee / instance_id / tier / expires_at(YYYY-MM-DD) / issued_at；
- 状态：valid / expired / missing / invalid——**信息性，不拦截任何功能**（真正的商业
  杠杆是总仓对到期客户停发新包，26号§八.4 商业约束非技术约束）；
- 缺省（无文件）=missing：只提示未授权，运行不受影响；
- 结果缓存 24h（每日校验语义）；启动时 shared.apps.ready() 记一次日志。
"""

from __future__ import annotations

import base64
import binascii
import json
import logging
import time
from datetime import date

from django.conf import settings

log = logging.getLogger(__name__)

_CACHE_TTL = 24 * 3600
_CACHE: tuple[float, dict] | None = None

STATE_VALID = "valid"
STATE_EXPIRED = "expired"
STATE_MISSING = "missing"
STATE_INVALID = "invalid"


def get_license_status(*, force: bool = False) -> dict:
    """读取并验签 license，返回状态摘要（信息性；任何异常都吞掉并降级，不抛出）。"""
    global _CACHE
    if not force and _CACHE is not None and (time.time() - _CACHE[0]) < _CACHE_TTL:
        return _CACHE[1]
    result = _compute_status()
    _CACHE = (time.time(), result)
    return result


def _compute_status() -> dict:
    base = {
        "state": STATE_MISSING,
        "licensee": None,
        "instance_id": None,
        "tier": None,
        "expires_at": None,
        "days_left": None,
    }
    try:
        raw = open(settings.LICENSE_FILE, "rb").read()  # noqa: SIM115 —— 小文件一次性读
    except FileNotFoundError:
        return base
    except OSError as e:
        log.warning("license 文件不可读: %s", e)
        return {**base, "state": STATE_INVALID}
    try:
        doc = json.loads(raw)
        payload = doc["payload"]
        signature = base64.b64decode(doc["signature"])
        _load_public_key().verify(signature, _canonical(payload))
        expires = _parse_expires(payload.get("expires_at"))
        if expires is None:
            return {**base, "state": STATE_INVALID}
        days_left = (expires - date.today()).days
        state = STATE_VALID if days_left >= 0 else STATE_EXPIRED
        return {
            "state": state,
            "licensee": payload.get("licensee"),
            "instance_id": payload.get("instance_id"),
            "tier": payload.get("tier"),
            "expires_at": payload.get("expires_at"),
            "days_left": days_left,
        }
    except binascii.Error:
        log.warning("license 签名 base64 无法解析")
        return {**base, "state": STATE_INVALID}
    except Exception as e:  # 验签失败/结构损坏/密钥缺失——一律 invalid，不抛出
        log.warning("license 验签失败（%s）——按未授权提示，不影响功能", e.__class__.__name__)
        return {**base, "state": STATE_INVALID}


def _canonical(payload: dict) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode(
        "utf-8"
    )


def _parse_expires(raw) -> date | None:
    if not raw:
        return None
    return date.fromisoformat(str(raw)[:10])


def _load_public_key():
    """加载 Ed25519 验签公钥：默认 PEM 文件路径；也接受直接注入的 PEM 文本（测试用）。"""
    from cryptography.hazmat.primitives.serialization import load_pem_public_key

    source = settings.LICENSE_PUBLIC_KEY
    try:
        with open(source, "rb") as f:
            return load_pem_public_key(f.read())
    except (OSError, TypeError):
        return load_pem_public_key(str(source).encode())

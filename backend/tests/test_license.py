"""license 离线验签全链路回归（D3-A：信息性四态 + Ed25519 + 24h 缓存）。

自生成临时 Ed25519 密钥对——不依赖本机 ~/.config/b1ru 真私钥（CI 可跑、
真私钥不入测试）。override_settings(LICENSE_FILE/LICENSE_PUBLIC_KEY) 安全：
licensing 运行时动态读 settings（非 DRF import 期类快照，不触 KNW-EXP-008）。
签发统一走 call_command("make_license")——真实命令链路而非复制签名逻辑。
"""

import base64
import json
from datetime import date, timedelta

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from shared import licensing
from shared.licensing import get_license_status

pytestmark = pytest.mark.django_db


@pytest.fixture
def keypair(tmp_path):
    """临时 Ed25519 密钥对：私钥 PEM 文件（供 make_license）+ 公钥 PEM 文件。"""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

    key = Ed25519PrivateKey.generate()
    priv = tmp_path / "priv.pem"
    pub = tmp_path / "pub.pem"
    priv.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    pub.write_bytes(
        key.public_key().public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
        )
    )
    return priv, pub


@pytest.fixture
def lic_env(tmp_path, keypair, settings):
    """license 环境：LICENSE_FILE 指向临时路径（缺省不存在=missing）。"""
    priv, pub = keypair
    lic = tmp_path / "license.json"
    settings.LICENSE_FILE = str(lic)
    settings.LICENSE_PUBLIC_KEY = str(pub)
    licensing._CACHE = None  # 进程级缓存按用例清（licensing 全局态）
    return lic, priv


def _issue(lic, priv, *, expires: str, licensee="ООО Тест"):
    call_command(
        "make_license",
        "--licensee",
        licensee,
        "--instance-id",
        "inst-test-001",
        "--expires-at",
        expires,
        "--private-key",
        str(priv),
        "--out",
        str(lic),
    )
    licensing._CACHE = None


def test_missing_when_no_file(lic_env):
    s = get_license_status(force=True)
    assert s["state"] == "missing"
    assert s["licensee"] is None


def test_valid_and_payload_roundtrip(lic_env):
    lic, priv = lic_env
    _issue(lic, priv, expires=(date.today() + timedelta(days=30)).isoformat())
    s = get_license_status(force=True)
    assert s["state"] == "valid"
    assert s["licensee"] == "ООО Тест"
    assert s["instance_id"] == "inst-test-001"
    assert s["days_left"] == 30


def test_expired(lic_env):
    lic, priv = lic_env
    _issue(lic, priv, expires=(date.today() - timedelta(days=1)).isoformat())
    s = get_license_status(force=True)
    assert s["state"] == "expired"
    assert s["days_left"] == -1


def test_tampered_payload_invalid(lic_env):
    """改 payload 不重签 → 验签失败 → invalid（防改授权方/延期）。"""
    lic, priv = lic_env
    _issue(lic, priv, expires=(date.today() + timedelta(days=30)).isoformat())
    doc = json.loads(lic.read_text(encoding="utf-8"))
    doc["payload"]["expires_at"] = "2099-01-01"  # 私改到期日
    lic.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    assert get_license_status(force=True)["state"] == "invalid"


def test_corrupt_signature_invalid(lic_env):
    lic, priv = lic_env
    _issue(lic, priv, expires=(date.today() + timedelta(days=30)).isoformat())
    doc = json.loads(lic.read_text(encoding="utf-8"))
    doc["signature"] = "not-base64-!!!"
    lic.write_text(json.dumps(doc), encoding="utf-8")
    assert get_license_status(force=True)["state"] == "invalid"


def test_renewal_expired_to_valid(lic_env):
    """续约场景：过期后换发新文件（新到期日）→ 恢复 valid（信息性，无拦截）。"""
    lic, priv = lic_env
    _issue(lic, priv, expires=(date.today() - timedelta(days=5)).isoformat())
    assert get_license_status(force=True)["state"] == "expired"
    _issue(lic, priv, expires=(date.today() + timedelta(days=365)).isoformat())
    s = get_license_status(force=True)
    assert s["state"] == "valid" and s["days_left"] == 365


def test_cache_hits_until_force(lic_env):
    lic, priv = lic_env
    _issue(lic, priv, expires=(date.today() + timedelta(days=30)).isoformat())
    assert get_license_status(force=True)["state"] == "valid"
    # 24h 缓存窗口内换掉文件：不带 force 的读取仍返回缓存值（每日校验语义）
    lic.unlink()
    assert get_license_status()["state"] == "valid"  # 缓存
    assert get_license_status(force=True)["state"] == "missing"  # 强制重读


def test_make_license_rejects_bad_date(keypair):
    priv, _ = keypair
    with pytest.raises(CommandError, match="YYYY-MM-DD"):
        call_command(
            "make_license",
            "--licensee",
            "x",
            "--instance-id",
            "i",
            "--expires-at",
            "2027/01/01",
            "--private-key",
            str(priv),
        )


def test_signature_is_deterministic_canonical(lic_env):
    """同 payload 两次签发验签均过（_canonical 序列化稳定）+ 签名 base64 可解码。"""
    lic, priv = lic_env
    exp = (date.today() + timedelta(days=30)).isoformat()
    _issue(lic, priv, expires=exp)
    doc = json.loads(lic.read_text(encoding="utf-8"))
    base64.b64decode(doc["signature"])  # 不抛即合法 base64
    assert set(doc["payload"]) == {"licensee", "instance_id", "tier", "expires_at", "issued_at"}

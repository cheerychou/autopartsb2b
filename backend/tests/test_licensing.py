"""D3-A 回归：离线 license——Ed25519 验签 / 状态机 / 缓存 / 签发命令 roundtrip。

机制裁定：信息性校验（不锁功能，26号"不远程锁死"）；无文件=missing；到期=expired。
"""

import base64
import json
from datetime import date, timedelta

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError

import shared.licensing as L

TOMORROW = (date.today() + timedelta(days=1)).isoformat()
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()


@pytest.fixture
def env(tmp_path, monkeypatch):
    """临时密钥对 + license 文件路径（不依赖入库公钥）。"""
    key = Ed25519PrivateKey.generate()
    pub = key.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    priv = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    pub_path, priv_path, lic_path = (
        tmp_path / "pub.pem",
        tmp_path / "priv.pem",
        tmp_path / "license.json",
    )
    pub_path.write_bytes(pub)
    priv_path.write_bytes(priv)
    monkeypatch.setattr(settings, "LICENSE_PUBLIC_KEY", str(pub_path), raising=False)
    monkeypatch.setattr(settings, "LICENSE_FILE", str(lic_path), raising=False)
    L._CACHE = None
    return {"priv": str(priv_path), "lic": lic_path, "key": key}


def _write_license(priv_path, payload, out_path):
    key = serialization.load_pem_private_key(open(priv_path, "rb").read(), password=None)
    assert isinstance(key, Ed25519PrivateKey)
    signature = base64.b64encode(key.sign(L._canonical(payload))).decode()
    out_path.write_text(
        json.dumps({"payload": payload, "signature": signature}, ensure_ascii=False),
        encoding="utf-8",
    )


def _payload(expires=TOMORROW, licensee="ООО Ромашка"):
    return {
        "licensee": licensee,
        "instance_id": "inst-001",
        "tier": "standard",
        "expires_at": expires,
        "issued_at": date.today().isoformat(),
    }


def test_missing_file_state(env):
    assert L.get_license_status()["state"] == "missing"


def test_valid_license(env):
    _write_license(env["priv"], _payload(), env["lic"])
    s = L.get_license_status()
    assert s["state"] == "valid"
    assert s["licensee"] == "ООО Ромашка" and s["days_left"] >= 0


def test_expired_license(env):
    _write_license(env["priv"], _payload(expires=YESTERDAY), env["lic"])
    assert L.get_license_status()["state"] == "expired"


def test_tampered_payload_is_invalid(env):
    _write_license(env["priv"], _payload(), env["lic"])
    doc = json.loads(env["lic"].read_text(encoding="utf-8"))
    doc["payload"]["licensee"] = "злой копировщик"  # 签名后篡改
    env["lic"].write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    assert L.get_license_status()["state"] == "invalid"


def test_signature_by_other_key_is_invalid(env):
    other = Ed25519PrivateKey.generate()
    priv_path = env["lic"].with_suffix(".other.pem")
    priv_path.write_bytes(
        other.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    _write_license(str(priv_path), _payload(), env["lic"])
    assert L.get_license_status()["state"] == "invalid"


def test_status_cached_24h_until_forced(env):
    _write_license(env["priv"], _payload(), env["lic"])
    assert L.get_license_status()["state"] == "valid"
    env["lic"].unlink()
    assert L.get_license_status()["state"] == "valid"  # 命中 24h 缓存
    assert L.get_license_status(force=True)["state"] == "missing"  # force 绕过


def test_make_license_command_roundtrip(env):
    call_command(
        "make_license",
        licensee="ООО Ромашка",
        instance_id="inst-001",
        expires_at=TOMORROW,
        private_key=env["priv"],
        out=env["lic"],
    )
    assert L.get_license_status(force=True)["state"] == "valid"


def test_make_license_rejects_bad_date(env):
    with pytest.raises(CommandError):
        call_command(
            "make_license",
            licensee="x",
            instance_id="i",
            expires_at="2027/01/01",
            private_key=env["priv"],
        )

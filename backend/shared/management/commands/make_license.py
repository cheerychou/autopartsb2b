"""签发离线 license（D3-A；开发商/运营方侧工具——私钥不入库、不入镜像）。"""

import base64
import json
from datetime import date

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "签发 B1-RU 离线 license 文件（Ed25519 签名；公钥已随代码分发）"

    def add_arguments(self, parser):
        parser.add_argument("--licensee", required=True, help="被授权方（客户名称）")
        parser.add_argument(
            "--instance-id", required=True, help="实例标识（防文件拷贝复用的绑定键）"
        )
        parser.add_argument("--tier", default="standard", help="订阅档位")
        parser.add_argument("--expires-at", required=True, help="到期日 YYYY-MM-DD")
        parser.add_argument("--private-key", required=True, help="Ed25519 私钥 PEM 路径（勿入库）")
        parser.add_argument("--out", default="", help="输出文件路径（缺省打印到 stdout）")

    def handle(self, *args, **options):
        try:
            date.fromisoformat(options["expires_at"])
        except ValueError:
            raise CommandError(f"--expires-at 格式应为 YYYY-MM-DD，得到: {options['expires_at']}")

        payload = {
            "licensee": options["licensee"],
            "instance_id": options["instance_id"],
            "tier": options["tier"],
            "expires_at": options["expires_at"],
            "issued_at": date.today().isoformat(),
        }
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

        try:
            with open(options["private_key"], "rb") as f:
                key = serialization.load_pem_private_key(f.read(), password=None)
        except (OSError, TypeError, ValueError) as e:
            raise CommandError(f"私钥不可用: {e}")
        if not isinstance(key, Ed25519PrivateKey):
            raise CommandError("私钥必须是 Ed25519 类型")

        from shared.licensing import _canonical

        signature = base64.b64encode(key.sign(_canonical(payload))).decode()
        doc = json.dumps({"payload": payload, "signature": signature}, ensure_ascii=False, indent=2)
        if options["out"]:
            with open(options["out"], "w", encoding="utf-8") as f:
                f.write(doc + "\n")
            self.stdout.write(self.style.SUCCESS(f"✅ license 已写入 {options['out']}"))
        else:
            self.stdout.write(doc)

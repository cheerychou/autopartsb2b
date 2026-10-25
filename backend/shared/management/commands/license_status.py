"""查看 license 状态（信息性——任何状态都不拦截功能，26号"不远程锁死"）。"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "查看 B1-RU license 校验状态（valid/expired/missing/invalid）"

    def add_arguments(self, parser):
        parser.add_argument("--refresh", action="store_true", help="绕过 24h 缓存强制重读")

    def handle(self, *args, **options):
        from shared.licensing import get_license_status

        s = get_license_status(force=options["refresh"])
        style = self.style.SUCCESS if s["state"] == "valid" else self.style.WARNING
        self.stdout.write(
            style(
                f"license: {s['state']}  |  licensee={s['licensee']}  tier={s['tier']}\n"
                f"instance={s['instance_id']}  expires={s['expires_at']}  "
                f"days_left={s['days_left']}"
            )
        )
        if s["state"] in ("expired", "missing"):
            self.stdout.write("（信息提示：订阅到期/缺失不影响功能运行；续约后新包由总仓恢复下发）")

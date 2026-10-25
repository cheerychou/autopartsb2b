"""F-11 限时价到期批量下价（调度位命令，D1-B 裁定 2026-10-26）。

由宿主机 cron / systemd timer 周期调用（配置见 deploy/scheduler/，建议每 5–15 分钟）；
客户环境禁用 cron 时自然退化为手动位（管理端 POST /api/v1/pricing/deactivate-expired/）
+ 买家侧读路径防御——三道防线语义一致，见 services_pricing 模块 docstring。
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "F-11：批量下架限时价已到期商品（幂等；供 cron/systemd timer 周期调用）"

    def add_arguments(self, parser):
        parser.add_argument("--quiet", action="store_true", help="无到期商品时静默（cron 减噪）")

    def handle(self, *args, **options):
        from commerce.services_pricing import deactivate_expired_prices as run

        codes = run()
        if not codes:
            if options["quiet"]:
                return
            self.stdout.write("无到期商品")
            return
        self.stdout.write(
            self.style.SUCCESS(f"✅ 已下架 {len(codes)} 个到期商品: {', '.join(codes)}")
        )

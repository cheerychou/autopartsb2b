"""初始化管理端 RBAC（单一真相源；承 CDD3 init 命令纪律）。

落库机制（评审 F1/P5 修复）：角色 = Django Group（name=角色码），用户分配用
--assign username role（可重复）。角色→权限码的映射常量在 shared.ROLE_PERMISSIONS，
运行时判定在 has_permission；v1 权限集未拆到 Group.permissions（Group 仅承载角色
身份），避免双写漂移——权限码语义收敛在代码常量一处。
"""

from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand, CommandError

from shared.permissions import ROLE_PERMISSIONS, ROLES


class Command(BaseCommand):
    help = "初始化管理端 RBAC 角色（创建角色组；可分配用户）"

    def add_arguments(self, parser):
        parser.add_argument(
            "--assign",
            action="append",
            default=[],
            metavar="USERNAME:ROLE",
            help="分配角色（可重复）",
        )

    def handle(self, *args, **options):
        for role in ROLES:
            Group.objects.get_or_create(name=role)
        self.stdout.write(self.style.SUCCESS(f"角色组就绪: {', '.join(ROLES)}"))

        for pair in options["assign"]:
            if ":" not in pair:
                raise CommandError(f"--assign 格式应为 用户名:角色，得到: {pair}")
            username, role = pair.split(":", 1)
            if role not in ROLES:
                raise CommandError(f"未知角色: {role}（可选 {', '.join(ROLES)}）")
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                raise CommandError(f"用户不存在: {username}")
            user.groups.add(Group.objects.get(name=role))
            self.stdout.write(self.style.SUCCESS(f"  {username} → {role}"))

        self.stdout.write("角色权限集概览（判定逻辑见 shared.permissions）:")
        for role, perms in ROLE_PERMISSIONS.items():
            self.stdout.write(f"  {role}: {len(perms)} 项权限")

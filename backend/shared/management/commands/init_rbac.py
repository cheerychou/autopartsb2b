"""初始化管理端 RBAC 角色（单一真相源；承 CDD3 init 命令纪律）。

S0：角色定义在 shared/permissions.ROLE_PERMISSIONS；本命令随 S2（F-15 客户与角色落库）把
角色/权限写入数据库。当前实现仅打印将初始化的角色集，供部署预检使用。
"""

from django.core.management.base import BaseCommand

from shared.permissions import ROLE_PERMISSIONS


class Command(BaseCommand):
    help = "初始化管理端 RBAC 角色（S2 起落库；当前为预检输出）"

    def handle(self, *args, **options):
        self.stdout.write("将初始化的管理端角色：")
        for role, perms in ROLE_PERMISSIONS.items():
            self.stdout.write(f"  {role}: {len(perms)} 项权限")
        self.stdout.write(self.style.WARNING("S0 预检模式：未写库（S2 F-15 落地后启用写库）"))

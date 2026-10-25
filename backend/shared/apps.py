"""shared app 配置：启动时记一条 license 状态日志（D3-A"启动校验"位；信息性，异常全吞）。"""

from django.apps import AppConfig


class SharedConfig(AppConfig):
    name = "shared"
    verbose_name = "共享（RBAC/license/校验）"

    def ready(self):
        try:
            from shared.licensing import get_license_status

            s = get_license_status()
            if s["state"] == "valid":
                return  # 正常态不刷日志
            import logging

            logging.getLogger(__name__).warning(
                "license 状态: %s（不影响功能；续约见 manage.py license_status）", s["state"]
            )
        except Exception:  # 启动路径绝不能被 license 拖垮（fail-open 于信息性检查）
            pass

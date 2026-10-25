#!/usr/bin/env python
"""B1-RU Django 管理入口（单体部署单元，24号裁定5）"""

import os
import sys


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "未找到 Django——请先 `make install-backend` 创建 venv 并安装依赖。"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()

"""D1-B 回归：F-11 到期下价调度命令（cron/systemd timer 的调用位）。"""

from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone

from tests.test_walkthrough_fixes import _product

pytestmark = pytest.mark.django_db


def _expired_product():
    p = _product()
    p.price_expires_at = timezone.now() - timedelta(days=1)
    p.save(update_fields=["price_expires_at", "updated_at"])
    return p


def test_command_deactivates_expired(capsys):
    p = _expired_product()
    call_command("deactivate_expired_prices")
    p.refresh_from_db()
    assert p.is_listed is False
    assert "已下架 1" in capsys.readouterr().out


def test_command_quiet_when_nothing_expired(capsys):
    _product()  # 未到期
    call_command("deactivate_expired_prices", "--quiet")
    assert capsys.readouterr().out == ""
    call_command("deactivate_expired_prices")
    assert "无到期商品" in capsys.readouterr().out

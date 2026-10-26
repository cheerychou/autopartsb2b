"""PG 真库并发回归（31号任务5：行锁逻辑 SQLite 无法验证——SQLite 无行级锁、写串行）。

前置：PG 环境（不带 B1RU_TEST_SQLITE 跑 pytest；make test-backend-pg）。
两个高危域并发窗口的真实验证：
- 双核销竞态：两请求同时 confirm_payment 同一订单——行锁串行化，恰好一个成功；
- 双发货竞态：两请求同时 ship_order 同一订单——同防线，恰好一个成功。

线程模型：threading.Barrier 同步起跑；每线程独立连接+独立事务（服务层
@transaction.atomic），finally 必关本线程连接（否则 TransactionTestCase teardown
销毁测试库时被残留连接卡死）。跨线程只传标量 pk，线程内重查（ORM 实例绑定
创建线程的连接，不可跨线程复用）。
"""

import threading
import uuid
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.db import connection

from commerce.models_customer import BuyerAccount
from commerce.models_order import Order

pytestmark = [
    pytest.mark.django_db(transaction=True),
    pytest.mark.skipif(
        connection.vendor != "postgresql",
        reason="行锁并发仅 PG 有真语义（SQLite 无行级锁、写全库串行，败者可能报 database is locked）",
    ),
]


def _account(username: str) -> BuyerAccount:
    u = User.objects.create_user(username=username, password="x")
    return BuyerAccount.objects.create(user=u, buyer_type=BuyerAccount.BuyerType.INDIVIDUAL)


def _order(account: BuyerAccount, *, status: str, total: Decimal = Decimal("100.00")) -> Order:
    return Order.objects.create(
        order_id=uuid.uuid4(),
        order_no=f"PGC{status[:4].upper()}",
        account=account,
        payment_method=Order.PaymentMethod.BANK_TRANSFER,
        shipping_address="Москва",
        total_amount=total,
        status=status,
    )


def _race(worker_fn) -> dict:
    """Barrier 同步起跑两个 worker；返回 {名: ("ok", 值) | ("exc", 类型名, 摘要)}。"""
    barrier = threading.Barrier(2)
    results: dict = {}

    def wrapped(name):
        try:
            barrier.wait(timeout=5)
            results[name] = ("ok", worker_fn(name))
        except Exception as e:  # noqa: BLE001——竞态败者异常类型即断言对象
            results[name] = ("exc", type(e).__name__, str(e)[:80])
        finally:
            connection.close()  # 关本线程连接，teardown 才能销毁测试库

    threads = [threading.Thread(target=wrapped, args=(n,)) for n in ("a", "b")]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=10)
    assert len(results) == 2, f"worker 未全部返回: {results}"
    return results


def _assert_single_winner(results) -> str:
    """恰好一个 ok 一个异常；返回赢家名。"""
    kinds = sorted(k for k, *_ in results.values())
    assert kinds == ["exc", "ok"], f"竞态结果异常（必须恰一成一败）: {results}"
    return next(n for n, r in results.items() if r[0] == "ok")


def test_confirm_payment_two_threads_single_winner():
    """双核销竞态：并发 confirm_payment 同一订单，恰好一个 paid 一个拒绝。"""
    from commerce.services_fulfillment import confirm_payment

    acc = _account("pgc_confirm")
    order = _order(acc, status=Order.Status.AWAITING_CONFIRMATION)
    confirmer = User.objects.create_user(username="pgc_fin", password="x")
    amount = order.total_amount

    def call(name):
        o = Order.objects.get(pk=order.pk)
        u = User.objects.get(pk=confirmer.pk)
        return confirm_payment(o, confirmed_by=u, amount=amount, note=name).order_no

    results = _race(call)
    winner = _assert_single_winner(results)

    order.refresh_from_db()
    assert order.status == Order.Status.PAID
    assert order.payment_note == winner  # 留痕是赢家写入的
    loser = next(n for n, r in results.items() if r[0] == "exc")
    assert results[loser][1] == "OrderStateError"  # 败者被状态机+行锁拒绝（防双花）


def test_ship_order_two_threads_single_winner():
    """双发货竞态：并发 ship_order 同一订单，恰好一个 shipped 一个拒绝。"""
    from commerce.services_fulfillment import ship_order

    acc = _account("pgc_ship")
    order = _order(acc, status=Order.Status.PAID)

    def call(name):
        o = Order.objects.get(pk=order.pk)
        return ship_order(o, tracking_no=f"CDEK-{name}").tracking_no

    results = _race(call)
    winner = _assert_single_winner(results)

    order.refresh_from_db()
    assert order.status == Order.Status.SHIPPED
    assert order.tracking_no == f"CDEK-{winner}"  # 面单号是赢家写入的
    loser = next(n for n, r in results.items() if r[0] == "exc")
    assert results[loser][1] == "OrderStateError"  # 重复发货被拒

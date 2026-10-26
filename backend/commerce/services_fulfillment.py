"""F-13 履约 + F-14 收款对账服务（高危域——REVIEW.md P4 人工必审）。

订单状态机（唯一合法迁移，models_order.Order.Status）：
    pending_payment ──(网关回调，S4 后)──> paid
    awaiting_confirmation ──(对公到账人工确认，本文 confirm_payment)──> paid
    paid ──(发货，ship_order)──> shipped
    shipped ──(签收)──> completed
    pending_payment/awaiting_confirmation ──(取消)──> cancelled
    paid 前才可取消；paid 后取消走退款流程（S4 不做，26号 v1 明确不做清单之外另行裁定）

资金边界（✅裁定 3/21号§十）：系统只做记账+核销（钱进运营方俄方账户，
结汇通道归运营方自有）——PaymentRecord 是"对账凭证"，不是资金流水账本。
"""

from django.db import transaction
from django.utils import timezone

from commerce.models_order import Order
from commerce.models_product import InventoryTransaction


class OrderStateError(Exception):
    """非法状态迁移。"""


ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    Order.Status.PENDING_PAYMENT: {
        Order.Status.AWAITING_CONFIRMATION,
        Order.Status.PAID,
        Order.Status.CANCELLED,
    },
    Order.Status.AWAITING_CONFIRMATION: {Order.Status.PAID, Order.Status.CANCELLED},
    Order.Status.PAID: {Order.Status.SHIPPED, Order.Status.CANCELLED},  # CANCELLED 走退款，v1 拒绝
    Order.Status.SHIPPED: {Order.Status.COMPLETED},
    Order.Status.COMPLETED: set(),
    Order.Status.CANCELLED: set(),
}


def _transition(order: Order, to: str) -> Order:
    if to not in ALLOWED_TRANSITIONS.get(order.status, set()):
        raise OrderStateError(f"非法状态迁移: {order.status} → {to}")
    order.status = to
    order.save(update_fields=["status", "updated_at"])
    return order


@transaction.atomic
def confirm_payment(order: Order, *, confirmed_by, amount, note: str = "") -> Order:
    """F-14 对公到账人工确认（核销）：awaiting_confirmation → paid。

    高危域约束：
    - 行锁（select_for_update，评审二节：并发双核销窗口）+ 幂等：仅 awaiting_confirmation
      可核销，已 paid 再次确认报错（防双花）；
    - 金额必须与订单总额一致（部分到账/多收一律拒绝——v1 不做拆单核销，
      差额处理留运营方线下与买家解决后全额录入）；
    - 留痕：confirmed_by + note 落库（谁核销的可追溯）。
    """
    # 行锁重读（并发双核销窗口关闭：两请求串行化，第二个看到 PAID 即拒）
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status != Order.Status.AWAITING_CONFIRMATION:
        raise OrderStateError(f"仅待确认到账订单可核销，当前: {order.status}")
    if amount != order.total_amount:
        raise ValueError(f"到账金额不符: 订单 {order.total_amount} ₽, 录入 {amount} ₽")
    order.payment_confirmed_by = confirmed_by
    order.payment_confirmed_at = timezone.now()
    order.payment_note = note
    order.save(
        update_fields=["payment_confirmed_by", "payment_confirmed_at", "payment_note", "updated_at"]
    )
    return _transition(order, Order.Status.PAID)


@transaction.atomic
def ship_order(order: Order, *, tracking_no: str, carrier: str = "") -> Order:
    """F-13 发货：paid → shipped + 物流单号（CDEK 等面单自动对接 P1，此处人工录入）。

    行锁重读（P3：与 confirm_payment 同一防线——并发双发货/发货与核销竞态窗口）。
    """
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status != Order.Status.PAID:
        raise OrderStateError(f"仅已付款订单可发货，当前: {order.status}")
    if not tracking_no:
        raise ValueError("发货必须录入物流单号")
    order.tracking_no = tracking_no
    order.carrier = carrier
    order.save(update_fields=["tracking_no", "carrier", "updated_at"])
    return _transition(order, Order.Status.SHIPPED)


@transaction.atomic
def complete_order(order: Order) -> Order:
    """F-13 签收完成：shipped → completed（买家确认收货/物流回执）。"""
    return _transition(order, Order.Status.COMPLETED)


@transaction.atomic
def cancel_order(order: Order, *, note: str = "", cancelled_by=None) -> Order:
    """取消：仅未付款可取消（已付款走退款，v1 拒绝）；**回补库存**（评审二节：
    下单已扣库存，取消不回补=流水有出无回、账实脱钩）。回补走 F-12 同账 append-only。"""
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status not in (Order.Status.PENDING_PAYMENT, Order.Status.AWAITING_CONFIRMATION):
        raise OrderStateError("已付款订单不可直接取消（退款流程另行裁定）")
    order.cancellation_note = note
    order.save(update_fields=["cancellation_note", "updated_at"])
    # 回补库存：逐行 inbound 回冲（append-only，账实同步恢复）
    from commerce.services import record_inventory

    for item in order.items.all():
        record_inventory(
            item.product,
            tx_type=InventoryTransaction.TxType.INBOUND,
            quantity=item.quantity,
            note=f"取消回补 {order.order_no}",
            created_by=cancelled_by,
        )
    return _transition(order, Order.Status.CANCELLED)

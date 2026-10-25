"""买家侧订单/购物车服务（F-06 下单；库存原子扣减+价格快照）。

门控铁律（31号§五）：
- 下单仅限 can_order 的登录买家（individual 恒可 / corporate 过审才可）；
- 成交价 = 下单时点的限时价（快照到 OrderItem，不受后续调价影响）；
- 库存扣减复用 record_inventory（select_for_update + append-only 流水，与 F-12 同账）。
"""

from __future__ import annotations

import uuid

from django.db import transaction
from django.utils import timezone

from commerce.models_customer import BuyerAccount
from commerce.models_order import CartItem, Order, OrderItem
from commerce.models_product import InventoryItem, InventoryTransaction, Product


class OrderError(Exception):
    """下单业务校验失败（门控/库存/限时价过期）。"""


def _effective_price(product: Product, now):
    """限时价有效性：过期价格不可成交（F-11 到期自动下价引擎前的防御）。"""
    if product.price_starts_at and now < product.price_starts_at:
        raise OrderError("价格未生效")
    if product.price_expires_at and now > product.price_expires_at:
        raise OrderError("限时价已过期，商品待重新定价")
    return product.price_amount


@transaction.atomic
def place_order(*, account: BuyerAccount, shipping_address: str, payment_method: str) -> Order:
    """购物车整单下单：门控→逐行校验库存与价格→快照→扣库存→清购物车。

    门控在服务层强制（视图层也拦，双保险）：
    - corporate 未过审（pending/rejected）→ OrderError；
    - 空购物车 → OrderError。
    """
    if not account.can_order:
        suffix = (
            "（企业认证审核中）"
            if account.verification_status == BuyerAccount.VerificationStatus.PENDING
            else ""
        )
        raise OrderError(f"当前账号不可下单{suffix}")
    items = list(CartItem.objects.filter(account=account).select_related("product"))
    if not items:
        raise OrderError("购物车为空")

    now = timezone.now()
    order = Order.objects.create(
        order_id=uuid.uuid4(),
        order_no=_next_order_no(),
        account=account,
        payment_method=payment_method,
        shipping_address=shipping_address,
        total_amount=0,
    )
    total = 0
    for item in items:
        product = item.product
        price = _effective_price(product, now)
        inv, _ = InventoryItem.objects.select_for_update().get_or_create(product=product)
        if inv.quantity_available < item.quantity:
            raise OrderError(f"库存不足: {product.title_ru} 可用 {inv.quantity_available}")
        line = price * item.quantity
        OrderItem.objects.create(
            order=order,
            product=product,
            catalog_spu_id=product.catalog_spu_id,
            title_ru=product.title_ru,
            unit_price=price,
            quantity=item.quantity,
            line_amount=line,
        )
        total += line
        # 库存扣减走 F-12 同账（append-only 流水，余额守卫在 record_inventory 内）
        from commerce.services import record_inventory

        record_inventory(
            product,
            tx_type=InventoryTransaction.TxType.OUTBOUND,
            quantity=-item.quantity,
            note=f"订单 {order.order_no}",
        )
    order.total_amount = total
    # 对公转账（S3 先行）：下单即待确认到账，转账指示由 F-14 对账流程展示；
    # 在线收单（online）S4 网关选型后接入——下单仍落 pending_payment，由网关回调推进
    if payment_method == Order.PaymentMethod.BANK_TRANSFER:
        order.status = Order.Status.AWAITING_CONFIRMATION
    order.save(update_fields=["total_amount", "status", "updated_at"])
    CartItem.objects.filter(account=account).delete()
    return order


def _next_order_no() -> str:
    """订单号：ORD+日期+日内序（unique 约束兜底并发）。"""
    date_part = timezone.localdate().strftime("%Y%m%d")
    seq = Order.objects.filter(order_no__startswith=f"ORD{date_part}").count() + 1
    while Order.objects.filter(order_no=f"ORD{date_part}{seq:04d}").exists():
        seq += 1
    return f"ORD{date_part}{seq:04d}"

"""买家侧订单/购物车服务（F-06 下单；库存原子扣减+价格快照）。

门控铁律（31号§五）：
- 下单仅限 can_order 的登录买家（individual 恒可 / corporate 过审才可）；
- 成交价 = 下单时点的限时价（快照到 OrderItem，不受后续调价影响）；
- 库存扣减复用 record_inventory（select_for_update + append-only 流水，与 F-12 同账）。
"""

from __future__ import annotations

import uuid

from django.db import IntegrityError, transaction
from django.utils import timezone

from commerce.models_customer import BuyerAccount
from commerce.models_order import CartItem, Order, OrderItem
from commerce.models_product import InventoryItem, InventoryTransaction, Product


class OrderError(Exception):
    """下单业务校验失败。code 供前端按语言包渲染（26号§六 i18n：买家侧禁直出中文）。"""

    def __init__(self, code: str, message_ru: str = ""):
        super().__init__(code)
        self.code = code
        self.message_ru = message_ru

    @classmethod
    def of(cls, code: str, message_ru: str):
        return cls(code, message_ru)


def _effective_price(product: Product, now):
    """限时价有效性：过期价格不可成交（F-11 到期自动下价引擎前的防御）。

    message_ru 一律俄语——本异常直出买家端（26号§六 i18n，走查 P2#4 修复）。
    """
    if product.price_starts_at and now < product.price_starts_at:
        raise OrderError.of("PRICE_NOT_ACTIVE", "Цена ещё не начала действовать")
    if product.price_expires_at and now > product.price_expires_at:
        raise OrderError.of("PRICE_EXPIRED", "Срок действия цены истёк, товар ожидает переоценку")
    return product.price_amount


@transaction.atomic
def place_order(*, account: BuyerAccount, shipping_address: str, payment_method: str) -> Order:
    """购物车整单下单：门控→逐行校验库存与价格→快照→扣库存→清购物车。

    门控在服务层强制（视图层也拦，双保险）：
    - corporate 未过审（pending/rejected）→ OrderError；
    - 空购物车 → OrderError。
    """
    if not account.can_order:
        # 服务层兜底文案（正常路径视图层 CORPORATE_PENDING/REJECTED 先拦）——同为俄语
        raise OrderError.of("BUYER_NOT_ALLOWED", "Заказ недоступен для текущей учётной записи")
    items = list(
        CartItem.objects.filter(account=account).select_related("product", "product__inventory")
    )
    if not items:
        raise OrderError.of("CART_EMPTY", "Корзина пуста")
    # 下架/过期商品在下单时点剔除（评审二节：管理端下架≠可成交）
    from django.utils import timezone as _tz

    items = [
        it
        for it in items
        if it.product.is_listed
        and not (it.product.price_expires_at and it.product.price_expires_at < _tz.now())
    ]
    if not items:
        raise OrderError.of("CART_UNAVAILABLE", "Товары в корзине более недоступны к заказу")

    now = timezone.now()
    order = _create_order_row(
        account=account,
        payment_method=payment_method,
        shipping_address=shipping_address,
    )
    total = 0
    for item in items:
        product = item.product
        price = _effective_price(product, now)
        inv, _ = InventoryItem.objects.select_for_update().get_or_create(product=product)
        if inv.quantity_available < item.quantity:
            raise OrderError.of("OUT_OF_STOCK", f"Недостаточно товара: {product.title_ru}")
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


def _next_order_no(*, skip: int = 0) -> str:
    """订单号：ORD+日期+日内序（skip=撞号重试时强制前跳的序号数）。"""
    date_part = timezone.localdate().strftime("%Y%m%d")
    seq = Order.objects.filter(order_no__startswith=f"ORD{date_part}").count() + 1 + skip
    while Order.objects.filter(order_no=f"ORD{date_part}{seq:04d}").exists():
        seq += 1
    return f"ORD{date_part}{seq:04d}"


def _create_order_row(
    *, account: BuyerAccount, payment_method: str, shipping_address: str
) -> Order:
    """创建订单行：并发撞号重试（评审二节"撞号 500"的落地实现——此前 docstring
    宣称重试但代码无重试，走查 P2#7 修复）。

    机制：savepoint 内插入，IntegrityError 即回滚 savepoint（外层下单事务不受污染）
    并 skip 递增重试；unique 约束为最后防线；重试上限 5 次后按业务错误返回买家。
    """
    for attempt in range(5):
        try:
            with transaction.atomic():  # savepoint
                return Order.objects.create(
                    order_id=uuid.uuid4(),
                    order_no=_next_order_no(skip=attempt),
                    account=account,
                    payment_method=payment_method,
                    shipping_address=shipping_address,
                    total_amount=0,
                )
        except IntegrityError:
            continue
    raise OrderError.of(
        "ORDER_NO_CONFLICT", "Не удалось зарезервировать номер заказа, попробуйте ещё раз"
    )

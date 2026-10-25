"""commerce 订单模型（F-06/F-13 基础；S3 落购物车+下单，S4 扩履约）。"""

from django.db import models

from commerce.models_customer import BuyerAccount
from commerce.models_product import Product


class CartItem(models.Model):
    """购物车行（登录买家专属——游客购物车是前端本地态，登录后合并，S3 前端处理）。"""

    account = models.ForeignKey(BuyerAccount, on_delete=models.CASCADE, related_name="cart_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "commerce_cart_item"
        unique_together = [["account", "product"]]

    def __str__(self):
        return f"{self.account_id}:{self.product.product_code}×{self.quantity}"


class Order(models.Model):
    """订单（结算单元）：状态机 pending_payment → awaiting_confirmation → paid → …。

    S3 支付=对公转账指示先行（26号§4.6：在线收单 S4 网关选型后接）：
    下单 → pending_payment（带转账指示）→ 运营方人工确认到账 → paid（F-14 对账）。
    """

    class Status(models.TextChoices):
        PENDING_PAYMENT = "pending_payment", "待付款"
        AWAITING_CONFIRMATION = "awaiting_confirmation", "待确认到账"
        PAID = "paid", "已付款"
        SHIPPED = "shipped", "已发货"
        COMPLETED = "completed", "已完成"
        CANCELLED = "cancelled", "已取消"

    class PaymentMethod(models.TextChoices):
        BANK_TRANSFER = "bank_transfer", "对公转账"  # S3 先行
        ONLINE = "online", "在线收单"  # S4（网关❓首单定）

    order_id = models.UUIDField(primary_key=True, editable=False)
    order_no = models.CharField(max_length=16, unique=True, verbose_name="订单号")
    account = models.ForeignKey(BuyerAccount, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PENDING_PAYMENT)
    payment_method = models.CharField(max_length=16, choices=PaymentMethod.choices)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="订单总额(₽)")
    shipping_address = models.TextField(verbose_name="收货地址")
    # F-14 核销留痕（高危域：谁在何时确认了到账）
    payment_confirmed_by = models.ForeignKey(
        "auth.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="payment_confirmations",
        verbose_name="核销人",
    )
    payment_confirmed_at = models.DateTimeField(null=True, blank=True, verbose_name="核销时间")
    payment_note = models.CharField(max_length=200, blank=True, default="", verbose_name="对账备注")
    # F-13 履约
    tracking_no = models.CharField(max_length=64, blank=True, default="", verbose_name="物流单号")
    carrier = models.CharField(max_length=32, blank=True, default="", verbose_name="承运商")
    cancellation_note = models.CharField(
        max_length=200, blank=True, default="", verbose_name="取消原因"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "commerce_order"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.order_no}[{self.status}]"


class OrderItem(models.Model):
    """订单行：下单时点价格快照（限时价可能后续变动，订单不受影响）。"""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    catalog_spu_id = models.UUIDField(verbose_name="目录 SPU（快照）")
    title_ru = models.CharField(max_length=300, verbose_name="俄语标题（快照）")
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="成交单价(₽)")
    quantity = models.PositiveIntegerField()
    line_amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="行金额(₽)")

    class Meta:
        db_table = "commerce_order_item"

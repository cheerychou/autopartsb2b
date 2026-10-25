"""F-11 限时价引擎（30 天限时价，✅裁定 2）。

机制：到期商品自动下架（is_listed=False）；重挂=重新定价并重启 30 天窗口
（relist_with_new_price，调用位=管理端 POST /api/v1/products/{id}/relist/）。

下架动作由 deactivate_expired_prices() 批量执行——调用位：
1) 管理端手动触发端点 /api/v1/pricing/deactivate-expired/（views.py）；
2) 买家侧读路径防御：store_product/_effective_price 已有过期不下发/不可成交兜底
   （断网/调度间隙不漏价——卖便宜了是资损，宁可少卖）。

⚠️ v1 无定时调度：项目无 Celery/beat（断网自足，不引入消息中间件），
下架依赖手动位 + 读路径防御。此前 docstring 宣称"Celery beat 每 5 分钟"系失实
（走查 P1-1 纠偏）；若未来引入常驻调度，属部署形态变更，须委托方批准。
"""

from django.db import transaction
from django.utils import timezone

from commerce.models_product import Product


def deactivate_expired_prices(now=None) -> list[str]:
    """一次性批量下架到期商品，返回被下架的 product_code 列表。"""
    now = now or timezone.now()
    expired = Product.objects.filter(
        is_listed=True,
        price_expires_at__lt=now,
    )
    codes = list(expired.values_list("product_code", flat=True))
    expired.update(is_listed=False)
    return codes


@transaction.atomic
def relist_with_new_price(product: Product, *, price_amount, price_days: int = 30) -> Product:
    """重挂：新价格 + 重启窗口 + 上架（管理端 F-11 操作；调价历史留在 OrderItem 快照）。"""
    now = timezone.now()
    product.price_amount = price_amount
    product.price_starts_at = now
    product.price_expires_at = now + timezone.timedelta(days=price_days)
    product.is_listed = True
    product.save(
        update_fields=[
            "price_amount",
            "price_starts_at",
            "price_expires_at",
            "is_listed",
            "updated_at",
        ]
    )
    return product

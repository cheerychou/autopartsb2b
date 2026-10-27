"""F-17 报表服务（26号 F-17：销售/滞销/目录覆盖率/码账龄）。

码账龄委托 services_codes.aging_report；其余三项在此聚合（只读，无副作用）。
"""

from decimal import Decimal

from django.db.models import Count, Sum

from commerce.models_order import Order, OrderItem
from commerce.models_product import InventoryItem


def sales_report() -> dict:
    """销售：已付款订单额与行数（v1 最小口径；RU 时区日切）。"""
    qs = OrderItem.objects.filter(
        order__status__in=[
            Order.Status.PAID,
            Order.Status.SHIPPED,
            Order.Status.COMPLETED,
        ]
    )
    agg = qs.aggregate(order_lines=Count("id"), total=Sum("line_amount"))
    return {
        "paid_order_lines": agg["order_lines"] or 0,
        "total_amount": str(agg["total"] or 0),
    }


def slow_movers(limit: int = 20) -> list[dict]:
    """滞销：有库存但从未出现在订单行的在售商品（按库存降序）。"""
    sold = set(OrderItem.objects.values_list("product_id", flat=True))
    rows = (
        InventoryItem.objects.filter(product__is_listed=True, quantity_available__gt=0)
        .exclude(product_id__in=sold)
        .select_related("product")
        .order_by("-quantity_available")[:limit]
    )
    return [
        {
            "product_id": str(r.product.product_id),
            "product_code": r.product.product_code,
            "title_ru": r.product.title_ru,
            "quantity_available": r.quantity_available,
        }
        for r in rows
    ]


def catalog_coverage() -> dict:
    """目录覆盖率：已组商品（挂 catalog_spu_id）的类目叶占已导入类目叶的比例。"""
    from catalog.models_category import Category

    leaf_total = Category.objects.filter(node_type="leaf", category_status="active").count()
    leaf_covered = Category.objects.filter(
        node_type="leaf", category_status="active", category_spus__isnull=False
    ).count()
    covered = leaf_covered and min(leaf_covered, leaf_total) or 0
    return {
        "leaf_total": leaf_total,
        "leaf_covered": covered,
        "ratio": round(covered / leaf_total, 4) if leaf_total else 0.0,
    }


def payment_flows(date_from=None, date_to=None) -> dict:
    """F-14 收单流水（ENG-003 缺口①）：从已核销订单派生（v1 无独立支付流水表）。

    一行 = 一笔到账核销；金额恒等于订单总额（confirm_payment 金额一致校验保证）。
    date_from/date_to 按核销日过滤；按核销时间倒序。
    """
    qs = Order.objects.filter(payment_confirmed_at__isnull=False).select_related(
        "account__user", "payment_confirmed_by"
    )
    if date_from:
        qs = qs.filter(payment_confirmed_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(payment_confirmed_at__date__lte=date_to)
    rows = []
    for o in qs.order_by("-payment_confirmed_at"):
        confirmed_at = o.payment_confirmed_at
        assert confirmed_at is not None  # 查询已过滤 isnull=False（mypy 收窄）
        rows.append(
            {
                "order_no": o.order_no,
                "buyer": o.account.user.username,
                "company_name_ru": o.account.company_name_ru,
                "payment_method": o.payment_method,
                "amount": str(o.total_amount),
                "confirmed_at": confirmed_at.isoformat(),
                "confirmed_by": o.payment_confirmed_by.username if o.payment_confirmed_by else "",
                "note": o.payment_note,
                "order_status": o.status,
            }
        )
    total = qs.aggregate(total=Sum("total_amount"))["total"]
    amount = (total or Decimal("0")).quantize(Decimal("0.01"))
    return {"rows": rows, "count": len(rows), "total_amount": str(amount)}

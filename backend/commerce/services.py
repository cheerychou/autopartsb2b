"""commerce 服务层：组商品回填校验（I2-2）/库存记账/企业审核状态机。"""

from __future__ import annotations

import uuid
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from commerce.models_customer import BuyerAccount
from commerce.models_product import InventoryItem, InventoryTransaction, Product


class CatalogRefError(Exception):
    """目录软引用校验失败（I2-2：不存在或 scope 外）。"""


def next_product_code() -> str:
    """商品编码：P + 自增序（v1 简单实现；并发由 unique 约束兜底重试）。"""
    seq = Product.objects.count() + 1
    while Product.objects.filter(product_code=f"P{seq:06d}").exists():
        seq += 1
    return f"P{seq:06d}"


@transaction.atomic
def create_product_from_catalog(
    *,
    catalog_spu_id: uuid.UUID,
    title_ru: str,
    price_amount,
    price_days: int = 30,
    catalog_version: str = "",
    gtin: str = "",
    harmonized_code: str = "",
) -> Product:
    """F-10 组商品（I2-2 回填契约）：校验目录件存在 → 建可售 SKU（待上架）。"""
    from catalog.models_product import SPU  # 进程内引用 catalog 域（软引用校验）

    if not SPU.objects.filter(spu_id=catalog_spu_id, spu_status="active").exists():
        raise CatalogRefError(f"目录件不存在或不可售: {catalog_spu_id}")
    now = timezone.now()
    return Product.objects.create(
        product_id=uuid.uuid4(),
        product_code=next_product_code(),
        catalog_spu_id=catalog_spu_id,
        catalog_version_at_listing=catalog_version,
        title_ru=title_ru,
        price_amount=price_amount,
        price_starts_at=now,
        price_expires_at=now + timedelta(days=price_days),
        gtin=gtin,
        harmonized_code=harmonized_code,
    )


@transaction.atomic
def record_inventory(
    product: Product, *, tx_type: str, quantity: int, note: str = "", created_by=None
) -> InventoryTransaction:
    """F-12 出入库记账：流水 append-only + 余额原子更新。

    约束：quantity 出库为负；余额不得为负（超卖防护在订单层再做一层）。
    """
    item, _ = InventoryItem.objects.select_for_update().get_or_create(product=product)
    new_balance = item.quantity_available + quantity
    if new_balance < 0:
        raise ValueError(
            f"库存不足: {product.product_code} 可用 {item.quantity_available}，变动 {quantity}"
        )
    item.quantity_available = new_balance
    item.save(update_fields=["quantity_available", "updated_at"])
    return InventoryTransaction.objects.create(
        tx_id=uuid.uuid4(),
        product=product,
        tx_type=tx_type,
        quantity=quantity,
        balance_after=new_balance,
        note=note,
        created_by=created_by,
    )


def approve_corporate(account: BuyerAccount, *, by, note: str = "") -> BuyerAccount:
    """F-15 审核状态机：pending/rejected → approved（管理端动作回写买家状态）。"""
    account.verification_status = BuyerAccount.VerificationStatus.APPROVED
    account.verification_note = note
    account.verified_by = by
    account.verified_at = timezone.now()
    account.save(
        update_fields=[
            "verification_status",
            "verification_note",
            "verified_by",
            "verified_at",
            "updated_at",
        ]
    )
    return account


def reject_corporate(account: BuyerAccount, *, by, note: str) -> BuyerAccount:
    """F-15 驳回：须附意见；驳回后可重新提审（回 pending，由买家侧 S3 触发）。"""
    account.verification_status = BuyerAccount.VerificationStatus.REJECTED
    account.verification_note = note
    account.verified_by = by
    account.verified_at = timezone.now()
    account.save(
        update_fields=[
            "verification_status",
            "verification_note",
            "verified_by",
            "verified_at",
            "updated_at",
        ]
    )
    return account


def resubmit_corporate(account: BuyerAccount) -> BuyerAccount:
    """驳回后重新提审：rejected → pending（买家修改资料后触发，S3 挂接口）。"""
    if account.verification_status != BuyerAccount.VerificationStatus.REJECTED:
        raise ValueError("仅驳回状态可重新提审")
    account.verification_status = BuyerAccount.VerificationStatus.PENDING
    account.save(update_fields=["verification_status", "updated_at"])
    return account

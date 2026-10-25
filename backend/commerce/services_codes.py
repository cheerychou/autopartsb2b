"""N2 赋码服务（导入式 v1；状态机唯一入口——禁止裸改 CodeInstance.state）。

联动纪律：受控品类与 F-12 库存**同账双记**——收货验码/按码出库/退货回转时
同步 record_inventory（码账与库存账不脱钩，25号§2.6 业务流增量）。
"""

from __future__ import annotations

import uuid

from django.db import transaction
from django.utils import timezone

from commerce.models_codes import CodeInstance, ImportBatch
from commerce.models_product import InventoryTransaction, Product


class CodeStateError(Exception):
    """非法码状态迁移 / 业务校验失败。"""


def _set_state(code: CodeInstance, to: str) -> None:
    allowed = CodeTransitions.ALLOWED.get(code.state, set())
    if to not in allowed:
        raise CodeStateError(f"非法码状态迁移: {code.state} → {to}")
    code.state = to
    code.save(update_fields=["state", "state_changed_at"])


class CodeTransitions:
    """白名单（与 models_codes.State 对应；非法迁移一律拒绝）。"""

    ALLOWED: dict[str, set[str]] = {
        CodeInstance.State.ORDERED: {CodeInstance.State.LABELLED},
        CodeInstance.State.LABELLED: {CodeInstance.State.IN_STOCK},
        CodeInstance.State.IN_STOCK: {CodeInstance.State.OUTBOUND},
        CodeInstance.State.OUTBOUND: {CodeInstance.State.RETURNED},
        CodeInstance.State.RETURNED: {CodeInstance.State.IN_STOCK},  # 退货=重新入转，可再售
    }


@transaction.atomic
def create_batch(*, batch_no: str, customs_declaration: str = "") -> ImportBatch:
    if ImportBatch.objects.filter(batch_no=batch_no).exists():
        raise CodeStateError(f"批次号已存在: {batch_no}")
    return ImportBatch.objects.create(
        batch_id=uuid.uuid4(),
        batch_no=batch_no,
        customs_declaration=customs_declaration,
    )


@transaction.atomic
def import_code_list(
    *, batch: ImportBatch, product: Product, code_values: list[str], gtin: str = ""
) -> dict:
    """贴标工作台（F-16）：批次码清单导入（ЧЗ 导出/Excel 粘贴的码值列表）。

    约定：码值进批次即落 labelled（已贴码待报关）；重复码值幂等跳过。
    """
    created = skipped = 0
    for value in code_values:
        value = value.strip()
        if not value:
            continue
        _, was_created = CodeInstance.objects.get_or_create(
            code_value=value,
            defaults={
                "code_id": uuid.uuid4(),
                "gtin": gtin,
                "product": product,
                "batch": batch,
                "state": CodeInstance.State.LABELLED,
            },
        )
        created += int(was_created)
        skipped += int(not was_created)
    return {"created": created, "skipped": skipped}


@transaction.atomic
def receive_batch(batch: ImportBatch, *, code_values: list[str] | None = None) -> dict:
    """收货验码（labelled→in_stock）：按码核对入库，同步库存入账（F-12 同账）。

    code_values=None 表示整批验收入库；给定列表则按码精确验收（扫码核对）。
    未在批次内的码值 → 拒收（CodeStateError，防错收他批货物）。
    """
    qs = batch.codes.filter(state=CodeInstance.State.LABELLED)
    if code_values is not None:
        qs = qs.filter(code_value__in=[v.strip() for v in code_values if v.strip()])
        found = set(qs.values_list("code_value", flat=True))
        unknown = [v for v in code_values if v.strip() and v.strip() not in found]
        if unknown:
            raise CodeStateError(f"验码失败：非本批次码 {unknown[:5]}")
    codes = list(qs)
    if not codes:
        raise CodeStateError("无可验收的已贴码码实例")
    by_product: dict[uuid.UUID, int] = {}
    for code in codes:
        _set_state(code, CodeInstance.State.IN_STOCK)
        by_product[code.product_id] = by_product.get(code.product_id, 0) + 1
    for product_id, qty in by_product.items():
        from commerce.services import record_inventory

        record_inventory(
            Product.objects.get(pk=product_id),
            tx_type=InventoryTransaction.TxType.INBOUND,
            quantity=qty,
            note=f"批次 {batch.batch_no} 收货验码",
        )
    batch.status = ImportBatch.Status.IN_STOCK
    batch.save(update_fields=["status"])
    return {"received": len(codes), "by_product": {str(k): v for k, v in by_product.items()}}


@transaction.atomic
def outbound_codes(*, product: Product, code_values: list[str], order=None) -> list[CodeInstance]:
    """按码出库（in_stock→outbound，销售核销关联订单）：逐码校验在库+归属本商品。"""
    codes = list(
        CodeInstance.objects.select_for_update().filter(
            code_value__in=[v.strip() for v in code_values],
            product=product,
            state=CodeInstance.State.IN_STOCK,
        )
    )
    if len(codes) != len(code_values):
        raise CodeStateError("出库码校验失败：存在不在库/不属本商品的码")
    for code in codes:
        _set_state(code, CodeInstance.State.OUTBOUND)
        if order is not None:
            code.order = order
            code.save(update_fields=["order", "state_changed_at"])
    from commerce.services import record_inventory

    record_inventory(
        product,
        tx_type=InventoryTransaction.TxType.OUTBOUND,
        quantity=-len(codes),
        note="按码出库",
    )
    return codes


@transaction.atomic
def return_codes(code_values: list[str]) -> int:
    """退货回转（outbound→returned）+ 重新入转（returned→in_stock，可再售）。

    25号§2.3：退货=重新入转（повторный ввод）——两步在同一事务内完成，
    库存同步回补（F-12 同账）。
    """
    codes = list(
        CodeInstance.objects.select_for_update().filter(
            code_value__in=[v.strip() for v in code_values],
            state=CodeInstance.State.OUTBOUND,
        )
    )
    if len(codes) != len(code_values):
        raise CodeStateError("退货码校验失败：存在非出转状态的码")
    by_product: dict[uuid.UUID, int] = {}
    for code in codes:
        _set_state(code, CodeInstance.State.RETURNED)
        _set_state(code, CodeInstance.State.IN_STOCK)  # 重新入转
        by_product[code.product_id] = by_product.get(code.product_id, 0) + 1
    for product_id, qty in by_product.items():
        from commerce.services import record_inventory

        record_inventory(
            Product.objects.get(pk=product_id),
            tx_type=InventoryTransaction.TxType.INBOUND,
            quantity=qty,
            note="退货回转",
        )
    return len(codes)


def aging_report() -> list[dict]:
    """码报表：在库码按批次账龄（25号§2.6 报表：在库码数/批次账龄）。"""
    from django.db.models import Count

    rows = (
        CodeInstance.objects.filter(state=CodeInstance.State.IN_STOCK)
        .values("batch_id", "batch__batch_no")
        .annotate(in_stock=Count("code_id"))
    )
    now = timezone.now()
    out = []
    for r in rows:
        batch = ImportBatch.objects.get(pk=r["batch_id"])
        days = (now - batch.created_at).days
        out.append(
            {
                "batch_no": batch.batch_no,
                "in_stock": r["in_stock"],
                "age_days": days,
                "aging_bucket": "0-30" if days <= 30 else "31-90" if days <= 90 else "90+",
            }
        )
    return out

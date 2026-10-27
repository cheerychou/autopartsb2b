"""M1 演示可售商品种子（26号 §九 DoD2 对公链路前置件）。

依赖：make_demo_pack + import_seed_package 已灌入演示目录（DM0000x SPU 在库）。
动作：对 2 个演示 SPU 建 commerce Product（复用 F-10 组商品服务
create_product_from_catalog，限时价 30 天窗口）→ 上架 → F-12 入库记账。
幂等：按 catalog_spu_id 已存在即跳过。

用法（backend/）：
    ./venv/bin/python manage.py seed_demo_commerce
"""

from typing import Any

from django.core.management.base import BaseCommand, CommandError

from catalog.models_pack_log import CatalogPackLog
from catalog.models_product import SPU
from commerce.models_product import InventoryTransaction, Product
from commerce.services import create_product_from_catalog, record_inventory

# 演示可售位：前刹车片（按车找件主推位）+ 机油滤（OE 检索/交叉号位）
DEMO_OFFERS: list[dict[str, Any]] = [
    {
        "spu_code": "DM00001",
        "title_ru": "Колодки тормозные передние Chery Tiggo 7",
        "price": "2850.00",
        "quantity": 24,
    },
    {
        "spu_code": "DM00003",
        "title_ru": "Фильтр масляный Chery (оригинал)",
        "price": "650.00",
        "quantity": 50,
    },
]


class Command(BaseCommand):
    help = "灌入 M1 演示可售商品（2 SKU：组商品→上架→入库）"

    def handle(self, *args, **options):
        version = CatalogPackLog.current_version()
        if version == "unknown":
            raise CommandError("目录为空：先执行 make_demo_pack + import_seed_package")
        for spec in DEMO_OFFERS:
            spu = SPU.objects.filter(spu_code=spec["spu_code"], spu_status="active").first()
            if spu is None:
                raise CommandError(f"演示目录件不存在或不可售: {spec['spu_code']}（先灌演示包）")
            product = Product.objects.filter(catalog_spu_id=spu.spu_id).first()
            if product is not None:
                self.stdout.write(f"  跳过（已存在）: {product.product_code} ← {spec['spu_code']}")
                continue
            product = create_product_from_catalog(
                catalog_spu_id=spu.spu_id,
                title_ru=spec["title_ru"],
                price_amount=spec["price"],
                catalog_version=version,
            )
            product.is_listed = True
            product.save(update_fields=["is_listed"])
            record_inventory(
                product,
                tx_type=InventoryTransaction.TxType.INBOUND,
                quantity=spec["quantity"],
                note="M1 演示入库",
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ {product.product_code} ← {spec['spu_code']}"
                    f"  {spec['title_ru']}  {spec['price']}₽ × {spec['quantity']}"
                )
            )
        self.stdout.write(f"目录版本: {version}；商品/库存就绪，可开始 storefront 演练")

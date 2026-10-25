"""共享 fixture（跨测试文件；承 CDD3 conftest 模式）。"""

import pytest

from catalog.models import Brand
from catalog.models_product import SPU


@pytest.fixture
def catalog_spu_factory():
    """生成目录 SPU（自增编码/OE，active）。"""
    from itertools import count

    counter = count(1)
    brand = Brand.objects.create(
        brand_code="BRU",
        brand_name="唯一测试",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )

    def _make():
        n = next(counter)
        return SPU.objects.create(
            spu_code=f"P0U{n:04d}",
            spu_name=f"件{n}",
            brand_id=brand,
            product_type="part",
            oe_number=f"T{n:08d}",
            spu_status="active",
        )

    return _make

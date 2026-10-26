"""共享 fixture（跨测试文件；承 CDD3 conftest 模式）。

⚠️ 禁止在测试内 override_settings(REST_FRAMEWORK=...)：DRF 视图链 lazy import 时，
APIView.authentication_classes / SimpleRateThrottle.THROTTLE_RATES 会把覆写字典
**永久绑进类快照**（整进程的 Bearer 认证/限流全废）。测试限流速率统一走
B1RU_AUTH_THROTTLE_RATE 环境变量（Makefile test-backend 设 10000/min）。
"""

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

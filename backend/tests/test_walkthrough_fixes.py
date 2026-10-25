"""2026-10-25 走查修复回归测试（P1-1/P1-2/P1-3 + P2#4/#5/#6/#7）。

P1-1 F-11 重挂闭环：到期→批量下价→重挂→可售（此前 relist 无生产调用方，到期即永久不可售）。
P1-2 响应契约：confirm-payment / cancel 回包必须是迁移后的新状态（此前返回旧状态）。
P1-3 权限档位：finance 角色调 inventory record → 403（此前未声明权限码，任一管理角色可写）。
P2#4 买家侧错误文案：OrderError message_ru 禁中文直出（26号§六 i18n）。
P2#5 赋码 fail-closed：缺 ТН ВЭД 编码拒绝导入码清单（此前空 HS 跳过校验）。
P2#6 I3 schema_ver 窗口校验：窗口外/无法解析一律拒收（27号§六.2）。
P2#7 订单号并发撞号：savepoint 重试落地（此前 docstring 宣称重试但无实现）。
"""

import json
import re
import uuid
import zipfile
from io import BytesIO

import pytest
from django.contrib.auth.models import Group, User
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import Brand
from catalog.models_product import SPU
from commerce.models_customer import BuyerAccount
from commerce.models_order import Order
from commerce.models_product import InventoryItem, InventoryTransaction
from commerce.services import create_product_from_catalog, record_inventory

pytestmark = pytest.mark.django_db

_CJK = re.compile(r"[一-鿿]")

counter = {"n": 0}


def _admin_with_role(role: str):
    """真实认证链管理端账号：init_rbac 建组 + 用户入组（承 test_review_fixes 模式）。"""
    call_command("init_rbac")
    counter["n"] += 1
    u = User.objects.create_user(username=f"wa_{role}_{counter['n']}", password="x")
    u.groups.add(Group.objects.get(name=role))
    from rest_framework_simplejwt.tokens import RefreshToken

    token = str(RefreshToken.for_user(u).access_token)
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api


def _buyer_individual(username: str) -> APIClient:
    """注册即用的个人买家（真实 JWT 链）。"""
    from rest_framework_simplejwt.tokens import RefreshToken

    api = APIClient()
    r = api.post(
        "/storefront/v1/auth/register",
        {"username": username, "password": "Str0ngPass!", "buyer_type": "individual"},
        format="json",
    )
    assert r.status_code == 201
    token = str(RefreshToken.for_user(User.objects.get(username=username)).access_token)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api


def _product(price=500.00, *, code_suffix: str = "", harmonized_code: str = "8708"):
    """建目录件 + 可售商品 + 入库（默认 8708=受控品类字典命中前缀）。"""
    from commerce.models_codes import MarkedCategoryDict

    MarkedCategoryDict.objects.get_or_create(
        tnved_prefix="8708", defaults={"category_label": "碰撞件测试"}
    )
    n = counter["n"]
    brand = Brand.objects.create(
        brand_code=f"BWA{n}{code_suffix}",
        brand_name="走查品牌",
        brand_type="S",
        brand_level="brand",
        brand_status="active",
    )
    spu = SPU.objects.create(
        spu_code=f"SPUWA{n}{code_suffix}",
        spu_name="Тормозной диск",
        brand_id=brand,
        product_type="part",
        oe_number=f"WA-{n:06d}",
        spu_status="active",
        harmonized_code=harmonized_code,
    )
    product = create_product_from_catalog(
        catalog_spu_id=spu.spu_id,
        title_ru="Тормозной диск",
        price_amount=price,
    )
    product.is_listed = True
    product.save(update_fields=["is_listed"])
    record_inventory(product, tx_type=InventoryTransaction.TxType.INBOUND, quantity=5)
    return product


# ---------- P1-1：F-11 重挂闭环 ----------


def test_f11_expired_relist_cycle_sellable_again():
    """到期→批量下价→重挂（新价+重启窗口）→买家可下单。修复前：重挂无端点，到期即永久不可售。"""
    product = _product()
    # 人为到期
    product.price_expires_at = timezone.now() - timezone.timedelta(days=1)
    product.save(update_fields=["price_expires_at", "updated_at"])

    admin = _admin_with_role("staff")
    r = admin.post("/api/v1/pricing/deactivate-expired/")
    assert r.status_code == 200
    product.refresh_from_db()
    assert product.is_listed is False  # 到期批量下价生效

    # 重挂：新价格 + 窗口重启 + 上架
    r = admin.post(
        f"/api/v1/products/{product.product_id}/relist/",
        {"price_amount": "990.00", "price_days": 30},
        format="json",
    )
    assert r.status_code == 200, r.content
    body = r.json()
    assert body["is_listed"] is True
    assert body["price_amount"] == "990.00"
    assert body["price_expires_at"] > timezone.now().isoformat()[:19]

    # 买家端恢复可见价且可成交
    buyer = _buyer_individual("walistbuyer")
    r = buyer.get(f"/storefront/v1/store/products/{product.catalog_spu_id}")
    assert r.status_code == 200
    assert r.json()["data"]["offer"]["price"] == "990.00"
    r = buyer.post(
        "/storefront/v1/cart/add",
        {"product_id": str(product.product_id), "quantity": 1},
        format="json",
    )
    assert r.status_code == 201
    r = buyer.post(
        "/storefront/v1/checkout",
        {"shipping_address": "Москва", "payment_method": "bank_transfer"},
        format="json",
    )
    assert r.status_code == 201, r.content  # 修复前：PRICE_EXPIRED 409


def test_f11_relist_requires_permission():
    """relist 绑 products:write：无角色管理端账号 403（fail-closed 不放行买家）。"""
    product = _product()
    api = APIClient()
    r = api.post(f"/api/v1/products/{product.product_id}/relist/", {"price_amount": "1.00"})
    assert r.status_code in (401, 403)


# ---------- P1-2：响应契约（迁移后新状态） ----------


def _awaiting_order(product):
    buyer = _buyer_individual("wapaybuyer")
    buyer.post(
        "/storefront/v1/cart/add",
        {"product_id": str(product.product_id), "quantity": 1},
        format="json",
    )
    r = buyer.post(
        "/storefront/v1/checkout",
        {"shipping_address": "Москва", "payment_method": "bank_transfer"},
        format="json",
    )
    assert r.status_code == 201
    return buyer, Order.objects.get(order_no=r.json()["data"]["order_no"])


def test_confirm_payment_response_returns_paid():
    """核销回包 status=paid（修复前：服务层重取实例，回包恒为 awaiting_confirmation）。"""
    product = _product()
    _, order = _awaiting_order(product)
    admin = _admin_with_role("finance")  # finance 有 payments:manage
    r = admin.post(
        f"/api/v1/orders/{order.order_id}/confirm-payment/",
        {"amount": "500.00", "note": "поступление"},
        format="json",
    )
    assert r.status_code == 200, r.content
    assert r.json()["data"]["status"] == "paid"


def test_cancel_my_order_response_returns_cancelled():
    """买家取消回包 status=cancelled（修复前：回包为取消前状态）。"""
    product = _product()
    buyer, order = _awaiting_order(product)
    r = buyer.post(f"/storefront/v1/orders/{order.order_id}/cancel")
    assert r.status_code == 200, r.content
    assert r.json()["data"]["status"] == "cancelled"


# ---------- P1-3：inventory record 权限档位 ----------


def test_finance_cannot_record_inventory():
    """finance 无 inventory:write：出入库记账必须 403（修复前：未声明权限码，任一管理角色可写）。"""
    product = _product()
    item = InventoryItem.objects.get(product=product)
    api = _admin_with_role("finance")
    r = api.post(
        f"/api/v1/inventory/{item.pk}/transactions/",
        {"tx_type": "inbound", "quantity": 3, "note": "越权尝试"},
        format="json",
    )
    assert r.status_code == 403, r.content
    item.refresh_from_db()
    assert item.quantity_available == 5  # 拒绝且未落账

    staff = _admin_with_role("staff")  # staff 有 inventory:write：放行对照
    r = staff.post(
        f"/api/v1/inventory/{item.pk}/transactions/",
        {"tx_type": "inbound", "quantity": 3},
        format="json",
    )
    assert r.status_code == 201


# ---------- P2#4：买家侧错误文案禁中文 ----------


def test_order_error_messages_are_russian():
    """OrderError 直出买家端：message_ru 不得含 CJK（空购物车路径抽样）。"""
    buyer = _buyer_individual("waerrbuyer")
    r = buyer.post(
        "/storefront/v1/checkout",
        {"shipping_address": "Москва", "payment_method": "bank_transfer"},
        format="json",
    )
    assert r.status_code == 409
    body = r.json()["error"]
    assert body["error_code"] == "CART_EMPTY"
    assert not _CJK.search(body.get("message_ru", "")), body


# ---------- P2#5：赋码缺 HS fail-closed ----------


def test_import_codes_rejects_missing_hs():
    """缺 ТН ВЭД 编码的商品导入码清单 → 400 HS_CODE_MISSING（修复前：空 HS 跳过受控校验）。"""
    from commerce.models_codes import ImportBatch

    product = _product(harmonized_code="")
    api = _admin_with_role("staff")
    r = api.post("/api/v1/batches/", {"batch_no": "WA-B1"}, format="json")
    assert r.status_code == 201
    r = api.post(
        "/api/v1/batches/WA-B1/codes/",
        {"product_id": str(product.product_id), "code_values": ["code-1", "code-2"]},
        format="json",
    )
    assert r.status_code == 400, r.content
    assert r.json()["error"]["error_code"] == "HS_CODE_MISSING"
    assert ImportBatch.objects.get(batch_no="WA-B1").codes.count() == 0


# ---------- P2#6：I3 schema_ver 窗口校验 ----------


def _pkg(path, schema_ver):
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        manifest = {
            "version": f"v-{schema_ver or 'none'}-{counter['n']}",
            "import_order": ["brands"],
            "counts": {"brands": 0},
        }
        if schema_ver is not None:
            manifest["schema_ver"] = schema_ver
        zf.writestr("manifest.json", json.dumps(manifest))
        zf.writestr("brands.json", json.dumps([]))
    with open(path, "wb") as f:
        f.write(buf.getvalue())


def test_i3_schema_ver_above_window_rejected(tmp_path):
    """高于支持窗口 → 拒收并提示升级应用（27号§六.2）。"""
    pkg = str(tmp_path / "hi.zip")
    _pkg(pkg, "9.0")
    with pytest.raises(CommandError, match="升级应用"):
        call_command("import_seed_package", "--package", pkg)


def test_i3_schema_ver_missing_rejected(tmp_path):
    """缺 schema_ver（契约字段）→ 拒收（预检零容差）。"""
    pkg = str(tmp_path / "none.zip")
    _pkg(pkg, None)
    with pytest.raises(CommandError, match="无法解析"):
        call_command("import_seed_package", "--package", pkg)


def test_i3_schema_ver_below_window_rejected(tmp_path, monkeypatch):
    """低于窗口（陈旧包）→ 拒收（27号§六.2；monkeypatch 抬高锚点构造窗口外）。"""
    from catalog import models_pack_log as mpl

    monkeypatch.setattr(mpl, "SUPPORTED_SCHEMA_VER", "3.0")
    pkg = str(tmp_path / "old.zip")
    _pkg(pkg, "1.0")
    with pytest.raises(CommandError, match="陈旧包"):
        call_command("import_seed_package", "--package", pkg)


# ---------- P2#7：订单号撞号重试落地 ----------


def _ghost_order(order_no: str, username: str) -> Order:
    return Order.objects.create(
        order_id=uuid.uuid4(),
        order_no=order_no,
        account=BuyerAccount.objects.get(user__username=username),
        payment_method="bank_transfer",
        shipping_address="ghost",
        total_amount=0,
    )


def test_order_no_retry_on_conflict(monkeypatch):
    """unique 冲突 → savepoint 回滚并 skip 递增重试，最终成功（docstring 与实现一致）。"""
    from commerce import services_order

    product = _product(code_suffix="r")
    buyer = _buyer_individual("waretrybuyer")
    buyer.post(
        "/storefront/v1/cart/add",
        {"product_id": str(product.product_id), "quantity": 1},
        format="json",
    )

    real_next = services_order._next_order_no
    ghost_no = real_next()  # 真实逻辑下一次会给出的号
    _ghost_order(ghost_no, "waretrybuyer")

    calls = {"n": 0}

    def flaky_next(*, skip: int = 0):
        """首次返回已被 ghost 占用的号（模拟并发撞号），此后走真实逻辑。"""
        calls["n"] += 1
        if calls["n"] == 1:
            return ghost_no
        return real_next(skip=skip)

    monkeypatch.setattr(services_order, "_next_order_no", flaky_next)
    r = buyer.post(
        "/storefront/v1/checkout",
        {"shipping_address": "Москва", "payment_method": "bank_transfer"},
        format="json",
    )
    assert r.status_code == 201, r.content  # 修复前：IntegrityError 500
    assert calls["n"] >= 2  # 确经重试路径
    assert r.json()["data"]["order_no"] != ghost_no


def test_order_no_retries_exhausted_business_error(monkeypatch):
    """重试耗尽 → 业务错误（俄语、409）而非 500。"""
    from commerce import services_order

    product = _product(code_suffix="x")
    buyer = _buyer_individual("waexhbuyer")
    buyer.post(
        "/storefront/v1/cart/add",
        {"product_id": str(product.product_id), "quantity": 1},
        format="json",
    )
    # 每次尝试都命中同一个已占用号 → 5 次重试全冲突
    monkeypatch.setattr(services_order, "_next_order_no", lambda *, skip=0: "ORD999999999999")
    _ghost_order("ORD999999999999", "waexhbuyer")
    r = buyer.post(
        "/storefront/v1/checkout",
        {"shipping_address": "Москва", "payment_method": "bank_transfer"},
        format="json",
    )
    assert r.status_code == 409
    body = r.json()["error"]
    assert body["error_code"] == "ORDER_NO_CONFLICT"
    assert not _CJK.search(body.get("message_ru", ""))

"""买家六步全链路演练——python 版（供 DoD 1 断网客户端容器执行）。

等价 m1-alpha-drill.sh 六步，改用标准库 urllib+json 并内嵌硬断言：
游客找件（价格不可见）→ 企业注册 pending → 未过审下单 403 → 管理端审核 →
对公下单（价格快照）→ 核销 → 发货 → 签收 completed。
BASE 默认 http://backend:8000（compose 内网 DNS——不经宿主转发面）。
"""

import json
import os
import time
import urllib.error
import urllib.request

BASE = os.environ.get("BASE", "http://backend:8000")
TAG = str(int(time.time()))
BUYER = f"corp_demo_{TAG}"
PASS = "Demo-Buyer-2026!"


def step(msg):
    print(f"\n======== {msg} ========", flush=True)


def req(method, path, token=None, body=None):
    r = urllib.request.Request(BASE + path, method=method)
    if token:
        r.add_header("Authorization", f"Bearer {token}")
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, data=data, timeout=15) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


step("① 游客按车找件（匿名）：品牌→车系→车型→适配件")
s, brands = req("GET", "/catalog/v1/brands")
assert s == 200, (s, brands)
brand_id = next(b["brand_id"] for b in brands["data"] if b["brand_code"] == "CHERY")
s, series = req("GET", f"/catalog/v1/brands/{brand_id}/series")
series_id = next(x["series_id"] for x in series["data"] if x["series_code"] == "TIGGO7")
s, models = req("GET", f"/catalog/v1/series/{series_id}/models")
model_id = next(x["model_id"] for x in models["data"] if x["model_code"] == "TIG7-15T")
s, fits = req("GET", f"/catalog/v1/fitments?model_id={model_id}")
assert s == 200, (s, fits)
spu_id = next(x["spu_id"] for x in fits["data"] if x["spu_code"] == "DM00001")
print(f"CHERY→TIGGO7→TIG7-15T：适配件 {len(fits['data'])} 行，DM00001 spu={spu_id[:8]}…")

step("② 游客看商品详情：价格不可见（登录后见价）")
s, prod = req("GET", f"/storefront/v1/store/products/{spu_id}")
assert s == 200, (s, prod)
offer = prod["data"].get("offer") or {}
assert offer.get("price") is None, f"游客不应见价（price 应为 null）: {offer}"
print(f"游客无价 ✓  {prod['data']['display_name']}")

step("③ 企业客户注册（ИНН 必填）→ pending 待审核")
s, reg = req(
    "POST",
    "/storefront/v1/auth/register",
    body={
        "username": BUYER,
        "password": PASS,
        "buyer_type": "corporate",
        "company_name_ru": "ООО АвтоЗапчасти Демо",
        "inn": "7701234567",
        "phone": "+79001234567",
    },
)
assert s == 201, (s, reg)
assert reg["data"]["buyer_type"] == "corporate"
assert reg["data"]["verification_status"] == "pending"
buyer_token = reg["data"]["access"]
print(f"{BUYER}: pending ✓")

step("④ 未过审企业：可加购、下单被拒 403（浏览/下单分离）")
s, prod2 = req(
    "GET", f"/storefront/v1/store/products/{spu_id}", token=buyer_token
)
assert s == 200
product_id = prod2["data"]["offer"]["product_id"]
print(f"登录后见价 = {prod2['data']['offer']['price']}（企业价可见 ✓）")
s, cart = req(
    "POST", "/storefront/v1/cart/add",
    token=buyer_token, body={"product_id": product_id, "quantity": 2},
)
assert s in (200, 201), (s, cart)
s, chk = req(
    "POST", "/storefront/v1/checkout",
    token=buyer_token,
    body={"shipping_address": "Москва, ул. Автозаводская, 1", "payment_method": "bank_transfer"},
)
assert s == 403, (s, chk)
assert chk["error"]["error_code"] == "CORPORATE_PENDING", chk
print("未过审下单 403 CORPORATE_PENDING ✓")

step("⑤ 管理端审核通过（F-15：管理端动作回写买家账号）")
s, tok = req("POST", "/api/v1/auth/token", body={"username": "b1owner", "password": "Demo-Owner-2026!"})
assert s == 200, (s, tok)
admin_token = tok["access"]
s, pend = req("GET", "/api/v1/buyer-accounts/?verification_status=pending", token=admin_token)
assert s == 200 and pend["results"], (s, pend)
account_id = pend["results"][0]["id"]
s, appr = req(
    "POST", f"/api/v1/buyer-accounts/{account_id}/approve/",
    token=admin_token, body={"note": "DoD1 断网演练通过"},
)
assert s == 200, (s, appr)
body = appr.get("data", appr)  # ⚠️ approve 端点响应未走 data 包络（契约观察项，另行收口）
assert body["can_order"] is True, appr
print("审核通过，can_order=True ✓")

step("⑥ 重新登录 → 对公下单（价格快照 + 原子扣库存）")
s, login = req("POST", "/storefront/v1/auth/login", body={"username": BUYER, "password": PASS})
assert s == 200, (s, login)
buyer_token = login["data"]["access"]
s, chk = req(
    "POST", "/storefront/v1/checkout",
    token=buyer_token,
    body={"shipping_address": "Москва, ул. Автозаводская, 1", "payment_method": "bank_transfer"},
)
assert s in (200, 201), (s, chk)
order = chk["data"]
total = str(order["total_amount"])
assert total in ("5700.00", "5700.0"), f"价格快照异常: {total}"
s, orders = req("GET", "/storefront/v1/orders", token=buyer_token)
assert s == 200 and orders["data"], (s, orders)
order_id = orders["data"][0]["order_id"]
print(f"order_no={order['order_no']}  status={order['status']}  total={total}")

step("⑦ 管理端核销到账（F-14：awaiting_confirmation → paid；金额必须一致）")
s, conf = req(
    "POST", f"/api/v1/orders/{order_id}/confirm-payment/",
    token=admin_token, body={"amount": "5700.00", "note": "DoD1 断网演练核销"},
)
assert s == 200, (s, conf)
assert conf["data"]["status"] == "paid", conf
print("核销 → paid ✓")

step("⑧ 管理端发货（F-13：paid → shipped + 物流单号）")
s, ship = req(
    "POST", f"/api/v1/orders/{order_id}/ship/",
    token=admin_token, body={"tracking_no": "CDEK-100500", "carrier": "CDEK"},
)
assert s == 200, (s, ship)
assert ship["data"]["status"] == "shipped", ship
print("发货 → shipped ✓")

step("⑨ 买家确认收货 → completed")
s, det = req("GET", f"/storefront/v1/orders/{order_id}", token=buyer_token)
assert s == 200 and det["data"]["tracking_no"] == "CDEK-100500", (s, det)
s, done = req("POST", f"/storefront/v1/orders/{order_id}/confirm-receipt", token=buyer_token)
assert s == 200 and done["data"]["status"] == "completed", (s, done)
print("签收 → completed ✓")

print(f"\n✅ 六步全链路通过（订单 {order['order_no']}，断网环境，BASE={BASE}）")

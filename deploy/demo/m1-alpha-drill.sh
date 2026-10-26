#!/usr/bin/env bash
# M1 内部 alpha 全链路演示脚本（26号 §九 DoD2 对公动线）
#
# 前置（一次性，backend/ 目录）：
#   B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py make_demo_pack
#   B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py import_seed_package \
#       --package ../deploy/demo/B1RU-CAT-DEMO-INIT-0001.zip
#   B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py import_seed_package \
#       --package ../deploy/demo/B1RU-CAT-DEMO-DELTA-0002.zip
#   B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py seed_demo_commerce
#   管理员：创建用户并 init_rbac --assign <user>:owner
#   服务：B1RU_TEST_SQLITE=1 ./venv/bin/python manage.py runserver 127.0.0.1:8000
#
# 断网说明：除支付网关与 ЧЗ 赋码 API（P1，未接）外，本演示全程无外网依赖；
# 离线交付与安装流程见 deploy/README。
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:8000}"
TAG="$(date +%H%M%S)"
BUYER="corp_demo_${TAG}"
PASS="Demo-Buyer-2026!"
step() { echo; echo "======== $* ========"; }
j() { jq -r "$1"; }

step "① 游客按车找件（匿名，无外联）：品牌→车系→车型→适配件"
BRAND_ID=$(curl -s "$BASE/catalog/v1/brands" | j '.data[] | select(.brand_code=="CHERY") | .brand_id')
echo "brand CHERY = $BRAND_ID"
SERIES_ID=$(curl -s "$BASE/catalog/v1/brands/$BRAND_ID/series" | j '.data[] | select(.series_code=="TIGGO7") | .series_id')
echo "series TIGGO7 = $SERIES_ID"
MODEL_ID=$(curl -s "$BASE/catalog/v1/series/$SERIES_ID/models" | j '.data[] | select(.model_code=="TIG7-15T") | .model_id')
echo "model TIG7-15T = $MODEL_ID"
FIT=$(curl -s "$BASE/catalog/v1/fitments?model_id=$MODEL_ID")
echo "$FIT" | jq -r '.data[] | "\(.spu_code) \(.display_name) verified=\(.fitment.verified_status) pos=\(.fitment.qualifiers.POSITION)"'
SPU_ID=$(echo "$FIT" | j '.data[] | select(.spu_code=="DM00001") | .spu_id')

step "② 游客看商品详情：价格不可见（登录后见价）"
curl -s "$BASE/storefront/v1/store/products/$SPU_ID" | jq '{display_name: .data.display_name, offer: .data.offer}'

step "③ 企业客户注册（ИНН 必填）→ pending 待审核"
REG=$(curl -s -X POST "$BASE/storefront/v1/auth/register" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$BUYER\",\"password\":\"$PASS\",\"buyer_type\":\"corporate\",\"company_name_ru\":\"ООО АвтоЗапчасти Демо\",\"inn\":\"7701234567\",\"phone\":\"+79001234567\"}")
BUYER_TOKEN=$(echo "$REG" | j '.data.access')
echo "buyer_type=$(echo "$REG" | j '.data.buyer_type')  verification=$(echo "$REG" | j '.data.verification_status')"

step "④ 未过审企业：可加购、下单被拒（403 CORPORATE_PENDING——浏览/下单分离）"
PRODUCT_ID=$(curl -s "$BASE/storefront/v1/store/products/$SPU_ID" -H "Authorization: Bearer $BUYER_TOKEN" | j '.data.offer.product_id')
echo "登录后见价 = $(curl -s "$BASE/storefront/v1/store/products/$SPU_ID" -H "Authorization: Bearer $BUYER_TOKEN" | j '.data.offer.price')"
curl -s -X POST "$BASE/storefront/v1/cart/add" -H "Authorization: Bearer $BUYER_TOKEN" \
  -H 'Content-Type: application/json' -d "{\"product_id\":\"$PRODUCT_ID\",\"quantity\":2}" | jq -c .
echo "下单 → HTTP $(curl -s -o /tmp/chk.json -w '%{http_code}' -X POST "$BASE/storefront/v1/checkout" \
  -H "Authorization: Bearer $BUYER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"shipping_address":"Москва, ул. Автозаводская, 1","payment_method":"bank_transfer"}')"
cat /tmp/chk.json | jq -c '.error'

step "⑤ 管理端审核通过（F-15：管理端动作回写买家账号）"
ADMIN_TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/token" -H 'Content-Type: application/json' \
  -d '{"username":"b1owner","password":"Demo-Owner-2026!"}' | j '.access')
ACCOUNT_ID=$(curl -s "$BASE/api/v1/buyer-accounts/?verification_status=pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | j '.results[0].id')
curl -s -X POST "$BASE/api/v1/buyer-accounts/$ACCOUNT_ID/approve/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"note":"M1 演示通过"}' | jq '{username, verification_status, can_order}'

step "⑥ 重新登录 → 对公下单（价格快照 + 原子扣库存）"
BUYER_TOKEN=$(curl -s -X POST "$BASE/storefront/v1/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$BUYER\",\"password\":\"$PASS\"}" | j '.data.access')
CHK=$(curl -s -X POST "$BASE/storefront/v1/checkout" -H "Authorization: Bearer $BUYER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"shipping_address":"Москва, ул. Автозаводская, 1","payment_method":"bank_transfer"}')
echo "$CHK" | jq '.data | {order_no, status, total_amount, payment_method}'
ORDER_ID=$(curl -s "$BASE/storefront/v1/orders" -H "Authorization: Bearer $BUYER_TOKEN" | j '.data[0].order_id')
echo "order_id = $ORDER_ID"

step "⑦ 管理端核销到账（F-14：awaiting_confirmation → paid；金额必须一致）"
curl -s -X POST "$BASE/api/v1/orders/$ORDER_ID/confirm-payment/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"amount":"5700.00","note":"对公到账核销（演示）"}' | jq -c .data

step "⑧ 管理端发货（F-13：paid → shipped + 物流单号）"
curl -s -X POST "$BASE/api/v1/orders/$ORDER_ID/ship/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"tracking_no":"CDEK-100500","carrier":"CDEK"}' | jq -c .data

step "⑨ 买家订单详情（shipped + 物流单号可见）→ 确认收货 → completed"
curl -s "$BASE/storefront/v1/orders/$ORDER_ID" -H "Authorization: Bearer $BUYER_TOKEN" \
  | jq '.data | {order_no, status, tracking_no, carrier, items}'
curl -s -X POST "$BASE/storefront/v1/orders/$ORDER_ID/confirm-receipt" \
  -H "Authorization: Bearer $BUYER_TOKEN" | jq -c .data

step "✅ 演示完成：游客找件 → 双语浏览 → 企业审核 → 对公下单 → 核销 → 发货 → 签收"
echo "订单号见上方 order_no；本脚本可重复执行（买家账号带时间戳）。"

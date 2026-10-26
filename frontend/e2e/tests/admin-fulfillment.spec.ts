import { expect, test } from "@playwright/test";

// E2E-2：admin 审核→核销→发货 UI 链 + storefront 签收闭环。
// 铺数据走 API（注册企业买家/加购/下单——非被测点）；被测点=管理端 UI 动作。
const OWNER = { username: "b1owner", password: "Demo-Owner-2026!" };
const API = "http://localhost:8001";
const TAG = Date.now().toString();
const BUYER = `e2e_adm_${TAG}`;
const PASS = "E2e-Pass-2026!";

async function api(path: string, init?: RequestInit) {
  const r = await fetch(`${API}${path}`, init);
  if (!r.ok && r.status !== 403) throw new Error(`${path} → ${r.status}`);
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function buyerToken(): Promise<string> {
  const { body } = await api("/storefront/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: BUYER, password: PASS, buyer_type: "corporate",
      company_name_ru: "ООО E2E Админ", inn: "7701234588", phone: "+79001234588",
    }),
  });
  return body.data.access;
}

let orderId = ""; let orderNo = ""; let total = ""; let product = ""; let buyerId = "";
test.beforeAll(async () => {
  const token = await buyerToken();
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  // 在售商品（演示数据 DM00003 机油滤清器）——products 是管理端端点，用 admin token
  const admin = await adminToken();
  const products = (await (
    await fetch(`${API}/api/v1/products/`, { headers: { Authorization: `Bearer ${admin}` } })
  ).json());
  const p = products.results?.[0] ?? products.data?.[0];
  product = p.product_id;
  // pending 买家账号 id（审核被测点用）
  const buyers = (await (
    await fetch(`${API}/api/v1/buyer-accounts/?verification_status=pending`, {
      headers: { Authorization: `Bearer ${admin}` },
    })
  ).json()).results;
  buyerId = buyers.find((b: { username: string }) => b.username === BUYER)?.id ?? "";
  // 加购 + 下单（预期 403：pending）→ 管理端审核后可下——为省一轮，这里由
  // 审核前的 403 语义已知，先审核再下单：
  await api("/storefront/v1/cart/add", {
    method: "POST", headers: auth,
    body: JSON.stringify({ product_id: product, quantity: 2 }),
  });
  const chk = await api("/storefront/v1/checkout", {
    method: "POST", headers: auth,
    body: JSON.stringify({ shipping_address: "Москва", payment_method: "bank_transfer" }),
  });
  if (chk.status !== 403) throw new Error(`pending 下单应 403，得到 ${chk.status}`);
  void orderId; void orderNo; void total;
});

let adminTok = "";
async function adminToken(): Promise<string> {
  if (adminTok) return adminTok;
  const r = await fetch(`${API}/api/v1/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(OWNER),
  });
  adminTok = (await r.json()).access;
  return adminTok;
}

test("admin 登录 → 审核企业买家 → 通过态可见", async ({ page }) => {
  test.skip(!buyerId, "铺数据失败");
  await page.goto("/login");
  await page.locator("input.input").nth(0).fill(OWNER.username);
  await page.locator("input[type=password]").fill(OWNER.password);
  await page.getByRole("button", { name: /登录|Войти/ }).click();
  await expect(page.getByRole("heading", { name: /商品管理/ })).toBeVisible();

  await page.goto("/buyers");
  const row = page.locator("tr", { hasText: BUYER });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "通过" }).click();
  await expect(page.locator("tr", { hasText: BUYER })).toContainText("已认证");
});

test("admin 核销到账 → 发货（金额预填）", async ({ page }) => {
  test.skip(!buyerId, "铺数据失败");
  // 审核（上一测试）后重登买家下单：
  const login = await fetch(`${API}/storefront/v1/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: BUYER, password: PASS }),
  });
  const token = (await login.json()).data.access;
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  await api("/storefront/v1/checkout", {
    method: "POST", headers: auth,
    body: JSON.stringify({ shipping_address: "Москва, E2E", payment_method: "bank_transfer" }),
  });
  const orders = (await (await fetch(`${API}/storefront/v1/orders`, { headers: auth })).json()).data;
  orderId = orders[0].order_id; orderNo = orders[0].order_no; total = String(orders[0].total_amount);
  expect(orders[0].status).toBe("awaiting_confirmation");

  await page.goto("/login");
  await page.locator("input.input").nth(0).fill(OWNER.username);
  await page.locator("input[type=password]").fill(OWNER.password);
  await page.getByRole("button", { name: /登录|Войти/ }).click();
  await page.waitForURL("**/products"); // 等登录请求完成+跳转（否则 goto 打断 token 存储）
  await page.goto("/orders");
  const row = page.locator("tr", { hasText: orderNo });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "确认到账" }).click();
  // 金额已由 open() 预填 total——直接提交
  await page.getByRole("button", { name: "确认", exact: true }).click(); // 弹窗提交（区别于行内"确认到账"）
  await expect(page.locator("tr", { hasText: orderNo })).toContainText("已付款");

  await row.getByRole("button", { name: "发货" }).click();
  await page.locator("input.input").nth(0).fill("CDEK-E2E-1");
  await page.locator("input.input").nth(1).fill("CDEK");
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator("tr", { hasText: orderNo })).toContainText("已发货");
});

test("storefront 买家确认收货 → completed", async ({ page }) => {
  test.skip(!orderId, "前置未完成");
  const login = await fetch(`${API}/storefront/v1/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: BUYER, password: PASS }),
  });
  const token = (await login.json()).data.access;
  await page.goto("http://localhost:5174/login"); // storefront（绝对 URL 跨端）
  await page.evaluate((t) => {
    // 与 lib/token.ts 的过渡封装同键（b1ru_token；两键都写以兼容）
    localStorage.setItem("b1ru_auth_token", t); // 键名=lib/token.ts TOKEN_KEY
  }, token);
  await page.goto(`http://localhost:5174/orders/${orderId}`);
  await expect(page.locator("text=CDEK-E2E-1")).toBeVisible();
  await page.getByRole("button", { name: "Подтвердить получение" }).click();
  await expect(page.locator("text=Завершён")).toBeVisible(); // i18n 文案（状态码已转 ru）
});

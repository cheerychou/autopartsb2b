import { expect, test } from "@playwright/test";

// E2E-1：storefront 对公买家 UI 链（游客找件 → 企业注册 → 见价 → 加购 →
// pending 门控）。API 链已由 m1-alpha-drill 覆盖——此处验证 UI 层渲染与交互。
// 数据：演示包（CHERY/TIGGO7/TIG7-15T/DM00001，见 make_demo_pack）；账号带时间戳可重跑。

const TAG = Date.now().toString();
const BUYER = `e2e_corp_${TAG}`;
const PASS = "E2e-Pass-2026!";

let ids: { brand: string; series: string; model: string; spu: string };
test.beforeAll(async () => {
  // 选择器素材直连后端取 id（选择联动本身在 UI 内完成，id 仅作 selectOption value）
  const base = "http://localhost:8001/catalog/v1";
  const brands = (await (await fetch(`${base}/brands`)).json()).data;
  ids = { brand: "" } as never;
  const chery = brands.find((b: { brand_code: string }) => b.brand_code === "CHERY");
  const series = (await (await fetch(`${base}/brands/${chery.brand_id}/series`)).json()).data;
  const tiggo7 = series.find((s: { series_code: string }) => s.series_code === "TIGGO7");
  const models = (await (await fetch(`${base}/series/${tiggo7.series_id}/models`)).json()).data;
  const tig7 = models.find((m: { model_code: string }) => m.model_code === "TIG7-15T");
  const fits = (
    await (await fetch(`${base}/fitments?model_id=${tig7.model_id}`)).json()
  ).data;
  const dm1 = fits.find((f: { spu_code: string }) => f.spu_code === "DM00001");
  ids = { brand: chery.brand_id, series: tiggo7.series_id, model: tig7.model_id, spu: dm1.spu_id };
});

test("游客找件 → 商品页价格不可见", async ({ page }) => {
  await page.goto("/fitment");
  const selects = page.locator("select.input");
  await selects.nth(0).selectOption(ids.brand);
  await selects.nth(1).selectOption(ids.series);
  await selects.nth(2).selectOption(ids.model);
  await expect(page.locator("a", { hasText: "Колодки тормозные" }).first()).toBeVisible();

  await page.goto(`/product/${ids.spu}`);
  await expect(page.getByRole("heading", { name: "Колодки тормозные" })).toBeVisible(); // DM00001=刹车片
  await expect(page.locator("text=Войдите, чтобы увидеть цены")).toBeVisible(); // 游客无价（19号开放参数默认）
  await expect(page.getByRole("button", { name: "В корзину" })).toBeDisabled();
});

test("企业注册 → 登录见价 → 加购 → pending 结算门控", async ({ page }) => {
  await page.goto("/register");
  await page.locator("label", { hasText: "Компания" }).click(); // label 触发 radio
  const inputs = page.locator("input.input");
  // 字段序：Название компании / ИНН / Имя пользователя / Пароль / Телефон
  await inputs.nth(0).fill("ООО E2E Демо");
  await inputs.nth(1).fill("7701234599");
  await inputs.nth(2).fill(BUYER);
  await inputs.nth(3).fill(PASS);
  await inputs.nth(4).fill("+79001234599");
  await page.getByRole("button", { name: "Регистрация" }).click();
  await expect(page.getByRole("heading", { name: "Запчасти для китайских автомобилей" })).toBeVisible();

  // 登录态见价 + 加购（ greeted welcome 文案含用户名亦可作登录态断言，此处直击价格）
  await page.goto(`/product/${ids.spu}`);
  await expect(page.locator(".price")).toContainText("2850");
  await page.getByRole("button", { name: "В корзину" }).click();
  await expect(page.locator(".alert", { hasText: "Добавлено в корзину" })).toBeVisible();

  // 购物车 → 结算：pending 企业被前端门控（提示文案 + 按钮禁用；API 403 是纵深防御）
  await page.goto("/cart");
  await expect(page.locator("text=Итого")).toBeVisible();
  await page.getByRole("link", { name: "Оформить заказ" }).click();
  await page.locator("textarea.input").fill("Москва, ул. Автозаводская, 1");
  await expect(page.locator("text=Ваша компания на проверке")).toBeVisible();
  await expect(page.getByRole("button", { name: "Разместить заказ" })).toBeDisabled();
});

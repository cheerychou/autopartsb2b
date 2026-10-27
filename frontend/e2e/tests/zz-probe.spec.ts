import { expect, test } from "@playwright/test";
const TAG = Date.now().toString();
test("probe register localStorage cart", async ({ page }) => {
  await page.goto("/register");
  const inputs = page.locator("input.input");
  await inputs.nth(0).fill("OOO Probe");
  await inputs.nth(1).fill("7701234566");
  await inputs.nth(2).fill("probe_" + TAG);
  await inputs.nth(3).fill("E2e-Pass-2026!");
  await inputs.nth(4).fill("+79001234566");
  await page.getByRole("button", { name: "Регистрация" }).click();
  await expect(page.getByRole("heading", { name: "Запчасти" })).toBeVisible();
  const afterReg = await page.evaluate(() => ({
    token: localStorage.getItem("b1ru_auth_token"),
    refresh: localStorage.getItem("b1ru_auth_refresh"),
  }));
  console.log("PROBE afterReg token=", Boolean(afterReg.token), "refresh=", afterReg.refresh);
  await page.goto("/cart");
  await page.waitForTimeout(800);
  const afterCart = await page.evaluate(() => ({
    token: localStorage.getItem("b1ru_auth_token"),
    url: location.pathname,
  }));
  console.log("PROBE afterCart url=", afterCart.url, "token=", Boolean(afterCart.token));
});

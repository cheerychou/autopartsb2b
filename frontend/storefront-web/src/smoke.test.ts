import { describe, expect, it } from "vitest";
import i18n from "./i18n";

describe("S6 storefront smoke", () => {
  it("i18n 默认俄语且双语语言包接线成功（26号§六）", () => {
    expect(i18n.language).toBe("ru");
    expect(i18n.t("nav.fitment")).toBe("Подбор по авто");
    expect(i18n.t("nav.home")).toBe("Главная");
  });

  it("买家三形态文案齐备（guest/individual/corporate，31号§五）", () => {
    expect(i18n.t("auth.priceLoginRequired")).toContain("цен");
    expect(i18n.t("auth.corporatePending")).toContain("проверке");
  });
});

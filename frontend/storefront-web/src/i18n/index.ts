import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// 两端均中俄双语（委托方 2026-10-25 澄清，26号§六）：默认 ru（买家主受众），可切换。
// 目录数据展示名不走语言包——走 I1 entity_names 回退链 + name_chain（27号）。
import ru from "./ru.json";
import zh from "./zh.json";

const LNG_KEY = "b1ru_lng"; // 非凭据，仅界面语言偏好

function initialLang(): string {
  try {
    return localStorage.getItem(LNG_KEY) ?? "ru";
  } catch {
    return "ru";
  }
}

i18n.use(initReactI18next).init({
  lng: initialLang(),
  fallbackLng: "ru",
  resources: {
    ru: { translation: ru },
    zh: { translation: zh },
  },
  interpolation: { escapeValue: false },
});

export function switchLang(lng: "ru" | "zh"): void {
  try {
    localStorage.setItem(LNG_KEY, lng);
  } catch {
    /* 隐私模式等场景忽略 */
  }
  void i18n.changeLanguage(lng);
}

export default i18n;

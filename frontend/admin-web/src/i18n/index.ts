import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// 管理端同样中俄双语（26号§六）；默认 zh（运营方主受众），俄籍员工可切换。
import ru from "./ru.json";
import zh from "./zh.json";

const LNG_KEY = "b1ru_admin_lng";

function initialLang(): string {
  try {
    return localStorage.getItem(LNG_KEY) ?? "zh";
  } catch {
    return "zh";
  }
}

i18n.use(initReactI18next).init({
  lng: initialLang(),
  fallbackLng: "zh",
  resources: { ru: { translation: ru }, zh: { translation: zh } },
  interpolation: { escapeValue: false },
});

export function switchLang(lng: "ru" | "zh"): void {
  try {
    localStorage.setItem(LNG_KEY, lng);
  } catch {
    /* 忽略 */
  }
  void i18n.changeLanguage(lng);
}

export default i18n;

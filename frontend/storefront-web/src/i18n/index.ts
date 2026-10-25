import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// storefront 默认俄语（26号§六：全部界面文案走语言包，禁止硬编码）
// 目录数据展示名不走语言包——走 I1 entity_names 回退链 ru→en→zh（27号）
import ru from "./ru.json";

i18n.use(initReactI18next).init({
  lng: "ru",
  fallbackLng: "ru",
  resources: { ru: { translation: ru } },
  interpolation: { escapeValue: false },
});

export default i18n;

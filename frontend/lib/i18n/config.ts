import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./ar";
import en from "./en";

const resources = {
  ar: { translation: ar },
  en: { translation: en },
};

// دايمًا "ar" وقت الـ init الأول - نفس الحاجة بالظبط على السيرفر والمتصفح
// (عشان اللي بيتبعت من السيرفر يتطابق مع أول حاجة بيرندرها المتصفح، ويمنع hydration error)
i18n.use(initReactI18next).init({
  resources,
  lng: "ar",
  fallbackLng: "ar",
  interpolation: { escapeValue: false },
});

// بعد ما الصفحة تخلص تحميل في المتصفح، لو فيه لغة محفوظة مختلفة، بدّلها وقتها بس
if (typeof window !== "undefined") {
  const savedLang = localStorage.getItem("lang");
  if (savedLang && savedLang !== i18n.language) {
    i18n.changeLanguage(savedLang);
  }
}

export default i18n;
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

// ⚠️ ملحوظة: استرجاع اللغة المحفوظة (localStorage) اتنقل لـ I18nProviderWrapper
// جوه useEffect، عشان يتنفذ بعد ما الـ hydration يخلص فعليًا مش وقت تحميل الملف.
// لو اتنفذ هنا (وقت تحميل الـ module) هيحصل قبل الـ hydration ويسبب mismatch
// لأن السيرفر بيرندر "ar" دايمًا والمتصفح كان بيبدل اللغة قبل ما يقارن.

export default i18n;
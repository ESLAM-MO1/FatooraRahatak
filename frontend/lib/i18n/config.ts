import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./ar";
import en from "./en";

const resources = {
  ar: { translation: ar },
  en: { translation: en },
};

const savedLang = typeof window !== "undefined" ? localStorage.getItem("lang") : null;

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang || "ar",
  fallbackLng: "ar",
  interpolation: { escapeValue: false },
});

export default i18n;

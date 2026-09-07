"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18nInstance from "./config";

export default function I18nProviderWrapper({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  // نستخدم النسخة الوحيدة (singleton) اللي طالعة من config.ts مباشرة بدل النسخة
  // الراجعة من useTranslation()، عشان نضمن إن الـ reference ثابت 100% ومايتغيرش
  // بين الرندرات (لو اتغير، الـ effect تحت كان بيتنفذ من جديد كل مرة ويعمل
  // حلقة لا نهائية من إعادة الرندر - "Maximum update depth exceeded").
  const ranOnce = useRef(false);

  // بيتنفذ مرة واحدة بس عند أول تحميل (mount)، مش كل مرة يتغير فيها أي حاجة،
  // عشان أول رندر على المتصفح يتطابق مع السيرفر (اللي دايمًا "ar")، وبعدين
  // نبدّل للغة المحفوظة لو موجودة من غير ما نسبب hydration mismatch أو أي لوب.
  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    const savedLang = localStorage.getItem("lang");
    if (savedLang && savedLang !== i18nInstance.language) {
      i18nInstance.changeLanguage(savedLang);
    }
  }, []);

  useEffect(() => {
    const sync = (lng: string) => {
      document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = lng;
      localStorage.setItem("lang", lng);
    };
    sync(i18nInstance.language);
    i18nInstance.on("languageChanged", sync);
    return () => { i18nInstance.off("languageChanged", sync); };
  }, []);

  return <>{children}</>;
}
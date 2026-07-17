"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./config";

export default function I18nProviderWrapper({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const sync = (lng: string) => {
      document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = lng;
      localStorage.setItem("lang", lng);
    };
    sync(i18n.language);
    i18n.on("languageChanged", sync);
    return () => { i18n.off("languageChanged", sync); };
  }, [i18n]);

  return <>{children}</>;
}

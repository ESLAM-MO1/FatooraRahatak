"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

export default function LangSwitch() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const toggle = () => {
    i18n.changeLanguage(isAr ? "en" : "ar");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="lang-switch-btn"
      title={t("lang.switchTo")}
      style={{
        background: "transparent",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "4px 10px",
        fontSize: "12px",
        fontWeight: 700,
        cursor: "pointer",
        color: "var(--ink)",
      }}
    >
      {t("lang.switch")}
    </button>
  );
}

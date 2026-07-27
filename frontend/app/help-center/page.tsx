"use client";
import { useTranslation } from "react-i18next";
import CmsPage from "@/components/CmsPage";
import "@/lib/i18n/config";

export default function HelpCenterPage() {
  const { t } = useTranslation();
  return <CmsPage pageKey="help-center" heroTitle={t("page.helpCenter")} heroSubtitle={t("common.help")} />;
}

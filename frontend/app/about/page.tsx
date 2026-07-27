"use client";
import { useTranslation } from "react-i18next";
import CmsPage from "@/components/CmsPage";
import "@/lib/i18n/config";

export default function AboutPage() {
  const { t } = useTranslation();
  return <CmsPage pageKey="about" heroTitle={t("page.about")} heroSubtitle={t("brand.name")} />;
}

"use client";
import { useTranslation } from "react-i18next";
import CmsPage from "@/components/CmsPage";
import "@/lib/i18n/config";

export default function Page() {
  const { t } = useTranslation();
  return <CmsPage pageKey="free-tools" heroTitle={t("page.freeTools")} />;
}

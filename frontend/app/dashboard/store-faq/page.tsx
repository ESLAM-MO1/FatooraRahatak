"use client";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import PageHeader from "@/components/PageHeader";
import StoreFaqManager from "@/components/store-managers/StoreFaqManager";

export default function StoreFaqPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader icon="book" title={t("storeFaq.title")} />
      <StoreFaqManager />
    </div>
  );
}
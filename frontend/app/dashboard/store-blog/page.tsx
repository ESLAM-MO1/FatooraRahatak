"use client";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import PageHeader from "@/components/PageHeader";
import StoreBlogManager from "@/components/store-managers/StoreBlogManager";

export default function StoreBlogPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader icon="edit" title={t("storeBlog.title")} />
      <StoreBlogManager />
    </div>
  );
}
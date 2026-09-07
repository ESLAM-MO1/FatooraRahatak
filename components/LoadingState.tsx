"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

export default function LoadingState({ text }: { text?: string }) {
  const { t } = useTranslation();
  const displayText = text ?? t("common.loading");

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span className="w-7 h-7 rounded-full border-[3px] border-[var(--blue)] border-t-transparent animate-spin" />
        <p className="text-[14px] text-[var(--sub)]">{displayText}</p>
      </div>
    </div>
  );
}

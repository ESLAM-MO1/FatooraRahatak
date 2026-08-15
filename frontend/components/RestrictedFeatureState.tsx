"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

export default function RestrictedFeatureState() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="min-h-[50vh] flex items-center justify-center py-10">
      <div className="max-w-sm w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#F5C34A]/15 to-[#E9A912]/10 flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E9A912" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h3 className="text-[20px] font-extrabold text-[var(--blue-deep)] mb-3">{t("restricted.title")}</h3>
        <p className="text-[14px] text-[var(--sub)] leading-relaxed mb-7">{t("restricted.description")}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/dashboard/subscription")}
            className="btn btn-primary w-full py-3 text-[14px]"
          >
            {t("restricted.upgradeBtn")}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn btn-outline w-full"
          >
            {t("restricted.backToDashboard")}
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { onUpgradePrompt } from "@/lib/upgradePrompt";

export default function UpgradeModal() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    return onUpgradePrompt((msg) => {
      setMessage(msg);
      setIsOpen(true);
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setIsOpen(false)}>
      <div className="modal-card max-w-md text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end mb-1">
          <button type="button" onClick={() => setIsOpen(false)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
        </div>
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-[#F5C34A]/15 to-[#E9A912]/10 flex items-center justify-center">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#E9A912" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 18h20v2H2z" />
            <path d="M3 18l2.5-8L11 13l3-6 5.5 6.5L21 18z" />
            <path d="M11 13l-3-6" />
            <path d="M14 7l3-6" />
          </svg>
        </div>

        <h3 className="text-[18px] font-extrabold text-[var(--blue-deep)] mb-2">{t("upgradeModal.title")}</h3>
        <p className="text-[13.5px] text-[var(--sub)] leading-relaxed mb-7">
          {message || t("upgradeModal.description")}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setIsOpen(false);
              router.push("/dashboard/subscription");
            }}
            className="btn btn-primary w-full py-3 text-[14px]"
          >
            {t("upgradeModal.upgradeBtn")}
          </button>
          <button onClick={() => setIsOpen(false)} className="btn btn-outline w-full">
            {t("upgradeModal.later")}
          </button>
        </div>
      </div>
    </div>
  );
}

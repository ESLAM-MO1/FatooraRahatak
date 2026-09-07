"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import Icon from "@/components/Icon";

type StepKey = "profile" | "merchant" | "verification";

interface StepMeta {
  key: StepKey;
  labelKey: string;
  descKey: string;
  icon: string;
  href: string;
  completed: boolean | null;
}

export default function OnboardingWizard({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const [steps, setSteps] = useState<StepMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileRes, merchantRes, kycRes] = await Promise.all([
          api.get("/auth/profile").catch(() => null),
          api.get("/owner/merchant-account").catch(() => null),
          api.get("/owner/merchant-account/kyc-status").catch(() => null),
        ]);

        if (cancelled) return;

        const profile = profileRes?.data?.data;
        const merchant = merchantRes?.data?.data;
        const kyc = kycRes?.data?.data;

        const hasProfile = !!(profile?.fullName && profile?.email);
        const hasMerchant = merchant?.status === "Approved" || merchant?.status === "Pending";
        const hasKyc = kyc?.isApproved || (merchant?.status === "Approved" && kyc?.documentsCount > 0);
        const isApproved = kyc?.isApproved === true || merchant?.status === "Approved";

        const allSteps: StepMeta[] = [
          { key: "profile", labelKey: "onboarding.profile", descKey: "onboarding.profileDesc", icon: "user", href: "/dashboard/profile", completed: hasProfile },
          { key: "merchant", labelKey: "onboarding.merchant", descKey: "onboarding.merchantDesc", icon: "store", href: "/dashboard/merchant-account", completed: hasMerchant },
          { key: "verification", labelKey: "onboarding.verification", descKey: "onboarding.verificationDesc", icon: "check", href: "/dashboard/merchant-verification", completed: hasKyc },
        ];

        // Only show incomplete steps unless all are complete
        const incomplete = allSteps.filter((s) => s.completed === false);
        setSteps(isApproved ? [] : incomplete.length > 0 ? incomplete : []);
      } catch {
        setSteps([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  if (loading || steps.length === 0 || dismissed) return null;

  return (
    <div className={`card p-5 sm:p-6 mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--gold-soft)] text-[var(--gold)] flex items-center justify-center shrink-0">
            <Icon name="box" size={18} />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-[var(--ink)]">{t("onboarding.title")}</h2>
            <p className="text-[12px] text-[var(--sub)]">{t("onboarding.desc")}</p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors p-1"
          aria-label={t("common.close")}
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3.5 border border-gray-100">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 text-[12px] font-bold text-[var(--blue-deep)] shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[var(--ink)]">{t(step.labelKey)}</p>
              <p className="text-[11.5px] text-[var(--sub)] mt-0.5">{t(step.descKey)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={step.href} className="btn btn-primary btn-sm">
                {t("onboarding.complete")}
              </Link>
              <button
                onClick={() => setSteps((prev) => prev.filter((s) => s.key !== step.key))}
                className="text-[12px] text-[var(--sub)] hover:text-[var(--ink)] font-bold px-2 py-1"
              >
                {t("onboarding.skip")}
              </button>
            </div>
          </div>
        ))}
      </div>

      {steps.length > 0 && (
        <p className="text-[11.5px] text-[var(--sub)] mt-4 text-center">
          {t("onboarding.reminder")}{" "}
          <Link href="/dashboard/profile" className="text-[var(--blue)] font-bold hover:underline">
            {t("onboarding.completeLater")}
          </Link>
        </p>
      )}
    </div>
  );
}
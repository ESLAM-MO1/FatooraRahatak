"use client";

import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatNumber } from "@/lib/formatNumber";
import InfoTooltip from "@/components/InfoTooltip";

export interface PackageCardData {
  id: number;
  name: string;
  monthlyPrice: number;
  maxProducts: number | null;
  maxEmployees: number;
  maxWarehouses: number;
  maxThemes: number;
  maxShippingCompanies: number;
  commissionPercentage: number;
  color: string;
  hasAccountingFull: boolean;
  hasPayroll: boolean;
  hasZatcaInvoice: boolean;
  hasCustomDomain: boolean;
  hasAffiliateMarketing: boolean;
  hasApiAccess: boolean;
  hasPos: boolean;
  hasLogo: boolean;
  hasShippingIntegration: boolean;
  hasShippingCalculator: boolean;
  hasShippingTracking: boolean;
  hasShippingLabelPrinting: boolean;
  hasFreeShipping: boolean;
  hasCashOnDelivery: boolean;
  hasShippingDiscounts: boolean;
}

interface PackageCardProps {
  pkg: PackageCardData;
  badge?: string;
  isCurrent?: boolean;
  footer?: ReactNode;
  totalPrice?: number;
  savePercent?: number;
}

const FEATURES: { key: keyof PackageCardData; labelKey: string }[] = [
  { key: "hasAccountingFull", labelKey: "packages.accounting" },
  { key: "hasZatcaInvoice", labelKey: "packages.zatcaInvoice" },
  { key: "hasPos", labelKey: "packages.pos" },
  { key: "hasPayroll", labelKey: "packages.payroll" },
  { key: "hasCustomDomain", labelKey: "packages.customDomain" },
  { key: "hasApiAccess", labelKey: "packages.apiAccess" },
  { key: "hasAffiliateMarketing", labelKey: "packages.affiliate" },
  { key: "hasLogo", labelKey: "packages.logo" },
];

const SHIPPING_FEATURES: { key: keyof PackageCardData; labelKey: string }[] = [
  { key: "hasShippingIntegration", labelKey: "packages.shippingIntegration" },
  { key: "hasShippingCalculator", labelKey: "packages.shippingCalculator" },
  { key: "hasShippingTracking", labelKey: "packages.shippingTracking" },
  { key: "hasShippingLabelPrinting", labelKey: "packages.shippingLabelPrinting" },
  { key: "hasCashOnDelivery", labelKey: "packages.cashOnDelivery" },
  { key: "hasFreeShipping", labelKey: "packages.freeShipping" },
  { key: "hasShippingDiscounts", labelKey: "packages.shippingDiscounts" },
];

const LIMITS: { key: keyof PackageCardData; labelKey: string }[] = [
  { key: "maxProducts", labelKey: "packages.products" },
  { key: "maxEmployees", labelKey: "packages.employees" },
  { key: "maxWarehouses", labelKey: "packages.warehouses" },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

function FeatureChip({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`feature-chip ${active ? "feature-chip--on" : "feature-chip--off"}`}>
      {active ? <CheckIcon /> : <CrossIcon />}
      {label}
    </span>
  );
}

function getLimitLabel(value: number | null, t: (s: string) => string) {
  if (value === null || value === -1) return t("packages.unlimited");
  return String(value);
}

function getShippingCompaniesLabel(value: number | null, t: (s: string, opts?: any) => string): string {
  if (value === null || value === -1) return t("packages.shippingIntegrationUnlimited");
  if (value === 0) return t("packages.shippingIntegration");
  if (value === 1) return t("packages.shippingIntegrationOne");
  if (value === 2) return t("packages.shippingIntegrationTwo");
  if (value === 3 || value === 4 || value === 5) return t("packages.shippingIntegrationCount", { count: value });
  return t("packages.shippingIntegrationCount", { count: value });
}

export default function PackageCard({ pkg, badge, isCurrent, footer, totalPrice, savePercent }: PackageCardProps) {
  const { t } = useTranslation();

  return (
    <div className={`package-card ${isCurrent ? "package-card--current" : ""}`}>
      {badge && <span className="package-card__badge">{badge}</span>}

      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-block w-3.5 h-3.5 rounded-full shrink-0"
          style={{ backgroundColor: pkg.color }}
        />
        <h3 className="text-[15px] font-bold text-[var(--blue-deep)]">{pkg.name}</h3>
      </div>

      <div className="mb-4">
        {totalPrice !== undefined ? (
          <>
            {savePercent ? (
              <span className="inline-block text-[10px] font-bold text-white px-2 py-0.5 rounded-full mb-1.5" style={{ background: "#16a34a" }}>
                {t("subscription.savePercent").replace("{percent}", String(savePercent))}
              </span>
            ) : null}
            <p className="text-[22px] font-bold" style={{ color: pkg.color }}>
              {formatNumber(totalPrice)} SAR
            </p>
            <p className="text-[11px] text-[var(--sub)]">
              {formatNumber(pkg.monthlyPrice)} {t("packages.month")}
            </p>
          </>
        ) : (
          <p className="text-[22px] font-bold" style={{ color: pkg.color }}>
            {formatNumber(pkg.monthlyPrice)} {t("packages.month")}
          </p>
        )}
      </div>

      <div className="flex justify-between text-[12.5px] mb-4">
        <span className="text-[var(--sub)] flex items-center gap-1.5">{t("packages.commission")}<InfoTooltip messageKey="packages.commissionTooltip" /></span>
        <span className="font-bold text-[var(--ink)]">{pkg.commissionPercentage}%</span>
      </div>

      <div className="space-y-1 mb-4 border-t border-[var(--border)] pt-4">
        {LIMITS.map((limit) => (
          <div key={limit.key} className="flex justify-between text-[12.5px] mb-2">
            <span className="text-[var(--sub)] flex items-center gap-1.5">{t(limit.labelKey)}<InfoTooltip messageKey={`packagesAdmin.limit${limit.key.replace("max", "")}Tooltip`} /></span>
            <span className="font-bold text-[var(--ink)]">
              {getLimitLabel(pkg[limit.key] as number | null, t)}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2 mb-4 border-t border-[var(--border)] pt-4">
        <p className="text-[11.5px] text-[var(--sub)] mb-1">{t("packages.featuresTitle")}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {FEATURES.map((feat) => (
            <FeatureChip key={feat.key} active={Boolean(pkg[feat.key])} label={t(feat.labelKey)} />
          ))}
          <FeatureChip active={pkg.maxThemes > 0} label={t("packages.templates")} />
        </div>
      </div>

      <div className="space-y-2 mb-4 border-t border-[var(--border)] pt-4">
        <p className="text-[11.5px] text-[var(--sub)] mb-1">{t("packages.shippingTitle")}</p>
        <div className="grid grid-cols-2 gap-1.5">
          <span className={`feature-chip ${pkg.maxShippingCompanies !== 0 ? "feature-chip--on" : "feature-chip--off"}`}>
            {pkg.maxShippingCompanies !== 0 ? <CheckIcon /> : <CrossIcon />}
            {getShippingCompaniesLabel(pkg.maxShippingCompanies, t)}
          </span>
          {SHIPPING_FEATURES.filter((feat) => feat.key !== "hasShippingIntegration").map((feat) => (
            <FeatureChip key={feat.key} active={Boolean(pkg[feat.key])} label={t(feat.labelKey)} />
          ))}
        </div>
      </div>

      {footer && <div className="flex flex-col gap-2 mt-4">{footer}</div>}
    </div>
  );
}

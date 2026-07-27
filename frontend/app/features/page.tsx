"use client";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "../site-layout";
import Icon from "@/components/Icon";
import "@/lib/i18n/config";

const FEATURES = [
  { labelKey: "page.accountingSystem", href: "/accounting-system", icon: "book" },
  { labelKey: "page.posSystem", href: "/pos-system", icon: "cashier" },
  { labelKey: "page.invoicing", href: "/invoicing", icon: "receipt" },
  { labelKey: "page.ecommerce", href: "/ecommerce", icon: "store" },
  { labelKey: "page.inventoryManagement", href: "/inventory-management", icon: "warehouse" },
  { labelKey: "page.smartReports", href: "/smart-reports", icon: "chart" },
  { labelKey: "page.paymentLinks", href: "/payment-links", icon: "link" },
  { labelKey: "page.pos", href: "/pos", icon: "package" },
  { labelKey: "page.paymentGateway", href: "/payment-gateway", icon: "card" },
  { labelKey: "page.websiteIntegration", href: "/website-integration", icon: "globe" },
] as const;

export default function FeaturesPage() {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      <section className="py-16 text-center text-white" style={{ backgroundColor: "var(--blue-deep)" }}>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">{t("nav.features")}</h1>
        <p className="text-[15px] opacity-80">{t("nav.featuresDropdownTitle")}</p>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feat) => (
            <Link
              key={feat.href}
              href={feat.href}
              className="flex items-center gap-4 p-5 rounded-xl border bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}
              >
                <Icon name={feat.icon as any} size={24} />
              </span>
              <span className="text-[15px] font-bold" style={{ color: "var(--ink)" }}>
                {t(feat.labelKey)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}

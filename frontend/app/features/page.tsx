"use client";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "../site-layout";
import Hero from "@/components/Hero";
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
  { labelKey: "page.usersPermissions", href: "/users-permissions", icon: "users" },
  { labelKey: "page.packagesDomains", href: "/packages-domains", icon: "crown" },
  { labelKey: "page.generalAccounts", href: "/general-accounts", icon: "ledger" },
  { labelKey: "page.affiliate", href: "/affiliate", icon: "share" },
  { labelKey: "page.productManagement", href: "/product-management", icon: "box" },
  { labelKey: "page.customerManagement", href: "/customer-management", icon: "userGroup" },
  { labelKey: "page.purchases", href: "/purchases", icon: "truck" },
  { labelKey: "page.pricing", href: "/pricing", icon: "tag" },
  { labelKey: "page.suppliers", href: "/suppliers", icon: "clipboard" },
  { labelKey: "page.sales", href: "/sales", icon: "wallet" },
  { labelKey: "page.reports", href: "/reports", icon: "layers" },
] as const;

export default function FeaturesPage() {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      <Hero title={t("nav.features")} subtitle={t("nav.featuresDropdownTitle")} />

      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {FEATURES.map((feat) => (
            <Link
              key={feat.href}
              href={feat.href}
              className="group flex flex-col items-center text-center gap-4 p-6 rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors group-hover:scale-105"
                style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}
              >
                <Icon name={feat.icon as any} size={26} />
              </span>
              <span className="text-[15px] font-bold leading-relaxed" style={{ color: "var(--ink)" }}>
                {t(feat.labelKey)}
              </span>
              <span className="text-[12px] font-medium flex items-center gap-1.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" style={{ color: "var(--blue)" }}>
                {t("site.knowMore")}
                <Icon name="arrowLeft" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}

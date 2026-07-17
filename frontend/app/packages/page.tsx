"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "../site-layout";
import LoadingState from "@/components/LoadingState";
import "@/lib/i18n/config";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

interface PublicPackage {
  id: number;
  name: string;
  monthlyPrice: number;
  maxProducts: number | null;
  maxEmployees: number;
  maxWarehouses: number;
  hasAccountingFull: boolean;
  hasPayroll: boolean;
  hasZatcaInvoice: boolean;
  hasCustomDomain: boolean;
  maxThemes: number;
}

const featuresList: { key: keyof PublicPackage; labelKey: string; check: boolean }[] = [
  { key: "maxProducts", labelKey: "packages.products", check: false },
  { key: "maxEmployees", labelKey: "packages.employees", check: false },
  { key: "maxWarehouses", labelKey: "packages.warehouses", check: false },
  { key: "hasAccountingFull", labelKey: "packages.accounting", check: true },
  { key: "hasPayroll", labelKey: "packages.payroll", check: true },
  { key: "hasZatcaInvoice", labelKey: "packages.zatcaInvoice", check: true },
  { key: "hasCustomDomain", labelKey: "packages.customDomain", check: true },
  { key: "maxThemes", labelKey: "packages.templates", check: false },
];

function fmt(key: string, val: any, t: (s: string) => string): string {
  if (typeof val === "boolean") return "";
  if (val === null || val === undefined) return t("packages.unlimited");
  return String(val);
}

export default function PackagesPage() {
  const { t } = useTranslation();
  const [packages, setPackages] = useState<PublicPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/site/packages`).then(r => r.json()).then(j => {
      const d = j.data || j;
      setPackages(Array.isArray(d) ? d : []);
    }).catch(() => setError(t("error.serverError"))).finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <SiteLayout>
        <LoadingState />
      </SiteLayout>
    );

  if (error) {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="alert alert--danger">{error}</div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div>
        <section
          className="py-16 text-center text-white"
          style={{ backgroundColor: "var(--blue-deep)" }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{t("packages.pricing")}</h1>
          <p className="text-[15px] opacity-80">{t("packages.subtitle")}</p>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="relative rounded-[var(--radius-md)] border-2 border-[var(--border)] bg-white p-6 flex flex-col transition-shadow hover:shadow-[var(--shadow-md)]"
              >
                <h3 className="text-lg font-bold text-[var(--ink)] mb-2">{pkg.name}</h3>
                <div className="mb-5">
                  <span className="text-3xl font-bold text-[var(--blue-deep)]">
                    {pkg.monthlyPrice.toLocaleString("ar-SA")}
                  </span>
                  <span className="text-[13px] text-[var(--sub)] mr-1">{t("packages.month")}</span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {featuresList.map((feat) => {
                    const val = (pkg as any)[feat.key];
                    if (feat.check) {
                      return (
                        <li key={feat.key} className="flex items-center gap-2 text-[13px] text-[var(--ink-light)]">
                          {val ? (
                            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-red-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          {t(feat.labelKey)}
                        </li>
                      );
                    }
                    return (
                      <li key={feat.key} className="flex items-center gap-2 text-[13px] text-[var(--ink-light)]">
                        <svg className="w-4 h-4 text-[var(--blue)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {t(feat.labelKey)}: <span className="font-bold text-[var(--ink)]">{fmt(feat.key, val, t)}</span>
                      </li>
                    );
                  })}
                </ul>
                <button className="btn btn-primary w-full justify-center">
                  {t("packages.start")}
                </button>
              </div>
            ))}
          </div>

          {packages.length > 0 && (
            <div className="mt-12 overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-[var(--radius-md)] shadow-[var(--shadow)] overflow-hidden">
                <thead>
                  <tr style={{ backgroundColor: "var(--blue-deep)" }}>
                    <th className="p-3 text-right text-[13px] font-bold text-white">{t("packages.feature")}</th>
                    {packages.map((pkg) => (
                      <th key={pkg.id} className="p-3 text-center text-[13px] font-bold text-white">
                        {pkg.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featuresList.map((feat, fi) => (
                    <tr key={feat.key} className={fi % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="p-3 text-[13px] font-medium text-[var(--ink)] border-t border-[var(--border)]">
                        {t(feat.labelKey)}
                      </td>
                      {packages.map((pkg) => {
                        const val = (pkg as any)[feat.key];
                        return (
                          <td key={pkg.id} className="p-3 text-center text-[13px] text-[var(--ink-light)] border-t border-[var(--border)]">
                            {feat.check ? (
                              val ? (
                                <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-red-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )
                            ) : (
                              <span className="font-bold text-[var(--ink)]">{fmt(feat.key, val, t)}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {packages.length === 0 && (
            <p className="text-center text-[var(--sub)] py-12">{t("packages.noPackages")}</p>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

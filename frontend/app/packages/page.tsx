"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "../site-layout";
import LoadingState from "@/components/LoadingState";
import PackageCard, { PackageCardData } from "@/components/PackageCard";
import "@/lib/i18n/config";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

export default function PackagesPage() {
  const { t } = useTranslation();
  const [packages, setPackages] = useState<PackageCardData[]>([]);
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
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                footer={
                  <button className="btn-primary w-full">{t("packages.start")}</button>
                }
              />
            ))}
          </div>

          {packages.length === 0 && (
            <p className="text-center text-[var(--sub)] py-12">{t("packages.noPackages")}</p>
          )}

          <p className="text-center text-[12px] text-[var(--sub)] mt-12 max-w-2xl mx-auto leading-relaxed">
            {t("packages.refundPolicy")}
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}

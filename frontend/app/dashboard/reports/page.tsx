"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

interface StoreCountByPackage {
  packageName: string;
  count: number;
}

interface ReportsOverview {
  totalStores: number;
  activeStores: number;
  suspendedStores: number;
  totalUsers: number;
  totalProductsAcrossPlatform: number;
  storesByPackage: StoreCountByPackage[];
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/admin/reports/overview");
        setData(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || t("reports.loadError"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <div className="alert alert--danger">{error}</div>;
  }

  if (!data) return null;

  const cards = [
    { label: t("reports.totalStores"), value: data.totalStores },
    { label: t("reports.activeStores"), value: data.activeStores },
    { label: t("reports.suspendedStores"), value: data.suspendedStores },
    { label: t("reports.totalUsers"), value: data.totalUsers },
    { label: t("reports.totalProducts"), value: data.totalProductsAcrossPlatform },
  ];

  return (
    <div className="space-y-6">
      <PageHeader icon="chart" title={t("reports.title")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <p className="text-[12.5px] text-[var(--sub)] mb-1">{card.label}</p>
            <p className="text-[24px] font-bold text-[var(--blue-deep)]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-[var(--blue-deep)] mb-4">{t("reports.storeDistributionByPackage")}</h2>
        {data.storesByPackage.length === 0 ? (
          <p className="text-[var(--sub)] text-sm">{t("reports.noData")}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("reports.package")}</th>
                  <th>{t("reports.storeCount")}</th>
                </tr>
              </thead>
              <tbody>
                {data.storesByPackage.map((row) => (
                  <tr key={row.packageName}>
                    <td className="font-bold">{row.packageName}</td>
                    <td className="text-[var(--sub)]">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

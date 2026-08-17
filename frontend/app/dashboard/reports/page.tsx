"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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
  pendingStores: number;
  totalUsers: number;
  totalProductsAcrossPlatform: number;
  totalOrders: number;
  totalRevenue: number;
  totalReferrals: number;
  pendingReferralCommissions: number;
  storesByPackage: StoreCountByPackage[];
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/admin/reports/overview");
        setData(res.data.data);
        setGeneratedAt(new Date());
      } catch (err: any) {
        setError(err.response?.data?.message || t("reports.loadError"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const exportCsv = () => {
    if (!data) return;
    const header = `${t("reports.package")},${t("reports.storeCount")},${t("reports.share")}`;
    const total = data.storesByPackage.reduce((s, r) => s + r.count, 0) || 1;
    const rows = data.storesByPackage.map((r) => {
      const share = ((r.count / total) * 100).toFixed(1);
      return `${r.packageName},${r.count},${share}%`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    { label: t("reports.pendingStores"), value: data.pendingStores },
    { label: t("reports.totalUsers"), value: data.totalUsers },
    { label: t("reports.totalProducts"), value: data.totalProductsAcrossPlatform },
    { label: t("reports.totalOrders"), value: data.totalOrders },
    { label: t("reports.totalRevenue"), value: `${data.totalRevenue.toLocaleString("ar-SA-u-nu-latn")} ${t("reports.sar")}` },
    { label: t("reports.totalReferrals"), value: data.totalReferrals },
    { label: t("reports.pendingCommissions"), value: `${data.pendingReferralCommissions.toLocaleString("ar-SA-u-nu-latn")} ${t("reports.sar")}` },
  ];

  const packageTotal = data.storesByPackage.reduce((s, r) => s + r.count, 0) || 1;

  return (
    <div className="space-y-6">
      <PageHeader icon="chart" title={t("reports.title")}>
        <div className="flex items-center gap-3 flex-wrap">
          {generatedAt && (
            <p className="text-[12px] text-[var(--sub)]">
              {t("reports.generatedAt")}: {generatedAt.toLocaleString("ar-SA-u-nu-latn")}
            </p>
          )}
          <button type="button" onClick={exportCsv} className="btn btn-outline btn-sm">
            {t("reports.exportCsv")}
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <p className="text-[12.5px] text-[var(--sub)] mb-1">{card.label}</p>
            <p className="text-[22px] font-bold text-[var(--blue-deep)] leading-tight">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[var(--blue-deep)]">{t("reports.storeDistributionByPackage")}</h2>
          <button type="button" onClick={exportCsv} className="text-[12px] text-[var(--blue)] hover:underline">
            {t("reports.exportCsv")}
          </button>
        </div>
        {data.storesByPackage.length === 0 ? (
          <p className="text-[var(--sub)] text-sm">{t("reports.noData")}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("reports.package")}</th>
                  <th>{t("reports.storeCount")}</th>
                  <th>{t("reports.share")}</th>
                </tr>
              </thead>
              <tbody>
                {data.storesByPackage.map((row) => {
                  const share = ((row.count / packageTotal) * 100).toFixed(1);
                  return (
                    <tr key={row.packageName}>
                      <td className="font-bold">{row.packageName}</td>
                      <td className="text-[var(--sub)]">{row.count}</td>
                      <td className="min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: "var(--blue)" }} />
                          </div>
                          <span className="text-[12px] text-[var(--sub)] whitespace-nowrap">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-[var(--blue-deep)] mb-4">{t("reports.quickLinks")}</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/stores" className="btn btn-outline btn-sm">{t("reports.allStores")}</Link>
          <Link href="/dashboard/users" className="btn btn-outline btn-sm">{t("reports.allUsers")}</Link>
          <Link href="/dashboard/admin-referrals" className="btn btn-outline btn-sm">{t("reports.adminReferrals")}</Link>
          <Link href="/dashboard/admin-verifications" className="btn btn-outline btn-sm">{t("reports.adminVerifications")}</Link>
        </div>
      </div>
    </div>
  );
}
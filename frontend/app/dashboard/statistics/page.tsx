"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";

interface OrderStatusCount {
  status: string;
  count: number;
}

interface TopSellingProduct {
  productId: number;
  productName: string;
  totalQuantitySold: number;
}

interface TopBuyingCustomer {
  name: string;
  phone: string;
  totalSpent: number;
  ordersCount: number;
}

interface DashboardStats {
  totalSales: number;
  ordersCountByStatus: OrderStatusCount[];
  topSellingProducts: TopSellingProduct[];
  topBuyingCustomers: TopBuyingCustomer[];
}

const statusStyles: Record<string, string> = {
  New: "badge badge--blue",
  PendingPayment: "badge badge--orange",
  Processing: "badge badge--yellow",
  Shipped: "badge badge--gray",
  Delivered: "badge badge--green",
  Returned: "badge badge--red",
};

import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";

export default function StatisticsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState("daily");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const statusLabels: Record<string, string> = {
    New: t("statistics.statusNew"),
    PendingPayment: t("statistics.statusPendingPayment"),
    Processing: t("statistics.statusProcessing"),
    Shipped: t("statistics.statusShipped"),
    Delivered: t("statistics.statusDelivered"),
    Returned: t("statistics.statusReturned"),
  };

  const periodOptions: { value: string; label: string }[] = [
    { value: "daily", label: t("statistics.periodDaily") },
    { value: "monthly", label: t("statistics.periodMonthly") },
    { value: "yearly", label: t("statistics.periodYearly") },
  ];

  const fetchStats = useCallback(async (p: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/owner/dashboard/stats", { params: { period: p } });
      setStats(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("statistics.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchStats(period);
  }, [period, fetchStats]);

  return (
    <div>
      <PageHeader icon="chart" title={t("statistics.title")} />

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <div className="mb-6 max-w-xs">
        <div className="field-shell">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {periodOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && !stats ? (
        <p className="text-[var(--sub)] text-sm py-8 text-center">{t("statistics.loading")}</p>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="wallet" />
                <p className="text-[12.5px] text-[var(--sub)]">{t("statistics.totalSales")}</p>
              </div>
              <p className="text-[22px] font-bold text-[var(--blue-deep)]">
                {stats.totalSales.toLocaleString("ar-SA-u-nu-latn")} {t("statistics.sar")}
              </p>
            </div>

            <div className="card p-5">
              <p className="text-[12.5px] text-[var(--sub)] mb-3">{t("statistics.ordersByStatus")}</p>
              {stats.ordersCountByStatus.length === 0 ? (
                <p className="text-[var(--sub)] text-sm">{t("statistics.noOrdersInPeriod")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stats.ordersCountByStatus.map((s) => (
                    <span
                      key={s.status}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-bold ${
                        statusStyles[s.status] ?? "text-[var(--sub)] bg-[#F1F2F4]"
                      }`}
                    >
                      {statusLabels[s.status] ?? s.status}: {s.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card overflow-hidden">
              <h2 className="text-[14px] font-bold text-[var(--blue-deep)] p-5 pb-3">
                {t("statistics.topSellingProducts")}
              </h2>
              {stats.topSellingProducts.length === 0 ? (
                <p className="p-5 pt-0 text-[var(--sub)] text-sm">{t("statistics.noData")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                      <tr>
                        <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12px]">{t("statistics.product")}</th>
                        <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12px]">
                          {t("statistics.quantitySold")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topSellingProducts.map((p) => (
                        <tr key={p.productId} className="border-b border-[var(--border)]">
                          <td className="p-3 text-[var(--ink)] font-medium">{p.productName}</td>
                          <td className="p-3 text-[var(--ink)]">{p.totalQuantitySold}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card overflow-hidden">
              <h2 className="text-[14px] font-bold text-[var(--blue-deep)] p-5 pb-3">
                {t("statistics.topBuyingCustomers")}
              </h2>
              {stats.topBuyingCustomers.length === 0 ? (
                <p className="p-5 pt-0 text-[var(--sub)] text-sm">{t("statistics.noData")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                      <tr>
                        <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12px]">{t("statistics.customer")}</th>
                        <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12px]">
                          {t("statistics.totalPurchase")}
                        </th>
                        <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12px]">
                          {t("statistics.orderCount")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topBuyingCustomers.map((c) => (
                        <tr key={c.phone} className="border-b border-[var(--border)]">
                          <td className="p-3 text-[var(--ink)] font-medium">{c.name}</td>
                          <td className="p-3 text-[var(--ink)]">
                            {c.totalSpent.toLocaleString("ar-SA-u-nu-latn")} {t("statistics.sar")}
                          </td>
                          <td className="p-3 text-[var(--sub)]">{c.ordersCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

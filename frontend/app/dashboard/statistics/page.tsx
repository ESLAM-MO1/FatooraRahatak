"use client";

import { useCallback, useEffect, useState } from "react";
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

const statusLabels: Record<string, string> = {
  New: "جديد",
  Processing: "قيد التجهيز",
  Shipped: "تم الشحن",
  Delivered: "تم التسليم",
  Returned: "مرتجع",
};

const statusStyles: Record<string, string> = {
  New: "text-[var(--blue)] bg-[var(--blue-50)]",
  Processing: "text-[var(--gold-deep)] bg-[var(--gold-soft)]",
  Shipped: "text-[var(--sub)] bg-[#F1F2F4]",
  Delivered: "text-[var(--green)] bg-[var(--green-soft)]",
  Returned: "text-[var(--danger)] bg-[var(--danger-soft)]",
};

const periodOptions: { value: string; label: string }[] = [
  { value: "daily", label: "يومي" },
  { value: "monthly", label: "شهري" },
  { value: "yearly", label: "سنوي" },
];

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="18" height="18">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const alertPath = "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";
const walletPath = "M3 7h15a3 3 0 0 1 3 3v8a1 1 0 0 1-1 1H6a3 3 0 0 1-3-3V7Zm0 0a2 2 0 0 1 2-2h11M16 13h2";

export default function StatisticsPage() {
  const [period, setPeriod] = useState("daily");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async (p: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/owner/dashboard/stats", { params: { period: p } });
      setStats(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل الإحصائيات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(period);
  }, [period, fetchStats]);

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]">الإحصائيات</h1>
      </div>

      {error && (
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

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
        <div className="flex items-center gap-3 text-[var(--sub)]">
          <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
          جاري التحميل...
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon path={walletPath} className="text-[var(--blue-deep)]" />
                <p className="text-[12.5px] text-[var(--sub)]">إجمالي المبيعات</p>
              </div>
              <p className="text-[22px] font-bold text-[var(--blue-deep)]">
                {stats.totalSales.toLocaleString("ar-SA")} ر.س
              </p>
            </div>

            <div className="card p-5">
              <p className="text-[12.5px] text-[var(--sub)] mb-3">عدد الطلبات لكل حالة</p>
              {stats.ordersCountByStatus.length === 0 ? (
                <p className="text-[var(--sub)] text-sm">لا توجد طلبات في هذه الفترة</p>
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
                المنتجات الأكثر مبيعًا
              </h2>
              {stats.topSellingProducts.length === 0 ? (
                <p className="p-5 pt-0 text-[var(--sub)] text-sm">لا توجد بيانات كافية.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                      <tr>
                        <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12px]">المنتج</th>
                        <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12px]">
                          الكمية المباعة
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
                العملاء الأكثر شراءً
              </h2>
              {stats.topBuyingCustomers.length === 0 ? (
                <p className="p-5 pt-0 text-[var(--sub)] text-sm">لا توجد بيانات كافية.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                      <tr>
                        <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12px]">العميل</th>
                        <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12px]">
                          إجمالي الشراء
                        </th>
                        <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12px]">
                          عدد الطلبات
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topBuyingCustomers.map((c) => (
                        <tr key={c.phone} className="border-b border-[var(--border)]">
                          <td className="p-3 text-[var(--ink)] font-medium">{c.name}</td>
                          <td className="p-3 text-[var(--ink)]">
                            {c.totalSpent.toLocaleString("ar-SA")} ر.س
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
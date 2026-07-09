"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

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
        setError(err.response?.data?.message || "حدث خطأ أثناء تحميل التقارير");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--sub)]">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
        جارٍ التحميل...
      </div>
    );
  }

  if (error) {
    return <div className="alert alert--danger">{error}</div>;
  }

  if (!data) return null;

  const cards = [
    { label: "إجمالي المتاجر", value: data.totalStores },
    { label: "المتاجر النشطة", value: data.activeStores },
    { label: "المتاجر المعلّقة", value: data.suspendedStores },
    { label: "إجمالي المستخدمين", value: data.totalUsers },
    { label: "إجمالي المنتجات", value: data.totalProductsAcrossPlatform },
  ];

  return (
    <div dir="rtl" className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--blue-deep)]">التقارير</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <p className="text-[12.5px] text-[var(--sub)] mb-1">{card.label}</p>
            <p className="text-[24px] font-bold text-[var(--blue-deep)]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-[var(--blue-deep)] mb-4">توزيع المتاجر حسب الباقة</h2>
        {data.storesByPackage.length === 0 ? (
          <p className="text-[var(--sub)] text-sm">لا توجد بيانات</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الباقة</th>
                  <th>عدد المتاجر</th>
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
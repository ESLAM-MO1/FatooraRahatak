"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

interface CustomerListItem {
  name: string;
  phone: string;
  email: string | null;
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string;
  isGuest: boolean;
}

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="18" height="18">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const alertPath = "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";
const searchPath = "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/owner/customers");
      setCustomers(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل العملاء");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--sub)]">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
        جاري التحميل...
      </div>
    );
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]">العملاء</h1>
      </div>

      {error && (
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="mb-4 max-w-sm">
        <div className="field-shell">
          <Icon path={searchPath} className="text-[var(--sub)] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الجوال..."
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">
            {search ? "لا توجد نتائج مطابقة." : "لا يوجد عملاء بعد."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الاسم</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الهاتف</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">عدد الطلبات</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">إجمالي المصروف</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">آخر طلب</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.phone}
                    className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors"
                  >
                    <td className="p-4 text-[var(--ink)] font-medium">
                      {customer.name}
                      {customer.isGuest && (
                        <span className="mr-2 px-2 py-0.5 rounded-full text-[10.5px] font-bold text-[var(--gold-deep)] bg-[var(--gold-soft)]">
                          ضيف
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">
                      {customer.phone}
                    </td>
                    <td className="p-4 text-[var(--ink)]">{customer.ordersCount}</td>
                    <td className="p-4 text-[var(--ink)]">
                      {customer.totalSpent.toLocaleString("ar-SA")} ر.س
                    </td>
                    <td className="p-4 text-[var(--sub)]">
                      {new Date(customer.lastOrderDate).toLocaleDateString("ar-SA")}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/dashboard/customers/${encodeURIComponent(customer.phone)}`}
                        className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]"
                      >
                        عرض التفاصيل
                      </Link>
                    </td>
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
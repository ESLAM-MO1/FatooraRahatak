"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

interface CustomerOrder {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  itemsCount: number;
  createdAt: string;
}

interface CustomerDetail {
  name: string;
  phone: string;
  email: string | null;
  isGuest: boolean;
  ordersCount: number;
  totalSpent: number;
  orders: CustomerOrder[];
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

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="18" height="18">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const alertPath = "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";

export default function CustomerDetailPage() {
  const params = useParams();
  const identifier = params.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/owner/customers/${identifier}`);
      setCustomer(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل بيانات العميل");
    } finally {
      setLoading(false);
    }
  }, [identifier]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--sub)]">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
        جاري التحميل...
      </div>
    );
  }

  if (!customer) {
    return (
      <div dir="rtl">
        <Link href="/dashboard/customers" className="text-[var(--blue)] hover:underline text-sm">
          ← العودة للعملاء
        </Link>
        {error && (
          <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mt-4 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div dir="rtl">
      <div className="mb-4">
        <Link href="/dashboard/customers" className="text-[var(--blue)] hover:underline text-sm">
          ← العودة للعملاء
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]">{customer.name}</h1>
        {customer.isGuest && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-[var(--gold-deep)] bg-[var(--gold-soft)]">
            ضيف
          </span>
        )}
      </div>

      {error && (
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-[12.5px] text-[var(--sub)] mb-1">رقم الجوال</p>
          <p className="text-[15px] font-bold text-[var(--ink)]" dir="ltr">
            {customer.phone}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-[12.5px] text-[var(--sub)] mb-1">عدد الطلبات</p>
          <p className="text-[15px] font-bold text-[var(--ink)]">{customer.ordersCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-[12.5px] text-[var(--sub)] mb-1">إجمالي المصروف</p>
          <p className="text-[15px] font-bold text-[var(--blue-deep)]">
            {customer.totalSpent.toLocaleString("ar-SA")} ر.س
          </p>
        </div>
      </div>

      {customer.email && (
        <div className="card p-5 mb-6">
          <p className="text-[12.5px] text-[var(--sub)] mb-1">البريد الإلكتروني</p>
          <p className="text-[15px] text-[var(--ink)]" dir="ltr">
            {customer.email}
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <h2 className="text-[14px] font-bold text-[var(--blue-deep)] p-5 pb-0">السجل الشرائي</h2>
        {customer.orders.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">لا توجد طلبات بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-3">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">رقم الطلب</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">عدد العناصر</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الإجمالي</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الحالة</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">التاريخ</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((order) => (
                  <tr key={order.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium" dir="ltr">
                      {order.orderNumber}
                    </td>
                    <td className="p-4 text-[var(--sub)]">{order.itemsCount}</td>
                    <td className="p-4 text-[var(--ink)]">{order.totalAmount.toLocaleString("ar-SA")} ر.س</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          statusStyles[order.status] ?? "text-[var(--sub)] bg-[#F1F2F4]"
                        }`}
                      >
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--sub)]">
                      {new Date(order.createdAt).toLocaleDateString("ar-SA")}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
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
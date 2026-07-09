"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

interface OrderItem {
  productId: number;
  productNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
  lineTotal: number;
}

interface StatusHistoryItem {
  status: string;
  changedAt: string;
}

interface OrderDetail {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  isGuest: boolean;
  shippingAddress: string;
  notes: string | null;
  status: string;
  subTotal: number;
  discountAmount: number;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  statusHistory: StatusHistoryItem[];
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

const statusOptions = ["New", "Processing", "Shipped", "Delivered", "Returned"];

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="18" height="18">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const alertPath = "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";
const checkPath = "M20 6 9 17l-5-5";

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/owner/orders/${id}`);
      setOrder(res.data.data);
      setSelectedStatus(res.data.data.status);
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل الطلب");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleSaveStatus = async () => {
    if (!order || selectedStatus === order.status) return;
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await api.put(`/owner/orders/${id}/status`, { newStatus: selectedStatus });
      setSuccessMessage("تم تحديث حالة الطلب بنجاح");
      await fetchOrder();
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تحديث الحالة");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--sub)]">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
        جاري التحميل...
      </div>
    );
  }

  if (!order) {
    return (
      <div dir="rtl">
        <Link href="/dashboard/orders" className="text-[var(--blue)] hover:underline text-sm">
          ← العودة للطلبات
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
        <Link href="/dashboard/orders" className="text-[var(--blue)] hover:underline text-sm">
          ← العودة للطلبات
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]" dir="ltr">
          {order.orderNumber}
        </h1>
        <span
          className={`px-3 py-1.5 rounded-full text-[12px] font-bold ${
            statusStyles[order.status] ?? "text-[var(--sub)] bg-[#F1F2F4]"
          }`}
        >
          {statusLabels[order.status] ?? order.status}
        </span>
      </div>

      {error && (
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-[var(--green-soft)] text-[var(--green)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={checkPath} className="shrink-0 mt-0.5" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">بيانات العميل</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--sub)]">الاسم: </span>
              <span className="text-[var(--ink)] font-medium">{order.customerName}</span>
              {order.isGuest && (
                <span className="mr-2 px-2 py-0.5 rounded-full text-[10.5px] font-bold text-[var(--gold-deep)] bg-[var(--gold-soft)]">
                  ضيف
                </span>
              )}
            </p>
            {order.customerPhone && (
              <p>
                <span className="text-[var(--sub)]">الجوال: </span>
                <span className="text-[var(--ink)]" dir="ltr">{order.customerPhone}</span>
              </p>
            )}
            {order.customerEmail && (
              <p>
                <span className="text-[var(--sub)]">البريد الإلكتروني: </span>
                <span className="text-[var(--ink)]" dir="ltr">{order.customerEmail}</span>
              </p>
            )}
            <p>
              <span className="text-[var(--sub)]">تاريخ الطلب: </span>
              <span className="text-[var(--ink)]">
                {new Date(order.createdAt).toLocaleString("ar-SA")}
              </span>
            </p>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">الشحن والملاحظات</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--sub)]">عنوان الشحن: </span>
              <span className="text-[var(--ink)]">{order.shippingAddress}</span>
            </p>
            {order.notes && (
              <p>
                <span className="text-[var(--sub)]">ملاحظات: </span>
                <span className="text-[var(--ink)]">{order.notes}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden mb-6">
        <h2 className="text-[14px] font-bold text-[var(--blue-deep)] p-5 pb-0">عناصر الطلب</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-3">
            <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
              <tr>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">المنتج</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الكمية</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">سعر الوحدة</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-[var(--border)]">
                  <td className="p-4 text-[var(--ink)] font-medium">{item.productNameSnapshot}</td>
                  <td className="p-4 text-[var(--sub)]">{item.quantity}</td>
                  <td className="p-4 text-[var(--sub)]">{item.unitPriceSnapshot.toLocaleString("ar-SA")} ر.س</td>
                  <td className="p-4 text-[var(--ink)] font-medium">{item.lineTotal.toLocaleString("ar-SA")} ر.س</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-5 space-y-1.5 border-t border-[var(--border)] max-w-xs mr-auto text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--sub)]">الإجمالي الفرعي</span>
            <span className="text-[var(--ink)]">{order.subTotal.toLocaleString("ar-SA")} ر.س</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--sub)]">الخصم</span>
              <span className="text-[var(--green)]">− {order.discountAmount.toLocaleString("ar-SA")} ر.س</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border)]">
            <span className="text-[var(--ink)] font-bold">الإجمالي</span>
            <span className="text-[var(--blue-deep)] font-bold text-[16px]">
              {order.totalAmount.toLocaleString("ar-SA")} ر.س
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">سجل الحالات</h2>
          <div className="space-y-3">
            {order.statusHistory.map((h, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    statusStyles[h.status] ?? "text-[var(--sub)] bg-[#F1F2F4]"
                  }`}
                >
                  {statusLabels[h.status] ?? h.status}
                </span>
                <span className="text-[var(--sub)] text-[12.5px]">
                  {new Date(h.changedAt).toLocaleString("ar-SA")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">تغيير الحالة</h2>
          <div className="field-shell mb-3">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSaveStatus}
            disabled={saving || selectedStatus === order.status}
            className="btn-primary w-full disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ الحالة"}
          </button>
        </div>
      </div>
    </div>
  );
}
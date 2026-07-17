"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import LoadingState from "@/components/LoadingState";

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

const statusStyles: Record<string, string> = {
  New: "badge badge--blue",
  Processing: "badge badge--yellow",
  Shipped: "badge badge--gray",
  Delivered: "badge badge--green",
  Returned: "badge badge--red",
};

const statusOptions = ["New", "Processing", "Shipped", "Delivered", "Returned"];

export default function OrderDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id as string;

  const statusLabel = (status: string) => {
    switch (status) {
      case "New": return t("orderDetail.statusNew");
      case "Processing": return t("orderDetail.statusProcessing");
      case "Shipped": return t("orderDetail.statusShipped");
      case "Delivered": return t("orderDetail.statusDelivered");
      case "Returned": return t("orderDetail.statusReturned");
      default: return status;
    }
  };

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
      setError(err.response?.data?.message || t("orderDetail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

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
      setSuccessMessage(t("orderDetail.updateSuccess"));
      await fetchOrder();
    } catch (err: any) {
      setError(err.response?.data?.message || t("orderDetail.updateError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!order) {
    return (
      <div>
        <Link href="/dashboard/orders" className="text-[var(--blue)] hover:underline text-sm">
          {t("orderDetail.backToList")}
        </Link>
        {error && <div className="alert alert--danger mt-4">{error}</div>}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/dashboard/orders" className="text-[var(--blue)] hover:underline text-sm">
          {t("orderDetail.backToList")}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]" dir="ltr">
          {order.orderNumber}
        </h1>
        <span className={statusStyles[order.status] ?? "badge badge--gray"}>
          {statusLabel(order.status)}
        </span>
      </div>

      {error && <div className="alert alert--danger mb-4">{error}</div>}
      {successMessage && <div className="alert alert--success mb-4">{successMessage}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">{t("orderDetail.customerInfo")}</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--sub)]">{t("orderDetail.name")}: </span>
              <span className="text-[var(--ink)] font-medium">{order.customerName}</span>
              {order.isGuest && (
                <span className="mr-2 badge badge--yellow">{t("orderDetail.guest")}</span>
              )}
            </p>
            {order.customerPhone && (
              <p>
                <span className="text-[var(--sub)]">{t("orderDetail.phone")}: </span>
                <span className="text-[var(--ink)]" dir="ltr">{order.customerPhone}</span>
              </p>
            )}
            {order.customerEmail && (
              <p>
                <span className="text-[var(--sub)]">{t("orderDetail.email")}: </span>
                <span className="text-[var(--ink)]" dir="ltr">{order.customerEmail}</span>
              </p>
            )}
            <p>
              <span className="text-[var(--sub)]">{t("orderDetail.orderDate")}: </span>
              <span className="text-[var(--ink)]">
                {new Date(order.createdAt).toLocaleString("ar-SA")}
              </span>
            </p>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">{t("orderDetail.shippingNotes")}</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--sub)]">{t("orderDetail.shippingAddress")}: </span>
              <span className="text-[var(--ink)]">{order.shippingAddress}</span>
            </p>
            {order.notes && (
              <p>
                <span className="text-[var(--sub)]">{t("orderDetail.notes")}: </span>
                <span className="text-[var(--ink)]">{order.notes}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden mb-6">
        <h2 className="text-[14px] font-bold text-[var(--blue-deep)] p-5 pb-0">{t("orderDetail.orderItems")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-3">
            <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
              <tr>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("orderDetail.productCol")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("orderDetail.qtyCol")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("orderDetail.unitPriceCol")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("orderDetail.totalCol")}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-[var(--border)]">
                  <td className="p-4 text-[var(--ink)] font-medium">{item.productNameSnapshot}</td>
                  <td className="p-4 text-[var(--sub)]">{item.quantity}</td>
                  <td className="p-4 text-[var(--sub)]">{item.unitPriceSnapshot.toLocaleString("ar-SA")} {t("common.sar")}</td>
                  <td className="p-4 text-[var(--ink)] font-medium">{item.lineTotal.toLocaleString("ar-SA")} {t("common.sar")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-5 space-y-1.5 border-t border-[var(--border)] max-w-xs mr-auto text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--sub)]">{t("orderDetail.subtotal")}</span>
            <span className="text-[var(--ink)]">{order.subTotal.toLocaleString("ar-SA")} {t("common.sar")}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--sub)]">{t("orderDetail.discount")}</span>
              <span className="text-[var(--green)]">− {order.discountAmount.toLocaleString("ar-SA")} {t("common.sar")}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border)]">
            <span className="text-[var(--ink)] font-bold">{t("orderDetail.total")}</span>
            <span className="text-[var(--blue-deep)] font-bold text-[16px]">
              {order.totalAmount.toLocaleString("ar-SA")} {t("common.sar")}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">{t("orderDetail.statusHistory")}</h2>
          <div className="space-y-3">
            {order.statusHistory.map((h, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className={statusStyles[h.status] ?? "badge badge--gray"}>
                  {statusLabel(h.status)}
                </span>
                <span className="text-[var(--sub)] text-[12.5px]">
                  {new Date(h.changedAt).toLocaleString("ar-SA")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">{t("orderDetail.changeStatus")}</h2>
          <div className="field-shell mb-3">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSaveStatus}
            disabled={saving || selectedStatus === order.status}
            className="btn btn-primary w-full disabled:opacity-60"
          >
            {saving ? t("common.saving") : t("orderDetail.saveStatus")}
          </button>
        </div>
      </div>
    </div>
  );
}

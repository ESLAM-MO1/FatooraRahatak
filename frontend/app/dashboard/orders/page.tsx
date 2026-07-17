"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

interface OrderListItem {
  id: number;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  itemsCount: number;
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  New: "badge badge--blue",
  Processing: "badge badge--yellow",
  Shipped: "badge badge--gray",
  Delivered: "badge badge--green",
  Returned: "badge badge--red",
};

const statusOptions = ["New", "Processing", "Shipped", "Delivered", "Returned"];

export default function OrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      New: t("order.statusNew"),
      Processing: t("order.statusProcessing"),
      Shipped: t("order.statusShipped"),
      Delivered: t("order.statusDelivered"),
      Returned: t("order.statusReturned"),
    };
    return map[status] ?? status;
  };

  const fetchOrders = useCallback(async (status: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/owner/orders", {
        params: status ? { status } : undefined,
      });
      setOrders(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("order.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchOrders(statusFilter);
  }, [statusFilter, fetchOrders]);

  if (loading && orders.length === 0) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader icon="receipt" title={t("order.title")} />

      {error && <div className="alert alert--danger">{error}</div>}

      <div className="mb-4 max-w-xs">
        <div className="field-shell">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t("order.allStatuses")}</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {orders.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("order.noResults")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("order.number")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("order.customer")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("order.total")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("order.status")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("order.date")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("order.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium" dir="ltr">
                      {order.orderNumber}
                    </td>
                    <td className="p-4 text-[var(--ink)]">{order.customerName}</td>
                    <td className="p-4 text-[var(--ink)]">{order.totalAmount.toLocaleString("ar-SA")} {t("common.sar")}</td>
                    <td className="p-4">
                      <span className={statusStyles[order.status] ?? "badge badge--gray"}>
                        {statusLabel(order.status)}
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
                        {t("order.viewDetails")}
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

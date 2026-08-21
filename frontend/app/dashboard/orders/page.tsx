"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import Pagination from "@/components/Pagination";
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
  PendingPayment: "badge badge--orange",
  Processing: "badge badge--yellow",
  Shipped: "badge badge--gray",
  Delivered: "badge badge--green",
  Returned: "badge badge--red",
  Cancelled: "badge badge--red",
  PendingRefund: "badge badge--orange",
};

const statusOptions = [
  "New",
  "PendingPayment",
  "Processing",
  "Shipped",
  "Delivered",
  "Returned",
  "Cancelled",
  "PendingRefund",
];

export default function OrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      New: t("order.statusNew"),
      PendingPayment: t("order.statusPendingPayment"),
      Processing: t("order.statusProcessing"),
      Shipped: t("order.statusShipped"),
      Delivered: t("order.statusDelivered"),
      Returned: t("order.statusReturned"),
      Cancelled: t("order.statusCancelled"),
      PendingRefund: t("order.statusPendingRefund"),
    };
    return map[status] ?? status;
  };

  const fetchOrders = useCallback(async (status: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/owner/orders", {
        params: { page, pageSize, ...(status ? { status } : {}) },
      });
      setOrders(res.data.data.items || []);
      setTotalPages(res.data.data.totalPages || 1);
      setTotalCount(res.data.data.totalCount || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || t("order.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t, page, pageSize]);

  useEffect(() => {
    fetchOrders(statusFilter);
  }, [statusFilter, fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

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
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm hidden md:table">
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
                    <td className="p-4 text-[var(--ink)]">{order.totalAmount.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}</td>
                    <td className="p-4">
                      <span className={statusStyles[order.status] ?? "badge badge--gray"}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--sub)]">
                      {new Date(order.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}
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
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="card p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("order.number")}</p>
                    <p className="text-[var(--ink)] font-medium" dir="ltr">{order.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("order.customer")}</p>
                    <p className="text-[var(--ink)]">{order.customerName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("order.total")}</p>
                    <p className="text-[var(--ink)]">{order.totalAmount.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("order.status")}</p>
                    <span className={statusStyles[order.status] ?? "badge badge--gray"}>
                      {statusLabel(order.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("order.date")}</p>
                    <p className="text-[var(--sub)]">
                      {new Date(order.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[12px]"
                  >
                    {t("order.viewDetails")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

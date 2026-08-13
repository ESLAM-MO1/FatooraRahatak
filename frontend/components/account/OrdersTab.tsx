"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { customerApi } from "@/lib/customerApi";

export interface CustomerOrder {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  canCancel: boolean;
}

const STATUS_KEYS: Record<string, string> = {
  New: "account.statusNew",
  PendingPayment: "account.statusPendingPayment",
  Processing: "account.statusProcessing",
  Shipped: "account.statusShipped",
  Delivered: "account.statusDelivered",
  Cancelled: "account.statusCancelled",
  Returned: "account.statusReturned",
};

const STATUS_COLORS: Record<string, string> = {
  New: "#2563EB",
  PendingPayment: "#D97706",
  Processing: "#7C3AED",
  Shipped: "#D97706",
  Delivered: "#16A34A",
  Cancelled: "#DC2626",
  Returned: "#64748B",
};

interface Props {
  slug: string;
  token: string;
  orders: CustomerOrder[];
  loading: boolean;
  error: string;
  onRefresh: () => Promise<void>;
  onMessage: (msg: string) => void;
}

export default function OrdersTab({ slug, token, orders, loading, error, onRefresh, onMessage }: Props) {
  const { t } = useTranslation();
  const [cancelTarget, setCancelTarget] = useState<CustomerOrder | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError("");
    try {
      await customerApi(
        `/public/stores/${slug}/customer/orders/${cancelTarget.orderNumber}/cancel`,
        token,
        { method: "POST" }
      );
      onMessage(t("account.cancelSuccess"));
      setCancelTarget(null);
      await onRefresh();
    } catch (err: any) {
      setCancelError(err?.message || t("account.cancelError"));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500 text-sm py-8 text-center">{t("common.loading")}</p>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 p-8 text-center">
        <p className="text-gray-500 mb-2">{t("account.noOrders")}</p>
        <p className="text-sm text-gray-400 mb-4">{t("account.noOrdersHint")}</p>
        <a href={`/store/${slug}`} className="store-btn inline-block text-sm">
          {t("account.browseProducts")}
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <a
                href={`/store/${slug}/orders/${order.orderNumber}`}
                className="font-bold text-sm text-gray-900 hover:text-blue-600"
              >
                {order.orderNumber}
              </a>
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: STATUS_COLORS[order.status] || "#6B7280" }}
              >
                {t(STATUS_KEYS[order.status] || order.status)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <div className="text-gray-500">
                <span>{t("account.orderItems")}: {order.itemCount}</span>
                <span className="mx-2">•</span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-900">{order.totalAmount.toFixed(2)} ر.س</span>
                {order.canCancel && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancelTarget(order);
                      setCancelError("");
                    }}
                    className="text-[12px] font-bold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50"
                  >
                    {t("account.cancelOrder")}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {cancelTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.5)" }}
          onClick={() => setCancelTarget(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold mb-2" style={{ color: "#0F172A" }}>
              {t("account.cancelConfirmTitle")}
            </h3>
            <p className="text-[13px] text-gray-500 mb-1">
              {t("account.cancelConfirmMessage", { orderNumber: cancelTarget.orderNumber })}
            </p>
            <p className="text-[12px] text-gray-400 mb-4">{t("account.cancelHint")}</p>
            {cancelError && <p className="text-[12px] text-red-600 mb-3">{cancelError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancel}
                className="flex-1 rounded-lg py-2.5 text-[13px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
              >
                {cancelling ? t("common.loading") : t("account.cancelConfirm")}
              </button>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="flex-1 rounded-lg py-2.5 text-[13px] font-bold border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

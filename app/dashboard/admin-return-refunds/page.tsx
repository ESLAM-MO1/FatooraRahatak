"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";

interface ManualRefund {
  id: number;
  orderId: number;
  orderNumber: string;
  storeName: string;
  refundAmount: number | null;
  refundStatus: string | null;
  decidedAt: string | null;
  manualRefundConfirmedAt: string | null;
  manualRefundConfirmedByName: string | null;
}

export default function AdminReturnRefundsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ManualRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/return-refunds");
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const confirm = async (id: number) => {
    setConfirmingId(id);
    try {
      await api.post(`/admin/return-refunds/${id}/confirm`);
      await load();
    } finally {
      setConfirmingId(null);
    }
  };

  if (loading) return <div className="p-6">...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-4">{t("nav.manualRefunds")}</h1>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 text-right">{t("order.orderNumber")}</th>
              <th className="p-3 text-right">{t("nav.stores")}</th>
              <th className="p-3 text-right">{t("order.returnReasonLabel")}</th>
              <th className="p-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.orderNumber}</td>
                <td className="p-3">{r.storeName}</td>
                <td className="p-3">{r.refundAmount?.toFixed(2)}</td>
                <td className="p-3">
                  {r.manualRefundConfirmedAt ? (
                    <span className="text-green-600 text-xs">{r.manualRefundConfirmedByName}</span>
                  ) : (
                    <button
                      onClick={() => confirm(r.id)}
                      disabled={confirmingId === r.id}
                      className="px-3 py-1 bg-[var(--theme)] text-white rounded-md text-xs disabled:opacity-50"
                    >
                      {confirmingId === r.id ? "..." : t("common.confirm")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-gray-400">{t("common.noData")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

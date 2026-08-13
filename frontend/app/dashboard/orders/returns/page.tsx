"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import Can from "@/components/Can";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

interface ReturnRequest {
  id: number;
  orderId: number;
  orderNumber: string;
  customerName: string | null;
  guestPhone: string | null;
  orderTotal: number;
  reason: string;
  status: string;
  decisionNote: string | null;
  refundAmount: number | null;
  refundStatus: string | null;
  createdAt: string;
  decidedAt: string | null;
}

const statusStyles: Record<string, string> = {
  Pending: "badge badge--yellow",
  Approved: "badge badge--green",
  Rejected: "badge badge--red",
};

export default function ReturnsPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      Pending: t("returns.statusPending"),
      Approved: t("returns.statusApproved"),
      Rejected: t("returns.statusRejected"),
    };
    return map[status] ?? status;
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/owner/orders/returns");
      setRequests(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("returns.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleDecision = async (requestId: number, approve: boolean) => {
    setProcessingId(requestId);
    setError("");
    setSuccessMessage("");
    try {
      await api.post(`/owner/orders/returns/${requestId}/handle`, {
        approve,
        note: note.trim() || null,
      });
      setSuccessMessage(
        approve ? t("returns.approveSuccess") : t("returns.rejectSuccess")
      );
      setNote("");
      await fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || t("returns.handleError"));
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && requests.length === 0) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader icon="receipt" title={t("returns.title")} />

      {error && <div className="alert alert--danger">{error}</div>}
      <SuccessToast message={successMessage} fixed className="mb-4" />

      <div className="card overflow-hidden">
        {requests.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("returns.noResults")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("returns.orderNumber")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("returns.customer")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("returns.total")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("returns.reason")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("returns.status")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("returns.date")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("returns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium" dir="ltr">
                      <Link href={`/dashboard/orders/${r.orderId}`} className="text-[var(--blue)] hover:underline">
                        {r.orderNumber}
                      </Link>
                    </td>
                    <td className="p-4 text-[var(--ink)]">
                      {r.customerName || r.guestPhone || "—"}
                    </td>
                    <td className="p-4 text-[var(--ink)]">
                      {r.orderTotal.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
                    </td>
                    <td className="p-4 text-[var(--sub)] max-w-[200px]">
                      <span className="block truncate" title={r.reason}>{r.reason}</span>
                    </td>
                    <td className="p-4">
                      <span className={statusStyles[r.status] ?? "badge badge--gray"}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--sub)]">
                      {new Date(r.createdAt).toLocaleString("ar-SA-u-nu-latn")}
                    </td>
                    <td className="p-4">
                      {r.status === "Pending" ? (
                        <Can code="Orders.Edit">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDecision(r.id, true)}
                              disabled={processingId === r.id}
                              className="btn btn-sm btn-primary disabled:opacity-60"
                            >
                              {processingId === r.id ? t("common.saving") : t("returns.approve")}
                            </button>
                            <button
                              onClick={() => handleDecision(r.id, false)}
                              disabled={processingId === r.id}
                              className="btn btn-sm btn-outline disabled:opacity-60"
                            >
                              {t("returns.reject")}
                            </button>
                          </div>
                        </Can>
                      ) : (
                        <span className="text-[var(--sub)] text-[12.5px]">
                          {r.decisionNote || "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-5 mt-4">
        <label className="block text-[13px] font-bold text-[var(--blue-deep)] mb-2">
          {t("returns.decisionNote")}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="field-shell"
          placeholder={t("returns.decisionNotePlaceholder")}
        />
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import Can from "@/components/Can";

interface StockTransfer {
  id: number;
  fromWarehouseName: string;
  toWarehouseName: string;
  status: string;
  itemsCount: number;
  createdAt: string;
  completedAt: string | null;
}

const statusStyles: Record<string, string> = {
  Pending: "badge badge--yellow",
  Approved: "badge badge--green",
  Rejected: "badge badge--red",
};

export default function TransfersPage() {
  const { t } = useTranslation();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      Pending: t("transfers.statusPending"),
      Approved: t("transfers.statusApproved"),
      Rejected: t("transfers.statusRejected"),
    };
    return map[status] ?? status;
  };

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/inventory/transfers");
      setTransfers(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("transfers.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    setError("");
    setSuccessMessage("");
    try {
      await api.put(`/inventory/transfer/${id}/approve`);
      setSuccessMessage(t("transfers.approveSuccess"));
      await fetchTransfers();
    } catch (err: any) {
      setError(err.response?.data?.message || t("transfers.handleError"));
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && transfers.length === 0) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader icon="layers" title={t("transfers.title")} />

      {error && <div className="alert alert--danger">{error}</div>}
      <SuccessToast message={successMessage} fixed className="mb-4" />

      <div className="card overflow-hidden">
        {transfers.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("transfers.noResults")}</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm hidden md:table">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("transfers.from")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("transfers.to")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("transfers.itemsCount")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("transfers.status")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("transfers.date")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("transfers.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((tr) => (
                  <tr key={tr.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium">{tr.fromWarehouseName}</td>
                    <td className="p-4 text-[var(--ink)] font-medium">{tr.toWarehouseName}</td>
                    <td className="p-4 text-[var(--sub)]">{tr.itemsCount}</td>
                    <td className="p-4">
                      <span className={statusStyles[tr.status] ?? "badge badge--gray"}>
                        {statusLabel(tr.status)}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--sub)]">
                      {new Date(tr.createdAt).toLocaleString("ar-SA-u-nu-latn")}
                    </td>
                    <td className="p-4">
                      {tr.status === "Pending" && (
                        <Can code="StockTransfer.Approve">
                          <button
                            onClick={() => handleApprove(tr.id)}
                            disabled={processingId === tr.id}
                            className="btn btn-sm btn-primary disabled:opacity-60"
                          >
                            {processingId === tr.id ? t("common.saving") : t("transfers.approve")}
                          </button>
                        </Can>
                      )}
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {transfers.map((tr) => (
                <div key={tr.id} className="card p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("transfers.from")}</p>
                      <p className="text-[12px] text-[var(--ink)] font-medium">{tr.fromWarehouseName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("transfers.to")}</p>
                      <p className="text-[12px] text-[var(--ink)] font-medium">{tr.toWarehouseName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("transfers.itemsCount")}</p>
                      <p className="text-[12px] text-[var(--sub)]">{tr.itemsCount}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("transfers.status")}</p>
                      <span className={statusStyles[tr.status] ?? "badge badge--gray"}>
                        {statusLabel(tr.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("transfers.date")}</p>
                      <p className="text-[12px] text-[var(--sub)]">{new Date(tr.createdAt).toLocaleString("ar-SA-u-nu-latn")}</p>
                    </div>
                  </div>
                  {tr.status === "Pending" && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <Can code="StockTransfer.Approve">
                        <button
                          onClick={() => handleApprove(tr.id)}
                          disabled={processingId === tr.id}
                          className="btn btn-sm btn-primary disabled:opacity-60"
                        >
                          {processingId === tr.id ? t("common.saving") : t("transfers.approve")}
                        </button>
                      </Can>
                    </div>
                  )}
                </div>
              ))}
            </div>
            </>
          )}
      </div>
    </div>
  );
}

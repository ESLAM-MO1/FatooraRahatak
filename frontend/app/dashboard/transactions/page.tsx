"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

interface Transaction {
  id: number;
  paymentReference: string;
  amount: number;
  currency: string;
  status: string;
  providerPaymentId: string | null;
  invoiceId: number | null;
  orderId: number | null;
  subscriptionId: number | null;
  paidAt: string | null;
  failedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  Paid: "badge badge--green",
  Pending: "badge badge--yellow",
  Failed: "badge badge--red",
  Refunded: "badge badge--gray",
};

const statusOptions = ["", "Pending", "Paid", "Failed", "Refunded"];

export default function TransactionsPage() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      Pending: t("payment.statusPending"),
      Paid: t("payment.statusPaid"),
      Failed: t("payment.statusFailed"),
      Refunded: t("payment.statusRefunded"),
    };
    return map[status] ?? status;
  };

  const fetchTransactions = useCallback(async (status: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/owner/payments", {
        params: status ? { status } : undefined,
      });
      setTransactions(res.data.data.items || []);
    } catch (err: any) {
      setError(err.response?.data?.message || t("payment.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchTransactions(statusFilter);
  }, [statusFilter, fetchTransactions]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-SA-u-nu-latn", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && transactions.length === 0) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader icon="credit-card" title={t("payment.transactionsTitle")} />

      {error && <div className="alert alert--danger">{error}</div>}

      <div className="mb-4 max-w-xs">
        <div className="field-shell">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t("payment.allStatuses")}</option>
            {statusOptions.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-[var(--sub)]">{t("payment.noTransactions")}</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
              <tr>
                <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("payment.reference")}</th>
                <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("payment.amount")}</th>
                <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("payment.status")}</th>
                <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("payment.date")}</th>
                <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("payment.source")}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                  <td className="p-3 text-[var(--ink)] font-mono text-[12px]" dir="ltr">
                    {tx.paymentReference}
                  </td>
                  <td className="p-3 text-[var(--ink)] font-medium">
                    {tx.amount.toLocaleString("ar-SA-u-nu-latn")} {tx.currency}
                  </td>
                  <td className="p-3">
                    <span className={statusStyles[tx.status] || "badge badge--gray"}>
                      {statusLabel(tx.status)}
                    </span>
                  </td>
                  <td className="p-3 text-[var(--sub)] whitespace-nowrap">
                    {formatDate(tx.paidAt || tx.failedAt || tx.createdAt)}
                  </td>
                  <td className="p-3 text-[var(--sub)]">
                    {tx.invoiceId && t("payment.sourceInvoice")}
                    {tx.orderId && t("payment.sourceOrder")}
                    {tx.subscriptionId && t("payment.sourceSubscription")}
                    {!tx.invoiceId && !tx.orderId && !tx.subscriptionId && "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

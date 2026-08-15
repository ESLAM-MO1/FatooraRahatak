"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { usePackageFeature } from "@/lib/usePackageFeatures";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import RestrictedFeatureState from "@/components/RestrictedFeatureState";
import Can from "@/components/Can";
import Pagination from "@/components/Pagination";

interface InvoiceRow {
  id: number;
  invoiceType: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: number | null;
  partyName: string | null;
  paymentMethod: string;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  journalEntryId: number | null;
  journalEntryNumber: string | null;
}

const typeStyles: Record<string, string> = {
  Sales: "badge badge--green",
  Purchase: "badge badge--blue",
};

export default function InvoicesPage() {
  const { t } = useTranslation();
  const gate = usePackageFeature("hasAccountingFull");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoiceType, setInvoiceType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const typeLabels: Record<string, string> = {
    Sales: t("invoice.sales"),
    Purchase: t("invoice.purchase"),
  };

  const paymentLabels: Record<string, string> = {
    Cash: t("invoice.paymentCash"),
    Credit: t("invoice.paymentCredit"),
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, any> = { page, pageSize };
      if (invoiceType) params.invoiceType = invoiceType;
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.get("/invoices", { params });
      setInvoices(res.data.data.items || []);
      setTotalPages(res.data.data.totalPages || 1);
      setTotalCount(res.data.data.totalCount || 0);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t("invoice.loadError"));
    } finally {
      setLoading(false);
    }
  }, [invoiceType, from, to, page, pageSize, t]);

  useEffect(() => {
    if (!gate.ready || !gate.allowed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData, gate.ready, gate.allowed]);

  useEffect(() => {
    setPage(1);
  }, [invoiceType, from, to]);

  if (!gate.ready) {
    return <LoadingState />;
  }

  if (!gate.allowed) {
    return <RestrictedFeatureState />;
  }

  return (
    <div>
      <PageHeader icon="receipt" title={t("invoice.title")}>
        <Can code="Invoices.Add">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/accounting/invoices/new-purchase" className="btn btn-secondary">
              <Icon name="plus" />
              {t("invoice.newPurchase")}
            </Link>
            <Link href="/dashboard/accounting/invoices/new-sale" className="btn btn-primary">
              <Icon name="plus" />
              {t("invoice.newSale")}
            </Link>
          </div>
        </Can>
      </PageHeader>

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("invoice.type")}</label>
          <div className="field-shell">
            <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
              <option value="">{t("common.all")}</option>
              <option value="Sales">{t("invoice.sales")}</option>
              <option value="Purchase">{t("invoice.purchase")}</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("invoice.fromDate")}</label>
          <div className="field-shell">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("invoice.toDate")}</label>
          <div className="field-shell">
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {(invoiceType || from || to) && (
          <button
            onClick={() => {
              setInvoiceType("");
              setFrom("");
              setTo("");
            }}
            className="text-[12.5px] text-[var(--blue)] hover:underline mb-2"
          >
            {t("invoice.clearFilters")}
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : invoices.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("invoice.noInvoices")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.number")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.invoiceType")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.date")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.party")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.paymentMethod")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.total")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.relatedEntry")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors"
                  >
                    <td className="p-4">
                      <Link
                        href={`/dashboard/accounting/invoices/${inv.id}`}
                        className="text-[var(--blue)] font-bold hover:underline"
                        dir="ltr"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="p-4">
                      <span className={typeStyles[inv.invoiceType] ?? "badge badge--gray"}>
                        {typeLabels[inv.invoiceType] ?? inv.invoiceType}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--ink)]">{inv.invoiceDate}</td>
                    <td className="p-4 text-[var(--sub)]">{inv.partyName || "—"}</td>
                    <td className="p-4 text-[var(--sub)]">
                      {paymentLabels[inv.paymentMethod] ?? inv.paymentMethod}
                    </td>
                    <td className="p-4 text-[var(--ink)] font-medium" dir="ltr">
                      {inv.totalAmount.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
                    </td>
                    <td className="p-4">
                      {inv.journalEntryId ? (
                        <Link
                          href={`/dashboard/accounting/journal-entries/${inv.journalEntryId}`}
                          className="text-[var(--blue)] hover:underline text-[12.5px]"
                          dir="ltr"
                        >
                          {inv.journalEntryNumber}
                        </Link>
                      ) : (
                        <span className="text-[var(--sub)] text-[12.5px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

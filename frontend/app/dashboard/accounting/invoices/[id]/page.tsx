"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import LoadingState from "@/components/LoadingState";

interface InvoiceItem {
  id: number;
  productId: number;
  variantId: number | null;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface InvoiceDetail {
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
  costOfGoodsSold: number | null;
  journalEntryId: number | null;
  journalEntryNumber: string | null;
  items: InvoiceItem[];
}

const typeLabels: Record<string, string> = {
  Sales: "invoice.sales",
  Purchase: "invoice.purchase",
};

const typeStyles: Record<string, string> = {
  Sales: "badge badge--green",
  Purchase: "badge badge--blue",
};

const paymentLabels: Record<string, string> = {
  Cash: "invoice.paymentCash",
  Credit: "invoice.paymentCredit",
};

export default function InvoiceDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("invoice.loadError"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  if (loading) {
    return <LoadingState />;
  }

  if (!invoice) {
    return (
      <div>
        <Link href="/dashboard/accounting/invoices" className="text-[var(--blue)] hover:underline text-sm">
          {t("invoice.backToList")}
        </Link>
        {error && <div className="alert alert--danger mt-4">{error}</div>}
      </div>
    );
  }

  const isSales = invoice.invoiceType === "Sales";

  return (
    <div>
      <div className="mb-4">
        <Link href="/dashboard/accounting/invoices" className="text-[var(--blue)] hover:underline text-sm">
          {t("invoice.backToList")}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold text-[var(--blue-deep)]" dir="ltr">
            {invoice.invoiceNumber}
          </h1>
          <span className={typeStyles[invoice.invoiceType] ?? "badge badge--gray"}>
            {t(typeLabels[invoice.invoiceType] ?? "common.noData")}
          </span>
        </div>
      </div>

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">
            {isSales ? t("invoice.customerInfo") : t("invoice.supplierInfo")}
          </h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--sub)]">{isSales ? t("invoice.customerLabel") : t("invoice.supplierLabel")}</span>
              <span className="text-[var(--ink)] font-medium">{invoice.partyName || "—"}</span>
            </p>
            <p>
              <span className="text-[var(--sub)]">{t("invoice.dateLabel")}</span>
              <span className="text-[var(--ink)]">{invoice.invoiceDate}</span>
            </p>
            <p>
              <span className="text-[var(--sub)]">{t("invoice.paymentLabel")}</span>
              <span className="text-[var(--ink)]">{t(paymentLabels[invoice.paymentMethod] ?? "common.noData")}</span>
            </p>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">{t("invoice.relatedJournal")}</h2>
          {invoice.journalEntryId ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-[var(--sub)]">{t("invoice.entryNumberLabel")}</span>
                <Link
                  href={`/dashboard/accounting/journal-entries/${invoice.journalEntryId}`}
                  className="text-[var(--blue)] font-bold hover:underline"
                  dir="ltr"
                >
                  {invoice.journalEntryNumber}
                </Link>
              </p>
              {isSales && invoice.costOfGoodsSold != null && (
                <p>
                  <span className="text-[var(--sub)]">{t("invoice.cogsLabel")}</span>
                  <span className="text-[var(--ink)]" dir="ltr">
                    {invoice.costOfGoodsSold.toLocaleString("ar-SA")} ر.س
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-[var(--sub)] text-sm">{t("invoice.noRelatedEntry")}</p>
          )}
        </div>
      </div>

      <div className="card overflow-hidden mb-6">
        <h2 className="text-[14px] font-bold text-[var(--blue-deep)] p-5 pb-0">{t("invoice.itemsTitle")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-3">
            <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
              <tr>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.product")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.quantity")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.unitPrice")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.lineTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)]">
                  <td className="p-4 text-[var(--ink)] font-medium">{item.productNameSnapshot}</td>
                  <td className="p-4 text-[var(--sub)]">{item.quantity}</td>
                  <td className="p-4 text-[var(--sub)]" dir="ltr">
                    {item.unitPrice.toLocaleString("ar-SA")} ر.س
                  </td>
                  <td className="p-4 text-[var(--ink)] font-medium" dir="ltr">
                    {item.lineTotal.toLocaleString("ar-SA")} ر.س
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-5 space-y-1.5 border-t border-[var(--border)] max-w-xs mr-auto text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--sub)]">{t("invoice.subTotal")}</span>
            <span className="text-[var(--ink)]" dir="ltr">
              {invoice.subTotal.toLocaleString("ar-SA")} ر.س
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--sub)]">{t("invoice.tax")}</span>
            <span className="text-[var(--ink)]" dir="ltr">
              {invoice.taxAmount.toLocaleString("ar-SA")} ر.س
            </span>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border)]">
            <span className="text-[var(--ink)] font-bold">{t("invoice.total")}</span>
            <span className="text-[var(--blue-deep)] font-bold text-[16px]" dir="ltr">
              {invoice.totalAmount.toLocaleString("ar-SA")} ر.س
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

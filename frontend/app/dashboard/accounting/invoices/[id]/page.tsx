"use client";

import { useEffect, useState } from "react";
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
  productCodeSnapshot?: string | null;
  productStatusSnapshot?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  discountAmount: number;
  lineAfterDiscount: number;
}

interface InvoiceDetail {
  id: number;
  invoiceType: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: number | null;
  partyName: string | null;
  partyPhone?: string | null;
  partyCity?: string | null;
  notes?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  costOfGoodsSold: number | null;
  journalEntryId: number | null;
  journalEntryNumber: string | null;
  items: InvoiceItem[];
  storeName?: string;
  storeLogo?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactAddress?: string | null;
  vatNumber?: string | null;
  isVatRegistered?: boolean;
  vatRate?: number;
  qrBase64?: string | null;
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

const statusLabels: Record<string, string> = {
  Paid: "invoice.statusPaid",
  Pending: "invoice.statusPending",
  Refunded: "invoice.statusRefunded",
};

const statusStyles: Record<string, string> = {
  Paid: "badge badge--green",
  Pending: "badge badge--yellow",
  Refunded: "badge badge--gray",
};

const itemStatusLabels: Record<string, string> = {
  Active: "invoice.itemStatusActive",
  Draft: "invoice.itemStatusDraft",
  OutOfStock: "invoice.itemStatusOutOfStock",
  Archived: "invoice.itemStatusArchived",
};

const fmt = (n: number) => n.toLocaleString("ar-SA-u-nu-latn");

function buildInvoiceHtml(invoice: InvoiceDetail, t: (k: string) => string) {
  const isSales = invoice.invoiceType === "Sales";
  const statusKey = statusLabels[invoice.paymentStatus] ?? "common.noData";
  const vatRateLabel = invoice.isVatRegistered && invoice.vatRate ? ` (${invoice.vatRate * 100}%)` : "";

  const rows = invoice.items
    .map(
      (item) => `
        <tr>
          <td class="c">${item.productCodeSnapshot || "—"}</td>
          <td>${item.productNameSnapshot}</td>
          <td class="c">${item.productStatusSnapshot ? t(itemStatusLabels[item.productStatusSnapshot] ?? "common.noData") : "—"}</td>
          <td class="c">${item.quantity}</td>
          <td class="c">${fmt(item.unitPrice)}</td>
          <td class="c">${fmt(item.lineTotal)}</td>
          <td class="c">${fmt(item.discountAmount)}</td>
          <td class="c">${fmt(item.lineAfterDiscount)}</td>
        </tr>`
    )
    .join("");

  const qrBlock =
    invoice.qrBase64 && invoice.isVatRegistered
      ? `<img class="qr-img" src="data:image/png;base64,${invoice.qrBase64}" alt="QR" />`
      : `<div class="qr-empty">—</div>`;

  const companyLogo = invoice.storeLogo
    ? `<img class="logo" src="${invoice.storeLogo}" alt="" />`
    : `<div class="logo-placeholder">${(invoice.storeName || "؟").charAt(0)}</div>`;

  const vatNumberBlock = invoice.isVatRegistered && invoice.vatNumber
    ? `<strong>${invoice.vatNumber}</strong>`
    : `<span class="dim">—</span>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${invoice.invoiceNumber}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #1c2733; background: #fff; padding: 24px 28px; font-size: 13px; }
  .page-title { text-align: center; font-size: 18px; font-weight: 800; margin-bottom: 14px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1c2733; padding-bottom: 14px; }
  .company { display: flex; gap: 12px; align-items: center; }
  .logo { width: 56px; height: 56px; object-fit: contain; }
  .logo-placeholder { width: 56px; height: 56px; background: #1c2733; color: #fff; font-size: 28px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .company-name { font-size: 19px; font-weight: 800; }
  .company-detail { font-size: 11.5px; color: #55606b; margin-top: 2px; }
  .qr-area { display: flex; gap: 8px; align-items: stretch; }
  .qr-img { width: 76px; height: 76px; border: 1px solid #d3d8de; }
  .qr-empty { width: 76px; height: 76px; border: 1px solid #d3d8de; display: flex; align-items: center; justify-content: center; color: #a4abb3; }
  .qr-meta { border: 1px solid #d3d8de; width: 130px; font-size: 10.5px; color: #55606b; padding: 6px; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
  .info-row { display: flex; gap: 14px; margin: 16px 0; }
  .info-box { flex: 1; border: 1px solid #dfe3e8; padding: 12px 14px; }
  .info-box .box-title { font-weight: 800; font-size: 12.5px; margin-bottom: 8px; }
  .info-line { display: flex; gap: 8px; font-size: 12.5px; margin-top: 4px; }
  .info-line .k { color: #55606b; min-width: 70px; }
  .info-line .v { font-weight: 700; }
  .body-row { display: flex; gap: 14px; align-items: flex-start; }
  .items-table { flex: 1; border-collapse: collapse; }
  .items-table th { background: #f1f3f5; border: 1px solid #dfe3e8; font-size: 11.5px; padding: 8px 6px; text-align: center; }
  .items-table td { border: 1px solid #dfe3e8; padding: 7px 6px; font-size: 12px; }
  .items-table td:nth-child(2) { text-align: right; }
  .c { text-align: center; }
  .summary { width: 240px; border: 1px solid #dfe3e8; }
  .sum-row { display: flex; justify-content: space-between; padding: 7px 12px; font-size: 12.5px; border-bottom: 1px solid #eef1f3; }
  .sum-row b { font-weight: 800; }
  .sum-row.grand { background: #d32f2f; color: #fff; font-weight: 800; font-size: 14.5px; border-bottom: none; }
  .notes { margin-top: 16px; border: 1px solid #dfe3e8; padding: 10px 14px; min-height: 64px; font-size: 12px; color: #55606b; }
  .notes .notes-title { font-weight: 800; color: #1c2733; margin-bottom: 4px; }
  .foot-stats { display: flex; gap: 10px; margin-top: 14px; }
  .stat { flex: 1; border: 1px solid #dfe3e8; padding: 8px 12px; font-size: 12px; }
  .stat .k { color: #55606b; }
  .stat .v { font-weight: 800; margin-top: 2px; }
  .signatures { display: flex; justify-content: space-between; gap: 20px; margin-top: 34px; }
  .signature { flex: 1; border-top: 1px solid #1c2733; padding-top: 8px; text-align: center; font-size: 12px; font-weight: 700; }
</style>
</head>
<body>
  <div class="page-title">${t("invoice.taxInvoice")}</div>

  <div class="header">
    <div class="company">
      ${companyLogo}
      <div>
        <div class="company-name">${invoice.storeName || ""}</div>
        ${invoice.contactPhone ? `<div class="company-detail">${t("invoice.phone")}: ${invoice.contactPhone}</div>` : ""}
        ${invoice.contactEmail ? `<div class="company-detail">${invoice.contactEmail}</div>` : ""}
        ${invoice.contactAddress ? `<div class="company-detail">${invoice.contactAddress}</div>` : ""}
      </div>
    </div>
    <div class="qr-area">
      ${qrBlock}
      <div class="qr-meta">
        <span>${t("invoice.vatNumber")}</span>
        <span dir="ltr">${vatNumberBlock}</span>
      </div>
    </div>
  </div>

  <div class="info-row">
    <div class="info-box">
      <div class="box-title">${isSales ? t("invoice.customerInfo") : t("invoice.supplierInfo")}</div>
      <div class="info-line"><span class="k">${t("invoice.customerLabel")}</span><span class="v">${invoice.partyName || "—"}</span></div>
      <div class="info-line"><span class="k">${t("invoice.customerPhone")}</span><span class="v">${invoice.partyPhone || "—"}</span></div>
      <div class="info-line"><span class="k">${t("invoice.customerMobile")}</span><span class="v">${invoice.partyPhone || "—"}</span></div>
      <div class="info-line"><span class="k">${t("invoice.customerCity")}</span><span class="v">${invoice.partyCity || "—"}</span></div>
    </div>
    <div class="info-box">
      <div class="box-title">${t("invoice.invoiceData")}</div>
      <div class="info-line"><span class="k">${t("invoice.dateLabel")}</span><span class="v">${invoice.invoiceDate}</span></div>
      <div class="info-line"><span class="k">${t("invoice.invoiceNo")}</span><span class="v">${invoice.invoiceNumber}</span></div>
      <div class="info-line"><span class="k">${t("invoice.paymentLabel")}</span><span class="v">${t(paymentLabels[invoice.paymentMethod] ?? "common.noData")}</span></div>
      <div class="info-line"><span class="k">${t("invoice.paymentStatus")}</span><span class="v">${t(statusKey)}</span></div>
    </div>
  </div>

  <div class="body-row">
    <table class="items-table">
      <thead>
        <tr>
          <th>${t("invoice.code")}</th>
          <th>${t("invoice.product")}</th>
          <th>${t("invoice.itemStatus")}</th>
          <th>${t("invoice.quantity")}</th>
          <th>${t("invoice.unitPrice")}</th>
          <th>${t("invoice.lineTotal")}</th>
          <th>${t("invoice.discount")}</th>
          <th>${t("invoice.lineAfterDiscount")}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="summary">
      <div class="sum-row"><span>${t("invoice.lineTotal")}</span><span>${fmt(invoice.subTotal)}</span></div>
      <div class="sum-row"><span>${t("invoice.totalDiscount")}</span><span>${fmt(invoice.discountAmount || 0)}</span></div>
      <div class="sum-row"><span>${t("invoice.net")}</span><span>${fmt((invoice.subTotal || 0) - (invoice.discountAmount || 0))}</span></div>
      <div class="sum-row"><span>${t("invoice.tax")}${vatRateLabel}</span><span>${fmt(invoice.taxAmount)}</span></div>
      <div class="sum-row grand"><span>${t("invoice.grandTotal")}</span><span>${fmt(invoice.totalAmount)} ${t("common.sar")}</span></div>
    </div>
  </div>

  <div class="notes">
    <div class="notes-title">${t("invoice.notes")}</div>
    <div>${invoice.notes || "—"}</div>
  </div>

  <div class="foot-stats">
    <div class="stat"><div class="k">${t("invoice.invoiceTotal")}</div><div class="v">${fmt(invoice.totalAmount)} ${t("common.sar")}</div></div>
    <div class="stat"><div class="k">${t("invoice.taxValue")}</div><div class="v">${fmt(invoice.taxAmount)} ${t("common.sar")}</div></div>
    <div class="stat"><div class="k">${t("invoice.dateLabel")}</div><div class="v">${invoice.invoiceDate}</div></div>
  </div>

  <div class="signatures">
    <div class="signature">${t("invoice.customerSignature")}</div>
    <div class="signature">${t("invoice.sellerSignature")}</div>
  </div>

  <script>window.onload = function(){ window.print(); window.close(); }<\/script>
</body>
</html>`;
}

function printInvoice(invoice: InvoiceDetail, t: (k: string) => string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(buildInvoiceHtml(invoice, t));
  w.document.close();
}

async function downloadPdf(id: string, t: (k: string) => string) {
  try {
    const res = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
    const blob = new Blob([res.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } };
    alert(e.response?.data?.message || t("invoice.loadError"));
  }
}

export default function InvoiceDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get(`/invoices/${id}`)
      .then((res) => {
        if (!active) return;
        setInvoice(res.data.data);
        setError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        const e = err as { response?: { data?: { message?: string } } };
        setError(e.response?.data?.message || t("invoice.loadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, t]);

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
  const statusKey = statusLabels[invoice.paymentStatus] ?? "common.noData";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/dashboard/accounting/invoices" className="text-[var(--blue)] hover:underline text-sm">
          {t("invoice.backToList")}
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => printInvoice(invoice, t)}
            className="btn btn-outline btn-sm"
          >
            <Icon name="printer" /> {t("invoice.print")}
          </button>
          <button
            onClick={() => downloadPdf(id, t)}
            className="btn btn-outline btn-sm"
          >
            <Icon name="download" /> {t("invoice.downloadPdf")}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold text-[var(--blue-deep)]" dir="ltr">
            {invoice.invoiceNumber}
          </h1>
          <span className={typeStyles[invoice.invoiceType] ?? "badge badge--gray"}>
            {t(typeLabels[invoice.invoiceType] ?? "common.noData")}
          </span>
          <span className={statusStyles[invoice.paymentStatus] ?? "badge badge--gray"}>
            {t(statusKey)}
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
            {invoice.partyPhone && (
              <p>
                <span className="text-[var(--sub)]">{t("invoice.customerPhone")}</span>
                <span className="text-[var(--ink)]">{invoice.partyPhone}</span>
              </p>
            )}
            {invoice.partyCity && (
              <p>
                <span className="text-[var(--sub)]">{t("invoice.customerCity")}</span>
                <span className="text-[var(--ink)]">{invoice.partyCity}</span>
              </p>
            )}
            <p>
              <span className="text-[var(--sub)]">{t("invoice.dateLabel")}</span>
              <span className="text-[var(--ink)]">{invoice.invoiceDate}</span>
            </p>
            <p>
              <span className="text-[var(--sub)]">{t("invoice.paymentLabel")}</span>
              <span className="text-[var(--ink)]">{t(paymentLabels[invoice.paymentMethod] ?? "common.noData")}</span>
            </p>
            <p>
              <span className="text-[var(--sub)]">{t("invoice.paymentStatus")}</span>
              <span className="text-[var(--ink)]">{t(statusKey)}</span>
            </p>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">{t("invoice.companyInfo")}</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--sub)]">{t("store.name")}</span>
              <span className="text-[var(--ink)] font-medium">{invoice.storeName || "—"}</span>
            </p>
            {invoice.vatNumber && (
              <p>
                <span className="text-[var(--sub)]">{t("invoice.vatNumber")}</span>
                <span className="text-[var(--ink)]" dir="ltr">{invoice.vatNumber}</span>
              </p>
            )}
            {invoice.contactPhone && (
              <p>
                <span className="text-[var(--sub)]">{t("invoice.phone")}</span>
                <span className="text-[var(--ink)]">{invoice.contactPhone}</span>
              </p>
            )}
            {invoice.contactEmail && (
              <p>
                <span className="text-[var(--sub)]">{t("invoice.email")}</span>
                <span className="text-[var(--ink)]">{invoice.contactEmail}</span>
              </p>
            )}
            {invoice.contactAddress && (
              <p>
                <span className="text-[var(--sub)]">{t("invoice.address")}</span>
                <span className="text-[var(--ink)]">{invoice.contactAddress}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden mb-6">
        <h2 className="text-[14px] font-bold text-[var(--blue-deep)] p-5 pb-0">{t("invoice.itemsTitle")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-3">
            <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
              <tr>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.code")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.product")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.itemStatus")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.quantity")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.unitPrice")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.lineTotal")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.discount")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.lineAfterDiscount")}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)]">
                  <td className="p-4 text-[var(--sub)]" dir="ltr">{item.productCodeSnapshot || "—"}</td>
                  <td className="p-4 text-[var(--ink)] font-medium">{item.productNameSnapshot}</td>
                  <td className="p-4 text-[var(--sub)]">{item.productStatusSnapshot ? t(itemStatusLabels[item.productStatusSnapshot] ?? "common.noData") : "—"}</td>
                  <td className="p-4 text-[var(--sub)]">{item.quantity}</td>
                  <td className="p-4 text-[var(--sub)]" dir="ltr">
                    {fmt(item.unitPrice)} {t("common.sar")}
                  </td>
                  <td className="p-4 text-[var(--sub)]" dir="ltr">
                    {fmt(item.lineTotal)} {t("common.sar")}
                  </td>
                  <td className="p-4 text-[var(--danger)]" dir="ltr">
                    {item.discountAmount ? `${fmt(item.discountAmount)} ${t("common.sar")}` : "—"}
                  </td>
                  <td className="p-4 text-[var(--ink)] font-medium" dir="ltr">
                    {fmt(item.lineAfterDiscount)} {t("common.sar")}
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
              {fmt(invoice.subTotal)} {t("common.sar")}
            </span>
          </div>
          {invoice.discountAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--sub)]">{t("invoice.totalDiscount")}</span>
              <span className="text-[var(--danger)]" dir="ltr">
                {fmt(invoice.discountAmount)} {t("common.sar")}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[var(--sub)]">
              {t("invoice.tax")}
              {invoice.isVatRegistered && invoice.vatRate ? ` (${invoice.vatRate * 100}%)` : ""}
            </span>
            <span className="text-[var(--ink)]" dir="ltr">
              {fmt(invoice.taxAmount)} {t("common.sar")}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border)]">
            <span className="text-[var(--ink)] font-bold">{t("invoice.total")}</span>
            <span className="text-[var(--blue-deep)] font-bold text-[16px]" dir="ltr">
              {fmt(invoice.totalAmount)} {t("common.sar")}
            </span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="card p-5 mb-6">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-2">{t("invoice.notes")}</h2>
          <p className="text-sm text-[var(--ink)] whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {invoice.qrBase64 && invoice.isVatRegistered && (
        <div className="card p-5 flex items-center gap-4">
          <img
            src={`data:image/png;base64,${invoice.qrBase64}`}
            alt="QR"
            className="w-24 h-24 rounded"
          />
          <div>
            <p className="text-[13px] font-bold text-[var(--ink)]">{t("invoice.taxInvoice")}</p>
            <p className="text-[12px] text-[var(--sub)] mt-1">{t("invoice.vatNumber")}: {invoice.vatNumber}</p>
          </div>
        </div>
      )}
    </div>
  );
}

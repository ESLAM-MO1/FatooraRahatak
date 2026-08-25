"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { usePackageFeature } from "@/lib/usePackageFeatures";
import Icon from "@/components/Icon";
import LoadingState from "@/components/LoadingState";
import RestrictedFeatureState from "@/components/RestrictedFeatureState";
import {
  InvoiceDetail,
  printInvoice,
  invoiceTypeLabels,
  invoiceTypeStyles,
  invoicePaymentLabels,
  invoiceStatusLabels,
  invoiceStatusStyles,
  invoiceItemStatusLabels,
} from "@/lib/invoicePrint";

const typeLabels = invoiceTypeLabels;
const typeStyles = invoiceTypeStyles;
const paymentLabels = invoicePaymentLabels;
const statusLabels = invoiceStatusLabels;
const statusStyles = invoiceStatusStyles;
const itemStatusLabels = invoiceItemStatusLabels;

const fmt = (n: number) => n.toLocaleString("ar-SA-u-nu-latn");

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
    const e = err as { response?: { data?: Blob; message?: string }; message?: string };
    let serverMsg = "";
    try {
      // الـ responseType blob يحوّل رسالة الخطأ JSON إلى Blob — نقرأها يدويًا لنعرضها للمستخدم
      if (e.response?.data instanceof Blob) {
        const text = await e.response.data.text();
        try {
          const parsed = JSON.parse(text);
          serverMsg = parsed?.message || "";
        } catch {
          serverMsg = text;
        }
      }
    } catch {
      // تجاهل فشل قراءة الاستجابة
    }
    throw new Error(serverMsg || e.message || t("invoice.pdfError"));
  }
}

export default function InvoiceDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id as string;
  const gate = usePackageFeature("hasAccountingFull");

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [payLinkOpen, setPayLinkOpen] = useState(false);
  const [payLinkGenerating, setPayLinkGenerating] = useState(false);
  const [payLink, setPayLink] = useState<string | null>(null);
  const [payLinkMsg, setPayLinkMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleVerifyZatca = async () => {
    setVerifying(true);
    setVerifyMsg(null);
    try {
      const res = await api.post(`/owner/zatca/invoices/${id}/verify`);
      setVerifyMsg({ success: res.data.success, text: res.data.message });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setVerifyMsg({ success: false, text: e.response?.data?.message || t("invoice.verifyError") });
    } finally {
      setVerifying(false);
    }
  };

  const handleCreatePayLink = async () => {
    if (!invoice) return;
    setPayLinkGenerating(true);
    setPayLinkMsg(null);
    try {
      const res = await api.post("/payments/create-link", {
        invoiceId: invoice.id,
        amount: invoice.totalAmount,
        currency: "SAR",
        successUrl: window.location.href,
        callbackUrl: window.location.href,
      });
      if (res.data?.success && res.data?.data?.paymentLinkUrl) {
        setPayLink(res.data.data.paymentLinkUrl);
      } else {
        setPayLinkMsg({ success: false, text: res.data?.message || t("invoice.payLinkError") });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setPayLinkMsg({ success: false, text: e.response?.data?.message || t("invoice.payLinkError") });
    } finally {
      setPayLinkGenerating(false);
    }
  };

  const copyPayLink = async () => {
    if (!payLink) return;
    try {
      await navigator.clipboard.writeText(payLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // تجاهل
    }
  };

  const handleDownloadPdf = async () => {
    setError("");
    try {
      await downloadPdf(id, t);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("invoice.pdfError");
      setError(message);
    }
  };

  useEffect(() => {
    if (!gate.ready || !gate.allowed) return;
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
  }, [id, t, gate.ready, gate.allowed]);

  if (!gate.ready) {
    return <LoadingState />;
  }

  if (!gate.allowed) {
    return <RestrictedFeatureState />;
  }

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
            onClick={handleDownloadPdf}
            className="btn btn-outline btn-sm"
          >
            <Icon name="download" /> {t("invoice.downloadPdf")}
          </button>
          {invoice.paymentStatus !== "Paid" && (
            <button
              onClick={() => { setPayLinkOpen(true); setPayLink(null); setPayLinkMsg(null); }}
              className="btn btn-outline btn-sm"
            >
              <Icon name="link" /> {t("invoice.createPayLink")}
            </button>
          )}
          {isSales && (
            <button
              onClick={handleVerifyZatca}
              disabled={verifying}
              className="btn btn-primary btn-sm"
            >
              <Icon name="check" /> {verifying ? t("common.loading") : t("invoice.verifyZatca")}
            </button>
          )}
        </div>
      </div>

      {verifyMsg && (
        <div className={`alert mb-4 ${verifyMsg.success ? "alert--success" : "alert--danger"}`}>
          {verifyMsg.text}
        </div>
      )}

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
          <table className="w-full text-sm mt-3 hidden md:table">
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
        <div className="md:hidden space-y-3">
          {invoice.items.map((item) => (
            <div key={item.id} className="card p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("invoice.code")}</p>
                  <p className="text-[var(--sub)]" dir="ltr">{item.productCodeSnapshot || "—"}</p>
                </div>
                <div>
                  <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("invoice.itemStatus")}</p>
                  <p className="text-[var(--sub)]">{item.productStatusSnapshot ? t(itemStatusLabels[item.productStatusSnapshot] ?? "common.noData") : "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("invoice.product")}</p>
                  <p className="text-[var(--ink)] font-medium">{item.productNameSnapshot}</p>
                </div>
                <div>
                  <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("invoice.quantity")}</p>
                  <p className="text-[var(--sub)]">{item.quantity}</p>
                </div>
                <div>
                  <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("invoice.unitPrice")}</p>
                  <p className="text-[var(--sub)]" dir="ltr">
                    {fmt(item.unitPrice)} {t("common.sar")}
                  </p>
                </div>
                <div>
                  <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("invoice.lineTotal")}</p>
                  <p className="text-[var(--sub)]" dir="ltr">
                    {fmt(item.lineTotal)} {t("common.sar")}
                  </p>
                </div>
                <div>
                  <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("invoice.discount")}</p>
                  <p className="text-[var(--danger)]" dir="ltr">
                    {item.discountAmount ? `${fmt(item.discountAmount)} ${t("common.sar")}` : "—"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("invoice.lineAfterDiscount")}</p>
                  <p className="text-[var(--ink)] font-medium" dir="ltr">
                    {fmt(item.lineAfterDiscount)} {t("common.sar")}
                  </p>
                </div>
              </div>
            </div>
          ))}
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

      {payLinkOpen && (
        <div className="modal-overlay" onClick={() => setPayLinkOpen(false)}>
          <div className="modal-card max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-bold text-[var(--blue-deep)]">{t("invoice.payLinkTitle")}</h2>
              <button onClick={() => setPayLinkOpen(false)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
            </div>
            {payLinkMsg && (
              <div className={`alert mb-4 ${payLinkMsg.success ? "alert--success" : "alert--danger"}`}>
                {payLinkMsg.text}
              </div>
            )}
            <div className="space-y-4">
              {!payLink ? (
                <>
                  <p className="text-[13px] text-[var(--sub)] leading-relaxed">
                    {t("invoice.payLinkDesc")}
                  </p>
                  <div className="bg-gray-50 rounded-xl p-4 text-[13px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[var(--sub)]">{t("invoice.invoiceValue")}</span>
                      <span className="font-bold" dir="ltr">{invoice.totalAmount.toFixed(2)} {t("common.sar")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--sub)]">{t("invoice.invoiceNumber")}</span>
                      <span className="font-bold" dir="ltr">{invoice.invoiceNumber}</span>
                    </div>
                  </div>
                  <button onClick={handleCreatePayLink} disabled={payLinkGenerating} className="btn btn-primary w-full py-2.5">
                    {payLinkGenerating ? t("common.loading") : t("invoice.generatePayLink")}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[13px] text-[var(--sub)]">{t("invoice.payLinkReady")}</p>
                  <div className="flex items-center gap-2">
                    <div className="field-shell flex-1">
                      <input type="text" readOnly value={payLink} dir="ltr" className="text-[12px]" />
                    </div>
                    <button onClick={copyPayLink} className="btn btn-outline btn-sm shrink-0">
                      <Icon name="copy" size={14} /> {copied ? t("invoice.copied") : t("invoice.copy")}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { window.open(payLink, "_blank"); }} className="btn btn-primary flex-1 py-2.5">
                      <Icon name="link" size={14} /> {t("invoice.openPayLink")}
                    </button>
                    <button onClick={() => setPayLinkOpen(false)} className="btn btn-outline flex-1 py-2.5">
                      {t("common.done")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

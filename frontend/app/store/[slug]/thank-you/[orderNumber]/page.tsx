"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { customerApi } from "@/lib/customerApi";
import { getQuickCustomer } from "@/lib/quickCustomer";

interface BankTransferInfo {
  bankName?: string | null;
  accountHolder?: string | null;
  iban?: string | null;
  receiptUrl?: string | null;
  transferReference?: string | null;
}

interface OrderDetail {
  totalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  bankTransfer?: BankTransferInfo | null;
}

export default function ThankYouPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;
  const orderNumber = params.orderNumber as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentState, setPaymentState] = useState<"checking" | "paid" | "failed" | "none">("checking");

  const [receiptUrl, setReceiptUrl] = useState("");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [receiptDone, setReceiptDone] = useState(false);

  const quick = getQuickCustomer(slug);
  const loggedIn = Boolean(quick?.sessionToken);

  useEffect(() => {
    const load = async () => {
      try {
        const phone = sessionStorage.getItem(`order_phone_${orderNumber}`);
        const res = await api.get(`/public/stores/${slug}/orders/${orderNumber}`, {
          params: phone ? { phone } : undefined,
        });
        const data = res.data.data as OrderDetail;
        setOrder(data);
        setTotal(data?.totalAmount ?? null);
        setReceiptDone(Boolean(data?.bankTransfer?.receiptUrl));
      } catch {
        /* fallback: show static confirmation */
      } finally {
        setLoading(false);
      }
    };
    load();

    // فحص حالة الدفع الإلكتروني بعد الرجوع من صفحة الدفع المحمية (ميسرا / PayPal)
    // الحوالة البنكية والدفع عند الاستلام لا يحتاجان فحصًا — تُترك الحالة كما هي.
    let tries = 0;
    const maxTries = 12;
    const check = async () => {
      try {
        const res = await api.get(`/public/stores/${slug}/orders/${orderNumber}/payment-status`);
        const status = res.data?.data?.status;
        if (status === "Paid") {
          setPaymentState("paid");
          return clearInterval(timer);
        }
        if (status === "Failed") {
          setPaymentState("failed");
          return clearInterval(timer);
        }
        if (status === "not_found") {
          setPaymentState("none");
          return clearInterval(timer);
        }
        tries += 1;
        if (tries >= maxTries) {
          setPaymentState("none");
          clearInterval(timer);
        }
      } catch {
        tries += 1;
        if (tries >= maxTries) {
          setPaymentState("none");
          clearInterval(timer);
        }
      }
    };
    const timer = setInterval(check, 2500);
    return () => clearInterval(timer);
  }, [slug, orderNumber]);

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptUrl.trim()) {
      setReceiptError(t("storefront.receiptUrlRequired"));
      return;
    }
    setSubmitting(true);
    setReceiptError("");
    try {
      let res: any;
      if (quick?.sessionToken) {
        res = await customerApi<{ success: boolean; message?: string }>(
          `/public/stores/${slug}/orders/${orderNumber}/bank-transfer/receipt`,
          quick.sessionToken,
          {
            method: "POST",
            body: { receiptUrl: receiptUrl.trim(), reference: reference.trim() || null },
          }
        );
      } else {
        res = await api.post(
          `/public/stores/${slug}/orders/${orderNumber}/bank-transfer/receipt`,
          { receiptUrl: receiptUrl.trim(), reference: reference.trim() || null }
        );
      }
      if (res?.success) {
        setReceiptDone(true);
        setReceiptUrl("");
        setReference("");
      } else {
        setReceiptError(res?.message || t("storefront.receiptUploadError"));
      }
    } catch (err: any) {
      setReceiptError(err.response?.data?.message || err.message || t("storefront.receiptUploadError"));
    } finally {
      setSubmitting(false);
    }
  };

  const isBankTransfer = order?.paymentMethod === "BankTransfer";

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        {paymentState === "paid" && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-[13px] font-bold text-green-700">
            {t("storefront.paymentCompleted")}
          </div>
        )}
        {paymentState === "failed" && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] font-bold text-red-700">
            {t("storefront.paymentFailed")}
          </div>
        )}
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("storefront.thankYou")}</h1>
        <p className="text-sm text-gray-500 mb-6">{t("storefront.thankYouSubtitle")}</p>

        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-6 space-y-2 text-left">
          <div className="flex justify-between text-[13px]">
            <span className="text-gray-500">{t("storefront.orderNumber")}</span>
            <span className="font-bold text-gray-900" dir="ltr">{orderNumber}</span>
          </div>
          {!loading && total !== null && (
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">{t("storefront.orderTotal")}</span>
              <span className="font-bold text-gray-900">{total.toFixed(2)} ر.س</span>
            </div>
          )}
        </div>

        {/* بيانات الحوالة البنكية + رفع الإيصال */}
        {isBankTransfer && (
          <div className="mb-6 text-left">
            {order?.bankTransfer?.iban ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2 mb-4">
                <p className="text-[13px] font-bold text-gray-800">{t("storefront.bankTransferDetails")}</p>
                {order.bankTransfer.bankName && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">{t("storefront.bankName")}</span>
                    <span className="font-bold text-gray-900">{order.bankTransfer.bankName}</span>
                  </div>
                )}
                {order.bankTransfer.accountHolder && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">{t("storefront.bankAccountHolder")}</span>
                    <span className="font-bold text-gray-900">{order.bankTransfer.accountHolder}</span>
                  </div>
                )}
                {order.bankTransfer.iban && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">{t("storefront.bankIban")}</span>
                    <span className="font-bold text-gray-900" dir="ltr">{order.bankTransfer.iban}</span>
                  </div>
                )}
                {order.bankTransfer.receiptUrl && (
                  <div className="pt-2 border-t border-blue-100">
                    <span className="text-[12px] font-bold text-green-700">{t("storefront.receiptSubmitted")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 mb-4 text-[12.5px] text-amber-700">
                {t("storefront.bankTransferNotConfigured")}
              </div>
            )}

            {isBankTransfer && order?.bankTransfer?.iban && !order.bankTransfer.receiptUrl && (
              <form onSubmit={handleUploadReceipt} className="space-y-3">
                <p className="text-[12.5px] font-bold text-gray-700">{t("storefront.uploadReceiptTitle")}</p>
                <input
                  type="text"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder={t("storefront.receiptUrlPlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
                />
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={t("storefront.transferReferencePlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {receiptError && (
                  <p className="text-[12px] text-red-600">{receiptError}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {submitting ? t("common.loading") : t("storefront.submitReceipt")}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="space-y-3">
          <a
            href={`/store/${slug}/track-order`}
            className="block w-full rounded-lg py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700"
          >
            {t("storefront.trackMyOrder")}
          </a>
          <a
            href={loggedIn ? `/store/${slug}/account` : `/store/${slug}`}
            className="block w-full rounded-lg py-3 text-sm font-bold text-gray-700 border border-gray-200 hover:bg-gray-50"
          >
            {loggedIn ? t("storefront.viewMyOrders") : t("storefront.backToStore")}
          </a>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import PhoneInputField from "@/components/PhoneInputField";
interface OrderItem {
  productNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
  lineTotal: number;
}

interface StatusHistoryItem {
  status: string;
  changedAt: string;
}

interface OrderDetail {
  id: number;
  orderNumber: string;
  status: string;
  subTotal: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
  shippingAddress: string;
  notes: string | null;
  shippingMethod: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  bankTransfer: BankTransferInfo | null;
  createdAt: string;
  items: OrderItem[];
  statusHistory: StatusHistoryItem[];
  shipments?: ShipmentInfo[];
}

interface BankTransferInfo {
  bankName?: string | null;
  accountHolder?: string | null;
  iban?: string | null;
  receiptUrl?: string | null;
  transferReference?: string | null;
}

interface ShipmentEvent {
  eventCode: string;
  description: string;
  eventAt: string | null;
}

interface ShipmentInfo {
  id: number;
  awb: string;
  status: string;
  shippingCompanyName: string;
  destinationCity: string;
  events: ShipmentEvent[];
}

function sessionPhoneKey(orderNumber: string) {
  return `order_phone_${orderNumber}`;
}

export default function OrderDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;
  const orderNumber = params.orderNumber as string;

  const SHIPPING_LABEL_KEYS: Record<string, string> = {
    PickupFromStore: "checkout.shippingPickup",
    DeliveryToAddress: "checkout.shippingDelivery",
  };

  const PAYMENT_LABEL_KEYS: Record<string, string> = {
    CashOnDelivery: "checkout.paymentCashOnDelivery",
    CreditCard: "checkout.paymentCreditCard",
    PayPal: "checkout.paymentPayPal",
    BankTransfer: "checkout.paymentBankTransfer",
  };

  const shippingMethodLabel = (type: string) =>
    SHIPPING_LABEL_KEYS[type] ? t(SHIPPING_LABEL_KEYS[type]) : type;
  const paymentMethodLabel = (type: string) =>
    PAYMENT_LABEL_KEYS[type] ? t(PAYMENT_LABEL_KEYS[type]) : type;

  const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    New: { label: t("order.statusNew"), className: "bg-blue-100 text-blue-700" },
    PendingPayment: { label: t("order.statusPendingPayment"), className: "bg-orange-100 text-orange-700" },
    Processing: { label: t("order.statusProcessing"), className: "bg-yellow-100 text-yellow-700" },
    Shipped: { label: t("order.statusShipped"), className: "bg-purple-100 text-purple-700" },
    Delivered: { label: t("order.statusDelivered"), className: "bg-green-100 text-green-700" },
    Returned: { label: t("order.statusReturned"), className: "bg-red-100 text-red-700" },
    PendingRefund: { label: t("order.statusPendingRefund"), className: "bg-orange-100 text-orange-700" },
  };

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [returnMsg, setReturnMsg] = useState("");
  const [returnError, setReturnError] = useState("");

  const submitReturn = async (e: FormEvent) => {
    e.preventDefault();
    if (!order || !returnReason.trim()) return;
    setSubmitting(true);
    setReturnError("");
    setReturnMsg("");
    try {
      await api.post(`/public/stores/${slug}/orders/return`, {
        orderId: order.id,
        reason: returnReason.trim(),
        guestPhone: sessionStorage.getItem(sessionPhoneKey(order.orderNumber)) || undefined,
      });
      setReturnMsg(t("order.returnSubmitted"));
      setShowReturn(false);
      setReturnReason("");
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } } };
      setReturnError(e2.response?.data?.message || t("order.returnError"));
    } finally {
      setSubmitting(false);
    }
  };

  const fetchOrder = async (phone?: string) => {
    try {
      const res = await api.get(`/public/stores/${slug}/orders/${orderNumber}`, {
        params: phone ? { phone } : {},
      });
      setOrder(res.data.data);
      setNeedsVerification(false);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      // 1. Logged in? Try directly without phone (backend checks token)
      if (isAuthenticated()) {
        const ok = await fetchOrder();
        if (ok) {
          setLoading(false);
          return;
        }
      }

      // 2. Coming from Checkout session? (phone stored temporarily)
      const storedPhone = sessionStorage.getItem(sessionPhoneKey(orderNumber));
      if (storedPhone) {
        const ok = await fetchOrder(storedPhone);
        if (ok) {
          setLoading(false);
          return;
        }
      }

      // 3. Otherwise (Deep Link): show verification form
      setNeedsVerification(true);
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, orderNumber]);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;

    setVerifying(true);
    setError("");
    const ok = await fetchOrder(phoneInput.trim());
    setVerifying(false);

    if (ok) {
      sessionStorage.setItem(sessionPhoneKey(orderNumber), phoneInput.trim());
    } else {
      setError(t("order.verifyError"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (needsVerification && !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-xl font-bold text-gray-800 mb-6 text-center">
          {t("order.verifyTitle")}
        </h1>
        <form
          onSubmit={handleVerify}
          className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("order.orderNumberLabel")}
            </label>
            <input
              type="text"
              value={orderNumber}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500"
            />
          </div>
          <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    {t("order.phoneUsedLabel")}
  </label>
  <PhoneInputField
    value={phoneInput}
    onChange={setPhoneInput}
    required
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-[var(--theme)]"
  />
</div>

          {error && (
            <div className="alert alert--danger">{error}</div>
          )}

          <button
            type="submit"
            disabled={verifying}
            className="store-btn w-full disabled:bg-gray-300"
          >
            {verifying ? t("order.verifying") : t("order.viewDetails")}
          </button>
        </form>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500 mb-4">{t("order.cannotDisplay")}</p>
        <Link href={`/store/${slug}`} className="store-link">
          {t("store.backToStore")}
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[order.status] || {
    label: order.status,
    className: "bg-gray-100 text-gray-700",
  };

  const TRACKING_STAGES = ["New", "Processing", "Shipped", "Delivered"];
  const stageDates: Record<string, string> = {};
  (order.statusHistory || []).forEach((h) => {
    if (TRACKING_STAGES.includes(h.status) && !stageDates[h.status]) {
      stageDates[h.status] = h.changedAt;
    }
  });
  const isReturned = order.status === "Returned";
  let currentStageIndex = TRACKING_STAGES.indexOf(order.status);
  if (isReturned) {
    const reached = (order.statusHistory || [])
      .map((h) => TRACKING_STAGES.indexOf(h.status))
      .filter((i) => i >= 0);
    currentStageIndex = reached.length ? Math.max(...reached) : 0;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
        {order.status === "Delivered" && !isReturned && (
          <button
            onClick={() => setShowReturn(true)}
            className="store-btn"
          >
            {t("order.requestReturn")}
          </button>
        )}
      </div>

      {returnMsg && (
        <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-3 text-sm font-medium mb-6">
          {returnMsg}
        </div>
      )}

      {/* Order tracking stepper */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
        <p className="text-sm font-bold text-gray-800 mb-5">{t("order.trackingTitle")}</p>
        <div className="relative">
          <div className="absolute top-[18px] left-[8%] right-[8%] h-0.5 bg-gray-200" />
          <div className="relative flex">
            {TRACKING_STAGES.map((stage, idx) => {
              const done = idx < currentStageIndex;
              const current = idx === currentStageIndex;
              const reached = done || current;
              return (
                <div key={stage} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 relative bg-white ${
                      done
                        ? "border-green-500 bg-green-500 text-white"
                        : current
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-gray-300 text-gray-400"
                    }`}
                  >
                    {done ? (
                      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : current ? (
                      <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <p className={`mt-2.5 text-xs font-medium text-center ${reached ? "text-gray-800" : "text-gray-400"}`}>
                    {t(`order.status${stage}`)}
                  </p>
                  {stageDates[stage] && (
                    <p className="text-[11px] text-gray-400 mt-0.5 text-center">
                      {new Date(stageDates[stage]).toLocaleString("ar-SA-u-nu-latn")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {isReturned && (
          <div className="alert alert--danger mt-5">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16" className="shrink-0">
              <path d="M3 3v6h6M21 21v-6h-6M3.5 9a9 9 0 0 1 15.4-2.3M20.5 15a9 9 0 0 1-15.4 2.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("order.statusReturned")}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
        <p className="text-sm text-gray-500">{t("order.orderNumberLabel")}</p>
        <p className="text-lg font-bold text-gray-800 mb-4">{order.orderNumber}</p>

        <p className="text-sm text-gray-500">{t("order.shippingAddressLabel")}</p>
        <p className="text-gray-800 mb-4">{order.shippingAddress}</p>

        {order.shippingMethod && (
          <>
            <p className="text-sm text-gray-500">{t("order.shippingMethodLabel")}</p>
            <p className="text-gray-800 mb-4">{shippingMethodLabel(order.shippingMethod)}</p>
          </>
        )}

        {order.paymentMethod && (
          <>
            <p className="text-sm text-gray-500">{t("order.paymentMethodLabel")}</p>
            <p className="text-gray-800 mb-4">{paymentMethodLabel(order.paymentMethod)}</p>
          </>
        )}

        {order.paymentMethod === "BankTransfer" && order.bankTransfer?.iban && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 mb-4 space-y-1.5">
            <p className="text-[13px] font-bold text-gray-800">{t("storefront.bankTransferDetails")}</p>
            {order.bankTransfer.bankName && (
              <p className="text-[13px] text-gray-700">
                <span className="text-gray-500">{t("storefront.bankName")}: </span>
                <b>{order.bankTransfer.bankName}</b>
              </p>
            )}
            {order.bankTransfer.accountHolder && (
              <p className="text-[13px] text-gray-700">
                <span className="text-gray-500">{t("storefront.bankAccountHolder")}: </span>
                <b>{order.bankTransfer.accountHolder}</b>
              </p>
            )}
            {order.bankTransfer.iban && (
              <p className="text-[13px] text-gray-700">
                <span className="text-gray-500">{t("storefront.bankIban")}: </span>
                <b dir="ltr">{order.bankTransfer.iban}</b>
              </p>
            )}
            {order.bankTransfer.transferReference && (
              <p className="text-[13px] text-gray-700">
                <span className="text-gray-500">{t("storefront.transferReferencePlaceholder")}: </span>
                <b dir="ltr">{order.bankTransfer.transferReference}</b>
              </p>
            )}
            {order.bankTransfer.receiptUrl && (
              <p className="text-[12px] font-bold text-green-700">{t("storefront.receiptSubmitted")}</p>
            )}
          </div>
        )}

        {order.notes && (
          <>
            <p className="text-sm text-gray-500">{t("order.notesLabel")}</p>
            <p className="text-gray-800">{order.notes}</p>
          </>
        )}
      </div>

      {order.shipments && order.shipments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
          <p className="text-sm font-bold text-gray-800 mb-4">{t("order.shipmentTrackingTitle")}</p>
          <div className="space-y-4">
            {order.shipments.map((shipment) => (
              <div key={shipment.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800">{shipment.shippingCompanyName}</p>
                    {shipment.awb && (
                      <span className="text-xs text-gray-500" dir="ltr">{shipment.awb}</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-[var(--theme)] px-2.5 py-1 rounded-full bg-[var(--theme)]/10">
                    {t(`order.shipmentStatus.${shipment.status}`, { defaultValue: shipment.status })}
                  </span>
                </div>
                {shipment.destinationCity && (
                  <p className="text-xs text-gray-500 mb-2">{t("order.shippingAddressLabel")}: {shipment.destinationCity}</p>
                )}
                {shipment.events.length === 0 ? (
                  <p className="text-xs text-gray-400">{t("order.noTrackingEvents")}</p>
                ) : (
                  <div className="space-y-2">
                    {shipment.events.map((evt, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme)] mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{evt.description || evt.eventCode}</p>
                          {evt.eventAt && (
                            <p className="text-[11px] text-gray-400">
                              {new Date(evt.eventAt).toLocaleString("ar-SA-u-nu-latn")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-100 mb-6">
        {order.items.map((item, idx) => (
          <div key={idx} className="p-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-gray-800 font-medium">{item.productNameSnapshot}</p>
              <p className="text-sm text-gray-500 mt-1">
                {item.quantity} × {t("cart.priceSAR", { price: item.unitPriceSnapshot.toFixed(2) })}
              </p>
            </div>
            <p className="font-bold text-gray-800">{t("cart.priceSAR", { price: item.lineTotal.toFixed(2) })}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-gray-500">{t("cart.totalBeforeDiscount")}</span>
          <span className="text-gray-500">{t("cart.priceSAR", { price: order.subTotal.toFixed(2) })}</span>
        </div>
        {order.discountAmount > 0 && (
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-500">{t("cart.discountValue")}</span>
            <span className="text-green-600">− {t("cart.priceSAR", { price: order.discountAmount.toFixed(2) })}</span>
          </div>
        )}
        {order.shippingCost > 0 && (
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-500">{t("order.shippingCostLabel")}</span>
            <span className="text-gray-500">{t("cart.priceSAR", { price: order.shippingCost.toFixed(2) })}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-gray-600 font-medium">{t("order.totalFinal")}</span>
          <span className="text-xl font-bold store-price">
            {t("cart.priceSAR", { price: order.totalAmount.toFixed(2) })}
          </span>
        </div>
      </div>

      {showReturn && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{t("order.returnTitle")}</h2>
            <form onSubmit={submitReturn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("order.returnReasonLabel")}
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={4}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--theme)]"
                />
              </div>
              {returnError && (
                <div className="alert alert--danger">{returnError}</div>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="store-btn flex-1 disabled:bg-gray-300"
                >
                  {submitting ? t("common.saving") : t("order.returnSubmit")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReturn(false);
                    setReturnError("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

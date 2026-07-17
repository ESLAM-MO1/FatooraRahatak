"use client";
import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

interface OrderItem {
  productNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
  lineTotal: number;
}

interface OrderDetail {
  orderNumber: string;
  status: string;
  subTotal: number;
  discountAmount: number;
  totalAmount: number;
  shippingAddress: string;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
}

function sessionPhoneKey(orderNumber: string) {
  return `order_phone_${orderNumber}`;
}

export default function OrderDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;
  const orderNumber = params.orderNumber as string;

  const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    New: { label: t("order.statusNew"), className: "bg-blue-100 text-blue-700" },
    Processing: { label: t("order.statusProcessing"), className: "bg-yellow-100 text-yellow-700" },
    Shipped: { label: t("order.statusShipped"), className: "bg-purple-100 text-purple-700" },
    Delivered: { label: t("order.statusDelivered"), className: "bg-green-100 text-green-700" },
    Returned: { label: t("order.statusReturned"), className: "bg-red-100 text-red-700" },
  };

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

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
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme)]"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
        <p className="text-sm text-gray-500">{t("order.orderNumberLabel")}</p>
        <p className="text-lg font-bold text-gray-800 mb-4">{order.orderNumber}</p>

        <p className="text-sm text-gray-500">{t("order.shippingAddressLabel")}</p>
        <p className="text-gray-800 mb-4">{order.shippingAddress}</p>

        {order.notes && (
          <>
            <p className="text-sm text-gray-500">{t("order.notesLabel")}</p>
            <p className="text-gray-800">{order.notes}</p>
          </>
        )}
      </div>

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
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-gray-600 font-medium">{t("order.totalFinal")}</span>
          <span className="text-xl font-bold store-price">
            {t("cart.priceSAR", { price: order.totalAmount.toFixed(2) })}
          </span>
        </div>
      </div>
    </div>
  );
}

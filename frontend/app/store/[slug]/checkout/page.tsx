"use client";
import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

interface CartItem {
  id: number;
  productId: number;
  productNameAr: string;
  variantId: number | null;
  quantity: number;
  priceAtAdd: number;
  lineTotal: number;
}

interface CartData {
  id: number;
  status: string;
  items: CartItem[];
  subtotal: number;
}

function getCartSessionKey(slug: string) {
  return `cart_session_${slug}`;
}

export default function CheckoutPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError("");

      const authed = isAuthenticated();
      setLoggedIn(authed);
      if (authed) {
        setGuestName(localStorage.getItem("fullName") || "");
        setGuestEmail(localStorage.getItem("email") || "");
      }

      try {
        const storeRes = await api.get(`/public/stores/${slug}`);
        const id = storeRes.data.data.id;

        const sessionId = localStorage.getItem(getCartSessionKey(slug));
        if (!sessionId) {
          setCart(null);
          setLoading(false);
          return;
        }

        const cartRes = await api.get(`/stores/${id}/cart`, { params: { sessionId } });
        setCart(cartRes.data.data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setCart(null);
        } else {
          setError(err.response?.data?.message || t("checkout.errorLoadingCart"));
        }
      } finally {
        setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!cart) return;

    if (!shippingAddress.trim()) {
      setError(t("checkout.shippingAddressRequired"));
      return;
    }
    if (!loggedIn && (!guestName.trim() || !guestPhone.trim())) {
      setError(t("checkout.nameAndPhoneRequired"));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const sessionId = localStorage.getItem(getCartSessionKey(slug));
      const res = await api.post(`/public/stores/${slug}/checkout`, {
        sessionId,
        guestName: guestName.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
        guestEmail: guestEmail.trim() || undefined,
        shippingAddress: shippingAddress.trim(),
        notes: notes.trim() || undefined,
      });

      const orderNumber = res.data.data.orderNumber;
      localStorage.removeItem(getCartSessionKey(slug));
      if (guestPhone.trim()) {
        sessionStorage.setItem(`order_phone_${orderNumber}`, guestPhone.trim());
      }

      // Create payment link and redirect
      try {
        const payRes = await api.post("/api/v1/payments/create-link", {
          orderNumber,
          amount: cart.subtotal,
          currency: "SAR",
          callbackUrl: `${window.location.origin}/store/${slug}/orders/${orderNumber}`,
        });
        if (payRes.data.success && payRes.data.data.paymentUrl) {
          window.location.href = payRes.data.data.paymentUrl;
          return;
        }
      } catch {
        // Payment creation failed, still redirect to order page
      }
      router.push(`/store/${slug}/orders/${orderNumber}`);
    } catch (err: any) {
      setError(err.response?.data?.message || t("checkout.errorPlacingOrder"));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-500 mb-4">{t("checkout.emptyCart")}</p>
          <Link
            href={`/store/${slug}`}
            className="store-btn inline-block text-sm"
          >
            {t("cart.browseProducts")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>
      )}

      {/* Cart summary for review */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-100 mb-6">
        {cart.items.map((item) => (
          <div key={item.id} className="p-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-gray-800 font-medium">{item.productNameAr}</p>
              <p className="text-sm text-gray-500 mt-1">
                {item.quantity} × {t("cart.priceSAR", { price: item.priceAtAdd.toFixed(2) })}
              </p>
            </div>
            <p className="font-bold text-gray-800">{t("cart.priceSAR", { price: item.lineTotal.toFixed(2) })}</p>
          </div>
        ))}
        <div className="p-4 flex items-center justify-between">
          <span className="text-gray-600 font-medium">{t("cart.total")}</span>
          <span className="text-xl font-bold store-price">
            {t("cart.priceSAR", { price: cart.subtotal.toFixed(2) })}
          </span>
        </div>
      </div>

      {/* Shipping form - always direct, no login/guest step */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 space-y-4"
      >
        {loggedIn && (
          <p className="text-sm text-green-700 bg-green-50 rounded p-3">
            {t("checkout.loggedInNotice")}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("checkout.nameLabel")}{!loggedIn && " *"}
          </label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme)]"
            required={!loggedIn}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("checkout.phoneLabel")}{!loggedIn && " *"}
          </label>
          <input
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme)]"
            required={!loggedIn}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("checkout.emailLabel")}
          </label>
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("checkout.shippingAddressLabel")}
          </label>
          <textarea
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme)]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("checkout.notesLabel")}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme)]"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="store-btn w-full disabled:bg-gray-300"
        >
          {submitting ? t("checkout.confirming") : t("checkout.confirmOrder")}
        </button>
      </form>
    </div>
  );
}

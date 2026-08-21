"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import SuccessToast from "@/components/SuccessToast";
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

export default function CartPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;

  const [storeId, setStoreId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);

  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponsEnabled, setCouponsEnabled] = useState(true);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null);
  const [vatRate, setVatRate] = useState<number>(0);

  const loadCart = async (sId: number) => {
    const sessionId = localStorage.getItem(getCartSessionKey(slug));
    if (!sessionId) {
      setCart(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get(`/stores/${sId}/cart`, { params: { sessionId } });
      setCart(res.data.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setCart(null);
      } else {
        setError(err.response?.data?.message || t("cart.errorLoadingCart"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError("");
      try {
        const storeRes = await api.get(`/public/stores/${slug}`);
        const id = storeRes.data.data.id;
        setStoreId(id);
        setCouponsEnabled(storeRes.data.data.isCouponsEnabled !== false);
        setFreeShippingThreshold(storeRes.data.data.freeShippingThreshold ?? null);
        setVatRate(storeRes.data.data.vatRate ?? 0);
        await loadCart(id);
      } catch (err: any) {
        setError(err.response?.data?.message || t("cart.errorLoadingStore"));
        setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const resetCouponOnCartChange = () => {
    setDiscountAmount(null);
    setCouponSuccess("");
    setCouponError("");
  };

  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    if (!storeId || newQuantity < 1) return;
    setUpdatingItemId(itemId);
    setError("");
    try {
      const res = await api.put(`/stores/${storeId}/cart/items/${itemId}`, {
        quantity: newQuantity,
      });
      setCart(res.data.data);
      resetCouponOnCartChange();
    } catch (err: any) {
      setError(err.response?.data?.message || t("cart.errorUpdatingQuantity"));
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!storeId) return;
    setUpdatingItemId(itemId);
    setError("");
    try {
      await api.delete(`/stores/${storeId}/cart/items/${itemId}`);
      await loadCart(storeId);
      resetCouponOnCartChange();
    } catch (err: any) {
      setError(err.response?.data?.message || t("cart.errorRemovingItem"));
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleApplyCoupon = async () => {
    if (!storeId || !cart || !couponCode.trim()) return;

    setApplyingCoupon(true);
    setCouponError("");
    setCouponSuccess("");
    setDiscountAmount(null);

    try {
      const res = await api.post(`/stores/${storeId}/cart/apply-coupon`, {
        cartId: cart.id,
        code: couponCode.trim(),
      });
      setDiscountAmount(res.data.data.discountAmount);
      setCouponSuccess(
        `${res.data.message || t("cart.couponAppliedSuccess")} — ${t("cart.discountValueLabel", { amount: res.data.data.discountAmount.toFixed(2) })}`
      );
    } catch (err: any) {
      setCouponError(err.response?.data?.message || t("cart.errorApplyingCoupon"));
    } finally {
      setApplyingCoupon(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  const finalTotal =
    cart && discountAmount !== null
      ? Math.max(0, cart.subtotal - discountAmount)
      : cart?.subtotal ?? 0;

  const vatAmount = vatRate > 0 ? Math.round(finalTotal * vatRate * 100) / 100 : 0;
  const grandTotal = finalTotal + vatAmount;
  const remainingForFreeShipping =
    freeShippingThreshold !== null && freeShippingThreshold > 0
      ? Math.max(0, freeShippingThreshold - finalTotal)
      : null;
  const freeShippingPct =
    freeShippingThreshold !== null && freeShippingThreshold > 0
      ? Math.min(100, Math.round((finalTotal / freeShippingThreshold) * 100))
      : 100;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {error && (
        <div className="alert alert--danger mb-4">{error}</div>
      )}

      {!cart || cart.items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-500 mb-4">{t("cart.empty")}</p>
          <Link
            href={`/store/${slug}`}
            className="store-btn inline-block text-sm"
          >
            {t("cart.browseProducts")}
          </Link>
        </div>
      ) : (
        <>
          {remainingForFreeShipping !== null && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
              <p className="text-sm font-medium mb-2" style={{ color: remainingForFreeShipping > 0 ? "#0F172A" : "#15803D" }}>
                {remainingForFreeShipping > 0
                  ? t("cart.freeShippingBar", { remaining: remainingForFreeShipping.toFixed(2) })
                  : t("cart.freeShippingReached")}
              </p>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${freeShippingPct}%`,
                    background: remainingForFreeShipping > 0 ? "linear-gradient(90deg,#3B82F6,#8B5CF6)" : "#22C55E",
                  }}
                />
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-100 mb-6">
            {cart.items.map((item) => (
              <div key={item.id} className="p-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <div className="w-full sm:w-auto sm:flex-1 min-w-0">
                  <p className="text-gray-800 font-medium">{item.productNameAr}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("cart.pricePerUnit", { price: item.priceAtAdd.toFixed(2) })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    disabled={updatingItemId === item.id || item.quantity <= 1}
                    className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    −
                  </button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    disabled={updatingItemId === item.id}
                    className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    +
                  </button>
                </div>

                <p className="w-24 text-left font-bold text-gray-800">
                  {t("cart.priceSAR", { price: item.lineTotal.toFixed(2) })}
                </p>

                <button
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={updatingItemId === item.id}
                  className="text-red-600 hover:underline text-sm disabled:opacity-40"
                >
                  {t("cart.remove")}
                </button>
              </div>
            ))}
          </div>

          {/* Coupon */}
          {couponsEnabled && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">{t("cart.haveCoupon")}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder={t("cart.couponPlaceholder")}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme)]"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={applyingCoupon || !couponCode.trim()}
                className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:bg-gray-300 transition text-sm"
              >
                {applyingCoupon ? t("cart.applyingCoupon") : t("cart.applyCoupon")}
              </button>
            </div>

            {couponError && (
              <div className="alert alert--danger mt-3">
                {couponError}
              </div>
            )}
            <SuccessToast message={couponSuccess} fixed className="mb-4" />
          </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            {discountAmount !== null && (
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-gray-500">{t("cart.totalBeforeDiscount")}</span>
                <span className="text-gray-500">{t("cart.priceSAR", { price: cart.subtotal.toFixed(2) })}</span>
              </div>
            )}
            {discountAmount !== null && (
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-gray-500">{t("cart.discountValue")}</span>
                <span className="text-green-600">− {t("cart.priceSAR", { price: discountAmount.toFixed(2) })}</span>
              </div>
            )}
            {vatRate > 0 && (
              <>
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-gray-500">{t("cart.vatAmount", { vatRate: Math.round(vatRate * 100) })}</span>
                  <span className="text-gray-700">{t("cart.priceSAR", { price: vatAmount.toFixed(2) })}</span>
                </div>
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-gray-500">{t("cart.shipping")}</span>
                  <span className="text-gray-400">{t("cart.shippingEstimate")}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between mb-4 pt-2 border-t border-gray-100">
              <span className="text-gray-600 font-medium">
                {discountAmount !== null ? t("cart.totalAfterDiscount") : t("cart.total")}
              </span>
              <span className="text-xl font-bold store-price">
                {t("cart.priceSAR", { price: grandTotal.toFixed(2) })}
              </span>
            </div>

            <Link
              href={`/store/${slug}/checkout`}
              className="store-btn block w-full text-center"
            >
              {t("cart.checkout")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

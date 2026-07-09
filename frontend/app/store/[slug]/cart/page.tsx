"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

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
        setError(err.response?.data?.message || "حدث خطأ أثناء تحميل السلة");
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
        await loadCart(id);
      } catch (err: any) {
        setError(err.response?.data?.message || "حدث خطأ أثناء تحميل المتجر");
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
      setError(err.response?.data?.message || "حدث خطأ أثناء تحديث الكمية");
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
      setError(err.response?.data?.message || "حدث خطأ أثناء حذف المنتج");
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
      setCouponSuccess(res.data.message || "تم تطبيق الكوبون بنجاح");
    } catch (err: any) {
      setCouponError(err.response?.data?.message || "حدث خطأ أثناء تطبيق الكوبون");
    } finally {
      setApplyingCoupon(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    );
  }

  const finalTotal =
    cart && discountAmount !== null
      ? Math.max(0, cart.subtotal - discountAmount)
      : cart?.subtotal ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-4">
        <Link href={`/store/${slug}`} className="text-blue-600 hover:underline text-sm">
          ← العودة للمتجر
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">سلة المشتريات</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>
      )}

      {!cart || cart.items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-500 mb-4">سلتك فارغة حاليًا</p>
          <Link
            href={`/store/${slug}`}
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm"
          >
            تصفح المنتجات
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-100 mb-6">
            {cart.items.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-gray-800 font-medium">{item.productNameAr}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {item.priceAtAdd.toFixed(2)} ر.س / قطعة
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    disabled={updatingItemId === item.id || item.quantity <= 1}
                    className="w-8 h-8 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    −
                  </button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    disabled={updatingItemId === item.id}
                    className="w-8 h-8 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    +
                  </button>
                </div>

                <p className="w-24 text-left font-bold text-gray-800">
                  {item.lineTotal.toFixed(2)} ر.س
                </p>

                <button
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={updatingItemId === item.id}
                  className="text-red-600 hover:underline text-sm disabled:opacity-40"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>

          {/* Coupon */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">لديك كود خصم؟</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="أدخل كود الكوبون"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={applyingCoupon || !couponCode.trim()}
                className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:bg-gray-300 transition text-sm"
              >
                {applyingCoupon ? "جاري التطبيق..." : "تطبيق"}
              </button>
            </div>

            {couponError && (
              <div className="bg-red-50 text-red-600 p-3 rounded mt-3 text-sm">
                {couponError}
              </div>
            )}
            {couponSuccess && discountAmount !== null && (
              <div className="bg-green-50 text-green-700 p-3 rounded mt-3 text-sm">
                {couponSuccess} — قيمة الخصم: {discountAmount.toFixed(2)} ر.س
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            {discountAmount !== null && (
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-gray-500">الإجمالي قبل الخصم</span>
                <span className="text-gray-500">{cart.subtotal.toFixed(2)} ر.س</span>
              </div>
            )}
            {discountAmount !== null && (
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-gray-500">قيمة الخصم</span>
                <span className="text-green-600">− {discountAmount.toFixed(2)} ر.س</span>
              </div>
            )}
            <div className="flex items-center justify-between mb-4 pt-2 border-t border-gray-100">
              <span className="text-gray-600 font-medium">
                {discountAmount !== null ? "الإجمالي بعد الخصم" : "الإجمالي"}
              </span>
              <span className="text-xl font-bold text-blue-600">
                {finalTotal.toFixed(2)} ر.س
              </span>
            </div>

            <Link
              href={`/store/${slug}/checkout`}
              className="block w-full text-center bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition font-medium"
            >
              إتمام الشراء
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
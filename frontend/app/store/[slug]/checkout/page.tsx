"use client";
import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

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
          setError(err.response?.data?.message || "حدث خطأ أثناء تحميل السلة");
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
      setError("عنوان الشحن مطلوب");
      return;
    }
    if (!loggedIn && (!guestName.trim() || !guestPhone.trim())) {
      setError("الاسم ورقم الجوال مطلوبان");
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
      router.push(`/store/${slug}/orders/${orderNumber}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء إتمام الطلب");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-500 mb-4">سلتك فارغة، لا يمكن إتمام الطلب</p>
          <Link
            href={`/store/${slug}`}
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm"
          >
            تصفح المنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-4">
        <Link href={`/store/${slug}/cart`} className="text-blue-600 hover:underline text-sm">
          ← العودة للسلة
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">إتمام الشراء</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>
      )}

      {/* ملخص السلة للمراجعة */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-100 mb-6">
        {cart.items.map((item) => (
          <div key={item.id} className="p-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-gray-800 font-medium">{item.productNameAr}</p>
              <p className="text-sm text-gray-500 mt-1">
                {item.quantity} × {item.priceAtAdd.toFixed(2)} ر.س
              </p>
            </div>
            <p className="font-bold text-gray-800">{item.lineTotal.toFixed(2)} ر.س</p>
          </div>
        ))}
        <div className="p-4 flex items-center justify-between">
          <span className="text-gray-600 font-medium">الإجمالي</span>
          <span className="text-xl font-bold text-blue-600">
            {cart.subtotal.toFixed(2)} ر.س
          </span>
        </div>
      </div>

      {/* فورم بيانات الشحن — فورم واحد مباشر دائمًا، بدون خطوة تسجيل دخول/ضيف */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 space-y-4"
      >
        {loggedIn && (
          <p className="text-sm text-green-700 bg-green-50 rounded p-3">
            أنت مسجل دخول، سيتم ربط الطلب بحسابك تلقائيًا
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            الاسم{!loggedIn && " *"}
          </label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={!loggedIn}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            رقم الجوال{!loggedIn && " *"}
          </label>
          <input
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={!loggedIn}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            البريد الإلكتروني (اختياري)
          </label>
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            عنوان الشحن *
          </label>
          <textarea
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ملاحظات (اختياري)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition font-medium"
        >
          {submitting ? "جاري تأكيد الطلب..." : "تأكيد الطلب"}
        </button>
      </form>
    </div>
  );
}
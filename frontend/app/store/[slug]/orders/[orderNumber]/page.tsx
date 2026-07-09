"use client";
import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

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

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  New: { label: "جديد", className: "bg-blue-100 text-blue-700" },
  Processing: { label: "قيد التجهيز", className: "bg-yellow-100 text-yellow-700" },
  Shipped: { label: "تم الشحن", className: "bg-purple-100 text-purple-700" },
  Delivered: { label: "تم التسليم", className: "bg-green-100 text-green-700" },
  Returned: { label: "مرتجع", className: "bg-red-100 text-red-700" },
};

function sessionPhoneKey(orderNumber: string) {
  return `order_phone_${orderNumber}`;
}

export default function OrderDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const orderNumber = params.orderNumber as string;

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

      // 1. مسجل دخول؟ جرب مباشرة من غير رقم جوال (الباك إند بيتحقق بالتوكن)
      if (isAuthenticated()) {
        const ok = await fetchOrder();
        if (ok) {
          setLoading(false);
          return;
        }
      }

      // 2. جاي لسه من نفس جلسة الـ Checkout؟ (رقم الجوال محفوظ مؤقتًا)
      const storedPhone = sessionStorage.getItem(sessionPhoneKey(orderNumber));
      if (storedPhone) {
        const ok = await fetchOrder(storedPhone);
        if (ok) {
          setLoading(false);
          return;
        }
      }

      // 3. غير ذلك (Deep Link): اعرض فورم التحقق
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
      setError("رقم الطلب أو رقم الجوال غير صحيح");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    );
  }

  if (needsVerification && !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-xl font-bold text-gray-800 mb-6 text-center">
          التحقق من الطلب
        </h1>
        <form
          onSubmit={handleVerify}
          className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رقم الطلب
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
              رقم الجوال المستخدم في الطلب
            </label>
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={verifying}
            className="w-full bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition font-medium"
          >
            {verifying ? "جاري التحقق..." : "عرض تفاصيل الطلب"}
          </button>
        </form>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500 mb-4">تعذّر عرض تفاصيل الطلب</p>
        <Link href={`/store/${slug}`} className="text-blue-600 hover:underline text-sm">
          العودة للمتجر
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
      <div className="mb-4">
        <Link href={`/store/${slug}`} className="text-blue-600 hover:underline text-sm">
          ← العودة للمتجر
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">تفاصيل الطلب</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
        <p className="text-sm text-gray-500">رقم الطلب</p>
        <p className="text-lg font-bold text-gray-800 mb-4">{order.orderNumber}</p>

        <p className="text-sm text-gray-500">عنوان الشحن</p>
        <p className="text-gray-800 mb-4">{order.shippingAddress}</p>

        {order.notes && (
          <>
            <p className="text-sm text-gray-500">ملاحظات</p>
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
                {item.quantity} × {item.unitPriceSnapshot.toFixed(2)} ر.س
              </p>
            </div>
            <p className="font-bold text-gray-800">{item.lineTotal.toFixed(2)} ر.س</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-gray-500">الإجمالي قبل الخصم</span>
          <span className="text-gray-500">{order.subTotal.toFixed(2)} ر.س</span>
        </div>
        {order.discountAmount > 0 && (
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-500">قيمة الخصم</span>
            <span className="text-green-600">− {order.discountAmount.toFixed(2)} ر.س</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-gray-600 font-medium">الإجمالي النهائي</span>
          <span className="text-xl font-bold text-blue-600">
            {order.totalAmount.toFixed(2)} ر.س
          </span>
        </div>
      </div>
    </div>
  );
}
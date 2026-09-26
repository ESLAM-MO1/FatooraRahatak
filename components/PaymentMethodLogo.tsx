"use client";

interface PaymentMethodLogoProps {
  method: string;
  size?: number;
}

/**
 * لوجوهات طرق الدفع بأسلوب احترافي مثل المواقع الحقيقية (Stripe/Shopify).
 * كل أيقونة بخلفية ملونة + رمز واضح — مقاسها 44px (حجم مثالي للأزرار).
 */
export default function PaymentMethodLogo({ method, size = 44 }: PaymentMethodLogoProps) {
  const s = size;

  switch (method) {
    case "Cash":
      return (
        <svg width={s} height={s} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="10" fill="#059669" />
          <rect x="10" y="14" width="24" height="16" rx="3" fill="white" />
          <circle cx="22" cy="22" r="3.5" fill="#059669" />
          <path d="M32 19v6" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 19v6" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
          <text x="22" y="34" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">نقداً</text>
        </svg>
      );

    case "Mada":
      return (
        <div className="w-14 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center overflow-hidden px-1 py-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/payment/mada.png" alt="مدى" className="max-w-full max-h-full object-contain" />
        </div>
      );

    case "CreditCard":
      return (
        <svg width={s} height={s} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="10" fill="#2563EB" />
          <rect x="6" y="11" width="32" height="20" rx="3" fill="white" />
          <rect x="6" y="15" width="32" height="5" fill="#E2E8F0" />
          <path d="M10 24h8" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 27h5" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
          <text x="22" y="38" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">بطاقة</text>
        </svg>
      );

    case "BankTransfer":
      return (
        <svg width={s} height={s} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="10" fill="#1E40AF" />
          <rect x="8" y="10" width="28" height="20" rx="3" fill="white" />
          <path d="M10 18l12-6 12 6" stroke="#1E40AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 20v6M17 20v6M22 20v6M27 20v6M32 20v6" stroke="#1E40AF" strokeWidth="1.5" strokeLinecap="round" />
          <text x="22" y="38" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="bold">تحويل</text>
        </svg>
      );

    case "Tabby":
      return (
        <div className="w-14 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center overflow-hidden px-1 py-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/payment/tabby.png" alt="تابي" className="max-w-full max-h-full object-contain" />
        </div>
      );

    case "Tamara":
      return (
        <div className="w-14 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center overflow-hidden px-1 py-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/payment/tamara.png" alt="تمارا" className="max-w-full max-h-full object-contain" />
        </div>
      );

    case "PayPal":
      return (
        <div className="w-9 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center overflow-hidden px-1 py-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/payment/paypal.png" alt="PayPal" className="max-w-full max-h-full object-contain" />
        </div>
      );

    default:
      return null;
  }
}
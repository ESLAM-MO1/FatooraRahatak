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
        <svg width={s} height={s} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="10" fill="#1A3B6C" />
          <rect x="6" y="12" width="32" height="18" rx="3" fill="white" />
          <rect x="6" y="16" width="32" height="5" fill="#F9A825" />
          <circle cx="16" cy="23" r="3.5" fill="#F9A825" />
          <path d="M24 21.5l2 2 3-3" stroke="#1A3B6C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="22" y="38" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">مدى</text>
        </svg>
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
        <svg width={s} height={s} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="10" fill="#5A31F4" />
          <rect x="8" y="10" width="28" height="20" rx="5" fill="white" />
          <text x="22" y="24" textAnchor="middle" fill="#5A31F4" fontSize="14" fontWeight="bold" fontFamily="Arial">Tabby</text>
          <text x="22" y="38" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="bold">تابي</text>
        </svg>
      );

    case "Tamara":
      return (
        <svg width={s} height={s} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="10" fill="#FF6B9D" />
          <rect x="8" y="10" width="28" height="20" rx="5" fill="white" />
          <text x="22" y="24" textAnchor="middle" fill="#FF6B9D" fontSize="12" fontWeight="bold" fontFamily="Arial">Tamara</text>
          <text x="22" y="38" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="bold">تمارا</text>
        </svg>
      );

    default:
      return null;
  }
}
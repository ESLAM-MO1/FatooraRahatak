"use client";

interface PaymentMethodLogoProps {
  method: string;
  size?: number;
}

/**
 * لوجوهات طرق الدفع المعروضة في نقطة البيع والدفع (نقدًا، شبكة، تحويل بنكي، تابي، تمارا، بطاقة).
 * تُرسم كـ SVG مضمّنة (بدون طلبات خارجية)، بأسلوب "badge" موحّد:
 * مربع بحواف دائرية بلون العلامة التجارية + رمز أبيض بسيط بالمنتصف.
 * هذا الأسلوب المتّسق هو نفس المنطق اللي بتستخدمه المنصات الاحترافية (Stripe, Salla, ...)
 * بدل رسومات كرتونية مختلفة الأسلوب لكل أيقونة.
 */
export default function PaymentMethodLogo({ method, size = 20 }: PaymentMethodLogoProps) {
  const common = { width: size, height: size } as const;
  const r = 6.5; // نصف قطر حواف الـ badge (نسبة إلى viewBox 0 0 24 24)

  switch (method) {
    case "Cash":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none">
          <rect x="1.5" y="1.5" width="21" height="21" rx={r} fill="#0F9D58" />
          <rect x="6" y="9" width="12" height="7.5" rx="1.6" stroke="white" strokeWidth="1.5" />
          <circle cx="12" cy="12.75" r="1.6" fill="white" />
          <path d="M6 11v3.5M18 11v3.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );

    case "Mada":
    case "CreditCard":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none">
          <rect x="1.5" y="1.5" width="21" height="21" rx={r} fill="#0B5FA5" />
          <rect x="5.5" y="8" width="13" height="9" rx="1.6" stroke="white" strokeWidth="1.5" />
          <path d="M5.5 11.2h13" stroke="white" strokeWidth="1.5" />
          <path d="M8 14.3h3" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );

    case "BankTransfer":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none">
          <rect x="1.5" y="1.5" width="21" height="21" rx={r} fill="#1D4ED8" />
          <path d="M6 10.5l6-4 6 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 10.5v6M11 10.5v6M13 10.5v6M17.5 10.5v6" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M5.5 17h13" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M5 19.2h14" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );

    case "Tabby":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none">
          <rect x="1.5" y="1.5" width="21" height="21" rx={r} fill="#5A31F4" />
          <rect x="6" y="6" width="5" height="5" rx="1.2" fill="white" />
          <rect x="13" y="6" width="5" height="5" rx="1.2" fill="white" fillOpacity="0.45" />
          <rect x="6" y="13" width="5" height="5" rx="1.2" fill="white" fillOpacity="0.45" />
          <rect x="13" y="13" width="5" height="5" rx="1.2" fill="white" fillOpacity="0.45" />
        </svg>
      );

    case "Tamara":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none">
          <rect x="1.5" y="1.5" width="21" height="21" rx={r} fill="#EF5DA8" />
          <rect x="6" y="6" width="5" height="5" rx="1.2" fill="white" />
          <rect x="13" y="6" width="5" height="5" rx="1.2" fill="white" fillOpacity="0.45" />
          <rect x="6" y="13" width="5" height="5" rx="1.2" fill="white" fillOpacity="0.45" />
          <rect x="13" y="13" width="5" height="5" rx="1.2" fill="white" fillOpacity="0.45" />
        </svg>
      );

    default:
      return null;
  }
}
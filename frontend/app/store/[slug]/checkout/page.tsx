"use client";
import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { customerApi } from "@/lib/customerApi";
import { isAuthenticated } from "@/lib/auth";
import { getQuickCustomer } from "@/lib/quickCustomer";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import PhoneInputField from "@/components/PhoneInputField";

// === تتبع التحويلات من السيرفر: قراءة كوكيز بيكسل فيسبوك وجوجل أناليتكس (لو موجودة) ===
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// كوكي _ga بيكون بالشكل GA1.2.XXXXXXXXXX.YYYYYYYYYY — الـ client_id المطلوب هو آخر جزئين
function getGa4ClientId(): string | undefined {
  const raw = getCookie("_ga");
  if (!raw) return undefined;
  const parts = raw.split(".");
  if (parts.length >= 4) return `${parts[2]}.${parts[3]}`;
  return undefined;
}

interface CustomerAddress {
  id: number;
  fullName: string;
  city: string;
  addressLine: string;
  landmark?: string | null;
  notes?: string | null;
  isDefault: boolean;
}
interface CartItem {
  id: number;
  productId: number;
  productNameAr: string;
  variantId: number | null;
  quantity: number;
  priceAtAdd: number;
  lineTotal: number;
  weight?: number | null;
}

interface CartData {
  id: number;
  status: string;
  items: CartItem[];
  subtotal: number;
  totalWeightKg?: number;
}

function getCartSessionKey(slug: string) {
  return `cart_session_${slug}`;
}

const SHIPPING_LABEL_KEYS: Record<string, string> = {
  PickupFromStore: "checkout.shippingPickup",
  DeliveryToAddress: "checkout.shippingDelivery",
};

const PAYMENT_LABEL_KEYS: Record<string, string> = {
  CashOnDelivery: "checkout.paymentCashOnDelivery",
  CreditCard: "checkout.paymentCreditCard",
  PayPal: "checkout.paymentPayPal",
  BankTransfer: "checkout.paymentBankTransfer",
  Mada: "checkout.paymentMada",
  Tabby: "checkout.paymentTabby",
  Tamara: "checkout.paymentTamara",
  Moyasar: "checkout.paymentMoyasar",
};

function paymentIcon(type: string) {
  switch (type) {
    case "CashOnDelivery":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      );
    case "CreditCard":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 15h4" />
        </svg>
      );
    case "PayPal":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 3h5a5 5 0 0 1 5 5c0 .6-.1 1.2-.3 1.7" />
          <path d="M6 3h-2l3 13h2l1.2-5" />
          <path d="M9 11c1.2 0 2.3-1 2.3-2.3A2.3 2.3 0 0 0 9 6.5H6.5L8 11" />
        </svg>
      );
    case "BankTransfer":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h16" />
          <path d="M5 20v-8M9 20v-8M15 20v-8M19 20v-8" />
          <path d="M3 12V8l9-5 9 5v4" />
          <path d="M5 8h14" />
          <path d="M8 8v-1M16 8v-1" />
        </svg>
      );
    case "Mada":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="14" rx="3" fill="#2E3192" />
          <rect x="2" y="9" width="20" height="3" fill="#F9A825" />
          <circle cx="9" cy="14.5" r="2" fill="#F9A825" />
        </svg>
      );
    case "Tabby":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="16" rx="4" fill="#FFE1C9" />
          <path d="M7 9.5h2.5l2 2-2 2H7v-4zM14.5 9.5H17l-1.2 1.2-1.3-1.2z" fill="#F04E37" />
          <path d="M17 13.5h-2.5l-2-2 2-2H17v4zM9.5 13.5H7l1.2-1.2 1.3 1.2z" fill="#2E2E38" />
        </svg>
      );
    case "Tamara":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#FF6B9D" />
          <path d="M7.5 9.2c.9 0 1.5-.4 1.5-1.2S8.4 6.8 7.5 6.8 6 7.2 6 8s.6 1.2 1.5 1.2z" fill="#fff" />
          <path d="M16.5 9.2c.9 0 1.5-.4 1.5-1.2s-.6-1.2-1.5-1.2-1.5.4-1.5 1.2.6 1.2 1.5 1.2z" fill="#fff" />
          <path d="M12 17.2c2.2 0 3.8-1.4 3.8-3.2H8.2c0 1.8 1.6 3.2 3.8 3.2z" fill="#fff" />
        </svg>
      );
    case "Moyasar":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 15h4" />
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v10M8.5 9.5 12 7l3.5 2.5" />
        </svg>
      );
  }
}

interface MethodOption {
  type: string;
}

interface ShippingCompanyOption {
  id: number;
  name: string;
  code: string;
  isDefault: boolean;
}

interface ShippingQuote {
  available: boolean;
  shippingCost: number;
  currency: string;
  companyName: string;
  estimatedDeliveryDays: number;
  isFreeShipping: boolean;
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

  const [addrRegion, setAddrRegion] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrDistrict, setAddrDistrict] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrBuilding, setAddrBuilding] = useState("");
  const [addrPostal, setAddrPostal] = useState("");

  const [shippingMethods, setShippingMethods] = useState<MethodOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<MethodOption[]>([]);
  const [shippingCompanies, setShippingCompanies] = useState<ShippingCompanyOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">("new");
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const shippingLabel = (type: string) =>
    SHIPPING_LABEL_KEYS[type] ? t(SHIPPING_LABEL_KEYS[type]) : type;
  const paymentLabel = (type: string) =>
    PAYMENT_LABEL_KEYS[type] ? t(PAYMENT_LABEL_KEYS[type]) : type;

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError("");

      const authed = isAuthenticated();
      setLoggedIn(authed);
      if (authed) {
        setGuestName(localStorage.getItem("fullName") || "");
        setGuestEmail(localStorage.getItem("email") || "");
      } else {
        const quick = getQuickCustomer(slug);
        if (quick) {
          if (!guestName && quick.fullName) setGuestName(quick.fullName);
          if (!guestPhone && quick.phone) setGuestPhone(quick.phone);
          if (!guestEmail && quick.email) setGuestEmail(quick.email);
          if (!shippingAddress && quick.lastAddress) setShippingAddress(quick.lastAddress);
        }
      }

      try {
        const storeRes = await api.get(`/public/stores/${slug}`);
        const id = storeRes.data.data.id;

        const shipOptions = (storeRes.data.data.shippingMethods || []) as MethodOption[];
        const payOptions = (storeRes.data.data.paymentMethods || []) as MethodOption[];
        const cardEnabled = storeRes.data.data.isCardPaymentsEnabled !== false;
        const filteredPay = cardEnabled
          ? payOptions
          : payOptions.filter((m) => m.type !== "CreditCard");
        setShippingMethods(shipOptions);
        setPaymentMethods(filteredPay);
        const companies = (storeRes.data.data.shippingCompanies || []) as ShippingCompanyOption[];
        setShippingCompanies(companies);
        setSelectedShipping((prev) => prev || shipOptions[0]?.type || null);
        setSelectedPayment((prev) =>
          prev ||
          (filteredPay.some((m) => m.type === "CreditCard")
            ? "CreditCard"
            : filteredPay[0]?.type || null)
        );

        const sessionId = localStorage.getItem(getCartSessionKey(slug));
        if (!sessionId) {
          setCart(null);
          setLoading(false);
          return;
        }

        const cartRes = await api.get(`/stores/${id}/cart`, { params: { sessionId } });
        setCart(cartRes.data.data);

        const quick = getQuickCustomer(slug);
        if (quick?.sessionToken) {
          try {
            const addrRes = await customerApi<{ data: CustomerAddress[] }>(
              `/public/stores/${slug}/customer/addresses`,
              quick.sessionToken
            );
            const list = addrRes.data || [];
            setSavedAddresses(list);
            const def = list.find((a: CustomerAddress) => a.isDefault) || list[0];
            if (def) {
              setSelectedAddressId(String(def.id));
              setGuestName(def.fullName);
              setShippingAddress(def.addressLine);
            }
          } catch {
            /* ignore address fetch errors on checkout */
          }
        }
      } catch (err) {
        const e = err as { response?: { status?: number; data?: { message?: string } } };
        if (e.response?.status === 404) {
          setCart(null);
        } else {
          setError(e.response?.data?.message || t("checkout.errorLoadingCart"));
        }
      } finally {
        setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (selectedShipping !== "DeliveryToAddress" || !shippingAddress.trim() || shippingAddress.trim().length < 3) {
      setQuote(null);
      return;
    }
    const sessionId = localStorage.getItem(getCartSessionKey(slug));
    if (!sessionId) return;

    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const res = await api.post(`/public/stores/${slug}/shipping-quote`, {
          sessionId,
          shippingAddress: shippingAddress.trim(),
        });
        setQuote(res.data.data);
      } catch {
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingAddress, selectedShipping, slug]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!cart) return;

    const composedAddress = [addrRegion, addrCity, addrDistrict, addrStreet, addrBuilding ? `مبنى ${addrBuilding}` : null, addrPostal ? `الرمز البريدي ${addrPostal}` : null]
      .filter(Boolean)
      .join("، ");
    if (!addrCity.trim()) {
      setError(t("checkout.shippingAddressRequired"));
      return;
    }
    if (!selectedShipping || !selectedPayment) {
      setError(t("checkout.methodsRequired"));
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
      if (!sessionId) {
        setSubmitting(false);
        setError(t("checkout.cartSessionExpired"));
        router.push(`/store/${slug}/cart`);
        return;
      }
      const body: {
        sessionId: string;
        guestName?: string;
        guestPhone?: string;
        guestEmail?: string;
        shippingAddress: string;
        notes?: string;
        shippingMethod: string | null;
        paymentMethod: string | null;
        marketingSource?: string;
        marketingCampaign?: string;
        gaClientId?: string;
        fbClickId?: string;
        fbBrowserId?: string;
      } = {
        sessionId,
        guestName: guestName.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
        guestEmail: guestEmail.trim() || undefined,
        shippingAddress: composedAddress,
        notes: notes.trim() || undefined,
        shippingMethod: selectedShipping,
        paymentMethod: selectedPayment,
        marketingSource: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("utm_source") || undefined : undefined,
        marketingCampaign: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("utm_campaign") || undefined : undefined,
        // تتبع التحويلات من السيرفر: بتُقرأ من كوكيز بيكسل فيسبوك وجوجل أناليتكس (لو موجودة على المتصفح)
        // وبتتبعت مع الطلب لإرسالها لاحقًا عبر Meta Conversions API / GA4 Measurement Protocol
        gaClientId: getGa4ClientId(),
        fbClickId: getCookie("_fbc") || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("fbclid") || undefined : undefined),
        fbBrowserId: getCookie("_fbp"),
      };
      const res = await api.post(`/public/stores/${slug}/checkout`, body);

      const orderNumber = res.data.data.orderNumber;
      const paymentLinkUrl = res.data.data.paymentLinkUrl;
      const paymentMessage = res.data.data.paymentMessage;
      const paymentMethod = res.data.data.paymentMethod;
      localStorage.removeItem(getCartSessionKey(slug));
      if (guestPhone.trim()) {
        sessionStorage.setItem(`order_phone_${orderNumber}`, guestPhone.trim());
      }

      // الدفع عند الاستلام: يُنجز الطلب مباشرة بدون تحويل لبوابة الدفع
      if (selectedPayment === "CashOnDelivery") {
        router.push(`/store/${slug}/thank-you/${orderNumber}`);
        return;
      }

      // الحوالة البنكية: يُنجز الطلب ويظهر للعميل بيانات الحساب + رفع الإيصال
      if (selectedPayment === "BankTransfer") {
        router.push(`/store/${slug}/thank-you/${orderNumber}`);
        return;
      }

      // الدفع الإلكتروني: نستخدم رابط الدفع المرتبط بالطلب من الباك إند مباشرة
      // (بطاقة عبر ميسرة أو PayPal)
      if (paymentLinkUrl) {
        setSubmitting(false);
        window.location.assign(paymentLinkUrl);
        return;
      }

      // فشل إنشاء رابط الدفع: نعرض خطأ واضح بدل تحويل صامت
      setSubmitting(false);
      setError(paymentMessage || t("checkout.paymentUnavailable"));
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t("checkout.errorPlacingOrder"));
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
    <div className="max-w-6xl mx-auto px-4 py-6">
      {error && (
        <div className="alert alert--danger mb-4">{error}</div>
      )}

      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start">
        {/* Main column */}
        <div className="space-y-6">

      {/* Shipping method selection */}
      {shippingMethods.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 rounded-full bg-[var(--theme)]/10 text-[var(--theme)] text-[13px] font-bold flex items-center justify-center">1</span>
            <p className="text-[14px] font-bold text-gray-800">{t("checkout.shippingMethodLabel")}</p>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shippingMethods.map((m) => {
              const active = selectedShipping === m.type;
              return (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => setSelectedShipping(m.type)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition cursor-pointer ${
                    active
                      ? "border-[var(--theme)] bg-[var(--theme)]/[0.06] shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <span className={`text-sm font-semibold ${active ? "text-[var(--theme)]" : "text-gray-700"}`}>
                    {shippingLabel(m.type)}
                  </span>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                      active ? "border-[var(--theme)]" : "border-gray-300"
                    }`}
                  >
                    {active && <span className="w-2.5 h-2.5 rounded-full bg-[var(--theme)]" />}
                  </span>
                </button>
              );
            })}
          </div>

          {cart.totalWeightKg ? (
            <p className="mt-3 text-xs text-gray-500">
              {t("checkout.totalWeightLabel", { weight: cart.totalWeightKg })}
            </p>
          ) : null}

          {selectedShipping === "DeliveryToAddress" && shippingCompanies.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">{t("checkout.shippingCompanyLabel")}</span>
              <span className="text-sm font-bold text-gray-800">
                {shippingCompanies.find((c) => c.isDefault)?.name || shippingCompanies[0]?.name}
              </span>
            </div>
          )}

          {selectedShipping === "DeliveryToAddress" && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">{t("checkout.shippingCostLabel")}</span>
              {quoteLoading ? (
                <span className="text-sm text-gray-400">{t("checkout.calculatingShipping")}</span>
              ) : quote?.available ? (
                <span className="text-sm font-bold text-gray-800">
                  {quote.isFreeShipping
                    ? t("checkout.freeShipping")
                    : t("cart.priceSAR", { price: quote.shippingCost.toFixed(2) })}
                </span>
              ) : (
                <span className="text-xs text-gray-400">{t("checkout.enterAddressForShipping")}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payment method selection */}
      {paymentMethods.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 rounded-full bg-[var(--theme)]/10 text-[var(--theme)] text-[13px] font-bold flex items-center justify-center">2</span>
            <p className="text-[14px] font-bold text-gray-800">{t("checkout.paymentMethodLabel")}</p>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paymentMethods.map((m) => {
              const active = selectedPayment === m.type;
              return (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => setSelectedPayment(m.type)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition cursor-pointer ${
                    active
                      ? "border-[var(--theme)] bg-[var(--theme)]/[0.06] shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? "bg-[var(--theme)]/[0.12] text-[var(--theme)]" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {paymentIcon(m.type)}
                  </span>
                  <span className={`text-sm font-semibold flex-1 text-right ${active ? "text-[var(--theme)]" : "text-gray-700"}`}>
                    {paymentLabel(m.type)}
                  </span>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition shrink-0 ${
                      active ? "border-[var(--theme)]" : "border-gray-300"
                    }`}
                  >
                    {active && <span className="w-2.5 h-2.5 rounded-full bg-[var(--theme)]" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Shipping form - always direct, no login/guest step */}
      <form
        id="checkout-form"
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {loggedIn && (
          <div className="alert alert--success mx-5 mt-5">
            {t("checkout.loggedInNotice")}
          </div>
        )}

        {savedAddresses.length > 0 && (
          <div className="px-5 pt-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("checkout.savedAddresses")}
            </label>
            <div className="space-y-2">
              {savedAddresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${
                    selectedAddressId === String(addr.id)
                      ? "border-[var(--theme)] bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="savedAddress"
                    value={String(addr.id)}
                    checked={selectedAddressId === String(addr.id)}
                    onChange={() => {
                      setSelectedAddressId(String(addr.id));
                      setGuestName(addr.fullName);
                      setShippingAddress(addr.addressLine);
                    }}
                    className="accent-[var(--theme)] mt-0.5"
                  />
                  <span className="text-[13px] text-gray-700">
                    <b>{addr.fullName}</b> — {addr.city}، {addr.addressLine}
                    {addr.landmark ? ` (${addr.landmark})` : ""}
                  </span>
                </label>
              ))}
              <label
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${
                  selectedAddressId === "new"
                    ? "border-[var(--theme)] bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="savedAddress"
                  value="new"
                  checked={selectedAddressId === "new"}
                  onChange={() => {
                    setSelectedAddressId("new");
                    const quick = getQuickCustomer(slug);
                    setGuestName(quick?.fullName || "");
                    setShippingAddress("");
                  }}
                  className="accent-[var(--theme)] mt-0.5"
                />
                <span className="text-[13px] text-gray-700">{t("checkout.otherAddress")}</span>
              </label>
            </div>
            <a
              href={`/store/${slug}/account`}
              className="inline-block mt-2 text-[12px] font-bold text-blue-600 hover:text-blue-700"
            >
              {t("checkout.manageAddresses")}
            </a>
          </div>
        )}

        <div className="p-5 space-y-5">
          {/* Contact details section */}
          <div className="border-b border-gray-100 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-full bg-[var(--theme)]/10 text-[var(--theme)] text-[13px] font-bold flex items-center justify-center">3</span>
              <p className="text-[14px] font-bold text-gray-800">{t("checkout.sectionContact")}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("checkout.nameLabel")}{!loggedIn && " *"}
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme)] transition"
                required={!loggedIn}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("checkout.phoneLabel")}{!loggedIn && " *"}
              </label>
              <PhoneInputField
                value={guestPhone}
                onChange={setGuestPhone}
                required={!loggedIn}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-[var(--theme)]"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("checkout.emailLabel")}
              </label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme)] transition"
              />
            </div>
          </div>

          {/* Delivery details section */}
          <div className="border-b border-gray-100 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-full bg-[var(--theme)]/10 text-[var(--theme)] text-[13px] font-bold flex items-center justify-center">4</span>
              <p className="text-[14px] font-bold text-gray-800">{t("checkout.sectionDelivery")}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("checkout.shippingAddressLabel")}{" *"}
              </label>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input type="text" value={addrRegion} onChange={e => setAddrRegion(e.target.value)} placeholder={t("checkout.addressRegion")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme)] transition" />
                  </div>
                  <div>
                    <input type="text" value={addrCity} onChange={e => setAddrCity(e.target.value)} placeholder={t("checkout.addressCity")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme)] transition" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input type="text" value={addrDistrict} onChange={e => setAddrDistrict(e.target.value)} placeholder={t("checkout.addressDistrict")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme)] transition" />
                  </div>
                  <div>
                    <input type="text" value={addrStreet} onChange={e => setAddrStreet(e.target.value)} placeholder={t("checkout.addressStreet")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme)] transition" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input type="text" value={addrBuilding} onChange={e => setAddrBuilding(e.target.value)} placeholder={t("checkout.addressBuilding")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme)] transition" />
                  </div>
                  <div>
                    <input type="text" value={addrPostal} onChange={e => setAddrPostal(e.target.value)} placeholder={t("checkout.addressPostal")} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme)] transition" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-full bg-[var(--theme)]/10 text-[var(--theme)] text-[13px] font-bold flex items-center justify-center">5</span>
              <p className="text-[14px] font-bold text-gray-800">{t("checkout.sectionNotes")}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("checkout.notesLabel")}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme)] transition"
              />
            </div>
          </div>
        </div>
      </form>
        </div>
        {/* End main column */}

        {/* Sticky order summary sidebar */}
        <aside className="lg:sticky lg:top-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            <div className="px-5 py-4">
              <p className="text-[15px] font-bold text-gray-800">{t("checkout.yourOrderTitle")}</p>
            </div>
            <div className="px-5 py-3 max-h-64 overflow-y-auto">
              {cart.items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 text-sm font-medium truncate">{item.productNameAr}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.quantity} × {t("cart.priceSAR", { price: item.priceAtAdd.toFixed(2) })}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-800 shrink-0">{t("cart.priceSAR", { price: item.lineTotal.toFixed(2) })}</p>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm font-medium">{t("cart.subtotal")}</span>
                <span className="text-sm font-bold text-gray-700">
                  {t("cart.priceSAR", { price: cart.subtotal.toFixed(2) })}
                </span>
              </div>
              {selectedShipping === "DeliveryToAddress" && quote?.available ? (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">{t("checkout.shippingCostLabel")}</span>
                  <span className="text-sm font-bold text-gray-700">
                    {quote.isFreeShipping
                      ? t("checkout.freeShipping")
                      : t("cart.priceSAR", { price: quote.shippingCost.toFixed(2) })}
                  </span>
                </div>
              ) : selectedShipping === "DeliveryToAddress" ? (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">{t("checkout.shippingCostLabel")}</span>
                  <span className="text-xs text-gray-400">{t("checkout.enterAddressForShipping")}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                <span className="text-gray-700 font-bold">{t("cart.total")}</span>
                <span className="text-xl font-bold store-price">
                  {t("cart.priceSAR", {
                    price: (
                      cart.subtotal +
                      (selectedShipping === "DeliveryToAddress" && quote?.available ? quote.shippingCost : 0)
                    ).toFixed(2),
                  })}
                </span>
              </div>
            </div>
            <div className="px-5 py-4">
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                className="store-btn w-full disabled:bg-gray-300"
              >
                {submitting ? t("checkout.confirming") : t("checkout.confirmOrder")}
              </button>
              {(selectedPayment === "CreditCard" || selectedPayment === "PayPal" || selectedPayment === "BankTransfer" || selectedPayment === "Mada" || selectedPayment === "Tabby" || selectedPayment === "Tamara") && (
                <p className="mt-2.5 text-[11px] text-gray-400 text-center leading-relaxed">
                  {selectedPayment === "CreditCard"
                    ? t("checkout.securePaymentRedirect")
                    : selectedPayment === "PayPal"
                    ? t("checkout.paypalRedirect")
                    : selectedPayment === "Mada"
                    ? t("checkout.securePaymentRedirect")
                    : selectedPayment === "Tabby"
                    ? t("checkout.tabbyRedirect")
                    : selectedPayment === "Tamara"
                    ? t("checkout.tamaraRedirect")
                    : t("checkout.bankTransferInstructions")}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
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
};

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

    if (!shippingAddress.trim()) {
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
      } = {
        sessionId,
        guestName: guestName.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
        guestEmail: guestEmail.trim() || undefined,
        shippingAddress: shippingAddress.trim(),
        notes: notes.trim() || undefined,
        shippingMethod: selectedShipping,
        paymentMethod: selectedPayment,
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
          <span className="text-gray-600 font-medium">{t("cart.subtotal")}</span>
          <span className="text-base font-bold text-gray-700">
            {t("cart.priceSAR", { price: cart.subtotal.toFixed(2) })}
          </span>
        </div>
        {selectedShipping === "DeliveryToAddress" && quote?.available && (
          <div className="p-4 flex items-center justify-between">
            <span className="text-gray-500 text-sm">{t("checkout.shippingCostLabel")}</span>
            <span className="text-sm font-bold text-gray-700">
              {quote.isFreeShipping
                ? t("checkout.freeShipping")
                : t("cart.priceSAR", { price: quote.shippingCost.toFixed(2) })}
            </span>
          </div>
        )}
        <div className="p-4 flex items-center justify-between">
          <span className="text-gray-600 font-medium">{t("cart.total")}</span>
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

      {/* Shipping method selection */}
      {shippingMethods.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
          <p className="text-sm font-bold text-gray-800 mb-3">{t("checkout.shippingMethodLabel")}</p>
          <div className="space-y-2">
            {shippingMethods.map((m) => (
              <label
                key={m.type}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition ${
                  selectedShipping === m.type
                    ? "border-[var(--theme)] bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-sm font-medium text-gray-700">{shippingLabel(m.type)}</span>
                <input
                  type="radio"
                  name="shippingMethod"
                  value={m.type}
                  checked={selectedShipping === m.type}
                  onChange={() => setSelectedShipping(m.type)}
                  className="accent-[var(--theme)]"
                />
              </label>
            ))}
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
          <p className="text-sm font-bold text-gray-800 mb-3">{t("checkout.paymentMethodLabel")}</p>
          <div className="space-y-2">
            {paymentMethods.map((m) => (
              <label
                key={m.type}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition ${
                  selectedPayment === m.type
                    ? "border-[var(--theme)] bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-sm font-medium text-gray-700">{paymentLabel(m.type)}</span>
                <input
                  type="radio"
                  name="paymentMethod"
                  value={m.type}
                  checked={selectedPayment === m.type}
                  onChange={() => setSelectedPayment(m.type)}
                  className="accent-[var(--theme)]"
                />
              </label>
            ))}
          </div>
        </div>
      )}

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

        {savedAddresses.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("checkout.savedAddresses")}
            </label>
            <div className="space-y-2">
              {savedAddresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition ${
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
                className={`flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition ${
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
  <PhoneInputField
    value={guestPhone}
    onChange={setGuestPhone}
    required={!loggedIn}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-[var(--theme)]"
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

        {selectedPayment === "CreditCard" && (
          <div className="rounded-lg border border-blue-300 bg-blue-50/40 p-4">
            <p className="text-[13px] font-bold text-gray-800">{t("checkout.securePaymentTitle")}</p>
            <p className="text-[12px] text-gray-600 mt-1">
              {t("checkout.securePaymentRedirect")}
            </p>
          </div>
        )}

        {selectedPayment === "PayPal" && (
          <div className="rounded-lg border border-blue-300 bg-blue-50/40 p-4">
            <p className="text-[13px] font-bold text-gray-800">{t("checkout.paypalTitle")}</p>
            <p className="text-[12px] text-gray-600 mt-1">
              {t("checkout.paypalRedirect")}
            </p>
          </div>
        )}

        {selectedPayment === "BankTransfer" && (
          <div className="rounded-lg border border-blue-300 bg-blue-50/40 p-4">
            <p className="text-[13px] font-bold text-gray-800">{t("checkout.bankTransferTitle")}</p>
            <p className="text-[12px] text-gray-600 mt-1">
              {t("checkout.bankTransferInstructions")}
            </p>
          </div>
        )}

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
"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import Can from "@/components/Can";
import { formatMoney } from "@/lib/formatNumber";

// ── Moyasar Payment Form (in-page) ── تُحمَّل من CDN مرة واحدة وتُحقن داخل المودال
const MOYASAR_JS_URL = "https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.3.0/dist/moyasar.umd.min.js";
const MOYASAR_CSS_URL = "https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.3.0/dist/moyasar.css";
let moyasarSdkPromise: Promise<void> | null = null;

const loadMoyasarSdk = (): Promise<void> => {
  if ((window as any).Moyasar) return Promise.resolve();
  if (moyasarSdkPromise) return moyasarSdkPromise;
  moyasarSdkPromise = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${MOYASAR_CSS_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = MOYASAR_CSS_URL;
      document.head.appendChild(link);
    }
    const existing = document.querySelector(`script[src="${MOYASAR_JS_URL}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => { moyasarSdkPromise = null; reject(new Error("moyasar script failed")); });
      return;
    }
    const script = document.createElement("script");
    script.src = MOYASAR_JS_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { moyasarSdkPromise = null; reject(new Error("moyasar script failed")); };
    document.head.appendChild(script);
  });
  return moyasarSdkPromise;
};

interface PayFormSession {
  ref: string;
  invoiceId: string;
  publishableKey: string;
  amountHalalas: number;
}

interface MobileAppStatus {
  id: number | null;
  storeId: number;
  packageName: string;
  status: string;
  paymentStatus: string;
  billingCycle: string;
  dueAmount: number;
  monthlyPrice: number;
  yearlyPrice: number;
  isAvailable: boolean;
  autoRenew: boolean;
  appName: string | null;
  developerAccountType: string;
  developerAccountInfo: string | null;
  merchantNotes: string | null;
  adminNote: string | null;
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number | null;
  completedAt: string | null;
  createdAt: string | null;
}

type BillingCycle = "Monthly" | "Yearly";

export default function MobileAppManager() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<MobileAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // نموذج الاشتراك
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("Monthly");
  const [appName, setAppName] = useState("");
  const [devAccountType, setDevAccountType] = useState<"Company" | "Platform">("Company");
  const [devAccountInfo, setDevAccountInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // الدفع
  const [showPayModal, setShowPayModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payAppSubscriptionId, setPayAppSubscriptionId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payForm, setPayForm] = useState<PayFormSession | null>(null);
  const [formReady, setFormReady] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const paidHandledRef = useRef(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/mobile-app/status");
      const d = res.data.data as MobileAppStatus;
      setStatus(d);
      if (d.developerAccountType === "Platform" || d.developerAccountType === "Company") {
        setDevAccountType(d.developerAccountType);
      }
    } catch {
      setError(t("mobileApp.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPaymentModal = (appSubscriptionId: number, amount: number) => {
    paidHandledRef.current = false;
    setPayAppSubscriptionId(appSubscriptionId);
    setPayAmount(amount);
    setPayForm(null);
    setFormReady(false);
    setShowPayModal(true);
  };

  const startHostedPayment = async () => {
    if (!payAppSubscriptionId) return;
    setError("");
    setSuccess("");
    setPayLoading(true);
    try {
      const payRes = await api.post("/payments/create-link", {
        appSubscriptionId: payAppSubscriptionId,
        amount: payAmount,
        currency: "SAR",
        successUrl: window.location.href,
        callbackUrl: window.location.href,
      });
      if (payRes.data.success && payRes.data.data?.paymentLinkUrl) {
        const d = payRes.data.data;
        const ref = d?.paymentReference;
        if (ref) sessionStorage.setItem("app_payment_ref", ref);
        if (d?.providerPaymentId && d?.publishableKey) {
          setPayForm({
            ref: ref || "",
            invoiceId: d.providerPaymentId,
            publishableKey: d.publishableKey,
            amountHalalas: typeof d.amountHalalas === "number" ? d.amountHalalas : Math.round(payAmount * 100),
          });
        } else {
          window.location.assign(d.paymentLinkUrl);
        }
      } else {
        setError(payRes.data?.message || t("mobileApp.paymentError"));
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t("mobileApp.paymentError"));
    } finally {
      setPayLoading(false);
    }
  };

  const closePayModal = () => {
    setShowPayModal(false);
    setPayForm(null);
    setFormReady(false);
  };

  // تحميل فورم ميستر وتشغيله داخل المودال بمجرد إنشاء الفاتورة
  useEffect(() => {
    if (!payForm) return;
    let disposed = false;
    (async () => {
      try {
        await loadMoyasarSdk();
        if (disposed) return;
        const el = document.querySelector(".mysr-app-form");
        if (!el) return;
        (window as any).Moyasar.init({
          element: ".mysr-app-form",
          invoice_id: payForm.invoiceId,
          publishable_api_key: payForm.publishableKey,
          amount: payForm.amountHalalas,
          currency: "SAR",
          description: t("mobileApp.title"),
          callback_url: window.location.href,
          methods: ["creditcard"],
          supported_networks: ["mada", "visa", "mastercard", "amex", "unionpay"],
          language: "ar",
          on_completed: async (payment: any) => {
            if (disposed) return;
            if (payment?.status === "paid") {
              paidHandledRef.current = true;
              const ref = payForm.ref || sessionStorage.getItem("app_payment_ref");
              sessionStorage.removeItem("app_payment_ref");
              setConfirming(true);
              try {
                if (ref) await api.get(`/payments/status/${ref}`);
              } catch { /* الويبهوك يتكفّل بالتأكيد كاحتياط */ }
              setConfirming(false);
              setPayForm(null);
              setShowPayModal(false);
              setSuccess(t("mobileApp.paymentSuccess"));
              load();
            }
          },
          on_failure: async (err: any) => {
            if (disposed) return;
            setError(typeof err === "string" ? err : (err?.message || t("mobileApp.paymentError")));
          },
          on_redirect: async (url: string) => {
            if (paidHandledRef.current) return;
            window.location.assign(url);
          },
        });
        setFormReady(true);
      } catch {
        if (!disposed) {
          setError(t("mobileApp.paymentError"));
          setPayForm(null);
        }
      }
    })();
    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payForm]);

  // بعد الرجوع من صفحة الدفع، نتحقق من النتيجة
  useEffect(() => {
    const ref = sessionStorage.getItem("app_payment_ref");
    if (!ref) return;
    sessionStorage.removeItem("app_payment_ref");
    let tries = 0;
    const maxTries = 12;
    const timer = setInterval(async () => {
      try {
        const res = await api.get(`/payments/status/${ref}`);
        const st = res.data?.data?.status;
        if (st === "Paid") {
          clearInterval(timer);
          setSuccess(t("mobileApp.paymentSuccess"));
          load();
          return;
        }
        if (st === "Failed") {
          clearInterval(timer);
          setError(t("mobileApp.paymentError"));
          load();
          return;
        }
        tries += 1;
        if (tries >= maxTries) {
          clearInterval(timer);
          setError(t("mobileApp.paymentStatusUnknown"));
          load();
        }
      } catch {
        tries += 1;
        if (tries >= maxTries) {
          clearInterval(timer);
          setError(t("mobileApp.paymentStatusUnknown"));
          load();
        }
      }
    }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const res = await api.post("/mobile-app/subscribe", {
        billingCycle,
        appName: appName.trim() || null,
        developerAccountType: devAccountType,
        developerAccountInfo: devAccountInfo.trim() || null,
        merchantNotes: notes.trim() || null,
      });
      const d = res.data.data as MobileAppStatus;
      setStatus(d);
      setSuccess(t("mobileApp.paymentPendingMsg"));
      if (d.id) openPaymentModal(d.id, d.dueAmount);
    } catch (err: any) {
      setError(err.response?.data?.message || t("mobileApp.loadError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(t("mobileApp.cancelConfirm"))) return;
    setError("");
    setSuccess("");
    setCancelling(true);
    try {
      await api.post("/mobile-app/cancel");
      setSuccess(t("mobileApp.cancelSuccess"));
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("mobileApp.cancelError"));
    } finally {
      setCancelling(false);
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "Pending": return t("mobileApp.statusPending");
      case "Active": return t("mobileApp.statusActive");
      case "Cancelled": return t("mobileApp.statusCancelled");
      case "Expired": return t("mobileApp.statusExpired");
      case "Suspended": return t("mobileApp.statusSuspended");
      case "GracePeriod": return t("mobileApp.statusGrace");
      default: return t("mobileApp.statusNone");
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "Active": return "badge badge--green";
      case "Pending": return "badge badge--yellow";
      case "Cancelled": return "badge badge--red";
      case "Expired": return "badge badge--gray";
      default: return "badge badge--gray";
    }
  };

  const formatDate = (v: string | null) => {
    if (!v) return "—";
    return new Date(v).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "long", day: "numeric" });
  };

  const cycleLabel = (c: string) =>
    c === "Yearly" || c === "TwoYears" ? t("mobileApp.billingYearly") : t("mobileApp.billingMonthly");

  if (loading) {
    return <div className="text-center py-8 text-[13px] text-[var(--sub)]">{t("common.loading")}</div>;
  }

  // غير متاحة في الباقة المجانية أو باقة بلا الخاصية
  if (status && !status.isAvailable) {
    return (
      <div>
        <div className="rounded-2xl border p-5 mb-5 text-center" style={{ borderColor: "var(--border)", background: "var(--blue-50, #f5f9ff)" }}>
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "#fff", color: "var(--blue)" }}>
            <Icon name="package" size={22} />
          </div>
          <p className="text-[14px] font-extrabold text-[var(--ink)] mb-1">{t("mobileApp.notAvailableTitle")}</p>
          <p className="text-[12.5px] text-[var(--sub)] leading-relaxed max-w-md mx-auto">
            {status.packageName === "المجانية" ? t("mobileApp.notAvailableFree") : t("mobileApp.notAvailablePackage")}
          </p>
          <a href="/dashboard/subscription" className="btn btn-primary btn-sm mt-4 inline-block">
            {t("mobileApp.upgradeCta")}
          </a>
        </div>
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
          <p className="text-[13px] font-extrabold text-[var(--ink)] mb-3">{t("mobileApp.includedFeatures")}</p>
          <FeatureList t={t} />
        </div>
      </div>
    );
  }

  const isActive = status?.status === "Active";
  const isPending = status?.status === "Pending";

  return (
    <div>
      {success && (
        <div className="alert alert--info mb-4">
          <Icon name="check" size={16} className="shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="alert alert--warning mb-4">
          <Icon name="alert" size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* الحالة الحالية */}
      <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-5 py-4 mb-5 border border-gray-100 flex-wrap gap-3">
        <div className="min-w-0">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("mobileApp.currentStatus")}</p>
          <span className={statusBadge(status?.status || "None")}>{statusLabel(status?.status || "None")}</span>
        </div>
        <div className="text-end">
          <p className="text-[12px] text-[var(--sub)] mb-1">
            {isActive ? t("mobileApp.daysRemaining") : t("mobileApp.currentPrice")}
          </p>
          <p className="text-[15px] font-bold text-[var(--ink)]">
            {isActive && status?.daysRemaining != null
              ? `${status.daysRemaining} ${t("mobileApp.daysSuffix")}`
              : `${formatMoney(status?.monthlyPrice || 0)} ${t("mobileApp.perMonth")}`}
          </p>
        </div>
      </div>

      {/* تفاصيل الاشتراك القائم */}
      {status?.id && (
        <div className="rounded-2xl border p-5 mb-5" style={{ borderColor: "var(--border)" }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-[12.5px]">
            <div>
              <p className="text-[var(--sub)] mb-0.5">{t("mobileApp.billingCycle")}</p>
              <p className="font-bold text-[var(--ink)]">{cycleLabel(status.billingCycle)}</p>
            </div>
            <div>
              <p className="text-[var(--sub)] mb-0.5">{t("mobileApp.dueAmount")}</p>
              <p className="font-bold text-[var(--ink)]">{formatMoney(status.dueAmount)}</p>
            </div>
            <div>
              <p className="text-[var(--sub)] mb-0.5">{t("mobileApp.startDate")}</p>
              <p className="font-bold text-[var(--ink)]">{formatDate(status.startDate)}</p>
            </div>
            <div>
              <p className="text-[var(--sub)] mb-0.5">{t("mobileApp.endDate")}</p>
              <p className="font-bold text-[var(--ink)]">{formatDate(status.endDate)}</p>
            </div>
            {status.appName && (
              <div className="col-span-2">
                <p className="text-[var(--sub)] mb-0.5">{t("mobileApp.appName")}</p>
                <p className="font-bold text-[var(--ink)]">{status.appName}</p>
              </div>
            )}
            {status.adminNote && (
              <div className="col-span-2 sm:col-span-3">
                <p className="text-[var(--sub)] mb-0.5">{t("mobileApp.adminNote")}</p>
                <p className="text-[var(--ink)]">{status.adminNote}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-5">
            {isPending && status.id && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => openPaymentModal(status.id as number, status.dueAmount)}
              >
                {t("mobileApp.payNow")}
              </button>
            )}
            {(isActive || isPending) && (
              <Can code="StoreSettings.Edit">
                <button type="button" className="btn btn-sm" disabled={cancelling} onClick={handleCancel}>
                  {cancelling ? t("mobileApp.cancelling") : t("mobileApp.cancelSubscription")}
                </button>
              </Can>
            )}
          </div>
        </div>
      )}

      {/* نموذج الاشتراك الجديد */}
      {!status?.id && (
        <div className="rounded-2xl border p-5 mb-5" style={{ borderColor: "var(--border)" }}>
          <p className="text-[13px] font-extrabold text-[var(--ink)] mb-4">{t("mobileApp.includedFeatures")}</p>
          <FeatureList t={t} />

          <form onSubmit={handleSubscribe} className="space-y-4 mt-6 border-t border-gray-100 pt-5">
            <div>
              <label className="text-[12.5px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.billingCycle")}</label>
              <div className="flex gap-3">
                {(["Monthly", "Yearly"] as BillingCycle[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBillingCycle(c)}
                    className={`flex-1 rounded-xl border-2 p-3 text-center transition-colors ${
                      billingCycle === c ? "border-[var(--blue)] bg-[var(--blue-50)]" : "border-gray-200"
                    }`}
                  >
                    <span className="block text-[13px] font-bold text-[var(--ink)]">
                      {c === "Yearly" ? t("mobileApp.billingYearly") : t("mobileApp.billingMonthly")}
                    </span>
                    <span className="block text-[12px] text-[var(--sub)] mt-0.5">
                      {formatMoney(c === "Yearly" ? (status?.yearlyPrice || 0) : (status?.monthlyPrice || 0))}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[12.5px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.appName")}</label>
              <div className="field-shell">
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  maxLength={200}
                  placeholder={t("mobileApp.appNamePlaceholder")}
                />
              </div>
            </div>

            <div>
              <label className="text-[12.5px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.developerAccount")}</label>
              <div className="space-y-2">
                {(["Company", "Platform"] as const).map((opt) => (
                  <label key={opt} className="flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer" style={{ borderColor: devAccountType === opt ? "var(--blue)" : "var(--border)" }}>
                    <input
                      type="radio"
                      name="devAccountType"
                      checked={devAccountType === opt}
                      onChange={() => setDevAccountType(opt)}
                      className="mt-0.5 accent-[var(--blue)]"
                    />
                    <span className="text-[12.5px] text-[var(--ink)]">
                      {opt === "Platform" ? t("mobileApp.devAccountPlatform") : t("mobileApp.devAccountCompany")}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[12.5px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.devAccountInfo")}</label>
              <div className="field-shell">
                <input
                  type="text"
                  value={devAccountInfo}
                  onChange={(e) => setDevAccountInfo(e.target.value)}
                  maxLength={1000}
                  placeholder={t("mobileApp.devAccountInfoPlaceholder")}
                />
              </div>
            </div>

            <div>
              <label className="text-[12.5px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.notes")}</label>
              <div className="field-shell">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder={t("mobileApp.notesPlaceholder")}
                />
              </div>
            </div>

            <div className="alert alert--info">
              <Icon name="alert" size={16} className="shrink-0 mt-0.5" />
              <span>{t("mobileApp.devFeesNote")}</span>
            </div>

            <button type="submit" disabled={submitting} className="btn btn-primary w-full sm:w-auto">
              {submitting ? t("mobileApp.subscribing") : t("mobileApp.subscribe")}
            </button>
          </form>
        </div>
      )}

      {/* مودال الدفع */}
      {showPayModal && (
        <div className="modal-overlay" onClick={closePayModal}>
          <div className="modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-[var(--blue-deep)]">{t("subscription.paymentTitle")}</h2>
              <button onClick={closePayModal} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
            </div>

            <div className="bg-[var(--blue-50)] rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
              <span className="text-[13px] font-bold text-[var(--ink)]">{t("subscription.paymentAmount")}</span>
              <span className="text-[18px] font-extrabold text-[var(--blue-deep)]">{formatMoney(payAmount)} {t("common.sar")}</span>
            </div>

            {error && <div className="alert alert--danger mb-4">{error}</div>}

            {payForm ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => { setPayForm(null); setFormReady(false); setError(""); }}
                    className="text-[13px] font-bold text-[var(--blue)] flex items-center gap-1"
                  >
                    <Icon name="arrowLeft" size={14} /> {t("common.back")}
                  </button>
                </div>
                <div className="mysr-app-form" />
                {!formReady && <div className="text-center text-[13px] text-[var(--sub)] py-6">{t("common.loading")}</div>}
                {confirming && <div className="text-center text-[13px] text-[var(--sub)] pt-3">{t("common.loading")}</div>}
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={startHostedPayment}
                  disabled={payLoading}
                  className="w-full flex items-center gap-3 border-2 border-[var(--blue)] rounded-xl p-4 text-start transition-colors hover:bg-[var(--blue-50)]/50 disabled:opacity-60"
                >
                  <span className="w-10 h-10 rounded-full bg-[var(--blue-50)] flex items-center justify-center shrink-0">
                    <Icon name="card" size={18} className="text-[var(--blue)]" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-bold text-[var(--ink)]">{t("subscription.onlinePayment")}</span>
                    <span className="block text-[12px] text-[var(--sub)] mt-0.5">
                      {payLoading ? t("common.loading") : t("subscription.onlinePaymentDesc")}
                    </span>
                  </span>
                  <Icon name="arrowLeft" size={16} className="text-[var(--sub)] shrink-0" />
                </button>

                <button type="button" onClick={closePayModal} className="btn btn-outline w-full">
                  {t("mobileApp.payLater")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureList({ t }: { t: (k: string) => string }) {
  const items = [
    "mobileApp.featurePush",
    "mobileApp.featureNative",
    "mobileApp.featureAnalytics",
    "mobileApp.featureCoupons",
    "mobileApp.featureDesign",
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {items.map((k) => (
        <div key={k} className="flex items-center gap-2 text-[12.5px] text-[var(--ink)]">
          <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--green-soft, #e4f9f0)", color: "var(--green)" }}>
            <Icon name="check" size={11} />
          </span>
          {t(k)}
        </div>
      ))}
    </div>
  );
}

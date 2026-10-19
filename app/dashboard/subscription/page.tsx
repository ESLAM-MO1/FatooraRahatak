"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { useConfirm } from "@/components/ConfirmDialog";
import PackageCard from "@/components/PackageCard";
import Can from "@/components/Can";
import Icon from "@/components/Icon";
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

interface SubscriptionStatus {
  currentPackage: string;
  status: string;
  billingCycleDate: string;
  gracePeriodEnd: string | null;
  subscriptionEndDate: string | null;
  daysRemaining: number | null;
  requiresRenewal: boolean;
  subscriptionStatus: string;
  balance: number;
  currentProductsCount: number;
  maxProducts: number | null;
  currentEmployeesCount: number;
  maxEmployees: number;
  currentWarehousesCount: number;
  maxWarehouses: number;
  maxThemes: number;
  billingCycle: string;
}

interface PackageInfo {
  id: number;
  name: string;
  monthlyPrice: number;
  maxProducts: number | null;
  maxEmployees: number;
  maxWarehouses: number;
  maxThemes: number;
  maxShippingCompanies: number;
  commissionPercentage: number;
  color: string;
  hasAccountingFull: boolean;
  hasPayroll: boolean;
  hasZatcaInvoice: boolean;
  hasCustomDomain: boolean;
  hasAffiliateMarketing: boolean;
  hasApiAccess: boolean;
  hasPos: boolean;
  hasLogo: boolean;
  hasShippingIntegration: boolean;
  hasShippingCalculator: boolean;
  hasShippingTracking: boolean;
  hasShippingLabelPrinting: boolean;
  hasFreeShipping: boolean;
  hasCashOnDelivery: boolean;
  hasShippingDiscounts: boolean;
}

type BillingCycle = "Monthly" | "Yearly" | "TwoYears";

const BILLING_CYCLE_MONTHS: Record<BillingCycle, number> = {
  Monthly: 1,
  Yearly: 12,
  TwoYears: 24,
};

const BILLING_CYCLE_DISCOUNT: Record<BillingCycle, number> = {
  Monthly: 0,
  Yearly: 0.1,
  TwoYears: 0.15,
};

const BILLING_CYCLE_OPTIONS: { value: BillingCycle; labelKey: string; savePercent: number }[] = [
  { value: "Monthly", labelKey: "subscription.billingMonthly", savePercent: 0 },
  { value: "Yearly", labelKey: "subscription.billingYearly", savePercent: 10 },
  { value: "TwoYears", labelKey: "subscription.billingTwoYears", savePercent: 15 },
];

const getCycleTotalPrice = (monthlyPrice: number, cycle: BillingCycle) => {
  const months = BILLING_CYCLE_MONTHS[cycle];
  const discount = BILLING_CYCLE_DISCOUNT[cycle];
  return monthlyPrice * months * (1 - discount);
};



export default function SubscriptionPage() {
  const { t, i18n } = useTranslation();
  const confirm = useConfirm();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("Monthly");
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [paySubscriptionId, setPaySubscriptionId] = useState<number | null>(null);
  const [bankAccount, setBankAccount] = useState<{ bankName?: string; accountHolder?: string; iban?: string } | null>(null);
  const [bankTransferEnabled, setBankTransferEnabled] = useState(false);
  const [transferRef, setTransferRef] = useState("");
  const [bankSubmitting, setBankSubmitting] = useState(false);
  // جلسة فورم الدفع داخل الصفحة (Moyasar.init عبر invoice_id — بدون تحويل خارجي)
  const [payForm, setPayForm] = useState<PayFormSession | null>(null);
  const [formReady, setFormReady] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const paidHandledRef = useRef(false);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [statusRes, packagesRes] = await Promise.all([
        api.get("/subscriptions/status"),
        api.get("/site/packages"),
      ]);
      setStatus(statusRes.data.data);
      setPackages(packagesRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("subscription.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCurrentPackageIndex = () => {
    if (!status || packages.length === 0) return -1;
    return packages.findIndex((p) => p.name === status.currentPackage);
  };

  const isHigherPackage = (pkgName: string) => {
    const currentIndex = getCurrentPackageIndex();
    const targetIndex = packages.findIndex((p) => p.name === pkgName);
    return currentIndex >= 0 && targetIndex > currentIndex;
  };

  const isLowerPackage = (pkgName: string) => {
    const currentIndex = getCurrentPackageIndex();
    const targetIndex = packages.findIndex((p) => p.name === pkgName);
    return currentIndex >= 0 && targetIndex < currentIndex;
  };

  const handlePackageChange = async (packageName: string, isUpgrade: boolean) => {
    const confirmMsg = isUpgrade
      ? `${t("subscription.confirmUpgrade")} "${packageName}"؟`
      : `${t("subscription.confirmDowngrade")} "${packageName}"؟`;
    if (!(await confirm(confirmMsg))) return;

    setActionError("");
    setActionSuccess("");
    setProcessing(packageName);

    try {
      if (isUpgrade) {
        const upRes = await api.post("/subscriptions/upgrade", { packageName, billingCycle });
        const dueAmount = upRes.data?.data?.dueAmount ?? 0;
        const balanceUsed = upRes.data?.data?.balanceUsed ?? 0;
        const subscriptionId = upRes.data?.data?.subscriptionId ?? null;

        if (dueAmount > 0) {
          if (subscriptionId) {
            // فتح مودال الدفع داخل الصفحة (إلكتروني أو تحويل بنكي)
            await openPaymentModal(subscriptionId, dueAmount);
          } else {
            setActionError(t("subscription.paymentError"));
          }
        } else {
          setActionSuccess(
            balanceUsed > 0
              ? t("subscription.balanceCovered").replace("{amount}", `${formatMoney(balanceUsed)} ${t("common.sar")}`)
              : t("subscription.upgradeSuccess")
          );
          await fetchData();
        }
      } else {
        const endpoint = "/subscriptions/downgrade";
        await api.post(endpoint, { packageName, billingCycle });
        setActionSuccess(t("subscription.downgradeSuccess"));
        await fetchData();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message || (isUpgrade ? t("subscription.upgradeError") : t("subscription.downgradeError")));
    } finally {
      setProcessing(null);
    }
  };

  const handleRenew = async () => {
    if (!(await confirm(t("subscription.confirmRenew")))) return;

    setActionError("");
    setActionSuccess("");
    setProcessing("renew");

    try {
      const res = await api.post("/subscriptions/renew", { billingCycle });
      const balanceUsed = res.data?.data?.balanceUsed ?? 0;
      const dueAmount = res.data?.data?.dueAmount ?? 0;
      const subscriptionId = res.data?.data?.subscriptionId ?? null;
      if (balanceUsed > 0) {
        setActionSuccess(t("subscription.balanceCovered").replace("{amount}", `${formatMoney(balanceUsed)} ${t("common.sar")}`));
        await fetchData();
      } else if (dueAmount > 0) {
        if (subscriptionId) {
          // فتح مودال الدفع داخل الصفحة (إلكتروني أو تحويل بنكي)
          await openPaymentModal(subscriptionId, dueAmount);
        } else {
          setActionError(t("subscription.paymentError"));
        }
      } else {
        setActionSuccess(t("subscription.renewSuccess"));
        await fetchData();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("subscription.renewError"));
    } finally {
      setProcessing(null);
    }
  };

  // الدفع المحمي: إنشاء فاتورة على ميستر ثم عرض فورم الدفع داخل نفس الصفحة
  // (Moyasar.init + invoice_id) — بدون أي تحويل لصفحة خارجية
  const startHostedPayment = async (subscriptionId: number, amount: number) => {
    setActionError("");
    setActionSuccess("");
    setPayLoading(true);
    try {
      const payRes = await api.post("/payments/create-link", {
        subscriptionId,
        amount,
        currency: "SAR",
        successUrl: window.location.href,
        callbackUrl: window.location.href,
      });
      if (payRes.data.success && payRes.data.data.paymentLinkUrl) {
        const d = payRes.data.data;
        const ref = d?.paymentReference;
        if (ref) sessionStorage.setItem("sub_payment_ref", ref);
        if (d?.providerPaymentId && d?.publishableKey) {
          // فين-بيج: نعرض فورم ميستر داخل المودال نفسه (لا تحويل خارجي)
          paidHandledRef.current = false;
          setFormReady(false);
          setPayForm({
            ref: ref || "",
            invoiceId: d.providerPaymentId,
            publishableKey: d.publishableKey,
            amountHalalas: typeof d.amountHalalas === "number" ? d.amountHalalas : Math.round(amount * 100),
          });
        } else {
          // احتياط: لو المفتاح العام غير متاح نستخدم الرابط المُضاف (سلوك قديم)
          setActionSuccess(t("subscription.paymentInitiated"));
          window.location.assign(d.paymentLinkUrl);
        }
      } else {
        setActionError(payRes.data?.message || t("subscription.paymentError"));
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionError(e.response?.data?.message || t("subscription.paymentError"));
    } finally {
      setPayLoading(false);
    }
  };

  // إغلاق المودال مع تنظيف جلسة الفورم
  const closePayModal = () => {
    setShowPayModal(false);
    setPayForm(null);
    setFormReady(false);
  };

  // فتح مودال الدفع داخل صفحة الاشتراك: يجلب طرق الدفع المتاحة (إلكتروني + تحويل بنكي بحساب المنصة)
  const openPaymentModal = async (subscriptionId: number, amount: number) => {
    setPaySubscriptionId(subscriptionId);
    setPayAmount(amount);
    setTransferRef("");
    setActionError("");
    setActionSuccess("");
    setPayForm(null);
    setFormReady(false);
    setShowPayModal(true);
    try {
      const res = await api.get("/subscriptions/payment-methods");
      const d = res.data?.data;
      setBankTransferEnabled(Boolean(d?.bankTransfer));
      setBankAccount(d?.bankAccount ?? null);
    } catch {
      setBankTransferEnabled(false);
      setBankAccount(null);
    }
  };

  // تأكيد التحويل البنكي: إنشاء سجل دفع من نوع BankTransfer وإرفاق مرجع التحويل
  const submitBankTransfer = async () => {
    if (!paySubscriptionId) return;
    setBankSubmitting(true);
    setActionError("");
    try {
      const payRes = await api.post("/payments/create-link", {
        subscriptionId: paySubscriptionId,
        amount: payAmount,
        currency: "SAR",
        paymentMethod: "BankTransfer",
        successUrl: window.location.href,
        callbackUrl: window.location.href,
      });
      if (payRes.data.success) {
        const ref = payRes.data?.data?.paymentReference;
        if (ref) sessionStorage.setItem("sub_payment_ref", ref);
        setShowPayModal(false);
        setActionSuccess(t("subscription.bankSuccess"));
        fetchData();
      } else {
        setActionError(payRes.data?.message || t("subscription.paymentError"));
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionError(e.response?.data?.message || t("subscription.paymentError"));
    } finally {
      setBankSubmitting(false);
    }
  };

  // الدفع الإلكتروني من داخل المودال (لا يغادر الصفحة نهائيًا — الفورم يُحقن هنا)
  const payOnlineFromModal = async () => {
    if (!paySubscriptionId) return;
    await startHostedPayment(paySubscriptionId, payAmount);
  };

  // تحميل فورم ميستر وتشغيله داخل المودال بمجرد إنشاء الفاتورة (payForm)
  useEffect(() => {
    if (!payForm) return;
    let disposed = false;
    (async () => {
      try {
        await loadMoyasarSdk();
        if (disposed) return;
        const el = document.querySelector(".mysr-form");
        if (!el) return;
        (window as any).Moyasar.init({
          element: ".mysr-form",
          invoice_id: payForm.invoiceId,
          publishable_api_key: payForm.publishableKey,
          amount: payForm.amountHalalas,
          currency: "SAR",
          description: t("subscription.paymentTitle"),
          callback_url: window.location.href,
          methods: ["creditcard"],
          supported_networks: ["mada", "visa", "mastercard", "amex", "unionpay"],
          language: (i18n.language || "ar").startsWith("ar") ? "ar" : "en",
          on_completed: async (payment: any) => {
            if (disposed) return;
            // الدفع اكتمل بدون 3DS — نؤكد الطرف الخلفي مباشرة ثم نغلق
            if (payment?.status === "paid") {
              paidHandledRef.current = true;
              const ref = payForm.ref || sessionStorage.getItem("sub_payment_ref");
              sessionStorage.removeItem("sub_payment_ref");
              setConfirming(true);
              try {
                if (ref) await api.get(`/payments/status/${ref}`);
              } catch { /* webhook/status يتكفل بالتأكيد كاحتياط */ }
              setConfirming(false);
              setPayForm(null);
              setShowPayModal(false);
              setActionSuccess(t("subscription.paymentSuccess"));
              fetchData();
            }
            // status === "initiated" يعني 3DS — سيعالجه on_redirect بالتحويل ثم العودة
          },
          // ملاحظة: إصدار moyasar-payment-form@2.3.0 يتطلب أن تكون كل العوائد
          // (on_completed / on_failure / on_redirect) قائمة على الوعود (Promise)
          // وإلا يرفض الفورم عرضه برسالة "Form configuration issue".
          on_failure: async (error: any) => {
            if (disposed) return;
            setActionError(typeof error === "string" ? error : (error?.message || t("subscription.paymentError")));
          },
          on_redirect: async (url: string) => {
            // 3DS: التحويل لصفحة البنك ثم العودة تلقائيًا إلى هذه الصفحة نفسها
            // (callback_url) ثم تعمل آلية sub_payment_ref القائمة.
            if (paidHandledRef.current) return;
            window.location.assign(url);
          },
        });
        setFormReady(true);
      } catch {
        if (!disposed) {
          setActionError(t("subscription.paymentError"));
          setPayForm(null);
        }
      }
    })();
    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payForm]);

  // بعد الرجوع من صفحة موياسر المحمية، نتحقق من نتيجة الدفع
  useEffect(() => {
    const ref = sessionStorage.getItem("sub_payment_ref");
    if (!ref) return;

    sessionStorage.removeItem("sub_payment_ref");
    let tries = 0;
    const maxTries = 12;
    const timer = setInterval(async () => {
      try {
        const res = await api.get(`/payments/status/${ref}`);
        const status = res.data?.data?.status;
        if (status === "Paid") {
          clearInterval(timer);
          setActionSuccess(t("subscription.paymentSuccess"));
          fetchData();
          return;
        }
        if (status === "Failed") {
          clearInterval(timer);
          setActionError(t("subscription.paymentError"));
          fetchData();
          return;
        }
        tries += 1;
        if (tries >= maxTries) {
          clearInterval(timer);
          setActionError(t("subscription.paymentStatusUnknown"));
          fetchData();
        }
      } catch {
        tries += 1;
        if (tries >= maxTries) {
          clearInterval(timer);
          setActionError(t("subscription.paymentStatusUnknown"));
          fetchData();
        }
      }
    }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async () => {
    if (!(await confirm(t("subscription.confirmCancel")))) return;

    setActionError("");
    setActionSuccess("");
    setProcessing("cancel");

    try {
      await api.post("/subscriptions/cancel");
      setActionSuccess(t("subscription.cancelSuccess"));
      await fetchData();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("subscription.cancelError"));
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-SA-u-nu-latn", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getLimitLabel = (max: number | null) => {
    if (max === null || max === -1 || max === 0) return t("subscription.unlimited");
    return max.toString();
  };

  const getProgressPercent = (current: number, max: number | null) => {
    if (max === null || max === -1 || max === 0) return 0;
    return Math.min(100, (current / max) * 100);
  };

  const getStatusBadgeClass = (statusStr: string) => {
    switch (statusStr) {
      case "Active":
        return "badge badge--green";
      case "Suspended":
        return "badge badge--red";
      case "Trial":
        return "badge badge--blue";
      case "Expired":
        return "badge badge--yellow";
      default:
        return "badge badge--gray";
    }
  };

  const getStatusLabel = (statusStr: string) => {
    switch (statusStr) {
      case "Active":
        return t("subscription.statusActive");
      case "Suspended":
        return t("subscription.statusSuspended");
      case "Trial":
        return t("subscription.statusTrial");
      case "Expired":
        return t("subscription.statusExpired");
      default:
        return statusStr;
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <div className="alert alert--danger">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader icon="crown" title={t("subscription.title")} />

      {status && (
        <div className="card p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-[var(--ink)]">
                {t("subscription.currentPackage")}: <span className="text-[var(--blue)]">{status.currentPackage}</span>
              </h2>
              <p className="text-[var(--sub)] mt-1 flex items-center gap-2">
                {t("subscription.status")}:
                <span className={getStatusBadgeClass(status.status)}>
                  {getStatusLabel(status.status)}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Can code="SubscriptionPackage.Edit">
                <button onClick={handleRenew} disabled={processing === "renew"} className="btn-primary">
                  {processing === "renew" ? t("subscription.renewing") : t("subscription.renewBtn")}
                </button>
                <button onClick={handleCancel} disabled={processing === "cancel"} className="btn-outline">
                  {processing === "cancel" ? t("subscription.cancelling") : t("subscription.cancelAutoRenew")}
                </button>
              </Can>
            </div>
          </div>

          <div className="border-t pt-6" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-lg font-medium text-[var(--ink)] mb-4">{t("subscription.subscriptionDetails")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[var(--sub)]">{t("subscription.billingCycleDate")}</p>
                <p className="font-medium text-[var(--ink)]">{formatDate(status.billingCycleDate)}</p>
              </div>
              <div>
                <p className="text-[var(--sub)]">{t("subscription.currentCycle")}</p>
                <p className="font-medium text-[var(--ink)]">{status.billingCycle === "Monthly" ? t("subscription.billingMonthly") : status.billingCycle === "Yearly" ? t("subscription.billingYearly") : status.billingCycle}</p>
              </div>
              <div>
                <p className="text-[var(--sub)]">{t("subscription.subscriptionEndDate")}</p>
                <p className="font-medium text-[var(--ink)]">{status.subscriptionEndDate ? formatDate(status.subscriptionEndDate) : "—"}</p>
              </div>
              <div>
                <p className="text-[var(--sub)]">{t("subscription.renewalStatus")}</p>
                <p className="font-medium text-[var(--ink)]">
                  {status.requiresRenewal ? (
                    <span className="text-[var(--danger)]">
                      {status.daysRemaining != null && status.daysRemaining >= 0
                        ? t("subscription.renewalRequired").replace("{days}", `${status.daysRemaining}`)
                        : t("subscription.renewalRequiredNow")}
                    </span>
                  ) : (
                    <span className="text-[var(--success)]">{t("subscription.renewalNotRequired")}</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[var(--sub)]">{t("subscription.balance")}</p>
                <p className="font-medium text-[var(--blue)]">{formatMoney(status.balance)} {t("common.sar")}</p>
              </div>
              {status.gracePeriodEnd && (
                <div>
                  <p className="text-[var(--sub)]">{t("subscription.gracePeriodEnd")}</p>
                  <p className="font-medium text-[var(--danger)]">{formatDate(status.gracePeriodEnd)}</p>
                </div>
              )}
            </div>
            {status.balance > 0 && (
              <p className="text-[12px] text-[var(--sub)] mt-3">{t("subscription.balanceHint")}</p>
            )}
          </div>
        </div>
      )}

      {status && (
        <div className="card p-5">
          <h3 className="text-lg font-medium text-[var(--ink)] mb-4">{t("subscription.limitUsage")}</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--ink)]">{t("subscription.products")}</span>
                <span className="text-[var(--sub)]">
                  {status.currentProductsCount} / {getLimitLabel(status.maxProducts)}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgressPercent(status.currentProductsCount, status.maxProducts)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--ink)]">{t("subscription.employees")}</span>
                <span className="text-[var(--sub)]">
                  {status.currentEmployeesCount} / {getLimitLabel(status.maxEmployees)}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgressPercent(status.currentEmployeesCount, status.maxEmployees)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--ink)]">{t("subscription.warehouses")}</span>
                <span className="text-[var(--sub)]">
                  {status.currentWarehousesCount} / {getLimitLabel(status.maxWarehouses)}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgressPercent(status.currentWarehousesCount, status.maxWarehouses)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="text-lg font-medium text-[var(--ink)] mb-4">{t("subscription.availablePackages")}</h3>

        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-[13px] font-bold text-[var(--ink)]">{t("subscription.billingCycle")}:</span>
          {BILLING_CYCLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBillingCycle(opt.value)}
              className={`px-4 py-2 rounded-full text-[12.5px] font-bold transition-colors ${
                billingCycle === opt.value
                  ? "text-white"
                  : "text-[var(--sub)] hover:text-[var(--ink)]"
              }`}
              style={
                billingCycle === opt.value
                  ? { background: "var(--blue)" }
                  : { background: "var(--bg)", border: "1px solid var(--border)" }
              }
            >
              {t(opt.labelKey)}
              {opt.savePercent > 0 && (
                <span className="ms-1.5 text-[11px] font-bold" style={{ color: billingCycle === opt.value ? "#bbf7d0" : "#16a34a" }}>
                  {t("subscription.savePercent").replace("{percent}", String(opt.savePercent))}
                </span>
              )}
            </button>
          ))}
        </div>

        {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
        <SuccessToast message={actionSuccess} fixed className="mb-4" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg) => {
            const isCurrent = pkg.name === status?.currentPackage;
            const isHigher = isHigherPackage(pkg.name);
            const isLower = isLowerPackage(pkg.name);
            const totalPrice = billingCycle === "Monthly" || pkg.monthlyPrice <= 0 ? undefined : getCycleTotalPrice(pkg.monthlyPrice, billingCycle);
            const savePercent = billingCycle === "Monthly" || pkg.monthlyPrice <= 0 ? undefined : BILLING_CYCLE_DISCOUNT[billingCycle] * 100;

            return (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                isCurrent={isCurrent}
                badge={isCurrent ? t("subscription.currentBadge") : undefined}
                totalPrice={totalPrice}
                savePercent={savePercent}
                footer={
                  <div className="flex flex-col gap-2">
                    {isCurrent ? (
                      <button disabled className="btn-secondary w-full">
                        {t("subscription.currentBadge")}
                      </button>
                    ) : isHigher ? (
                      <Can code="SubscriptionPackage.Edit">
                        <button
                          onClick={() => handlePackageChange(pkg.name, true)}
                          disabled={processing === pkg.name}
                          className="btn-primary w-full"
                        >
                          {processing === pkg.name ? t("subscription.upgrading") : t("subscription.upgradeTo")}
                        </button>
                      </Can>
                    ) : isLower ? (
                      <Can code="SubscriptionPackage.Edit">
                        <button
                          onClick={() => handlePackageChange(pkg.name, false)}
                          disabled={processing === pkg.name}
                          className="btn-secondary w-full"
                        >
                          {processing === pkg.name ? t("subscription.downgrading") : t("subscription.downgradeTo")}
                        </button>
                      </Can>
                    ) : (
                      <button disabled className="btn-secondary w-full">
                        {t("subscription.notAvailable")}
                      </button>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      </div>

      {/* ── مودال إتمام الدفع داخل صفحة الاشتراك ── */}
      {showPayModal && (
        <div className="modal-overlay" onClick={closePayModal}>
          <div className="modal-card max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-[var(--blue-deep)]">{t("subscription.paymentTitle")}</h2>
              <button onClick={closePayModal} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
            </div>

            <div className="bg-[var(--blue-50)] rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
              <span className="text-[13px] font-bold text-[var(--ink)]">{t("subscription.paymentAmount")}</span>
              <span className="text-[18px] font-extrabold text-[var(--blue-deep)]">{formatMoney(payAmount)} {t("common.sar")}</span>
            </div>

            {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}

            {/* مرحلة فورم الدفع داخل الصفحة (Moyasar.init + invoice_id) */}
            {payForm ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => { setPayForm(null); setFormReady(false); setActionError(""); }}
                    className="text-[13px] font-bold text-[var(--blue)] flex items-center gap-1"
                  >
                    <Icon name="arrowLeft" size={14} /> {t("common.back")}
                  </button>
                </div>
                <div className="mysr-form" />
                {!formReady && (
                  <div className="text-center text-[13px] text-[var(--sub)] py-6">{t("common.loading")}</div>
                )}
                {confirming && (
                  <div className="text-center text-[13px] text-[var(--sub)] pt-3">{t("common.loading")}</div>
                )}
              </div>
            ) : (
            <div className="space-y-3">
              {/* خيار الدفع الإلكتروني */}
              <button
                type="button"
                onClick={payOnlineFromModal}
                disabled={payLoading}
                className="w-full flex items-center gap-3 border-2 border-[var(--blue)] rounded-xl p-4 text-start transition-colors hover:bg-[var(--blue-50)]/50 disabled:opacity-60"
              >
                <span className="w-10 h-10 rounded-full bg-[var(--blue-50)] flex items-center justify-center shrink-0">
                  <Icon name="card" size={18} className="text-[var(--blue)]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-bold text-[var(--ink)]">{t("subscription.onlinePayment")}</span>
                  <span className="block text-[12px] text-[var(--sub)] mt-0.5">{payLoading ? t("common.loading") : t("subscription.onlinePaymentDesc")}</span>
                </span>
                <Icon name="arrowLeft" size={16} className="text-[var(--sub)] shrink-0" />
              </button>

              {/* خيار التحويل البنكي */}
              {bankTransferEnabled && (
                <div className="border-2 border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <Icon name="card" size={18} className="text-[var(--sub)]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[14px] font-bold text-[var(--ink)]">{t("subscription.bankTransfer")}</span>
                      <span className="block text-[12px] text-[var(--sub)] mt-0.5">{t("subscription.bankTransferDesc")}</span>
                    </div>
                  </div>

                  {bankAccount && (
                    <div className="bg-gray-50 rounded-lg p-3 text-[13px] space-y-1.5 mb-3">
                      <p className="text-[12px] font-bold text-[var(--sub)] mb-1">{t("subscription.bankTransferDetails")}</p>
                      {bankAccount.bankName && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--sub)]">{t("subscription.bankName")}</span>
                          <b className="text-[var(--ink)]">{bankAccount.bankName}</b>
                        </div>
                      )}
                      {bankAccount.accountHolder && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--sub)]">{t("subscription.accountHolder")}</span>
                          <b className="text-[var(--ink)]">{bankAccount.accountHolder}</b>
                        </div>
                      )}
                      {bankAccount.iban && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--sub)]">{t("subscription.iban")}</span>
                          <b className="text-[var(--ink)] break-all" dir="ltr">{bankAccount.iban}</b>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="field-shell mb-3">
                    <input
                      type="text"
                      value={transferRef}
                      onChange={e => setTransferRef(e.target.value)}
                      placeholder={t("subscription.transferReferencePlaceholder")}
                    />
                  </div>
                  <button type="button" onClick={submitBankTransfer} disabled={bankSubmitting} className="btn btn-primary w-full">
                    {bankSubmitting ? t("common.loading") : t("subscription.payByBank")}
                  </button>
                </div>
              )}
            </div>
            )}

            <div className="mt-4 pt-4 border-t border-[var(--border)] text-center">
              <button onClick={closePayModal} className="text-[12.5px] text-[var(--sub)] hover:text-[var(--ink)] transition-colors">
                {t("subscription.cancelPayment")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
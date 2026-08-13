"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import Icon from "@/components/Icon";
import { useConfirm } from "@/components/ConfirmDialog";
import PackageCard from "@/components/PackageCard";
import Can from "@/components/Can";

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
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("Monthly");
  const [showCardForm, setShowCardForm] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{ subscriptionId: number; amount: number } | null>(null);
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardError, setCardError] = useState("");
  const [paying, setPaying] = useState(false);

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
            // فتح فورم البطاقة لإدخال بيانات الكارت (رقم/تاريخ/CVV) —
            // مع خيار بديل للدفع عبر صفحة موياسر المحمية.
            setPendingPayment({ subscriptionId, amount: dueAmount });
            setCardHolder("");
            setCardNumber("");
            setCardExpiry("");
            setCardCvc("");
            setCardError("");
            setShowCardForm(true);
          } else {
            setActionError(t("subscription.paymentError"));
          }
        } else {
          setActionSuccess(
            balanceUsed > 0
              ? t("subscription.balanceCovered").replace("{amount}", `${balanceUsed.toFixed(2)} SAR`)
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
        setActionSuccess(t("subscription.balanceCovered").replace("{amount}", `${balanceUsed.toFixed(2)} SAR`));
        await fetchData();
      } else if (dueAmount > 0) {
        if (subscriptionId) {
          await startHostedPayment(subscriptionId, dueAmount);
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

  // الدفع المحمي: تحويل العميل مباشرة إلى صفحة موياسر (لا تُدخل بيانات البطاقة هنا)
  const startHostedPayment = async (subscriptionId: number, amount: number) => {
    setActionError("");
    setActionSuccess("");
    try {
      const payRes = await api.post("/payments/create-link", {
        subscriptionId,
        amount,
        currency: "SAR",
        successUrl: window.location.href,
        callbackUrl: window.location.href,
      });
      if (payRes.data.success && payRes.data.data.paymentLinkUrl) {
        const ref = payRes.data?.data?.paymentReference;
        if (ref) sessionStorage.setItem("sub_payment_ref", ref);
        setActionSuccess(t("subscription.paymentInitiated"));
        window.location.assign(payRes.data.data.paymentLinkUrl);
      } else {
        setActionError(payRes.data?.message || t("subscription.paymentError"));
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionError(e.response?.data?.message || t("subscription.paymentError"));
    }
  };

  // 💳 الدفع عبر فورم البطاقة المدمج: تُرسل بيانات الكارت لإنشاء دفع مباشر لدى ميسرا
  // (source: creditcard) ثم يُحوَّل المستخدم إلى صفحة 3DS لتأكيد الدفع.
  const submitCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPayment) return;

    const expiryMatch = cardExpiry.trim().match(/^(\d{2})\s*[/-]\s*(\d{2})$/);
    if (!expiryMatch) {
      setCardError(t("subscription.cardExpiry"));
      return;
    }
    if (cardNumber.replace(/\s/g, "").length < 12) {
      setCardError(t("subscription.cardRequired"));
      return;
    }

    setPaying(true);
    setCardError("");
    try {
      const payRes = await api.post("/payments/create-link", {
        subscriptionId: pendingPayment.subscriptionId,
        amount: pendingPayment.amount,
        currency: "SAR",
        successUrl: window.location.href,
        callbackUrl: window.location.href,
        cardHolder: cardHolder.trim(),
        cardNumber: cardNumber.replace(/\s/g, ""),
        cardExpiryMonth: expiryMatch[1],
        cardExpiryYear: expiryMatch[2],
        cardCvc: cardCvc.trim(),
      });
      if (payRes.data.success && payRes.data.data.paymentLinkUrl) {
        const ref = payRes.data?.data?.paymentReference;
        if (ref) sessionStorage.setItem("sub_payment_ref", ref);
        setActionSuccess(t("subscription.paymentInitiated"));
        setShowCardForm(false);
        setPendingPayment(null);
        window.location.assign(payRes.data.data.paymentLinkUrl);
      } else {
        setCardError(payRes.data?.message || t("subscription.paymentError"));
        setPaying(false);
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setCardError(e.response?.data?.message || t("subscription.paymentError"));
      setPaying(false);
    }
  };

  const useHostedCheckout = () => {
    if (!pendingPayment) return;
    const { subscriptionId, amount } = pendingPayment;
    setShowCardForm(false);
    setPendingPayment(null);
    startHostedPayment(subscriptionId, amount);
  };

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
                <p className="font-medium text-[var(--ink)]">{status.billingCycle}</p>
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
                <p className="font-medium text-[var(--blue)]">{status.balance.toFixed(2)} SAR</p>
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
            const totalPrice = billingCycle === "Monthly" ? undefined : getCycleTotalPrice(pkg.monthlyPrice, billingCycle);
            const savePercent = billingCycle === "Monthly" ? undefined : BILLING_CYCLE_DISCOUNT[billingCycle] * 100;

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

      {showCardForm && pendingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-[var(--blue-deep)]">{t("subscription.cardFormTitle")}</h2>
              <button onClick={() => setShowCardForm(false)} className="text-[var(--sub)] hover:text-[var(--ink)]">
                <Icon name="close" size={18} />
              </button>
            </div>

            <p className="text-[13px] text-[var(--sub)] mb-4">
              {t("subscription.cardDetails")}:{" "}
              <span className="font-bold text-[var(--ink)]">{pendingPayment.amount.toFixed(2)} SAR</span>
            </p>

            {cardError && <div className="alert alert--danger mb-4">{cardError}</div>}

            <form onSubmit={submitCardPayment} className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("subscription.cardHolder")}</label>
                <div className="field-shell">
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    required
                    placeholder={t("subscription.cardHolder")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("subscription.cardNumber")}</label>
                <div className="field-shell">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/[^\d ]/g, "").slice(0, 19))}
                    required
                    dir="ltr"
                    className="text-left"
                    placeholder="4111 1111 1111 1111"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("subscription.cardExpiry")}</label>
                  <div className="field-shell">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value.replace(/[^\d/]/g, "").slice(0, 5))}
                      required
                      dir="ltr"
                      className="text-left"
                      placeholder="MM/YY"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("subscription.cardCvc")}</label>
                  <div className="field-shell">
                    <input
                      type="password"
                      inputMode="numeric"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                      required
                      dir="ltr"
                      className="text-left"
                      placeholder="123"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11.5px] text-[var(--sub)]">{t("subscription.securePaymentNote")}</p>
              <p className="text-[11.5px] text-[var(--sub)] bg-[var(--bg)] p-2 rounded">{t("subscription.testCardHint")}</p>

              <button type="submit" disabled={paying} className="btn-primary w-full">
                {paying ? t("common.saving") : t("subscription.payNow")}
              </button>
              <button
                type="button"
                onClick={useHostedCheckout}
                disabled={paying}
                className="btn-outline w-full"
              >
                {t("subscription.hostedCheckout")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import Can from "@/components/Can";
import { formatMoney } from "@/lib/formatNumber";
import AppDesigner, {
  type AppDesign,
  type MobileAppBundle,
  parseDesign,
  serializeDesign,
  DEFAULT_DESIGN,
} from "@/components/AppDesigner";

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
  renewalPrice: number;
  isFirstSubscriptionFree: boolean;
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
  publishStatus: string;
  adminReviewNote: string | null;
  currentStep: string;
  designJson: string | null;
  listingShortDescription: string | null;
  listingDescription: string | null;
  listingKeywords: string | null;
  listingCategory: string | null;
  listingIconUrl: string | null;
  listingScreenshots: string[];
  listingSupportEmail: string | null;
  listingPrivacyUrl: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  appStoreUrl: string | null;
  googlePlayUrl: string | null;
  currentAppVersion: string | null;
  downloadCount: number;
  salesCount: number;
}

interface AppNotification {
  id: number;
  title: string;
  body: string;
  kind: string;
  imageUrl: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  status: string;
  recipientsCount: number;
  opensCount: number;
  createdAt: string;
}

interface Analytics {
  totalInstalls: number;
  totalSessions: number;
  totalOrders: number;
  totalRevenue: number;
  totalNewCustomers: number;
  downloadCount: number;
  salesCount: number;
}

interface AppBuild {
  id: number;
  storeId: number;
  storeAppSubscriptionId: number;
  storeName: string | null;
  appName: string | null;
  status: string;
  githubRunId: number | null;
  githubRunUrl: string | null;
  packageName: string | null;
  versionName: string | null;
  isApkReady: boolean;
  apkSizeBytes: number | null;
  apkSha256: string | null;
  downloadUrl: string | null;
  errorMessage: string | null;
  logTail: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

type BillingCycle = "Monthly" | "Yearly";
type StepId = "design" | "subscribe" | "launch";

export default function MobileAppManager() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<MobileAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeStep, setActiveStep] = useState<StepId>("design");

  const [design, setDesign] = useState<AppDesign>(DEFAULT_DESIGN);
  const [bundle, setBundle] = useState<MobileAppBundle | null>(null);
  const [storeName, setStoreName] = useState("");
  const [savingDesign, setSavingDesign] = useState(false);

  // نموذج الاشتراك
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("Yearly");
  const [devAccountType, setDevAccountType] = useState<"Company" | "Platform">("Company");
  const [devAccountInfo, setDevAccountInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // نموذج الإطلاق
  const [shortDesc, setShortDesc] = useState("");
  const [longDesc, setLongDesc] = useState("");
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [supportEmail, setSupportEmail] = useState("");
  const [privacyUrl, setPrivacyUrl] = useState("");
  const [publishing, setPublishing] = useState(false);

  // بناء التطبيق (APK)
  const [build, setBuild] = useState<AppBuild | null>(null);
  const [buildLoading, setBuildLoading] = useState(false);

  // الدفع
  const [showPayModal, setShowPayModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payAppSubscriptionId, setPayAppSubscriptionId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payForm, setPayForm] = useState<PayFormSession | null>(null);
  const [formReady, setFormReady] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const paidHandledRef = useRef(false);

  // لوحات فرعية
  const [panel, setPanel] = useState<"none" | "notifications" | "analytics">("none");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

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
      const parsed = parseDesign(d.designJson, d.appName);
      // دمج الأيقونة المحفوظة في صفحة الإطلاق ضمن التصميم
      if (d.listingIconUrl) parsed.iconUrl = parsed.iconUrl || d.listingIconUrl;
      setDesign(parsed);
      setShortDesc(d.listingShortDescription || "");
      setLongDesc(d.listingDescription || "");
      setKeywords(d.listingKeywords || "");
      setCategory(d.listingCategory || "");
      setScreenshots(d.listingScreenshots || []);
      setSupportEmail(d.listingSupportEmail || "");
      setPrivacyUrl(d.listingPrivacyUrl || "");
      setActiveStep((d.currentStep as StepId) || "design");
    } catch {
      setError(t("mobileApp.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const loadStoreInfo = async () => {
    try {
      const res = await api.get("/mobile-app/bundle");
      const d = res.data?.data as MobileAppBundle | undefined;
      if (d) {
        setBundle(d);
        if (d.store?.storeName) setStoreName(d.store.storeName);
      }
    } catch { /* تجاهل */ }
  };

  const loadBuild = async () => {
    try {
      const res = await api.get("/mobile-app/build");
      setBuild(res.data?.data || null);
    } catch { setBuild(null); }
  };

  useEffect(() => {
    load();
    loadStoreInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // متابعة حالة البناء أثناء التشغيل (استقصاء كل 15 ثانية).
  useEffect(() => {
    if (!build || (build.status !== "Queued" && build.status !== "Running")) return;
    const timer = setInterval(async () => {
      try {
        const res = await api.get("/mobile-app/build");
        setBuild(res.data?.data || null);
      } catch { /* تجاهل */ }
    }, 15000);
    return () => clearInterval(timer);
  }, [build]);

  // تحميل حالة البناء عند الدخول لخطوة الإطلاق.
  useEffect(() => {
    if (activeStep === "launch") loadBuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  const downloadBuild = async () => {
    if (!build?.isApkReady) return;
    setBuildLoading(true);
    try {
      const res = await api.get("/mobile-app/build/download", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `app-${build.packageName || "store"}-v${build.versionName || "1.0.0"}.apk`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError(t("mobileApp.buildDownloadError"));
    } finally {
      setBuildLoading(false);
    }
  };

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
    return () => { disposed = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payForm]);

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
        if (st === "Paid") { clearInterval(timer); setSuccess(t("mobileApp.paymentSuccess")); load(); return; }
        if (st === "Failed") { clearInterval(timer); setError(t("mobileApp.paymentError")); load(); return; }
        tries += 1;
        if (tries >= maxTries) { clearInterval(timer); setError(t("mobileApp.paymentStatusUnknown")); load(); }
      } catch {
        tries += 1;
        if (tries >= maxTries) { clearInterval(timer); setError(t("mobileApp.paymentStatusUnknown")); load(); }
      }
    }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveDesign = async (silent = false) => {
    if (!status?.id) return;
    setError("");
    if (!silent) setSuccess("");
    setSavingDesign(true);
    try {
      const res = await api.post("/mobile-app/design", {
        designJson: serializeDesign(design),
        appName: design.appName.trim() || null,
      });
      const d = res.data.data as MobileAppStatus;
      setStatus(d);
      if (!silent) setSuccess(t("appDesigner.saved"));
    } catch (err: any) {
      setError(err.response?.data?.message || t("mobileApp.loadError"));
    } finally {
      setSavingDesign(false);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      // نحفظ التصميم أولًا إن كان الاشتراك قائمًا
      if (status?.id) await handleSaveDesign(true);
      const res = await api.post("/mobile-app/subscribe", {
        billingCycle,
        appName: design.appName.trim() || null,
        developerAccountType: devAccountType,
        developerAccountInfo: devAccountInfo.trim() || null,
        merchantNotes: notes.trim() || null,
      });
      const d = res.data.data as MobileAppStatus;
      setStatus(d);
      // الاشتراك الأول مجاني (المبلغ 0) ⇒ يُفعَّل مباشرةً بلا دفع.
      // التجديد فقط (بمبلغ > 0) يتطلّب فتح نافذة الدفع.
      if (d.dueAmount > 0 && d.id) {
        setSuccess(t("mobileApp.paymentPendingMsg"));
        openPaymentModal(d.id, d.dueAmount);
      } else {
        setSuccess(t("mobileApp.freeActivatedMsg"));
      }
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

  const handlePublish = async () => {
    setError("");
    setSuccess("");
    setPublishing(true);
    try {
      await handleSaveDesign(true);
      const res = await api.post("/mobile-app/publish", {
        appName: design.appName.trim() || null,
        listingShortDescription: shortDesc.trim() || null,
        listingDescription: longDesc.trim() || null,
        listingKeywords: keywords.trim() || null,
        listingCategory: category.trim() || null,
        listingIconUrl: design.iconUrl.trim() || null,
        listingScreenshots: screenshots.filter((s) => s.trim()),
        listingSupportEmail: supportEmail.trim() || null,
        listingPrivacyUrl: privacyUrl.trim() || null,
      });
      const d = res.data.data as MobileAppStatus;
      setStatus(d);
      setSuccess(res.data.message || t("mobileApp.publishSubmitted"));
    } catch (err: any) {
      setError(err.response?.data?.message || t("mobileApp.loadError"));
    } finally {
      setPublishing(false);
    }
  };

  const openNotifications = async () => {
    setPanel("notifications");
    try {
      const res = await api.get("/mobile-app/notifications");
      setNotifications(res.data.data || []);
    } catch { setNotifications([]); }
  };

  const openAnalytics = async () => {
    setPanel("analytics");
    try {
      const res = await api.get("/mobile-app/analytics", { params: { days: 30 } });
      setAnalytics(res.data.data || null);
    } catch { setAnalytics(null); }
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

  const publishBadge = (s: string) => {
    switch (s) {
      case "Published": return { cls: "badge badge--green", key: "mobileApp.pubPublished" };
      case "Submitted": return { cls: "badge badge--yellow", key: "mobileApp.pubSubmitted" };
      case "InReview": return { cls: "badge badge--yellow", key: "mobileApp.pubInReview" };
      case "Rejected": return { cls: "badge badge--red", key: "mobileApp.pubRejected" };
      default: return { cls: "badge badge--gray", key: "mobileApp.pubDraft" };
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
  const hasSubscription = !!status?.id;
  const publish = publishBadge(status?.publishStatus || "Draft");

  const steps: { id: StepId; labelKey: string; icon: string; done: boolean }[] = [
    { id: "design", labelKey: "mobileApp.stepDesign", icon: "edit", done: !!status?.designJson },
    { id: "subscribe", labelKey: "mobileApp.stepSubscribe", icon: "card", done: isActive },
    { id: "launch", labelKey: "mobileApp.stepLaunch", icon: "download", done: status?.publishStatus === "Published" },
  ];

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

      {/* ── شريط الحالة + الأزرار الفرعية ── */}
      <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-5 py-4 mb-4 border border-gray-100 flex-wrap gap-3">
        <div className="min-w-0">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("mobileApp.currentStatus")}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={statusBadge(status?.status || "None")}>{statusLabel(status?.status || "None")}</span>
            {hasSubscription && <span className={publish.cls}>{t(publish.key)}</span>}
            {hasSubscription && status?.currentAppVersion && (
              <span className="badge badge--gray">v{status.currentAppVersion}</span>
            )}
          </div>
        </div>
        <div className="text-end">
          <p className="text-[12px] text-[var(--sub)] mb-1">
            {isActive ? t("mobileApp.daysRemaining") : t("mobileApp.currentPrice")}
          </p>
          <p className="text-[15px] font-bold text-[var(--ink)]">
            {isActive && status?.daysRemaining != null
              ? `${status.daysRemaining} ${t("mobileApp.daysSuffix")}`
              : `${formatMoney(status?.renewalPrice ?? 300)} ${t("common.currency")} ${t("mobileApp.perYear")}`}
          </p>
        </div>
      </div>

      {/* زر إدارة/إلغاء + الإشعارات والإحصاءات */}
      {hasSubscription && isActive && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" onClick={openNotifications} className={`btn btn-sm ${panel === "notifications" ? "btn-primary" : ""}`}>
            <Icon name="bell" size={14} /> {t("mobileApp.notificationsBtn")}
          </button>
          <button type="button" onClick={openAnalytics} className={`btn btn-sm ${panel === "analytics" ? "btn-primary" : ""}`}>
            <Icon name="chart" size={14} /> {t("mobileApp.analyticsBtn")}
          </button>
          <button type="button" onClick={() => setPanel("none")} className={`btn btn-sm ${panel === "none" ? "btn-primary" : ""}`}>
            <Icon name="layers" size={14} /> {t("mobileApp.manageBtn")}
          </button>
          <Can code="StoreSettings.Edit">
            <button type="button" className="btn btn-sm ms-auto" disabled={cancelling} onClick={handleCancel}>
              {cancelling ? t("mobileApp.cancelling") : t("mobileApp.cancelSubscription")}
            </button>
          </Can>
        </div>
      )}

      {/* لوحة الإشعارات */}
      {panel === "notifications" && <NotificationsPanel notifications={notifications} reload={openNotifications} setError={setError} setSuccess={setSuccess} />}

      {/* لوحة الإحصاءات */}
      {panel === "analytics" && <AnalyticsPanel analytics={analytics} downloadCount={status?.downloadCount || 0} salesCount={status?.salesCount || 0} />}

      {panel === "none" && (
        <>
          {/* ── خطوات صانع التطبيقات ── */}
          <div className="flex items-center gap-1 mb-5">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => setActiveStep(s.id)}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold"
                    style={{
                      background: activeStep === s.id ? "var(--blue)" : s.done ? "var(--green-soft, #e4f9f0)" : "var(--bg, #eef1f5)",
                      color: activeStep === s.id ? "#fff" : s.done ? "var(--green)" : "var(--sub)",
                    }}
                  >
                    {s.done ? <Icon name="check" size={14} /> : i + 1}
                  </span>
                  <span className={`text-[12.5px] font-bold truncate ${activeStep === s.id ? "text-[var(--ink)]" : "text-[var(--sub)]"}`}>
                    {t(s.labelKey)}
                  </span>
                </button>
                {i < steps.length - 1 && <span className="w-4 h-px bg-gray-300 mx-1 shrink-0" />}
              </div>
            ))}
          </div>

          {/* ── الخطوة 1: صمّم ── */}
          {activeStep === "design" && (
            <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
              {!hasSubscription && (
                <div className="alert alert--info mb-4">
                  <Icon name="alert" size={16} className="shrink-0 mt-0.5" />
                  <span>{t("mobileApp.designBeforeSubscribe")}</span>
                </div>
              )}
              <AppDesigner design={design} onChange={setDesign} bundle={bundle} storeName={storeName} />
              {hasSubscription && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Can code="StoreSettings.Edit">
                    <button type="button" className="btn btn-primary" disabled={savingDesign} onClick={() => handleSaveDesign(false)}>
                      {savingDesign ? t("mobileApp.saving") : t("mobileApp.saveDesign")}
                    </button>
                  </Can>
                  {isActive && <SaveAndPublishHint onGo={() => setActiveStep("launch")} label={t("mobileApp.goToLaunch")} />}
                </div>
              )}
              {!hasSubscription && (
                <div className="mt-5">
                  <button type="button" className="btn btn-primary" onClick={() => setActiveStep("subscribe")}>
                    {t("mobileApp.nextSubscribe")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── الخطوة 2: اشترك ── */}
          {activeStep === "subscribe" && (
            <SubscribeStep
              t={t}
              status={status}
              isActive={isActive}
              isPending={isPending}
              hasSubscription={hasSubscription}
              billingCycle={billingCycle}
              setBillingCycle={setBillingCycle}
              devAccountType={devAccountType}
              setDevAccountType={setDevAccountType}
              devAccountInfo={devAccountInfo}
              setDevAccountInfo={setDevAccountInfo}
              notes={notes}
              setNotes={setNotes}
              submitting={submitting}
              onSubmit={handleSubscribe}
              onPayNow={() => status?.id && openPaymentModal(status.id, status.dueAmount)}
              onGoLaunch={() => setActiveStep("launch")}
              onGoDesign={() => setActiveStep("design")}
              formatDate={formatDate}
              cycleLabel={cycleLabel}
            />
          )}

          {/* ── الخطوة 3: أطلق ── */}
          {activeStep === "launch" && (
            <LaunchStep
              t={t}
              status={status}
              isActive={isActive}
              hasSubscription={hasSubscription}
              shortDesc={shortDesc} setShortDesc={setShortDesc}
              longDesc={longDesc} setLongDesc={setLongDesc}
              keywords={keywords} setKeywords={setKeywords}
              category={category} setCategory={setCategory}
              iconUrl={design.iconUrl}
              screenshots={screenshots} setScreenshots={setScreenshots}
              supportEmail={supportEmail} setSupportEmail={setSupportEmail}
              privacyUrl={privacyUrl} setPrivacyUrl={setPrivacyUrl}
              publishing={publishing}
              onPublish={handlePublish}
              onGoSubscribe={() => setActiveStep("subscribe")}
              formatDate={formatDate}
              build={build}
              buildLoading={buildLoading}
              onDownloadBuild={downloadBuild}
              onRefreshBuild={loadBuild}
            />
          )}
        </>
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

// ── الخطوة 2: اشترك ──
function SubscribeStep(props: any) {
  const {
    t, status, isActive, isPending, hasSubscription,
    billingCycle, setBillingCycle, devAccountType, setDevAccountType,
    devAccountInfo, setDevAccountInfo, notes, setNotes, submitting, onSubmit,
    onPayNow, onGoLaunch, onGoDesign, formatDate, cycleLabel,
  } = props;

  if (hasSubscription) {
    return (
      <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-[12.5px]">
          <div>
            <p className="text-[var(--sub)] mb-0.5">{t("mobileApp.billingCycle")}</p>
            <p className="font-bold text-[var(--ink)]">{cycleLabel(status.billingCycle)}</p>
          </div>
          <div>
            <p className="text-[var(--sub)] mb-0.5">{t("mobileApp.dueAmount")}</p>
            <p className="font-bold text-[var(--ink)]">{formatMoney(status.dueAmount)} {t("common.currency")}</p>
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
            <button type="button" className="btn btn-primary btn-sm" onClick={onPayNow}>
              {t("mobileApp.payNow")}
            </button>
          )}
          {isActive && (
            <>
              <button type="button" className="btn btn-primary btn-sm" onClick={onGoLaunch}>
                {t("mobileApp.nextLaunch")}
              </button>
              <button type="button" className="btn btn-sm" onClick={onGoDesign}>
                {t("mobileApp.backToDesign")}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
      <p className="text-[13px] font-extrabold text-[var(--ink)] mb-4">{t("mobileApp.includedFeatures")}</p>
      <FeatureList t={t} />

      <form onSubmit={onSubmit} className="space-y-4 mt-6 border-t border-gray-100 pt-5">
        <div className="rounded-xl border border-[var(--border)] p-4">
          {status?.isFirstSubscriptionFree ? (
            <>
              <p className="text-[13px] font-extrabold text-[var(--ink)] mb-1">{t("mobileApp.firstFreeTitle")}</p>
              <p className="text-[12px] text-[var(--sub)]">{t("mobileApp.firstFreeDesc")}</p>
            </>
          ) : (
            <>
              <p className="text-[13px] font-extrabold text-[var(--ink)] mb-1">{t("mobileApp.renewalTitle")}</p>
              <p className="text-[12px] text-[var(--sub)]">
                {t("mobileApp.renewalDesc").replace("{price}", formatMoney(status?.renewalPrice ?? 300))}
              </p>
            </>
          )}
        </div>

        <div>
          <label className="text-[12.5px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.developerAccount")}</label>
          <div className="space-y-2">
            {(["Company", "Platform"] as const).map((opt) => (
              <label key={opt} className="flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer" style={{ borderColor: devAccountType === opt ? "var(--blue)" : "var(--border)" }}>
                <input type="radio" name="devAccountType" checked={devAccountType === opt} onChange={() => setDevAccountType(opt)} className="mt-0.5 accent-[var(--blue)]" />
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
            <input type="text" value={devAccountInfo} onChange={(e) => setDevAccountInfo(e.target.value)} maxLength={1000} placeholder={t("mobileApp.devAccountInfoPlaceholder")} />
          </div>
        </div>

        <div>
          <label className="text-[12.5px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.notes")}</label>
          <div className="field-shell">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} placeholder={t("mobileApp.notesPlaceholder")} />
          </div>
        </div>

        <div className="alert alert--info">
          <Icon name="alert" size={16} className="shrink-0 mt-0.5" />
          <span>{t("mobileApp.devFeesNote")}</span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? t("mobileApp.subscribing") : t("mobileApp.subscribe")}
          </button>
          <button type="button" className="btn" onClick={onGoDesign}>{t("mobileApp.backToDesign")}</button>
        </div>
      </form>
    </div>
  );
}

// ── الخطوة 3: أطلق ──
function LaunchStep(props: any) {
  const {
    t, status, isActive, hasSubscription,
    shortDesc, setShortDesc, longDesc, setLongDesc, keywords, setKeywords,
    category, setCategory, iconUrl, screenshots, setScreenshots,
    supportEmail, setSupportEmail, privacyUrl, setPrivacyUrl, publishing, onPublish,
    onGoSubscribe, formatDate,
    build, buildLoading, onDownloadBuild, onRefreshBuild,
  } = props;

  if (!hasSubscription || !isActive) {
    return (
      <div className="rounded-2xl border p-6 text-center" style={{ borderColor: "var(--border)" }}>
        <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--blue-50, #f5f9ff)", color: "var(--blue)" }}>
          <Icon name="lock" size={20} />
        </div>
        <p className="text-[13px] font-bold text-[var(--ink)] mb-1">{t("mobileApp.launchLockedTitle")}</p>
        <p className="text-[12.5px] text-[var(--sub)] mb-4 max-w-md mx-auto">{t("mobileApp.launchLockedDesc")}</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={onGoSubscribe}>{t("mobileApp.goToSubscribe")}</button>
      </div>
    );
  }

  const published = status.publishStatus === "Published";
  const awaitingReview = status.publishStatus === "Submitted" || status.publishStatus === "InReview";

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
      {/* حالة النشر */}
      {status.publishStatus !== "Draft" && (
        <div className={`alert ${published ? "alert--info" : awaitingReview ? "alert--warning" : "alert--danger"} mb-5`}>
          <Icon name={published ? "check" : "alert"} size={16} className="shrink-0 mt-0.5" />
          <span>
            {published && t("mobileApp.reviewPublished")}
            {awaitingReview && t("mobileApp.reviewAwaiting")}
            {status.publishStatus === "Rejected" && t("mobileApp.reviewRejected")}
            {status.adminReviewNote && <><br />{t("mobileApp.reviewNote")}: {status.adminReviewNote}</>}
          </span>
        </div>
      )}

      {/* روابط المتاجر بعد النشر */}
      {published && (status.appStoreUrl || status.googlePlayUrl) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {status.appStoreUrl && (
            <a href={status.appStoreUrl} target="_blank" rel="noreferrer" className="rounded-xl border p-3 flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
              <Icon name="download" size={16} className="text-[var(--blue)]" />
              <span className="text-[12.5px] font-bold text-[var(--ink)]">App Store</span>
            </a>
          )}
          {status.googlePlayUrl && (
            <a href={status.googlePlayUrl} target="_blank" rel="noreferrer" className="rounded-xl border p-3 flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
              <Icon name="download" size={16} className="text-[var(--blue)]" />
              <span className="text-[12.5px] font-bold text-[var(--ink)]">Google Play</span>
            </a>
          )}
        </div>
      )}

      <p className="text-[13px] font-extrabold text-[var(--ink)] mb-1">{t("mobileApp.listingTitle")}</p>
      <p className="text-[11.5px] text-[var(--sub)] mb-4">{t("mobileApp.listingDesc")}</p>

      <div className="space-y-3">
        <div>
          <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.listingShortDescription")}</label>
          <div className="field-shell">
            <input type="text" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} maxLength={1000} placeholder={t("mobileApp.listingShortPlaceholder")} />
          </div>
        </div>
        <div>
          <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.listingDescription")}</label>
          <div className="field-shell">
            <textarea value={longDesc} onChange={(e) => setLongDesc(e.target.value)} rows={4} maxLength={4000} placeholder={t("mobileApp.listingDescPlaceholder")} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.listingKeywords")}</label>
            <div className="field-shell">
              <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} maxLength={200} placeholder={t("mobileApp.listingKeywordsPlaceholder")} />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.listingCategory")}</label>
            <div className="field-shell">
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={100} placeholder={t("mobileApp.listingCategoryPlaceholder")} />
            </div>
          </div>
        </div>
        <div>
          <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.listingIcon")}</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl border flex items-center justify-center overflow-hidden shrink-0" style={{ borderColor: "var(--border)" }}>
              {iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={iconUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Icon name="package" size={22} className="text-[var(--sub-light)]" />
              )}
            </div>
            <span className="text-[11.5px] text-[var(--sub)]">{t("mobileApp.listingIconNote")}</span>
          </div>
        </div>
        <div>
          <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.listingScreenshots")}</label>
          <div className="space-y-2">
            {screenshots.map((s: string, i: number) => (
              <div key={i} className="flex gap-2">
                <div className="field-shell flex-1">
                  <input
                    type="text"
                    value={s}
                    onChange={(e) => setScreenshots(screenshots.map((x: string, j: number) => (j === i ? e.target.value : x)))}
                    placeholder="https://..."
                  />
                </div>
                <button type="button" className="btn btn-sm" onClick={() => setScreenshots(screenshots.filter((_: string, j: number) => j !== i))}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
            {screenshots.length < 12 && (
              <button type="button" className="btn btn-sm" onClick={() => setScreenshots([...screenshots, ""])}>
                <Icon name="plus" size={14} /> {t("mobileApp.addScreenshot")}
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.listingSupportEmail")}</label>
            <div className="field-shell">
              <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} maxLength={500} placeholder="support@store.com" />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.listingPrivacyUrl")}</label>
            <div className="field-shell">
              <input type="text" value={privacyUrl} onChange={(e) => setPrivacyUrl(e.target.value)} maxLength={500} placeholder="https://..." />
            </div>
          </div>
        </div>
      </div>

      <div className="alert alert--info mt-5">
        <Icon name="clock" size={16} className="shrink-0 mt-0.5" />
        <span>{t("mobileApp.reviewTimeline")}</span>
      </div>

      <div className="flex flex-wrap gap-3 mt-5">
        <Can code="StoreSettings.Edit">
          <button type="button" className="btn btn-primary" disabled={publishing || awaitingReview} onClick={onPublish}>
            {publishing ? t("mobileApp.publishing") : published ? t("mobileApp.republish") : t("mobileApp.publishBtn")}
          </button>
        </Can>
        {published && (
          <span className="text-[12px] text-[var(--sub)] self-center">{t("mobileApp.publishedAt")}: {formatDate(status.publishedAt)}</span>
        )}
      </div>

      {/* ── بناء التطبيق (APK) ── */}
      {(published || awaitingReview) && (
        <BuildPanel
          t={t}
          build={build}
          buildLoading={buildLoading}
          onDownload={onDownloadBuild}
          onRefresh={onRefreshBuild}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}

// ── لوحة بناء التطبيق (APK) ──
function BuildPanel({ t, build, buildLoading, onDownload, onRefresh, formatDate }: any) {
  const badgeCls = (s: string) => {
    switch (s) {
      case "Succeeded": return "badge badge--green";
      case "Running": return "badge badge--yellow";
      case "Queued": return "badge badge--yellow";
      case "Failed": return "badge badge--red";
      default: return "badge badge--gray";
    }
  };
  const statusLabel = (s: string) => {
    switch (s) {
      case "Succeeded": return t("mobileApp.buildStatusSucceeded");
      case "Running": return t("mobileApp.buildStatusRunning");
      case "Queued": return t("mobileApp.buildStatusQueued");
      case "Failed": return t("mobileApp.buildStatusFailed");
      default: return t("mobileApp.buildStatusNone");
    }
  };
  const sizeMb = build?.apkSizeBytes ? (build.apkSizeBytes / (1024 * 1024)).toFixed(1) : null;

  return (
    <div className="rounded-2xl border p-5 mt-5" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Icon name="download" size={18} className="text-[var(--blue)]" />
          <p className="text-[13px] font-extrabold text-[var(--ink)]">{t("mobileApp.buildTitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {build && <span className={badgeCls(build.status)}>{statusLabel(build.status)}</span>}
          <button type="button" className="btn btn-sm" onClick={onRefresh}>
            <Icon name="refresh" size={14} /> {t("mobileApp.buildRefresh")}
          </button>
        </div>
      </div>

      <p className="text-[11.5px] text-[var(--sub)] mb-4 leading-relaxed">{t("mobileApp.buildDesc")}</p>

      {!build ? (
        <p className="text-[12.5px] text-[var(--sub)]">{t("mobileApp.buildNone")}</p>
      ) : (
        <div className="space-y-2 text-[12px]">
          {build.packageName && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--sub)]">{t("mobileApp.buildPackage")}</span>
              <span className="font-bold text-[var(--ink)] font-mono text-[11.5px]">{build.packageName}</span>
            </div>
          )}
          {build.versionName && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--sub)]">{t("mobileApp.buildVersion")}</span>
              <span className="font-bold text-[var(--ink)]">v{build.versionName}</span>
            </div>
          )}
          {build.status === "Succeeded" && sizeMb && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--sub)]">{t("mobileApp.buildSize")}</span>
              <span className="font-bold text-[var(--ink)]">{sizeMb} MB</span>
            </div>
          )}
          {build.finishedAt && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--sub)]">{t("mobileApp.buildFinishedAt")}</span>
              <span className="font-bold text-[var(--ink)]">{formatDate(build.finishedAt)}</span>
            </div>
          )}
          {build.errorMessage && (
            <div className="alert alert--danger mt-2">
              <Icon name="alert" size={15} className="shrink-0 mt-0.5" />
              <span className="text-[11.5px] break-all">{build.errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {build?.isApkReady && (
        <button type="button" className="btn btn-primary mt-4" disabled={buildLoading} onClick={onDownload}>
          <Icon name="download" size={15} /> {buildLoading ? t("common.loading") : t("mobileApp.buildDownload")}
        </button>
      )}

      {build && (build.status === "Queued" || build.status === "Running") && (
        <div className="alert alert--warning mt-4">
          <Icon name="alert" size={15} className="shrink-0 mt-0.5" />
          <span className="text-[11.5px]">{t("mobileApp.buildInProgressNote")}</span>
        </div>
      )}
    </div>
  );
}

// ── لوحة الإشعارات ──
function NotificationsPanel({ notifications, reload, setError, setSuccess }: any) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<"Instant" | "Scheduled">("Instant");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    setError(""); setSuccess("");
    setSending(true);
    try {
      await api.post("/mobile-app/notifications", {
        kind,
        title: title.trim(),
        body: body.trim(),
        imageUrl: imageUrl.trim() || null,
        scheduledAt: kind === "Scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      setSuccess(t("mobileApp.notifSent"));
      setTitle(""); setBody(""); setImageUrl(""); setScheduledAt("");
      reload();
    } catch (err: any) {
      setError(err.response?.data?.message || t("mobileApp.loadError"));
    } finally {
      setSending(false);
    }
  };

  const cancel = async (id: number) => {
    setError(""); setSuccess("");
    try {
      await api.post(`/mobile-app/notifications/${id}/cancel`);
      setSuccess(t("mobileApp.notifCancelled"));
      reload();
    } catch (err: any) {
      setError(err.response?.data?.message || t("mobileApp.loadError"));
    }
  };

  const kindLabel = (k: string) => k === "Scheduled" ? t("mobileApp.notifScheduled") : k === "Automated" ? t("mobileApp.notifAutomated") : t("mobileApp.notifInstant");
  const statusLabel = (s: string) =>
    s === "Sent" ? t("mobileApp.notifStatusSent") : s === "Scheduled" ? t("mobileApp.notifStatusScheduled") : s === "Cancelled" ? t("mobileApp.notifStatusCancelled") : s;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
        <p className="text-[13px] font-extrabold text-[var(--ink)] mb-1">{t("mobileApp.notifNewTitle")}</p>
        <p className="text-[11.5px] text-[var(--sub)] mb-4">{t("mobileApp.notifNewDesc")}</p>

        <div className="flex gap-2 mb-4">
          {(["Instant", "Scheduled"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)}
              className={`btn btn-sm ${kind === k ? "btn-primary" : ""}`}>
              {kindLabel(k)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.notifTitle")}</label>
            <div className="field-shell">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.notifBody")}</label>
            <div className="field-shell">
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.notifImage")}</label>
              <div className="field-shell">
                <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            {kind === "Scheduled" && (
              <div>
                <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.notifSchedule")}</label>
                <div className="field-shell">
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <button type="button" className="btn btn-primary" disabled={sending} onClick={send}>
            {sending ? t("mobileApp.sending") : t("mobileApp.notifSend")}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
        <p className="text-[13px] font-extrabold text-[var(--ink)] mb-4">{t("mobileApp.notifHistory")}</p>
        {notifications.length === 0 ? (
          <p className="text-[12.5px] text-[var(--sub)]">{t("mobileApp.notifEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n: AppNotification) => (
              <div key={n.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[12.5px] font-bold text-[var(--ink)]">{n.title}</span>
                  <span className="badge badge--gray">{kindLabel(n.kind)}</span>
                </div>
                <p className="text-[11.5px] text-[var(--sub)] leading-relaxed">{n.body}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--sub)]">
                  <span>{statusLabel(n.status)}</span>
                  {n.scheduledAt && <span>{t("mobileApp.notifScheduledFor")}: {new Date(n.scheduledAt).toLocaleString("ar-SA-u-nu-latn")}</span>}
                  <span>{n.recipientsCount} {t("mobileApp.notifRecipients")}</span>
                  {n.status === "Scheduled" && (
                    <button type="button" className="text-[var(--red)] font-bold" onClick={() => cancel(n.id)}>{t("mobileApp.notifCancel")}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── لوحة الإحصاءات ──
function AnalyticsPanel({ analytics, downloadCount, salesCount }: { analytics: Analytics | null; downloadCount: number; salesCount: number }) {
  const { t } = useTranslation();
  const cards: { key: string; value: string; icon: "wallet" | "receipt" | "download" | "users" | "userGroup" | "chart" }[] = [
    { key: "mobileApp.statRevenue", value: analytics ? `${formatMoney(analytics.totalRevenue)} ${t("common.sar")}` : "—", icon: "wallet" },
    { key: "mobileApp.statOrders", value: analytics ? String(analytics.totalOrders) : "—", icon: "receipt" },
    { key: "mobileApp.statInstalls", value: analytics ? String(analytics.totalInstalls || downloadCount) : String(downloadCount), icon: "download" },
    { key: "mobileApp.statSessions", value: analytics ? String(analytics.totalSessions) : "—", icon: "users" },
    { key: "mobileApp.statNewCustomers", value: analytics ? String(analytics.totalNewCustomers) : "—", icon: "userGroup" },
    { key: "mobileApp.statAppSales", value: String(salesCount), icon: "chart" },
  ];
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
      <p className="text-[13px] font-extrabold text-[var(--ink)] mb-1">{t("mobileApp.analyticsTitle")}</p>
      <p className="text-[11.5px] text-[var(--sub)] mb-4">{t("mobileApp.analyticsDesc")}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.key} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
            <span className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: "var(--blue-50, #f5f9ff)", color: "var(--blue)" }}>
              <Icon name={c.icon} size={15} />
            </span>
            <p className="text-[11px] text-[var(--sub)] mb-0.5">{t(c.key)}</p>
            <p className="text-[16px] font-extrabold text-[var(--ink)]">{c.value}</p>
          </div>
        ))}
      </div>
      {(!analytics || analytics.totalSessions === 0) && (
        <p className="text-[11.5px] text-[var(--sub)] mt-4">{t("mobileApp.analyticsEmpty")}</p>
      )}
    </div>
  );
}

function SaveAndPublishHint({ onGo, label }: { onGo: () => void; label: string }) {
  return (
    <button type="button" className="btn" onClick={onGo}>
      {label}
    </button>
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

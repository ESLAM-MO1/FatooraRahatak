"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import ToggleSwitch from "@/components/ToggleSwitch";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { useConfirm } from "@/components/ConfirmDialog";
import Can from "@/components/Can";
import "@/lib/i18n/config";
import { STORE_THEMES, resolveThemeConfig, getDefaultColors, parseStoreColors } from "@/components/store-templates/configs";
import type { StoreThemeMeta, StoreColors } from "@/components/store-templates/configs";
import PhoneInputField from "@/components/PhoneInputField";
import { PAGE_DEFS, parseStorePages } from "@/lib/storePages";
import StoreFaqManager from "@/components/store-managers/StoreFaqManager";
import StoreBlogManager from "@/components/store-managers/StoreBlogManager";
import StoreBannersManager from "@/components/store-managers/StoreBannersManager";

type DomainStatus = "None" | "Pending" | "Active";

interface MethodItem {
  type: string;
  isEnabled: boolean;
}

interface TrustBadge {
  icon: string;
  text: string;
  isEnabled: boolean;
}

interface StoreData {
  id: number;
  storeName: string;
  storeSlug: string;
  logo: string | null;
  favicon: string | null;
  customDomain: string | null;
  customDomainStatus: DomainStatus;
  isVatRegistered: boolean;
  vatNumber: string | null;
  isOnline: boolean;
  shippingMethods: MethodItem[];
  paymentMethods: MethodItem[];
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  branchName: string | null;
  commercialRegistrationNumber: string | null;
  bioLink: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  whatsappUrl: string | null;
  snapchatUrl: string | null;
  tiktokUrl: string | null;
  telegramUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  pinterestUrl: string | null;
  currency: string;
  defaultLanguage: string;
  themeName: string;
  colorsJson: string | null;
  coverImage: string | null;
  maxThemes: number;
  returnPolicyText: string | null;
  isSearchEnabled: boolean;
  isReviewsEnabled: boolean;
  lowStockThreshold: number | null;
  isCouponsEnabled: boolean;
  customerNotificationEmail: boolean;
  customerNotificationWhatsapp: boolean;
  trustBadgesJson: string | null;
  returnPolicyDays: number | null;
  menuConfigJson: string | null;
  storePagesJson: string | null;
}

interface PageEditableItem {
  key: string;
  labelKey: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
}

const PAGE_KEYS = ["about", "terms", "privacy-policy", "shipping-policy", "usage-policy"];

const statusConfig: Record<DomainStatus, { labelKey: string; className: string }> = {
  None: { labelKey: "storeSettings.statusNone", className: "badge badge--gray" },
  Pending: { labelKey: "storeSettings.statusPending", className: "badge badge--yellow" },
  Active: { labelKey: "storeSettings.statusActive", className: "badge badge--green" },
};

const shippingLabels: Record<string, string> = {
  PickupFromStore: "storeSettings.shippingPickup",
  DeliveryToAddress: "storeSettings.shippingDelivery",
};

const paymentLabels: Record<string, string> = {
  CashOnDelivery: "storeSettings.paymentCashOnDelivery",
  CreditCard: "storeSettings.paymentCreditCard",
  PayPal: "storeSettings.paymentPayPal",
  BankTransfer: "storeSettings.paymentBankTransfer",
  Mada: "storeSettings.paymentMada",
  Tabby: "storeSettings.paymentTabby",
  Tamara: "storeSettings.paymentTamara",
};

const STORE_BASE_URL = process.env.NEXT_PUBLIC_STORE_BASE_URL || "http://localhost:3000";

const COLOR_FIELDS: { key: keyof StoreColors; labelKey: string }[] = [
  { key: "headerColor", labelKey: "storeSettings.colorHeader" },
  { key: "buttonColor", labelKey: "storeSettings.colorButton" },
  { key: "accentColor", labelKey: "storeSettings.colorAccent" },
  { key: "heroFrom", labelKey: "storeSettings.colorHeroFrom" },
  { key: "heroTo", labelKey: "storeSettings.colorHeroTo" },
  { key: "footerColor", labelKey: "storeSettings.colorFooter" },
  { key: "newsletterColor", labelKey: "storeSettings.colorNewsletter" },
];

// ---- Navigation model -------------------------------------------------
// The page used to stack every settings card on one endless scroll, which is
// what made it feel overwhelming. Grouping the same cards into a handful of
// named sections — reachable from one tab strip — keeps every field exactly
// where it was, just organized around the questions a merchant actually asks
// ("what does my store look like?" vs "how do people pay?").
type TabId = "overview" | "domain" | "design" | "contact" | "commerce" | "pages" | "advanced" | "designChat" | "faq" | "blog" | "banners";

const TABS: { id: TabId; labelKey: string; icon: string }[] = [
  { id: "overview", labelKey: "storeSettings.tabOverview", icon: "hash" },
  { id: "design", labelKey: "storeSettings.tabDesign", icon: "settings" },
  { id: "designChat", labelKey: "storeSettings.tabDesignChat", icon: "palette" },
  { id: "domain", labelKey: "storeSettings.tabDomain", icon: "link" },
  { id: "contact", labelKey: "storeSettings.tabContact", icon: "phone" },
  { id: "commerce", labelKey: "storeSettings.tabCommerce", icon: "truck" },
  { id: "pages", labelKey: "storeSettings.tabPages", icon: "book" },
  { id: "faq", labelKey: "storeFaq.title", icon: "book" },
  { id: "blog", labelKey: "storeBlog.title", icon: "edit" },
  { id: "banners", labelKey: "banners.title", icon: "layout" },
  { id: "advanced", labelKey: "storeSettings.tabAdvanced", icon: "card" },
];

// تجميع التبويبات في مجموعات منسّقة لتظهر كقائمة جانبية سهلة الاستخدام
const TAB_GROUPS: { key: string; labelKey: string; items: TabId[] }[] = [
  { key: "general", labelKey: "storeSettings.groupGeneral", items: ["overview"] },
  { key: "appearance", labelKey: "storeSettings.groupAppearance", items: ["design", "designChat"] },
  { key: "presence", labelKey: "storeSettings.groupPresence", items: ["domain", "contact"] },
  { key: "commerce", labelKey: "storeSettings.groupCommerce", items: ["commerce"] },
  { key: "content", labelKey: "storeSettings.groupContent", items: ["pages", "faq", "blog", "banners"] },
  { key: "advanced", labelKey: "storeSettings.groupAdvanced", items: ["advanced"] },
];

const TAB_FALLBACK: Record<TabId, string> = {
  overview: "نظرة عامة",
  design: "التصميم والمظهر",
  designChat: "التصميم المخصص",
  domain: "النطاق المخصص",
  contact: "التواصل والسوشيال",
  commerce: "الشحن والدفع",
  pages: "صفحات المتجر",
  faq: "الأسئلة الشائعة",
  blog: "المدونة",
  banners: "البنرات الإعلانية",
  advanced: "إعدادات متقدمة",
};

function SettingCard({
  icon,
  title,
  desc,
  accent = "blue",
  children,
}: {
  icon: string;
  title: string;
  desc?: string;
  accent?: "blue" | "gold" | "green";
  children: React.ReactNode;
}) {
  const accentColors: Record<string, string> = {
    blue: "var(--blue)",
    gold: "var(--gold)",
    green: "var(--green)",
  };
  const accentSoft: Record<string, string> = {
    blue: "var(--blue-50)",
    gold: "rgba(200, 158, 63, 0.12)",
    green: "rgba(34, 155, 108, 0.12)",
  };
  return (
    <div className="card p-6 sm:p-7" style={{ position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          insetInlineEnd: 0,
          top: 0,
          width: 4,
          height: "100%",
          background: accentColors[accent],
          borderRadius: "0 14px 14px 0",
        }}
      />
      <div className="flex items-start gap-3 mb-6">
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: accentSoft[accent],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accentColors[accent],
            flexShrink: 0,
          }}
        >
          <Icon name={icon as any} size={17} />
        </div>
        <div className="min-w-0">
          <h2 style={{ fontSize: 15.5, fontWeight: 800, color: "var(--ink)", lineHeight: 1.3 }}>{title}</h2>
          {desc && <p className="text-[12px] text-[var(--sub)] mt-0.5">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  enabled,
  onToggle,
  disabled,
}: {
  label: string;
  desc?: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-[14px] font-bold text-[var(--ink)] flex items-center gap-1.5">
          {label}
        </p>
        {desc && <p className="text-[12px] text-[var(--sub)] mt-0.5">{desc}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span
          className="text-[11px] font-bold px-2 py-1 rounded-full"
          style={{
            color: enabled ? "var(--green)" : "var(--sub)",
            background: enabled ? "rgba(34, 155, 108, 0.1)" : "var(--gray-50, #f3f4f6)",
          }}
        >
          {enabled ? t("storeSettings.toggleEnabled") : t("storeSettings.toggleDisabled")}
        </span>
        <ToggleSwitch enabled={enabled} onToggle={onToggle} disabled={disabled} />
      </div>
    </div>
  );
}

function FormField({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5">
        {label}
      </label>
      <div className="field-shell">
        <Icon name={icon as any} size={16} className="text-[var(--sub-light)]" />
        {children}
      </div>
    </div>
  );
}

function ThemePreviewMock({ colors }: { colors: StoreColors }) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 shrink-0" style={{ background: colors.footerColor, height: 92 }}>
      <div className="flex items-center justify-between px-2.5 py-1.5" style={{ background: colors.headerColor }}>
        <div className="flex gap-1">
          <span className="rounded-full" style={{ width: 5, height: 5, background: "#fff" }} />
          <span className="rounded-full bg-white/30" style={{ width: 5, height: 5 }} />
          <span className="rounded-full bg-white/30" style={{ width: 5, height: 5 }} />
        </div>
        <span className="rounded-sm bg-white/25" style={{ width: 24, height: 5 }} />
      </div>
      <div className="p-2 flex gap-2">
        <div className="flex-1 rounded-md bg-white p-1.5 shadow-sm">
          <div className="rounded" style={{ height: 22, background: `linear-gradient(135deg, ${colors.heroFrom}, ${colors.heroTo})` }} />
          <div className="mt-1 rounded bg-gray-200" style={{ height: 4, width: "70%" }} />
          <div className="mt-1.5 rounded" style={{ height: 12, background: colors.buttonColor }} />
        </div>
        <div className="flex-1 rounded-md bg-white p-1.5 shadow-sm">
          <div className="rounded" style={{ height: 22, background: `linear-gradient(135deg, ${colors.heroFrom}, ${colors.heroTo})` }} />
          <div className="mt-1 rounded bg-gray-200" style={{ height: 4, width: "55%" }} />
          <div className="mt-1.5 rounded" style={{ height: 12, background: colors.accentColor }} />
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[12px] font-bold text-[var(--ink)]">{label}</label>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="relative shrink-0" style={{ width: 36, height: 36 }}>
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full rounded-lg cursor-pointer border border-gray-200"
            style={{ padding: 0 }}
          />
        </div>
        <div className="field-shell py-1 px-2.5 flex-1">
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" className="text-left text-[12px]" />
        </div>
      </div>
    </div>
  );
}

// ---- Theme picker card --------------------------------------------------
// Each card sits inside a CSS Grid row, and grid rows already stretch every
// cell to match the tallest one. The bug in the screenshot was that the
// *button* inside each cell wasn't told to fill that cell — it only grew to
// fit its own content, so a two-line description left a gap under a
// one-line description sitting right next to it. Fixing this means every
// piece in the chain (grid cell -> wrapper -> button -> inner rows) is
// explicitly full-height and flex, and the text block uses a fixed number
// of clamped lines so name/description never change the card's shape.
function ThemeCard({
  theme,
  isSelected,
  locked,
  previewColors,
  onSelect,
  t,
}: {
  theme: StoreThemeMeta;
  isSelected: boolean;
  locked: boolean;
  previewColors: StoreColors;
  onSelect: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className={`ss-theme-card-wrap ${locked ? "cursor-not-allowed" : ""}`}>
      <button
        type="button"
        onClick={() => {
          if (!locked) onSelect();
        }}
        disabled={locked}
        className={`ss-theme-card ${isSelected ? "ss-theme-card--active" : ""} ${locked ? "ss-theme-card--locked" : ""}`}
      >
        <ThemePreviewMock colors={previewColors} />
        <div className="flex items-start justify-between gap-2 mt-2.5">
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[var(--ink)] leading-snug line-clamp-1">{t(theme.nameKey)}</p>
            <p className="text-[11px] text-[var(--sub)] mt-0.5 leading-snug line-clamp-2">{t(theme.descKey)}</p>
          </div>
          {isSelected && (
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 20, height: 20, background: "var(--blue)" }}>
              <Icon name="check" size={12} className="text-white" />
            </div>
          )}
        </div>
      </button>
      {locked && (
        <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-2 p-3 text-center ss-theme-lock">
          <span className="rounded-full flex items-center justify-center text-white" style={{ width: 30, height: 30, background: "rgba(255,255,255,0.18)" }}>
            <Icon name="lock" size={15} />
          </span>
          <span className="text-[12px] font-bold text-white">{t("storeSettings.themeLocked")}</span>
          <a href="/dashboard/subscription" className="ss-upgrade-btn">
            {t("storeSettings.themeUpgrade")}
          </a>
        </div>
      )}
    </div>
  );
}

export default function StoreSettingsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [domainInput, setDomainInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [togglingVat, setTogglingVat] = useState(false);
  const [togglingShippingType, setTogglingShippingType] = useState<string | null>(null);
  const [togglingPaymentType, setTogglingPaymentType] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // ---- Active tab ----
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "designChat") setActiveTab("designChat");
  }, []);

  // ---- Custom design chat ----
  const [designRequest, setDesignRequest] = useState<{ id: number; status: string } | null>(null);
  const [designMessages, setDesignMessages] = useState<{ id: number; senderType: string; senderName: string; body: string; cssPayload?: string | null; createdAt: string }[]>([]);
  const [designText, setDesignText] = useState("");
  const [designSending, setDesignSending] = useState(false);
  const [designLoading, setDesignLoading] = useState(false);
  const [designSuccess, setDesignSuccess] = useState("");
  const designEndRef = useRef<HTMLDivElement>(null);

  const loadDesignChat = async () => {
    setDesignLoading(true);
    try {
      const res = await api.get("/stores/design-request");
      setDesignRequest(res.data.data.request);
      setDesignMessages(res.data.data.messages || []);
    } catch { setDesignRequest(null); setDesignMessages([]); }
    finally { setDesignLoading(false); }
  };

  useEffect(() => {
    if (activeTab === "designChat") {
      setDesignSuccess("");
      loadDesignChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    designEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [designMessages]);

  const designStatusLabel = (s: string) => {
    const v = t(`design.status${s}`);
    return v === `design.status${s}` ? s : v;
  };
  const fmtShortTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const doSendDesign = async () => {
    if (!designText.trim()) return;
    setDesignSending(true);
    setDesignSuccess("");
    try {
      await api.post("/stores/design-request/messages", { body: designText.trim() });
      setDesignText("");
      await loadDesignChat();
      setDesignSuccess(t("storeSettings.designChatSent"));
    } catch {
      setError(t("error.serverError"));
    } finally {
      setDesignSending(false);
    }
  };
  const handleSendDesign = (e: FormEvent) => {
    e.preventDefault();
    doSendDesign();
  };
  const handleDesignKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSendDesign();
    }
  };

  const [domainSuccess, setDomainSuccess] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");
  const [socialSuccess, setSocialSuccess] = useState("");
  const [storeTaxSuccess, setStoreTaxSuccess] = useState("");
  const [currencySuccess, setCurrencySuccess] = useState("");
  const [shippingSuccess, setShippingSuccess] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [returnPolicySuccess, setReturnPolicySuccess] = useState("");
  const [themeSuccess, setThemeSuccess] = useState("");
  const [advancedSuccess, setAdvancedSuccess] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [logoSuccess, setLogoSuccess] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoRemoving, setLogoRemoving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [faviconSuccess, setFaviconSuccess] = useState("");
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [faviconRemoving, setFaviconRemoving] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const [themeAutoSaving, setThemeAutoSaving] = useState(false);
  const themeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTheme = useRef<{ themeName: string; colors: StoreColors; coverImage: string; customCss: string } | null>(null);

  const [contactForm, setContactForm] = useState({ phone: "", email: "", address: "", branchName: "", crNumber: "" });
  const [contactSaving, setContactSaving] = useState(false);

  const [vatNumber, setVatNumber] = useState("");
  const [vatNumberSaving, setVatNumberSaving] = useState(false);

  const [socialForm, setSocialForm] = useState({ bioLink: "", facebook: "", instagram: "", whatsapp: "", snapchat: "", tiktok: "", telegram: "", linkedin: "", twitter: "", youtube: "", pinterest: "" });
  const [socialSaving, setSocialSaving] = useState(false);

  const [currencyLang, setCurrencyLang] = useState({ currency: "SAR", language: "ar" });
  const [currencySaving, setCurrencySaving] = useState(false);

  const [themeForm, setThemeForm] = useState<{ themeName: string; colors: StoreColors; coverImage: string; customCss: string }>({
    themeName: "professional-blue",
    colors: getDefaultColors("professional-blue"),
    coverImage: "",
    customCss: "",
  });
  const [themeSaving, setThemeSaving] = useState(false);
  const [enabledThemes, setEnabledThemes] = useState<Set<string> | null>(null);

  const [returnPolicyText, setReturnPolicyText] = useState("");
  const [returnPolicySaving, setReturnPolicySaving] = useState(false);

  const [advancedSettings, setAdvancedSettings] = useState({
    isSearchEnabled: true,
    isReviewsEnabled: false,
    lowStockThreshold: null as number | null,
    isCouponsEnabled: true,
    customerNotificationEmail: false,
    customerNotificationWhatsapp: false,
    returnPolicyDays: null as number | null,
  });
  const [trustBadges, setTrustBadges] = useState<TrustBadge[]>([]);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [notifTesting, setNotifTesting] = useState(false);
  const [notifTestSuccess, setNotifTestSuccess] = useState("");

  const [pageEditable, setPageEditable] = useState<PageEditableItem[]>([]);
  const [openPageKey, setOpenPageKey] = useState<string | null>(null);
  const [pagesSaving, setPagesSaving] = useState(false);
  const [pagesSuccess, setPagesSuccess] = useState("");

  const availableThemes = enabledThemes ? STORE_THEMES.filter((th) => enabledThemes.has(th.id)) : STORE_THEMES;

  const themeLimit = store?.maxThemes ?? -1;
  const isThemeLocked = (theme: StoreThemeMeta) => {
    if (!enabledThemes) return false;
    if (themeLimit === -1) return false;
    if (!enabledThemes.has(theme.id)) return true;
    const orderedEnabled = STORE_THEMES.filter((th) => enabledThemes.has(th.id));
    const index = orderedEnabled.findIndex((th) => th.id === theme.id);
    return index === -1 || index >= themeLimit;
  };

  const THEME_GROUPS: { key: string; labelKey: string; icon: string; items: StoreThemeMeta[] }[] = [
    { key: "b2c", labelKey: "storeSettings.themeGroupB2C", icon: "📦", items: availableThemes.filter((th) => th.group === "b2c") },
    { key: "b2b", labelKey: "storeSettings.themeGroupB2B", icon: "🏢", items: availableThemes.filter((th) => th.group === "b2b") },
    { key: "special", labelKey: "storeSettings.themeGroupSpecial", icon: "🎯", items: availableThemes.filter((th) => th.group === "special") },
  ].filter((g) => g.items.length > 0);

  const loadStore = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/stores/info");
      const d = res.data.data;
      setStore(d);
      setVatNumber(d.vatNumber || "");
      setContactForm({ phone: d.contactPhone || "", email: d.contactEmail || "", address: d.contactAddress || "", branchName: d.branchName || "", crNumber: d.commercialRegistrationNumber || "" });
      setSocialForm({ bioLink: d.bioLink || "", facebook: d.facebookUrl || "", instagram: d.instagramUrl || "", whatsapp: d.whatsappUrl || "", snapchat: d.snapchatUrl || "", tiktok: d.tiktokUrl || "", telegram: d.telegramUrl || "", linkedin: d.linkedinUrl || "", twitter: d.twitterUrl || "", youtube: d.youtubeUrl || "", pinterest: d.pinterestUrl || "" });
      setCurrencyLang({ currency: d.currency || "SAR", language: d.defaultLanguage || "ar" });
      const resolvedTheme = resolveThemeConfig(d.themeName);
      const resolvedColors = parseStoreColors(resolvedTheme.id, d.colorsJson);
      const initialTheme = { themeName: resolvedTheme.id, colors: resolvedColors, coverImage: d.coverImage || "", customCss: d.customCss || "" };
      setThemeForm(initialTheme);
      lastSavedTheme.current = initialTheme;
      setReturnPolicyText(d.returnPolicyText || "");
      setAdvancedSettings({
        isSearchEnabled: d.isSearchEnabled ?? true,
        isReviewsEnabled: d.isReviewsEnabled ?? false,
        lowStockThreshold: d.lowStockThreshold ?? null,
        isCouponsEnabled: d.isCouponsEnabled ?? true,
        customerNotificationEmail: d.customerNotificationEmail ?? false,
        customerNotificationWhatsapp: d.customerNotificationWhatsapp ?? false,
        returnPolicyDays: d.returnPolicyDays ?? null,
      });
      setTrustBadges(parseTrustBadges(d.trustBadgesJson));
      const pagesCfg = parseStorePages(d.storePagesJson);
      setPageEditable(
        PAGE_KEYS.map((key) => {
          const cfg = pagesCfg.find((p) => p.key === key);
          return {
            key,
            labelKey: PAGE_DEFS[key]?.titleKey || `storePages.${key}Title`,
            titleAr: cfg?.titleAr || "",
            titleEn: cfg?.titleEn || "",
            contentAr: cfg?.contentAr || "",
            contentEn: cfg?.contentEn || "",
          };
        })
      );
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const loadEnabledThemes = async () => {
    try {
      const res = await api.get("/site/themes");
      setEnabledThemes(new Set(res.data.data as string[]));
    } catch {
      setEnabledThemes(new Set(STORE_THEMES.map((th) => th.id)));
    }
  };

  useEffect(() => {
    loadStore();
    loadEnabledThemes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!store) return;
    const allValid = Object.values(themeForm.colors).every((c) => /^#[0-9a-fA-F]{6}$/.test(c));
    if (!allValid) return;
    const snap = { themeName: themeForm.themeName, colors: themeForm.colors, coverImage: themeForm.coverImage || "", customCss: themeForm.customCss };
    const last = lastSavedTheme.current;
    const sameColors = last && JSON.stringify(last.colors) === JSON.stringify(snap.colors);
    if (last && snap.themeName === last.themeName && sameColors && snap.coverImage === last.coverImage && snap.customCss === last.customCss) return;

    if (themeTimer.current) clearTimeout(themeTimer.current);
    themeTimer.current = setTimeout(async () => {
      setThemeAutoSaving(true);
      try {
        const res = await api.put("/stores/theme", { themeName: snap.themeName, colorsJson: JSON.stringify(snap.colors), coverImage: snap.coverImage || null });
        lastSavedTheme.current = snap;
        setThemeSuccess(res.data.message || t("storeSettings.themeSaved"));
      } catch {
        /* leave errors to the manual save button */
      } finally {
        setThemeAutoSaving(false);
      }
    }, 700);
    return () => {
      if (themeTimer.current) clearTimeout(themeTimer.current);
    };
  }, [store, themeForm]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDomainSuccess("");
    if (!domainInput.trim()) {
      setError(t("storeSettings.domainRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await api.put("/stores/custom-domain", { domain: domainInput.trim() });
      setDomainSuccess(t("storeSettings.domainSaved"));
      setDomainInput("");
      setStore((prev) => (prev ? { ...prev, customDomain: res.data.data.customDomain, customDomainStatus: res.data.data.customDomainStatus } : prev));
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.domainSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOnline = async () => {
    if (!store) return;
    const ok = await confirm({
      title: t("storeSettings.confirmToggleStoreTitle"),
      message: store.isOnline ? t("storeSettings.confirmDisableStore") : t("storeSettings.confirmEnableStore"),
      confirmLabel: t("common.confirm"),
    });
    if (!ok) return;
    setToggling(true);
    setError("");
    setStoreTaxSuccess("");
    try {
      const res = await api.put("/stores/toggle-online");
      setStore((prev) => (prev ? { ...prev, isOnline: res.data.data.isOnline } : prev));
      setStoreTaxSuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.genericError"));
    } finally {
      setToggling(false);
    }
  };

  const handleToggleVat = async () => {
    if (!store) return;
    const ok = await confirm({
      title: t("storeSettings.confirmToggleVatTitle"),
      message: store.isVatRegistered ? t("storeSettings.confirmUnregisterVat") : t("storeSettings.confirmRegisterVat"),
      confirmLabel: t("common.confirm"),
    });
    if (!ok) return;
    setTogglingVat(true);
    setError("");
    setStoreTaxSuccess("");
    try {
      const res = await api.put("/stores/toggle-vat-registration");
      setStore((prev) => (prev ? { ...prev, isVatRegistered: res.data.data.isVatRegistered } : prev));
      setStoreTaxSuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.genericError"));
    } finally {
      setTogglingVat(false);
    }
  };

  const handleToggleShipping = async (type: string, current: boolean) => {
    if (!store) return;
    setTogglingShippingType(type);
    setError("");
    setShippingSuccess("");
    try {
      const updatedMethods = store.shippingMethods.map((m) => (m.type === type ? { type: m.type, isEnabled: !current } : { type: m.type, isEnabled: m.isEnabled }));
      const res = await api.put("/stores/shipping-methods", { methods: updatedMethods });
      setStore((prev) => (prev ? { ...prev, shippingMethods: res.data.data } : prev));
      setShippingSuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.genericError"));
    } finally {
      setTogglingShippingType(null);
    }
  };

  const handleTogglePayment = async (type: string, current: boolean) => {
    if (!store) return;
    setTogglingPaymentType(type);
    setError("");
    setPaymentSuccess("");
    try {
      const updatedMethods = store.paymentMethods.map((m) => (m.type === type ? { type: m.type, isEnabled: !current } : { type: m.type, isEnabled: m.isEnabled }));
      const res = await api.put("/stores/payment-methods", { methods: updatedMethods });
      setStore((prev) => (prev ? { ...prev, paymentMethods: res.data.data } : prev));
      setPaymentSuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.genericError"));
    } finally {
      setTogglingPaymentType(null);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setContactSuccess("");
    setContactSaving(true);
    try {
      const res = await api.put("/stores/contact", { contactPhone: contactForm.phone || null, contactEmail: contactForm.email || null, contactAddress: contactForm.address || null, branchName: contactForm.branchName || null, commercialRegistrationNumber: contactForm.crNumber || null });
      setContactSuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.contactSaveError"));
    } finally {
      setContactSaving(false);
    }
  };

  const handleSaveVatNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStoreTaxSuccess("");
    setVatNumberSaving(true);
    try {
      const res = await api.put("/stores/vat-number", { vatNumber: vatNumber.trim() || null });
      setStore((prev) => (prev ? { ...prev, vatNumber: res.data.data.vatNumber || null, isVatRegistered: res.data.data.isVatRegistered } : prev));
      setStoreTaxSuccess(res.data.message);
    } catch (err: unknown) {
      const err2 = err as { response?: { data?: { message?: string } } };
      setError(err2.response?.data?.message || t("storeSettings.genericError"));
    } finally {
      setVatNumberSaving(false);
    }
  };

  const handleSaveSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSocialSuccess("");
    setSocialSaving(true);
    try {
      const res = await api.put("/stores/social", { bioLink: socialForm.bioLink || null, facebookUrl: socialForm.facebook || null, instagramUrl: socialForm.instagram || null, whatsappUrl: socialForm.whatsapp || null, snapchatUrl: socialForm.snapchat || null, tiktokUrl: socialForm.tiktok || null, telegramUrl: socialForm.telegram || null, linkedinUrl: socialForm.linkedin || null, twitterUrl: socialForm.twitter || null, youtubeUrl: socialForm.youtube || null, pinterestUrl: socialForm.pinterest || null });
      setSocialSuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.socialSaveError"));
    } finally {
      setSocialSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAdvancedSuccess("");
    setSettingsSaving(true);
    try {
      const cleanBadges = trustBadges.filter((b) => b.icon.trim() !== "" || b.text.trim() !== "");
      const res = await api.put("/stores/settings", { ...advancedSettings, trustBadgesJson: JSON.stringify(cleanBadges) });
      setTrustBadges(cleanBadges);
      setAdvancedSuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.genericError"));
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSendTestNotification = async () => {
    setError("");
    setNotifTestSuccess("");
    setNotifTesting(true);
    try {
      const res = await api.post("/stores/send-test-notification");
      setNotifTestSuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.testNotificationError"));
    } finally {
      setNotifTesting(false);
    }
  };

  const parseTrustBadges = (json: string | null): TrustBadge[] => {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) return parsed as TrustBadge[];
    } catch {
      /* ignore */
    }
    return [];
  };

  const addBadge = () => setTrustBadges((prev) => [...prev, { icon: "", text: "", isEnabled: true }]);
  const updateBadge = (idx: number, patch: Partial<TrustBadge>) => setTrustBadges((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  const removeBadge = (idx: number) => setTrustBadges((prev) => prev.filter((_, i) => i !== idx));

  const handleSaveReturnPolicy = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    setError("");
    setReturnPolicySuccess("");
    setReturnPolicySaving(true);
    try {
      const res = await api.put("/stores/return-policy", { returnPolicyText: returnPolicyText || null });
      setReturnPolicySuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.returnPolicySaveError"));
    } finally {
      setReturnPolicySaving(false);
    }
  };

  const handleUpdatePage = (key: string, patch: Partial<PageEditableItem>) => {
    setPageEditable((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  };

  const handleSavePages = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPagesSuccess("");
    setPagesSaving(true);
    try {
      const storePagesJson = JSON.stringify(
        pageEditable.map((p) => ({
          key: p.key,
          titleAr: p.titleAr.trim() || null,
          titleEn: p.titleEn.trim() || null,
          contentAr: p.contentAr.trim() || null,
          contentEn: p.contentEn.trim() || null,
        }))
      );
      const res = await api.put("/stores/menu-pages", { storePagesJson });
      setPagesSuccess(res.data.message || t("storeSettings.pagesSaved"));
      setStore((prev) => (prev ? { ...prev, storePagesJson } : prev));
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.pagesSaveError"));
    } finally {
      setPagesSaving(false);
    }
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setThemeSuccess("");
    setThemeSaving(true);
    if (themeTimer.current) {
      clearTimeout(themeTimer.current);
      themeTimer.current = null;
    }
    try {
      const res = await api.put("/stores/theme", { themeName: themeForm.themeName, colorsJson: JSON.stringify(themeForm.colors), coverImage: themeForm.coverImage || null });
      setThemeSuccess(res.data.message);
      const allValid = Object.values(themeForm.colors).every((c) => /^#[0-9a-fA-F]{6}$/.test(c));
      if (allValid) {
        lastSavedTheme.current = { themeName: themeForm.themeName, colors: themeForm.colors, coverImage: themeForm.coverImage || "", customCss: themeForm.customCss };
      }
      setStore((prev) => (prev ? { ...prev, themeName: themeForm.themeName, colorsJson: JSON.stringify(themeForm.colors), coverImage: themeForm.coverImage || null } : prev));
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.themeSaveError"));
    } finally {
      setThemeSaving(false);
    }
  };

  const handleSaveCurrencyLang = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCurrencySuccess("");
    setCurrencySaving(true);
    try {
      const res = await api.put("/stores/currency-language", { currency: currencyLang.currency, language: currencyLang.language });
      setCurrencySuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.currencyLangSaveError"));
    } finally {
      setCurrencySaving(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setError("");
    setLogoSuccess("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("read-failed"));
        reader.readAsDataURL(file);
      });
      const res = await api.put("/stores/logo", { logoBase64: base64 });
      setStore((prev) => (prev ? { ...prev, logo: res.data.data.logo } : prev));
      setLogoSuccess(res.data.message || t("storeSettings.logoSaved"));
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.logoUploadError"));
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleDeleteLogo = async () => {
    setLogoRemoving(true);
    setError("");
    setLogoSuccess("");
    try {
      const res = await api.delete("/stores/logo");
      setStore((prev) => (prev ? { ...prev, logo: res.data.data.logo } : prev));
      setLogoSuccess(res.data.message || t("storeSettings.logoRemoved"));
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.logoRemoveError"));
    } finally {
      setLogoRemoving(false);
    }
  };

  const handleUploadFavicon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconUploading(true);
    setError("");
    setFaviconSuccess("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("read-failed"));
        reader.readAsDataURL(file);
      });
      const res = await api.put("/stores/favicon", { faviconBase64: base64 });
      setStore((prev) => (prev ? { ...prev, favicon: res.data.data.favicon } : prev));
      setFaviconSuccess(res.data.message || t("storeSettings.faviconSaved"));
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.faviconUploadError"));
    } finally {
      setFaviconUploading(false);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
    }
  };

  const handleDeleteFavicon = async () => {
    setFaviconRemoving(true);
    setError("");
    setFaviconSuccess("");
    try {
      const res = await api.delete("/stores/favicon");
      setStore((prev) => (prev ? { ...prev, favicon: res.data.data.favicon } : prev));
      setFaviconSuccess(res.data.message || t("storeSettings.faviconRemoved"));
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.faviconRemoveError"));
    } finally {
      setFaviconRemoving(false);
    }
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    setError("");
    setThemeSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/products/upload-image", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setThemeForm((f) => ({ ...f, coverImage: res.data.data.url }));
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.coverUploadError"));
    } finally {
      setCoverUploading(false);
    }
  };

  const storeUrl = store ? (store.customDomainStatus === "Active" && store.customDomain ? `https://${store.customDomain}` : `${STORE_BASE_URL}/store/${store.storeSlug}`) : "";

  const handleCopy = async () => {
    if (!storeUrl) return;
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("storeSettings.copyError"));
    }
  };

  const handleSelectTheme = (theme: StoreThemeMeta) => {
    setThemeForm((f) => ({ ...f, themeName: theme.id }));
  };

  const handleResetColorsToDefault = () => {
    setThemeForm((f) => ({ ...f, colors: getDefaultColors(f.themeName) }));
  };

  if (loading) return <LoadingState />;

  const currentStatus = store?.customDomainStatus || "None";
  const statusInfo = statusConfig[currentStatus] || statusConfig.None;

  const tabLabel = (id: TabId, key: string) => {
    const val = t(key);
    return val === key ? TAB_FALLBACK[id] : val;
  };

  return (
    <div>
      <PageHeader icon="settings" title={t("storeSettings.title")} />

      {error && (
        <div className="alert alert--danger mb-6">
          <Icon name="alert" size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Store identity — always visible, this is the merchant's anchor point */}
      <div className="ss-hero card p-7 sm:p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold tracking-[0.14em] text-[var(--sub)] uppercase mb-1.5">{t("storeSettings.storeLabel")}</p>
            <h2 className="text-[24px] font-extrabold text-[var(--blue-deep)] mb-3.5 leading-tight">{store?.storeName}</h2>
            <div className="flex items-center gap-2.5 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100 min-w-0 max-w-xl">
              <Icon name="link" size={15} className="text-[var(--sub)] shrink-0" />
              <p className="text-[13px] text-[var(--ink)] truncate flex-1" dir="ltr">
                {storeUrl}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 text-[11.5px] font-bold text-[var(--blue)] hover:text-[var(--blue-deep)] transition-colors px-2 py-1 rounded-lg hover:bg-white"
              >
                {copied ? t("storeSettings.copied") : t("storeSettings.copy")}
              </button>
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[11.5px] font-bold text-white bg-[var(--blue)] hover:bg-[var(--blue-deep)] rounded-lg transition-colors px-3 py-1.5"
              >
                {t("storeSettings.visit")}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="ss-status-chip">
              <span className={`ss-status-dot ${store?.isOnline ? "ss-status-dot--on" : ""}`} />
              <div>
                <p className="text-[10.5px] text-[var(--sub)] leading-none mb-1">{t("storeSettings.storeStatus")}</p>
                <p className="text-[13px] font-extrabold text-[var(--ink)] leading-none">{store?.isOnline ? t("storeSettings.online") : t("storeSettings.hidden")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar nav + content — replaces the old wall of stacked cards */}
      <div className="ss-nav-wrap">
        <nav className="ss-sidebar">
          {TAB_GROUPS.map((group) => (
            <div key={group.key} className="ss-nav-group">
              <p className="ss-nav-group-label">{t(group.labelKey)}</p>
              {group.items.map((tabId) => {
                const tab = TABS.find((x) => x.id === tabId)!;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`ss-nav-item ${activeTab === tab.id ? "ss-nav-item--active" : ""}`}
                  >
                    <Icon name={tab.icon as any} size={16} />
                    <span>{tabLabel(tab.id, tab.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div key={activeTab} className="ss-tab-panel">
          {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SettingCard icon="hash" title={t("storeSettings.storeAndTax")} accent="green">
              <SuccessToast message={storeTaxSuccess} fixed className="mb-4" />
              <ToggleRow label={t("storeSettings.onlineToggleLabel")} desc={t("storeSettings.onlineToggleDesc")} enabled={store?.isOnline || false} onToggle={handleToggleOnline} disabled={toggling} />
              <ToggleRow
                label={t("storeSettings.vatToggleLabel")}
                desc={store?.isVatRegistered ? t("storeSettings.vatToggleDescRegistered") : t("storeSettings.vatToggleDescUnregistered")}
                enabled={store?.isVatRegistered || false}
                onToggle={handleToggleVat}
                disabled={togglingVat}
              />
              <form onSubmit={handleSaveVatNumber} className="pt-3">
                <FormField icon="hash" label={t("storeSettings.vatNumber")}>
                  <input type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="300000000000003" dir="ltr" maxLength={15} />
                </FormField>
                <p className="text-[11px] text-[var(--sub)] mt-1 mb-3">{t("storeSettings.vatNumberDesc")}</p>
                <Can code="StoreSettings.Edit">
                  <button type="submit" disabled={vatNumberSaving} className="btn btn-primary btn-sm">
                    {vatNumberSaving ? t("storeSettings.saving") : t("storeSettings.save")}
                  </button>
                </Can>
              </form>
            </SettingCard>

            <SettingCard icon="globe" title={t("storeSettings.currencyAndLang")} accent="blue">
              <SuccessToast message={currencySuccess} fixed className="mb-4" />
              <form onSubmit={handleSaveCurrencyLang} className="space-y-4">
                <FormField icon="wallet" label={t("storeSettings.storeCurrency")}>
                  <select value={currencyLang.currency} onChange={(e) => setCurrencyLang((f) => ({ ...f, currency: e.target.value }))}>
                    <option value="SAR">{t("storeSettings.currencySAR")}</option>
                    <option value="AED">{t("storeSettings.currencyAED")}</option>
                    <option value="QAR">{t("storeSettings.currencyQAR")}</option>
                    <option value="KWD">{t("storeSettings.currencyKWD")}</option>
                    <option value="BHD">{t("storeSettings.currencyBHD")}</option>
                    <option value="OMR">{t("storeSettings.currencyOMR")}</option>
                    <option value="EGP">{t("storeSettings.currencyEGP")}</option>
                    <option value="USD">{t("storeSettings.currencyUSD")}</option>
                  </select>
                </FormField>
                <FormField icon="globe" label={t("storeSettings.storeLanguage")}>
                  <select value={currencyLang.language} onChange={(e) => setCurrencyLang((f) => ({ ...f, language: e.target.value }))}>
                    <option value="ar">{t("storeSettings.langAr")}</option>
                    <option value="en">{t("storeSettings.langEn")}</option>
                  </select>
                </FormField>
                <Can code="StoreSettings.Edit">
                  <button type="submit" disabled={currencySaving} className="btn btn-primary btn-sm">
                    {currencySaving ? t("storeSettings.saving") : t("storeSettings.save")}
                  </button>
                </Can>
              </form>
            </SettingCard>

            <SettingCard icon="palette" title={t("storeSettings.logo")} desc={t("storeSettings.logoDesc")} accent="gold">
              <SuccessToast message={logoSuccess} fixed className="mb-4" />
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                  {store?.logo ? (
                    <img src={store.logo} alt={t("storeSettings.logoAlt")} className="w-full h-full object-contain" />
                  ) : (
                    <Icon name="palette" size={22} className="text-[var(--sub)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {!store?.logo && <p className="text-[12px] text-[var(--sub)] mb-2">{t("storeSettings.noLogo")}</p>}
                  <p className="text-[11px] text-[var(--sub)] mb-3">{t("storeSettings.logoHint")}</p>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                  <Can code="StoreSettings.Edit">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        className="btn btn-primary btn-sm"
                      >
                        {logoUploading ? t("storeSettings.saving") : store?.logo ? t("storeSettings.changeLogo") : t("storeSettings.uploadLogo")}
                      </button>
                      {store?.logo && (
                        <button
                          type="button"
                          onClick={handleDeleteLogo}
                          disabled={logoRemoving}
                          className="btn btn-outline btn-sm"
                        >
                          {logoRemoving ? t("storeSettings.saving") : t("storeSettings.removeLogo")}
                        </button>
                      )}
                    </div>
                  </Can>
                </div>
              </div>
            </SettingCard>

            <SettingCard icon="globe" title={t("storeSettings.favicon")} desc={t("storeSettings.faviconDesc")} accent="gold">
              <SuccessToast message={faviconSuccess} fixed className="mb-4" />
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                  {store?.favicon ? (
                    <img src={store.favicon} alt={t("storeSettings.faviconAlt")} className="w-full h-full object-contain" />
                  ) : (
                    <Icon name="globe" size={20} className="text-[var(--sub)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {!store?.favicon && <p className="text-[12px] text-[var(--sub)] mb-2">{t("storeSettings.noFavicon")}</p>}
                  <p className="text-[11px] text-[var(--sub)] mb-3">{t("storeSettings.faviconHint")}</p>
                  <input ref={faviconInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadFavicon} />
                  <Can code="StoreSettings.Edit">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => faviconInputRef.current?.click()}
                        disabled={faviconUploading}
                        className="btn btn-primary btn-sm"
                      >
                        {faviconUploading ? t("storeSettings.saving") : store?.favicon ? t("storeSettings.changeFavicon") : t("storeSettings.uploadFavicon")}
                      </button>
                      {store?.favicon && (
                        <button
                          type="button"
                          onClick={handleDeleteFavicon}
                          disabled={faviconRemoving}
                          className="btn btn-outline btn-sm"
                        >
                          {faviconRemoving ? t("storeSettings.saving") : t("storeSettings.removeFavicon")}
                        </button>
                      )}
                    </div>
                  </Can>
                </div>
              </div>
            </SettingCard>
          </div>
        )}

        {activeTab === "domain" && (
          <div className="card p-7 sm:p-8" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", insetInlineEnd: 0, top: 0, width: 4, height: "100%", background: "var(--gold)", borderRadius: "0 14px 14px 0" }} />
            <div className="flex items-center gap-3 mb-6">
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--blue-50)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--blue)", flexShrink: 0 }}>
                <Icon name="globe" size={17} />
              </div>
              <h2 style={{ fontSize: 15.5, fontWeight: 800, color: "var(--ink)" }}>{t("storeSettings.customDomain")}</h2>
            </div>
            <SuccessToast message={domainSuccess} fixed className="mb-4" />

            <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-5 py-4 mb-5 border border-gray-100">
              <div className="min-w-0">
                <p className="text-[12px] text-[var(--sub)] mb-1">{t("storeSettings.currentDomain")}</p>
                <p className="text-[15px] font-bold text-[var(--ink)] break-all" dir="ltr">
                  {store?.customDomain || "—"}
                </p>
              </div>
              <span className={statusInfo.className}>{t(statusInfo.labelKey)}</span>
            </div>

            {currentStatus === "Pending" && (
              <div className="alert alert--warning mb-5">
                <Icon name="clock" size={16} className="shrink-0 mt-0.5" />
                <span>{t("storeSettings.domainPendingMessage")}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDomain}>
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex-1">
                  <label>{t("storeSettings.newDomain")}</label>
                  <div className="field-shell">
                    <input type="text" value={domainInput} onChange={(e) => setDomainInput(e.target.value)} dir="ltr" placeholder={t("storeSettings.domainPlaceholder")} />
                  </div>
                </div>
                <Can code="StoreSettings.Edit">
                  <button type="submit" disabled={saving} className="btn btn-primary shrink-0">
                    {saving ? t("storeSettings.domainSaving") : t("storeSettings.saveAndLink")}
                  </button>
                </Can>
              </div>
            </form>
          </div>
        )}

        {activeTab === "design" && (
          <SettingCard icon="settings" title={t("storeSettings.colorsAndDesign")} accent="blue">
            <SuccessToast message={themeSuccess} fixed className="mb-4" />
            <form onSubmit={handleSaveTheme} className="space-y-8">
              <div>
                <label>{t("storeSettings.storeTemplate")}</label>
                <p className="text-[11px] text-[var(--sub)] mb-2">{t("storeSettings.storeTemplateDesc")}</p>
                <div className="mt-2 space-y-6">
                  {THEME_GROUPS.map((group) => (
                    <div key={group.key}>
                      <p className="text-[12.5px] font-bold text-[var(--ink)] mb-2.5">
                        {group.icon} {t(group.labelKey)}
                      </p>
                      <div className="ss-theme-grid grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                        {group.items.map((theme) => {
                          const isSelected = themeForm.themeName === theme.id;
                          const locked = isThemeLocked(theme);
                          const previewColors = isSelected ? themeForm.colors : getDefaultColors(theme.id);
                          return (
                            <ThemeCard
                              key={theme.id}
                              theme={theme}
                              isSelected={isSelected}
                              locked={locked}
                              previewColors={previewColors}
                              onSelect={() => handleSelectTheme(theme)}
                              t={t}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label>{t("storeSettings.storeColors")}</label>
                  <button type="button" onClick={handleResetColorsToDefault} className="text-[11px] font-bold text-[var(--blue)] hover:text-[var(--blue-deep)]">
                    {t("storeSettings.resetColorsToDefault")}
                  </button>
                </div>
                <p className="text-[11px] text-[var(--sub)] mb-3">{t("storeSettings.storeColorsDesc")}</p>
                <p className="text-[11px] text-[var(--green)] font-bold mb-3 flex items-center gap-1.5">
                  <Icon name="check" size={13} className="shrink-0" />
                  {t("storeSettings.themeAutoApply")}
                  {themeAutoSaving && <span className="text-[var(--blue)] font-normal">• {t("storeSettings.themeSaving")}</span>}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {COLOR_FIELDS.map((field) => (
                    <ColorField key={field.key} label={t(field.labelKey)} value={themeForm.colors[field.key]} onChange={(v) => setThemeForm((f) => ({ ...f, colors: { ...f.colors, [field.key]: v } }))} />
                  ))}
                </div>
              </div>

              <div>
                <label>{t("storeSettings.coverImage")}</label>
                <p className="text-[11px] text-[var(--sub)] mb-2">{t("storeSettings.coverImageDesc")}</p>
                <div className="flex items-center gap-4">
                  {themeForm.coverImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 w-40 h-24 bg-gray-50 shrink-0">
                      <img src={themeForm.coverImage} alt={t("storeSettings.coverImageAlt")} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <button
                        type="button"
                        onClick={() => setThemeForm((f) => ({ ...f, coverImage: "" }))}
                        className="absolute top-1.5 left-1.5 rounded-full bg-black/60 text-white w-9 h-9 flex items-center justify-center text-[13px] hover:bg-black/80 transition-colors"
                        aria-label={t("common.remove")}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 w-40 h-24 flex items-center justify-center text-[11px] text-[var(--sub)] bg-gray-50 shrink-0">{t("storeSettings.coverNoImage")}</div>
                  )}
                  <label className="btn btn-outline btn-sm cursor-pointer shrink-0">
                    {coverUploading ? t("storeSettings.saving") : t("storeSettings.coverUpload")}
                    <input type="file" accept="image/*" onChange={handleUploadCover} className="hidden" />
                  </label>
                </div>
              </div>

              <Can code="StoreSettings.Edit">
                <button type="submit" disabled={themeSaving} className="btn btn-primary btn-sm">
                  {themeSaving ? t("storeSettings.saving") : t("storeSettings.saveDesign")}
                </button>
              </Can>
            </form>
          </SettingCard>
        )}

        {activeTab === "contact" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SettingCard icon="phone" title={t("storeSettings.contactInfo")} accent="blue">
              <SuccessToast message={contactSuccess} fixed className="mb-4" />
              <form onSubmit={handleSaveContact} className="space-y-4">
                <div>
                  <label>{t("storeSettings.phone")}</label>
                  <PhoneInputField value={contactForm.phone} onChange={(v) => setContactForm((f) => ({ ...f, phone: v }))} className="field-shell" />
                </div>
                <FormField icon="mail" label={t("storeSettings.email")}>
                  <input type="email" value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} placeholder="store@example.com" dir="ltr" />
                </FormField>
                <FormField icon="location" label={t("storeSettings.address")}>
                  <input type="text" value={contactForm.address} onChange={(e) => setContactForm((f) => ({ ...f, address: e.target.value }))} placeholder={t("storeSettings.addressPlaceholder")} />
                </FormField>
                <FormField icon="store" label={t("storeSettings.branchName")}>
                  <input type="text" value={contactForm.branchName} onChange={(e) => setContactForm((f) => ({ ...f, branchName: e.target.value }))} placeholder={t("storeSettings.branchNamePlaceholder")} />
                </FormField>
                <FormField icon="clipboard" label={t("storeSettings.crNumber")}>
                  <input type="text" value={contactForm.crNumber} onChange={(e) => setContactForm((f) => ({ ...f, crNumber: e.target.value }))} placeholder={t("storeSettings.crNumberPlaceholder")} dir="ltr" />
                </FormField>
                <Can code="StoreSettings.Edit">
                  <button type="submit" disabled={contactSaving} className="btn btn-primary btn-sm">
                    {contactSaving ? t("storeSettings.saving") : t("storeSettings.save")}
                  </button>
                </Can>
              </form>
            </SettingCard>

            <SettingCard icon="share" title={t("storeSettings.socialLinks")} accent="gold">
              <SuccessToast message={socialSuccess} fixed className="mb-4" />
              <form onSubmit={handleSaveSocial} className="space-y-4">
                <FormField icon="link" label={t("storeSettings.bioLink")}>
                  <input type="text" value={socialForm.bioLink} onChange={(e) => setSocialForm((f) => ({ ...f, bioLink: e.target.value }))} placeholder="https://linktr.ee/..." dir="ltr" />
                </FormField>
                <FormField icon="facebook" label={t("storeSettings.facebook")}>
                  <input type="text" value={socialForm.facebook} onChange={(e) => setSocialForm((f) => ({ ...f, facebook: e.target.value }))} placeholder="https://facebook.com/..." dir="ltr" />
                </FormField>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField icon="instagram" label={t("storeSettings.instagram")}>
                    <input type="text" value={socialForm.instagram} onChange={(e) => setSocialForm((f) => ({ ...f, instagram: e.target.value }))} placeholder="https://instagram.com/..." dir="ltr" />
                  </FormField>
                  <FormField icon="whatsapp" label={t("storeSettings.whatsapp")}>
                    <input type="text" value={socialForm.whatsapp} onChange={(e) => setSocialForm((f) => ({ ...f, whatsapp: e.target.value }))} placeholder="https://wa.me/..." dir="ltr" />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField icon="snapchat" label={t("storeSettings.snapchat")}>
                    <input type="text" value={socialForm.snapchat} onChange={(e) => setSocialForm((f) => ({ ...f, snapchat: e.target.value }))} placeholder="https://snapchat.com/..." dir="ltr" />
                  </FormField>
                  <FormField icon="tiktok" label={t("storeSettings.tiktok")}>
                    <input type="text" value={socialForm.tiktok} onChange={(e) => setSocialForm((f) => ({ ...f, tiktok: e.target.value }))} placeholder="https://tiktok.com/..." dir="ltr" />
                  </FormField>
                  <FormField icon="telegram" label={t("storeSettings.telegram")}>
                    <input type="text" value={socialForm.telegram} onChange={(e) => setSocialForm((f) => ({ ...f, telegram: e.target.value }))} placeholder="https://t.me/..." dir="ltr" />
                  </FormField>
                  <FormField icon="linkedin" label={t("storeSettings.linkedin")}>
                    <input type="text" value={socialForm.linkedin} onChange={(e) => setSocialForm((f) => ({ ...f, linkedin: e.target.value }))} placeholder="https://linkedin.com/..." dir="ltr" />
                  </FormField>
                  <FormField icon="twitter" label={t("storeSettings.twitter")}>
                    <input type="text" value={socialForm.twitter} onChange={(e) => setSocialForm((f) => ({ ...f, twitter: e.target.value }))} placeholder="https://x.com/..." dir="ltr" />
                  </FormField>
                  <FormField icon="youtube" label={t("storeSettings.youtube")}>
                    <input type="text" value={socialForm.youtube} onChange={(e) => setSocialForm((f) => ({ ...f, youtube: e.target.value }))} placeholder="https://youtube.com/..." dir="ltr" />
                  </FormField>
                  <FormField icon="pinterest" label={t("storeSettings.pinterest")}>
                    <input type="text" value={socialForm.pinterest} onChange={(e) => setSocialForm((f) => ({ ...f, pinterest: e.target.value }))} placeholder="https://pinterest.com/..." dir="ltr" />
                  </FormField>
                </div>
                <Can code="StoreSettings.Edit">
                  <button type="submit" disabled={socialSaving} className="btn btn-primary btn-sm">
                    {socialSaving ? t("storeSettings.saving") : t("storeSettings.save")}
                  </button>
                </Can>
              </form>
            </SettingCard>
          </div>
        )}

        {activeTab === "commerce" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SettingCard icon="truck" title={t("storeSettings.shippingOptions")} accent="gold">
              <SuccessToast message={shippingSuccess} fixed className="mb-4" />
              <div className="space-y-1">
                {store?.shippingMethods.map((method) => (
                  <ToggleRow
                    key={method.type}
                    label={shippingLabels[method.type] ? t(shippingLabels[method.type]) : method.type}
                    enabled={method.isEnabled}
                    onToggle={() => handleToggleShipping(method.type, method.isEnabled)}
                    disabled={togglingShippingType === method.type}
                  />
                ))}
              </div>
            </SettingCard>

            <SettingCard icon="card" title={t("storeSettings.paymentOptions")} accent="green">
              <SuccessToast message={paymentSuccess} fixed className="mb-4" />
              <div className="space-y-1">
                {store?.paymentMethods.map((method) => (
                  <ToggleRow
                    key={method.type}
                    label={paymentLabels[method.type] ? t(paymentLabels[method.type]) : method.type}
                    enabled={method.isEnabled}
                    onToggle={() => handleTogglePayment(method.type, method.isEnabled)}
                    disabled={togglingPaymentType === method.type}
                  />
                ))}
              </div>
            </SettingCard>
          </div>
        )}

        {activeTab === "pages" && (
          <form onSubmit={handleSavePages} className="space-y-6">
            <SuccessToast message={pagesSuccess} fixed className="mb-4" />

            <SettingCard icon="book" title={t("storeSettings.pagesSection")} desc={t("storeSettings.pagesSectionDesc")} accent="gold">
              <div className="space-y-2">
                {pageEditable.map((page) => {
                  const open = openPageKey === page.key;
                  const hasCustom = page.titleAr || page.titleEn || page.contentAr || page.contentEn;
                  return (
                    <div key={page.key} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenPageKey(open ? null : page.key)}
                        className="w-full flex items-center gap-2 px-3.5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-start"
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13.5px] font-bold text-[var(--ink)] truncate">{t(page.labelKey)}</span>
                          {hasCustom && <span className="block text-[11px] text-[var(--sub)] truncate mt-0.5">{page.titleAr || page.titleEn || t(page.labelKey)}</span>}
                        </span>
                        {hasCustom && (
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(200, 158, 63, 0.15)", color: "#8a6d1d" }}>
                            {t("storeSettings.pagesCustom")}
                          </span>
                        )}
                        <span className="text-[11px] text-[var(--sub)] shrink-0">{open ? "▲" : "▼"}</span>
                      </button>

                      {open && (
                        <div className="p-4 space-y-4 border-t border-gray-100">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[12px] font-bold text-[var(--ink)] mb-1 block">{t("storeSettings.pagesTitleAr")}</label>
                              <input
                                type="text"
                                dir="rtl"
                                value={page.titleAr}
                                onChange={(e) => handleUpdatePage(page.key, { titleAr: e.target.value })}
                                placeholder={t(page.labelKey)}
                                className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-[var(--blue)]"
                                style={{ borderColor: "var(--border)" }}
                              />
                            </div>
                            <div>
                              <label className="text-[12px] font-bold text-[var(--ink)] mb-1 block">{t("storeSettings.pagesTitleEn")}</label>
                              <input
                                type="text"
                                dir="ltr"
                                value={page.titleEn}
                                onChange={(e) => handleUpdatePage(page.key, { titleEn: e.target.value })}
                                placeholder={t(PAGE_DEFS[page.key]?.titleKey || `storePages.${page.key}Title`)}
                                className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-[var(--blue)]"
                                style={{ borderColor: "var(--border)" }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[12px] font-bold text-[var(--ink)] mb-1 block">{t("storeSettings.pagesContentAr")}</label>
                            <textarea
                              dir="rtl"
                              rows={6}
                              value={page.contentAr}
                              onChange={(e) => handleUpdatePage(page.key, { contentAr: e.target.value })}
                              placeholder={t(PAGE_DEFS[page.key]?.contentKey || `storePages.${page.key}Content`)}
                              className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-[var(--blue)]"
                              style={{ borderColor: "var(--border)", minHeight: 140, lineHeight: 1.8 }}
                            />
                          </div>
                          <div>
                            <label className="text-[12px] font-bold text-[var(--ink)] mb-1 block">{t("storeSettings.pagesContentEn")}</label>
                            <textarea
                              dir="ltr"
                              rows={6}
                              value={page.contentEn}
                              onChange={(e) => handleUpdatePage(page.key, { contentEn: e.target.value })}
                              placeholder={t(PAGE_DEFS[page.key]?.contentKey || `storePages.${page.key}Content`)}
                              className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-[var(--blue)]"
                              style={{ borderColor: "var(--border)", minHeight: 120, lineHeight: 1.8 }}
                            />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <p className="text-[11px] text-[var(--sub)]">{t("storeSettings.pagesHint")}</p>
                            <button
                              type="button"
                              onClick={() => handleUpdatePage(page.key, { titleAr: "", titleEn: "", contentAr: "", contentEn: "" })}
                              className="text-[11.5px] font-bold text-[var(--blue)] hover:text-[var(--blue-deep)]"
                            >
                              {t("storeSettings.pagesReset")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SettingCard>

            <SettingCard icon="edit" title={t("storeSettings.returnPolicy")} desc={t("storeSettings.returnPolicyDesc")} accent="green">
              <div className="field-shell mb-3">
                <textarea value={returnPolicyText} onChange={(e) => setReturnPolicyText(e.target.value)} placeholder={t("storeSettings.returnPolicyPlaceholder")} rows={4} />
              </div>
              <label>{t("storeSettings.returnPeriodDays")}</label>
              <div className="field-shell mt-1 mb-2 py-1 px-2.5 w-24">
                <input
                  type="number"
                  value={advancedSettings.returnPolicyDays ?? ""}
                  onChange={(e) => setAdvancedSettings((s) => ({ ...s, returnPolicyDays: e.target.value === "" ? null : parseInt(e.target.value) || 0 }))}
                  min={0}
                  dir="ltr"
                  placeholder="--"
                />
              </div>
              <p className="text-[11px] text-[var(--sub)] mb-4">{t("storeSettings.returnPeriodDaysDesc")}</p>
              <Can code="StoreSettings.Edit">
                <button type="button" onClick={() => handleSaveReturnPolicy()} disabled={returnPolicySaving} className="btn btn-outline btn-sm">
                  {returnPolicySaving ? t("storeSettings.saving") : t("storeSettings.saveReturnPolicy")}
                </button>
              </Can>
              <SuccessToast message={returnPolicySuccess} fixed className="mt-3" />
            </SettingCard>

            <div className="flex justify-end">
              <Can code="StoreSettings.Edit">
                <button type="submit" disabled={pagesSaving} className="btn btn-primary">
                  {pagesSaving ? t("storeSettings.saving") : t("storeSettings.savePages")}
                </button>
              </Can>
            </div>
          </form>
        )}

        {activeTab === "faq" && (
          <SettingCard icon="book" title={t("storeFaq.title")} accent="green">
            <StoreFaqManager />
          </SettingCard>
        )}

        {activeTab === "blog" && (
          <SettingCard icon="edit" title={t("storeBlog.title")} accent="blue">
            <StoreBlogManager />
          </SettingCard>
        )}

        {activeTab === "banners" && (
          <SettingCard icon="layout" title={t("banners.title")} accent="gold">
            <StoreBannersManager />
          </SettingCard>
        )}

        {activeTab === "advanced" && (
          <SettingCard icon="settings" title={t("storeSettings.advancedSettings")} accent="blue">
            <SuccessToast message={advancedSuccess} fixed className="mb-4" />
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="ss-mini-toggle">
                  <div>
                    <p className="text-[13px] font-bold text-[var(--ink)] flex items-center gap-1.5">
                      {t("storeSettings.searchInStore")}
                    </p>
                    <p className="text-[11px] text-[var(--sub)]">{t("storeSettings.searchInStoreDesc")}</p>
                  </div>
                  <ToggleSwitch enabled={advancedSettings.isSearchEnabled} onToggle={() => setAdvancedSettings((s) => ({ ...s, isSearchEnabled: !s.isSearchEnabled }))} />
                </div>
                <div className="ss-mini-toggle">
                  <div>
                    <p className="text-[13px] font-bold text-[var(--ink)] flex items-center gap-1.5">
                      {t("storeSettings.reviews")}
                    </p>
                    <p className="text-[11px] text-[var(--sub)]">{t("storeSettings.reviewsDesc")}</p>
                  </div>
                  <ToggleSwitch enabled={advancedSettings.isReviewsEnabled} onToggle={() => setAdvancedSettings((s) => ({ ...s, isReviewsEnabled: !s.isReviewsEnabled }))} />
                </div>
                <div className="ss-mini-toggle">
                  <div>
                    <p className="text-[13px] font-bold text-[var(--ink)] flex items-center gap-1.5">
                      {t("storeSettings.coupons")}
                    </p>
                    <p className="text-[11px] text-[var(--sub)]">{t("storeSettings.couponsDesc")}</p>
                  </div>
                  <ToggleSwitch enabled={advancedSettings.isCouponsEnabled} onToggle={() => setAdvancedSettings((s) => ({ ...s, isCouponsEnabled: !s.isCouponsEnabled }))} />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <p className="text-[13px] font-bold text-[var(--ink)]">{t("storeSettings.customerNotifications")}</p>
                <p className="text-[11px] text-[var(--sub)] mb-3">{t("storeSettings.customerNotificationsDesc")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="ss-mini-toggle">
                    <div>
                      <p className="text-[13px] font-bold text-[var(--ink)]">{t("storeSettings.notifyEmail")}</p>
                      <p className="text-[11px] text-[var(--sub)]">{t("storeSettings.notifyEmailDesc")}</p>
                    </div>
                    <ToggleSwitch enabled={advancedSettings.customerNotificationEmail} onToggle={() => setAdvancedSettings((s) => ({ ...s, customerNotificationEmail: !s.customerNotificationEmail }))} />
                  </div>
                  <div className="ss-mini-toggle">
                    <div>
                      <p className="text-[13px] font-bold text-[var(--ink)]">{t("storeSettings.notifyWhatsapp")}</p>
                      <p className="text-[11px] text-[var(--sub)]">{t("storeSettings.notifyWhatsappDesc")}</p>
                    </div>
                    <ToggleSwitch enabled={advancedSettings.customerNotificationWhatsapp} onToggle={() => setAdvancedSettings((s) => ({ ...s, customerNotificationWhatsapp: !s.customerNotificationWhatsapp }))} />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3 bg-blue-50 rounded-2xl px-4 py-3 border border-blue-100">
                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-[var(--ink)]">{t("storeSettings.testNotificationTitle")}</p>
                    <p className="text-[11px] text-[var(--sub)]">{t("storeSettings.testNotificationDesc")}</p>
                  </div>
                  <button type="button" onClick={handleSendTestNotification} disabled={notifTesting} className="btn btn-outline btn-sm shrink-0">
                    {notifTesting ? t("storeSettings.sending") : t("storeSettings.sendTestNotification")}
                  </button>
                </div>
                <SuccessToast message={notifTestSuccess} fixed className="mt-3" />
                <p className="text-[11px] text-amber-700 mt-2">{t("storeSettings.notificationNote")}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="ss-mini-toggle">
                  <div>
                    <p className="text-[13px] font-bold text-[var(--ink)] flex items-center gap-1.5">
                      {t("storeSettings.lowStockThreshold")}
                    </p>
                    <p className="text-[11px] text-[var(--sub)]">{t("storeSettings.lowStockThresholdDesc")}</p>
                  </div>
                  <div className="field-shell py-1 px-2.5 w-20 shrink-0">
                    <input
                      type="number"
                      value={advancedSettings.lowStockThreshold ?? ""}
                      onChange={(e) => setAdvancedSettings((s) => ({ ...s, lowStockThreshold: e.target.value === "" ? null : parseInt(e.target.value) || 0 }))}
                      min={0}
                      dir="ltr"
                      className="text-left text-[12px]"
                      placeholder="--"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <p className="text-[13px] font-bold text-[var(--ink)]">{t("storeSettings.trustBadges")}</p>
                <p className="text-[11px] text-[var(--sub)] mb-3">{t("storeSettings.trustBadgesDesc")}</p>
                <div className="space-y-2">
                  {trustBadges.map((badge, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                      <input
                        type="text"
                        value={badge.icon}
                        onChange={(e) => updateBadge(idx, { icon: e.target.value })}
                        placeholder={t("storeSettings.trustBadgeIconPlaceholder")}
                        className="w-14 px-2 py-1.5 rounded-md border border-gray-200 text-[13px] text-center bg-white focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                        dir="ltr"
                      />
                      <input
                        type="text"
                        value={badge.text}
                        onChange={(e) => updateBadge(idx, { text: e.target.value })}
                        placeholder={t("storeSettings.trustBadgeTextPlaceholder")}
                        className="flex-1 px-3 py-1.5 rounded-md border border-gray-200 text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                      />
                      <span className="text-[11px] text-[var(--sub)] shrink-0">{t("storeSettings.trustBadgeEnabled")}</span>
                      <ToggleSwitch enabled={badge.isEnabled} onToggle={() => updateBadge(idx, { isEnabled: !badge.isEnabled })} />
                      <button type="button" onClick={() => removeBadge(idx)} className="shrink-0 text-[12px] font-bold text-red-500 hover:text-red-600 px-1 py-1">
                        {t("storeSettings.trustBadgeRemove")}
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addBadge} className="btn btn-outline btn-sm">
                    + {t("storeSettings.trustBadgeAdd")}
                  </button>
                </div>
              </div>

              <Can code="StoreSettings.Edit">
                <button type="submit" disabled={settingsSaving} className="btn btn-primary btn-sm">
                  {settingsSaving ? t("storeSettings.saving") : t("storeSettings.saveAdvanced")}
                </button>
              </Can>
            </form>
          </SettingCard>
        )}

        {activeTab === "designChat" && (
          <SettingCard icon="palette" title={t("storeSettings.designChatTitle")} accent="blue">
            <p className="text-[12.5px] text-[var(--sub)] mb-4 leading-relaxed">{t("storeSettings.designChatIntro")}</p>
            <SuccessToast message={designSuccess} fixed className="mb-4" />
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "#fff" }}>
              <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: "linear-gradient(135deg, #ffffff 0%, var(--blue-50, #eef4ff) 130%)", borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#fff", color: "var(--blue)", boxShadow: "0 1px 3px rgba(16,24,40,.1)" }}>
                    <Icon name="palette" size={17} />
                  </div>
                  <div>
                    <p className="text-[13px] font-extrabold leading-tight" style={{ color: "var(--ink)" }}>{t("storeSettings.designChatHeader")}</p>
                    <p className="text-[11px] leading-tight mt-0.5" style={{ color: "var(--sub)" }}>{t("storeSettings.designChatStatus")}</p>
                  </div>
                </div>
                {designRequest ? (
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold shrink-0" style={{ color: "var(--blue)", backgroundColor: "var(--blue-50)" }}>
                    {designStatusLabel(designRequest.status)}
                  </span>
                ) : (
                  <span className="text-[11.5px] text-[var(--sub)] shrink-0">{designLoading ? t("common.loading") : "—"}</span>
                )}
              </div>

              <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 380, background: "#f8fafc" }}>
                {designLoading ? (
                  <p className="text-[12.5px] text-[var(--sub)] text-center py-12">{t("common.loading")}</p>
                ) : designMessages.length === 0 ? (
                  <div className="text-center py-14">
                    <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--blue-50)", color: "var(--blue)" }}>
                      <Icon name="palette" size={24} />
                    </div>
                    <p className="text-[13px] font-bold" style={{ color: "var(--ink)" }}>{t("storeSettings.designChatEmptyTitle")}</p>
                    <p className="text-[12px] text-[var(--sub)] mt-1">{t("storeSettings.designChatEmptyDesc")}</p>
                  </div>
                ) : (
                  designMessages.map(m => {
                    const isOwner = m.senderType === "StoreOwner";
                    return (
                      <div key={m.id} className="flex items-start gap-2.5" style={{ flexDirection: isOwner ? "row" : "row-reverse" }}>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                          style={{ background: isOwner ? "#eef2ff" : "#ecfdf5", color: isOwner ? "#4f46e5" : "#059669" }}
                        >
                          {(m.senderName || (isOwner ? "م" : "أ")).charAt(0)}
                        </div>
                        <div className="max-w-[75%]">
                          <div
                            className="rounded-2xl px-4 py-2.5"
                            style={{
                              background: isOwner ? "#eef2ff" : "#fff",
                              border: "1px solid " + (isOwner ? "#e0e7ff" : "var(--border)"),
                              borderTopLeftRadius: isOwner ? 16 : 4,
                              borderTopRightRadius: isOwner ? 4 : 16,
                            }}
                          >
                            <p className="text-[11px] font-bold mb-1" style={{ color: isOwner ? "#4f46e5" : "#059669" }}>{m.senderName}</p>
                            {m.body && <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--ink)" }}>{m.body}</p>}
                            {m.cssPayload && (
                              <div className="mt-2 rounded-lg overflow-hidden">
                                <p className="px-3 py-1.5 text-[10.5px] font-bold" style={{ background: "#1e293b", color: "#cbd5e1" }}>CSS</p>
                                <pre className="p-2.5 text-[11px] overflow-x-auto m-0" dir="ltr" style={{ background: "#0f172a", color: "#e2e8f0", whiteSpace: "pre-wrap" }}>{m.cssPayload}</pre>
                              </div>
                            )}
                          </div>
                          <p className="text-[10.5px] mt-1.5 px-1" style={{ color: "var(--sub)", textAlign: isOwner ? "right" : "left" }}>{fmtShortTime(m.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={designEndRef} />
              </div>

              <form onSubmit={handleSendDesign} className="p-4 border-t" style={{ borderColor: "var(--border)", background: "#fff" }}>
                <div className="flex items-end gap-2">
                  <textarea
                    rows={1}
                    value={designText}
                    onChange={e => setDesignText(e.target.value)}
                    onKeyDown={handleDesignKeyDown}
                    placeholder={t("storeSettings.designChatPlaceholder")}
                    className="flex-1 rounded-2xl border px-4 py-2.5 text-[13px] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-100"
                    style={{ borderColor: "var(--border)", minHeight: 46, maxHeight: 140, background: "#f8fafc" }}
                  />
                  <Can code="StoreSettings.Edit">
                    <button type="submit" disabled={designSending} className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-60 transition-transform hover:scale-105" style={{ background: "var(--blue)", boxShadow: "0 4px 12px rgba(37,99,235,.25)" }}>
                      {designSending ? (
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                      ) : (
                        <Icon name="send" size={17} />
                      )}
                    </button>
                  </Can>
                </div>
              </form>
            </div>
          </SettingCard>
        )}
        </div>
        </div>

      <style jsx>{`
        .ss-hero {
          background: linear-gradient(135deg, #ffffff 0%, var(--blue-50, #eef4ff) 130%);
        }
        .ss-status-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid #eef0f3;
          border-radius: 14px;
          padding: 10px 14px;
        }
        .ss-status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #c7cbd1;
          flex-shrink: 0;
        }
        .ss-status-dot--on {
          background: var(--green);
          box-shadow: 0 0 0 3px rgba(34, 155, 108, 0.18);
        }

        .ss-nav-wrap {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .ss-nav-wrap {
            grid-template-columns: 1fr;
          }
          .ss-sidebar {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 12px;
          }
          .ss-nav-group {
            display: contents;
          }
          .ss-nav-group-label {
            display: none;
          }
          .ss-nav-item {
            width: auto;
          }
        }
        .ss-sidebar {
          position: sticky;
          top: 16px;
          border-radius: 16px;
          border: 1px solid #eef0f3;
          background: #fff;
          padding: 10px;
          overflow: hidden;
        }
        .ss-nav-group + .ss-nav-group {
          margin-top: 10px;
        }
        .ss-nav-group-label {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #9aa1ab;
          padding: 4px 10px 6px;
        }
        .ss-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          text-align: right;
          padding: 9px 10px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          color: var(--sub);
          background: transparent;
          transition: background 0.13s ease, color 0.13s ease;
        }
        .ss-nav-item:hover {
          background: #f6f7f9;
          color: var(--ink);
        }
        .ss-nav-item--active {
          background: var(--blue-50, #eef4ff);
          color: var(--blue-deep, #1e3a8a);
        }

        .ss-tab-panel {
          animation: ss-fade-in 0.22s ease both;
        }
        @keyframes ss-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ss-tab-panel {
            animation: none;
          }
        }

        /* Theme cards: forcing every grid row to an explicit equal height
           (grid-auto-rows: 1fr) removes any dependence on percentage-height
           inheritance working correctly through the DOM chain. The wrapper
           and button then use flexbox (flex: 1, not height: 100%) to fill
           that row — flexbox stretch is far more reliable across browsers
           than percentage heights, which need every single ancestor to have
           an explicit resolved height to work at all. */
        .ss-theme-grid {
          grid-auto-rows: 1fr;
        }
        .ss-theme-card-wrap {
          position: relative;
          display: flex;
          height: 100%;
        }
        .ss-theme-card {
          display: flex;
          flex: 1 1 auto;
          flex-direction: column;
          width: 100%;
          min-width: 0;
          text-align: right;
          border-radius: 16px;
          border: 2px solid #e5e7eb;
          padding: 12px;
          background: #fff;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
        }
        .ss-theme-card:hover {
          border-color: #c7cbd1;
          transform: translateY(-1px);
        }
        .ss-theme-card--active {
          border-color: var(--blue);
          /* inset, not an outer ring — the card's outer box stays the exact
             same size whether it's selected or not, only the inside tint
             changes, so no card visually "grows" next to its neighbor. */
          box-shadow: inset 0 0 0 2px var(--blue-50, #eef4ff);
          background: var(--blue-50, #f5f9ff);
        }
        .ss-theme-card--locked {
          filter: saturate(0.4);
          opacity: 0.95;
        }
        .ss-theme-lock {
          background: linear-gradient(160deg, rgba(15, 23, 42, 0.86), rgba(30, 58, 138, 0.88));
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
        }
        .ss-upgrade-btn {
          border-radius: 999px;
          background: #fff;
          color: #1e3a8a;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 14px;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
        }
        .ss-upgrade-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
        }

        .ss-mini-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: #f9fafb;
          border-radius: 14px;
          padding: 12px 16px;
          border: 1px solid #f1f2f4;
        }

        :global(.line-clamp-1) {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        :global(.line-clamp-2) {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        :global([dir="rtl"]) .ss-theme-card {
          text-align: right;
        }
      `}</style>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import ToggleSwitch from "@/components/ToggleSwitch";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import "@/lib/i18n/config";

type DomainStatus = "None" | "Pending" | "Active";

interface MethodItem {
  type: string;
  isEnabled: boolean;
}

interface StoreData {
  id: number;
  storeName: string;
  storeSlug: string;
  customDomain: string | null;
  customDomainStatus: DomainStatus;
  isVatRegistered: boolean;
  isOnline: boolean;
  shippingMethods: MethodItem[];
  paymentMethods: MethodItem[];
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  bioLink: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  whatsappUrl: string | null;
  currency: string;
  defaultLanguage: string;
  themeName: string;
  primaryColor: string;
  coverImage: string | null;
  returnPolicyText: string | null;
  isSearchEnabled: boolean;
  isReviewsEnabled: boolean;
  lowStockThreshold: number | null;
  isCouponsEnabled: boolean;
  customerNotificationEmail: boolean;
  customerNotificationWhatsapp: boolean;
  trustBadgesJson: string | null;
  returnPolicyDays: number | null;
}

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
};

const STORE_BASE_URL = process.env.NEXT_PUBLIC_STORE_BASE_URL || "http://localhost:3000";

function SettingCard({ icon, title, accent = "blue", children }: { icon: string; title: string; accent?: "blue" | "gold" | "green"; children: React.ReactNode }) {
  const accentColors: Record<string, string> = {
    blue: "var(--blue)",
    gold: "var(--gold)",
    green: "var(--green)",
  };
  return (
    <div className="card p-6" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: accentColors[accent], borderRadius: '0 14px 14px 0' }} />
      <div className="flex items-center gap-3 mb-5">
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', flexShrink: 0 }}>
          <Icon name={icon as any} size={17} />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, enabled, onToggle, disabled }: { label: string; desc?: string; enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-[14px] font-bold text-[var(--ink)]">{label}</p>
        {desc && <p className="text-[12px] text-[var(--sub)] mt-0.5">{desc}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-[var(--sub)]">{enabled ? t("storeSettings.toggleEnabled") : t("storeSettings.toggleDisabled")}</span>
        <ToggleSwitch enabled={enabled} onToggle={onToggle} disabled={disabled} />
      </div>
    </div>
  );
}

function FormField({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label>{label}</label>
      <div className="field-shell">
        <Icon name={icon as any} size={16} className="text-[var(--sub-light)]" />
        {children}
      </div>
    </div>
  );
}

function ThemePreviewMock({ primary, secondary, accent }: { primary: string; secondary: string; accent: string }) {
  return (
    <div
      className="rounded-lg overflow-hidden border border-gray-200"
      style={{ background: accent, height: 92 }}
    >
      <div className="flex items-center justify-between px-2.5 py-1.5" style={{ background: secondary }}>
        <div className="flex gap-1">
          <span className="rounded-full" style={{ width: 5, height: 5, background: primary }} />
          <span className="rounded-full bg-white/30" style={{ width: 5, height: 5 }} />
          <span className="rounded-full bg-white/30" style={{ width: 5, height: 5 }} />
        </div>
        <span className="rounded-sm bg-white/25" style={{ width: 24, height: 5 }} />
      </div>
      <div className="p-2 flex gap-2">
        <div className="flex-1 rounded-md bg-white p-1.5 shadow-sm">
          <div className="rounded bg-gray-100" style={{ height: 22 }} />
          <div className="mt-1 rounded bg-gray-200" style={{ height: 4, width: "70%" }} />
          <div className="mt-1.5 rounded" style={{ height: 12, background: primary }} />
        </div>
        <div className="flex-1 rounded-md bg-white p-1.5 shadow-sm">
          <div className="rounded bg-gray-100" style={{ height: 22 }} />
          <div className="mt-1 rounded bg-gray-200" style={{ height: 4, width: "55%" }} />
          <div className="mt-1.5 rounded" style={{ height: 12, background: secondary }} />
        </div>
      </div>
    </div>
  );
}

export default function StoreSettingsPage() {
  const { t } = useTranslation();
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
  const [success, setSuccess] = useState("");

  const [contactForm, setContactForm] = useState({ phone: "", email: "", address: "" });
  const [contactSaving, setContactSaving] = useState(false);

  const [socialForm, setSocialForm] = useState({ bioLink: "", facebook: "", instagram: "", whatsapp: "" });
  const [socialSaving, setSocialSaving] = useState(false);

  const [currencyLang, setCurrencyLang] = useState({ currency: "SAR", language: "ar" });
  const [currencySaving, setCurrencySaving] = useState(false);

  const [themeForm, setThemeForm] = useState({ themeName: "basic", primaryColor: "#2563EB", coverImage: "" });
  const [themeSaving, setThemeSaving] = useState(false);

  const [returnPolicyText, setReturnPolicyText] = useState("");
  const [returnPolicySaving, setReturnPolicySaving] = useState(false);

  const [advancedSettings, setAdvancedSettings] = useState({
    isSearchEnabled: true, isReviewsEnabled: false, lowStockThreshold: null as number | null,
    isCouponsEnabled: true, customerNotificationEmail: false, customerNotificationWhatsapp: false,
    trustBadgesJson: "", returnPolicyDays: null as number | null,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  const THEME_OPTIONS = [
    {
      value: "basic",
      labelKey: "storeSettings.themeBasic",
      descKey: "storeSettings.themeBasicDesc",
      primary: "#2563EB",
      secondary: "#0F172A",
      accent: "#F8FAFC",
    },
    {
      value: "digital-menu",
      labelKey: "storeSettings.themeDigitalMenu",
      descKey: "storeSettings.themeDigitalMenuDesc",
      primary: "#DC2626",
      secondary: "#1C1917",
      accent: "#FFF7ED",
    },
    {
      value: "elegant",
      labelKey: "storeSettings.themeElegant",
      descKey: "storeSettings.themeElegantDesc",
      primary: "#0F766E",
      secondary: "#1E293B",
      accent: "#F0FDFA",
    },
    {
      value: "colorful",
      labelKey: "storeSettings.themeColorful",
      descKey: "storeSettings.themeColorfulDesc",
      primary: "#9333EA",
      secondary: "#EA580C",
      accent: "#FDF4FF",
    },
  ];

  const COLOR_PRESETS = [
    "#2563EB", "#DC2626", "#0F766E", "#9333EA",
    "#EA580C", "#0891B2", "#1E293B", "#65A30D",
    "#DB2777", "#0F172A",
  ];

  const loadStore = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/stores/info");
      const d = res.data.data;
      setStore(d);
      setContactForm({ phone: d.contactPhone || "", email: d.contactEmail || "", address: d.contactAddress || "" });
      setSocialForm({ bioLink: d.bioLink || "", facebook: d.facebookUrl || "", instagram: d.instagramUrl || "", whatsapp: d.whatsappUrl || "" });
      setCurrencyLang({ currency: d.currency || "SAR", language: d.defaultLanguage || "ar" });
      setThemeForm({ themeName: d.themeName || "basic", primaryColor: d.primaryColor || "#2563EB", coverImage: d.coverImage || "" });
      setReturnPolicyText(d.returnPolicyText || "");
      setAdvancedSettings({
        isSearchEnabled: d.isSearchEnabled ?? true,
        isReviewsEnabled: d.isReviewsEnabled ?? false,
        lowStockThreshold: d.lowStockThreshold ?? null,
        isCouponsEnabled: d.isCouponsEnabled ?? true,
        customerNotificationEmail: d.customerNotificationEmail ?? false,
        customerNotificationWhatsapp: d.customerNotificationWhatsapp ?? false,
        trustBadgesJson: d.trustBadgesJson || "",
        returnPolicyDays: d.returnPolicyDays ?? null,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStore(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!domainInput.trim()) { setError(t("storeSettings.domainRequired")); return; }
    setSaving(true);
    try {
      const res = await api.put("/stores/custom-domain", { domain: domainInput.trim() });
      setSuccess(t("storeSettings.domainSaved"));
      setDomainInput("");
      setStore((prev) => prev ? { ...prev, customDomain: res.data.data.customDomain, customDomainStatus: res.data.data.customDomainStatus } : prev);
    } catch (err: any) { setError(err.response?.data?.message || t("storeSettings.domainSaveError")); }
    finally { setSaving(false); }
  };

  const handleToggleOnline = async () => {
    if (!store) return;
    if (!window.confirm(store.isOnline ? t("storeSettings.confirmDisableStore") : t("storeSettings.confirmEnableStore"))) return;
    setToggling(true); setError(""); setSuccess("");
    try { const res = await api.put("/stores/toggle-online"); setStore((prev) => prev ? { ...prev, isOnline: res.data.data.isOnline } : prev); setSuccess(res.data.message); }
    catch (err: any) { setError(err.response?.data?.message || t("storeSettings.genericError")); }
    finally { setToggling(false); }
  };

  const handleToggleVat = async () => {
    if (!store) return;
    if (!window.confirm(store.isVatRegistered ? t("storeSettings.confirmUnregisterVat") : t("storeSettings.confirmRegisterVat"))) return;
    setTogglingVat(true); setError(""); setSuccess("");
    try { const res = await api.put("/stores/toggle-vat-registration"); setStore((prev) => prev ? { ...prev, isVatRegistered: res.data.data.isVatRegistered } : prev); setSuccess(res.data.message); }
    catch (err: any) { setError(err.response?.data?.message || t("storeSettings.genericError")); }
    finally { setTogglingVat(false); }
  };

  const handleToggleShipping = async (type: string, current: boolean) => {
    if (!store) return;
    setTogglingShippingType(type); setError(""); setSuccess("");
    try {
      const updatedMethods = store.shippingMethods.map((m) => m.type === type ? { type: m.type, isEnabled: !current } : { type: m.type, isEnabled: m.isEnabled });
      const res = await api.put("/stores/shipping-methods", { methods: updatedMethods });
      setStore((prev) => prev ? { ...prev, shippingMethods: res.data.data } : prev);
      setSuccess(res.data.message);
    } catch (err: any) { setError(err.response?.data?.message || t("storeSettings.genericError")); }
    finally { setTogglingShippingType(null); }
  };

  const handleTogglePayment = async (type: string, current: boolean) => {
    if (!store) return;
    setTogglingPaymentType(type); setError(""); setSuccess("");
    try {
      const updatedMethods = store.paymentMethods.map((m) => m.type === type ? { type: m.type, isEnabled: !current } : { type: m.type, isEnabled: m.isEnabled });
      const res = await api.put("/stores/payment-methods", { methods: updatedMethods });
      setStore((prev) => prev ? { ...prev, paymentMethods: res.data.data } : prev);
      setSuccess(res.data.message);
    } catch (err: any) { setError(err.response?.data?.message || t("storeSettings.genericError")); }
    finally { setTogglingPaymentType(null); }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setContactSaving(true);
    try { const res = await api.put("/stores/contact", { contactPhone: contactForm.phone || null, contactEmail: contactForm.email || null, contactAddress: contactForm.address || null }); setSuccess(res.data.message); }
    catch (err: any) { setError(err.response?.data?.message || t("storeSettings.contactSaveError")); }
    finally { setContactSaving(false); }
  };

  const handleSaveSocial = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setSocialSaving(true);
    try { const res = await api.put("/stores/social", { bioLink: socialForm.bioLink || null, facebookUrl: socialForm.facebook || null, instagramUrl: socialForm.instagram || null, whatsappUrl: socialForm.whatsapp || null }); setSuccess(res.data.message); }
    catch (err: any) { setError(err.response?.data?.message || t("storeSettings.socialSaveError")); }
    finally { setSocialSaving(false); }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setSettingsSaving(true);
    try {
      const res = await api.put("/stores/settings", advancedSettings);
      setSuccess(res.data.message);
    } catch (err: any) { setError(err.response?.data?.message || t("storeSettings.genericError")); }
    finally { setSettingsSaving(false); }
  };

  const handleSaveReturnPolicy = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setReturnPolicySaving(true);
    try { const res = await api.put("/stores/return-policy", { returnPolicyText: returnPolicyText || null }); setSuccess(res.data.message); }
    catch (err: any) { setError(err.response?.data?.message || t("storeSettings.returnPolicySaveError")); }
    finally { setReturnPolicySaving(false); }
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setThemeSaving(true);
    try { const res = await api.put("/stores/theme", { themeName: themeForm.themeName, primaryColor: themeForm.primaryColor, coverImage: themeForm.coverImage || null }); setSuccess(res.data.message); }
    catch (err: any) { setError(err.response?.data?.message || t("storeSettings.themeSaveError")); }
    finally { setThemeSaving(false); }
  };

  const handleSaveCurrencyLang = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setCurrencySaving(true);
    try { const res = await api.put("/stores/currency-language", { currency: currencyLang.currency, language: currencyLang.language }); setSuccess(res.data.message); }
    catch (err: any) { setError(err.response?.data?.message || t("storeSettings.currencyLangSaveError")); }
    finally { setCurrencySaving(false); }
  };

  const storeUrl = store
    ? store.customDomainStatus === "Active" && store.customDomain
      ? `https://${store.customDomain}`
      : `${STORE_BASE_URL}/store/${store.storeSlug}`
    : "";

  const handleCopy = async () => {
    if (!storeUrl) return;
    try { await navigator.clipboard.writeText(storeUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError(t("storeSettings.copyError")); }
  };

  if (loading) return <LoadingState />;

  const currentStatus = store?.customDomainStatus || "None";
  const statusInfo = statusConfig[currentStatus] || statusConfig.None;

  return (
    <div>
      <PageHeader icon="settings" title={t("storeSettings.title")} />

      {error && <div className="alert alert--danger mb-6"><Icon name="alert" size={16} className="shrink-0 mt-0.5" /><span>{error}</span></div>}
      {success && <div className="alert alert--success mb-6"><Icon name="check" size={16} className="shrink-0 mt-0.5" /><span>{success}</span></div>}

      <div className="card p-8 mb-8">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-[var(--sub)] mb-1.5 tracking-wider">{t("storeSettings.storeLabel")}</p>
            <h2 className="text-[22px] font-extrabold text-[var(--blue-deep)] mb-3">{store?.storeName}</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100 min-w-0 flex-1 max-w-md">
                <Icon name="link" size={15} className="text-[var(--sub)] shrink-0" />
                <p className="text-[13px] text-[var(--ink)] truncate flex-1" dir="ltr">{storeUrl}</p>
                <button type="button" onClick={handleCopy} className="shrink-0 text-[11.5px] font-bold text-[var(--blue)] hover:text-[var(--blue-deep)] transition-colors px-2 py-1 rounded-lg hover:bg-white">
                  {copied ? t("storeSettings.copied") : t("storeSettings.copy")}
                </button>
                <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[11.5px] font-bold text-white bg-[var(--blue)] hover:bg-[var(--blue-deep)] rounded-lg transition-colors px-3 py-1.5">
                  {t("storeSettings.visit")}
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-left">
              <p className="text-[11px] text-[var(--sub)] mb-1">{t("storeSettings.storeStatus")}</p>
              <span className={`badge ${store?.isOnline ? 'badge--green' : 'badge--gray'}`}>
                {store?.isOnline ? t("storeSettings.online") : t("storeSettings.hidden")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SettingCard icon="phone" title={t("storeSettings.contactInfo")} accent="blue">
          <form onSubmit={handleSaveContact} className="space-y-4">
            <FormField icon="phone" label={t("storeSettings.phone")}>
              <input type="text" value={contactForm.phone} onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+966512345678" dir="ltr" />
            </FormField>
            <FormField icon="mail" label={t("storeSettings.email")}>
              <input type="email" value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} placeholder="store@example.com" dir="ltr" />
            </FormField>
            <FormField icon="location" label={t("storeSettings.address")}>
              <input type="text" value={contactForm.address} onChange={(e) => setContactForm((f) => ({ ...f, address: e.target.value }))} placeholder={t("storeSettings.addressPlaceholder")} />
            </FormField>
            <button type="submit" disabled={contactSaving} className="btn btn-primary btn-sm">{contactSaving ? t("storeSettings.saving") : t("storeSettings.save")}</button>
          </form>
        </SettingCard>

        <SettingCard icon="share" title={t("storeSettings.socialLinks")} accent="gold">
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
            <button type="submit" disabled={socialSaving} className="btn btn-primary btn-sm">{socialSaving ? t("storeSettings.saving") : t("storeSettings.save")}</button>
          </form>
        </SettingCard>

        <SettingCard icon="hash" title={t("storeSettings.storeAndTax")} accent="green">
          <ToggleRow label={t("storeSettings.onlineToggleLabel")} desc={t("storeSettings.onlineToggleDesc")} enabled={store?.isOnline || false} onToggle={handleToggleOnline} disabled={toggling} />
          <ToggleRow label={t("storeSettings.vatToggleLabel")} desc={store?.isVatRegistered ? t("storeSettings.vatToggleDescRegistered") : t("storeSettings.vatToggleDescUnregistered")} enabled={store?.isVatRegistered || false} onToggle={handleToggleVat} disabled={togglingVat} />
        </SettingCard>

        <SettingCard icon="globe" title={t("storeSettings.currencyAndLang")} accent="blue">
          <form onSubmit={handleSaveCurrencyLang} className="space-y-4">
            <FormField icon="wallet" label={t("storeSettings.storeCurrency")}>
              <select value={currencyLang.currency} onChange={(e) => setCurrencyLang((f) => ({ ...f, currency: e.target.value }))}>
                <option value="SAR">🇸🇦 {t("storeSettings.currencySAR")} (SAR)</option>
                <option value="AED">🇦🇪 {t("storeSettings.currencyAED")} (AED)</option>
                <option value="QAR">🇶🇦 {t("storeSettings.currencyQAR")} (QAR)</option>
                <option value="KWD">🇰🇼 {t("storeSettings.currencyKWD")} (KWD)</option>
                <option value="BHD">🇧🇭 {t("storeSettings.currencyBHD")} (BHD)</option>
                <option value="OMR">🇴🇲 {t("storeSettings.currencyOMR")} (OMR)</option>
                <option value="EGP">🇪🇬 {t("storeSettings.currencyEGP")} (EGP)</option>
                <option value="USD">🇺🇸 {t("storeSettings.currencyUSD")} (USD)</option>
              </select>
            </FormField>
            <FormField icon="globe" label={t("storeSettings.storeLanguage")}>
              <select value={currencyLang.language} onChange={(e) => setCurrencyLang((f) => ({ ...f, language: e.target.value }))}>
                <option value="ar">{t("storeSettings.langAr")}</option>
                <option value="en">{t("storeSettings.langEn")}</option>
              </select>
            </FormField>
            <button type="submit" disabled={currencySaving} className="btn btn-primary btn-sm">{currencySaving ? t("storeSettings.saving") : t("storeSettings.save")}</button>
          </form>
        </SettingCard>

        <SettingCard icon="truck" title={t("storeSettings.shippingOptions")} accent="gold">
          <div className="space-y-1">
            {store?.shippingMethods.map((method) => (
              <ToggleRow key={method.type} label={shippingLabels[method.type] ? t(shippingLabels[method.type]) : method.type} enabled={method.isEnabled} onToggle={() => handleToggleShipping(method.type, method.isEnabled)} disabled={togglingShippingType === method.type} />
            ))}
          </div>
        </SettingCard>

        <SettingCard icon="card" title={t("storeSettings.paymentOptions")} accent="green">
          <div className="space-y-1">
            {store?.paymentMethods.map((method) => (
              <ToggleRow key={method.type} label={paymentLabels[method.type] ? t(paymentLabels[method.type]) : method.type} enabled={method.isEnabled} onToggle={() => handleTogglePayment(method.type, method.isEnabled)} disabled={togglingPaymentType === method.type} />
            ))}
          </div>
        </SettingCard>
      </div>

      <div className="mt-6">
        <SettingCard icon="edit" title={t("storeSettings.returnPolicy")} accent="gold">
          <form onSubmit={handleSaveReturnPolicy}>
            <label>{t("storeSettings.returnPolicyText")}</label>
            <div className="field-shell mt-1 mb-4">
              <textarea
                value={returnPolicyText}
                onChange={(e) => setReturnPolicyText(e.target.value)}
                placeholder={t("storeSettings.returnPolicyPlaceholder")}
                rows={4}
              />
            </div>
            <button type="submit" disabled={returnPolicySaving} className="btn btn-primary btn-sm">{returnPolicySaving ? t("storeSettings.saving") : t("storeSettings.saveReturnPolicy")}</button>
          </form>
        </SettingCard>
      </div>

      <div className="mt-6">
        <SettingCard icon="settings" title={t("storeSettings.colorsAndDesign")} accent="blue">
          <form onSubmit={handleSaveTheme} className="space-y-6">
            <div>
              <label>{t("storeSettings.storeTemplate")}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {THEME_OPTIONS.map((theme) => {
                  const isSelected = themeForm.themeName === theme.value;
                  return (
                    <button
                      type="button"
                      key={theme.value}
                      onClick={() => setThemeForm((f) => ({ ...f, themeName: theme.value, primaryColor: theme.primary }))}
                      className={`text-right rounded-2xl border-2 p-3 transition-all ${
                        isSelected ? "border-[var(--blue)] ring-2 ring-[var(--blue-50)]" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <ThemePreviewMock primary={theme.primary} secondary={theme.secondary} accent={theme.accent} />
                      <div className="flex items-center justify-between mt-2.5">
                        <div>
                          <p className="text-[13px] font-bold text-[var(--ink)]">{t(theme.labelKey)}</p>
                          <p className="text-[11px] text-[var(--sub)] mt-0.5">{t(theme.descKey)}</p>
                        </div>
                        {isSelected && (
                          <div
                            className="rounded-full flex items-center justify-center shrink-0"
                            style={{ width: 20, height: 20, background: "var(--blue)" }}
                          >
                            <Icon name="check" size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label>{t("storeSettings.primaryColor")}</label>
              <p className="text-[11px] text-[var(--sub)] mb-2">{t("storeSettings.primaryColorDesc")}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setThemeForm((f) => ({ ...f, primaryColor: c }))}
                      className={`w-9 h-9 rounded-xl transition-all ${themeForm.primaryColor === c ? "ring-2 ring-offset-2 ring-[var(--blue)] scale-110" : ""}`}
                      style={{ background: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
                <div className="field-shell py-1 px-2.5 w-28">
                  <input
                    type="text"
                    value={themeForm.primaryColor}
                    onChange={(e) => setThemeForm((f) => ({ ...f, primaryColor: e.target.value }))}
                    dir="ltr" className="text-left text-[12px]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label>{t("storeSettings.coverImage")}</label>
              <div className="field-shell">
                <Icon name="link" size={16} className="text-[var(--sub-light)]" />
                <input
                  type="text"
                  value={themeForm.coverImage}
                  onChange={(e) => setThemeForm((f) => ({ ...f, coverImage: e.target.value }))}
                  placeholder="https://example.com/cover.jpg"
                  dir="ltr"
                />
              </div>
              {themeForm.coverImage && (
                <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 h-24 bg-gray-50">
                  <img src={themeForm.coverImage} alt={t("storeSettings.coverImageAlt")} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                </div>
              )}
            </div>

            <button type="submit" disabled={themeSaving} className="btn btn-primary btn-sm">{themeSaving ? t("storeSettings.saving") : t("storeSettings.saveDesign")}</button>
          </form>
        </SettingCard>
      </div>

        <SettingCard icon="settings" title={t("storeSettings.advancedSettings")} accent="blue">
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div><p className="text-[13px] font-bold text-[var(--ink)]">{t("storeSettings.searchInStore")}</p><p className="text-[11px] text-[var(--sub)]">{t("storeSettings.searchInStoreDesc")}</p></div>
                <ToggleSwitch enabled={advancedSettings.isSearchEnabled} onToggle={() => setAdvancedSettings(s => ({ ...s, isSearchEnabled: !s.isSearchEnabled }))} />
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div><p className="text-[13px] font-bold text-[var(--ink)]">{t("storeSettings.reviews")}</p><p className="text-[11px] text-[var(--sub)]">{t("storeSettings.reviewsDesc")}</p></div>
                <ToggleSwitch enabled={advancedSettings.isReviewsEnabled} onToggle={() => setAdvancedSettings(s => ({ ...s, isReviewsEnabled: !s.isReviewsEnabled }))} />
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div><p className="text-[13px] font-bold text-[var(--ink)]">{t("storeSettings.coupons")}</p><p className="text-[11px] text-[var(--sub)]">{t("storeSettings.couponsDesc")}</p></div>
                <ToggleSwitch enabled={advancedSettings.isCouponsEnabled} onToggle={() => setAdvancedSettings(s => ({ ...s, isCouponsEnabled: !s.isCouponsEnabled }))} />
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div><p className="text-[13px] font-bold text-[var(--ink)]">{t("storeSettings.notifyEmail")}</p><p className="text-[11px] text-[var(--sub)]">{t("storeSettings.notifyEmailDesc")}</p></div>
                <ToggleSwitch enabled={advancedSettings.customerNotificationEmail} onToggle={() => setAdvancedSettings(s => ({ ...s, customerNotificationEmail: !s.customerNotificationEmail }))} />
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div><p className="text-[13px] font-bold text-[var(--ink)]">{t("storeSettings.notifyWhatsapp")}</p><p className="text-[11px] text-[var(--sub)]">{t("storeSettings.notifyWhatsappDesc")}</p></div>
                <ToggleSwitch enabled={advancedSettings.customerNotificationWhatsapp} onToggle={() => setAdvancedSettings(s => ({ ...s, customerNotificationWhatsapp: !s.customerNotificationWhatsapp }))} />
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div><p className="text-[13px] font-bold text-[var(--ink)]">{t("storeSettings.lowStockThreshold")}</p><p className="text-[11px] text-[var(--sub)]">{t("storeSettings.lowStockThresholdDesc")}</p></div>
                <div className="field-shell py-1 px-2.5 w-20">
                  <input type="number" value={advancedSettings.lowStockThreshold ?? ""} onChange={e => setAdvancedSettings(s => ({ ...s, lowStockThreshold: e.target.value === "" ? null : parseInt(e.target.value) || 0 }))} min={0} dir="ltr" className="text-left text-[12px]" placeholder="--" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div><p className="text-[13px] font-bold text-[var(--ink)]">{t("storeSettings.returnPeriodDays")}</p><p className="text-[11px] text-[var(--sub)]">{t("storeSettings.returnPeriodDaysDesc")}</p></div>
                <div className="field-shell py-1 px-2.5 w-20">
                  <input type="number" value={advancedSettings.returnPolicyDays ?? ""} onChange={e => setAdvancedSettings(s => ({ ...s, returnPolicyDays: e.target.value === "" ? null : parseInt(e.target.value) || 0 }))} min={0} dir="ltr" className="text-left text-[12px]" placeholder="--" />
                </div>
              </div>
            </div>
            <button type="submit" disabled={settingsSaving} className="btn btn-primary btn-sm">{settingsSaving ? t("storeSettings.saving") : t("storeSettings.saveAdvanced")}</button>
          </form>
        </SettingCard>

      <div className="card p-6 mt-6" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: 'var(--gold)', borderRadius: '0 14px 14px 0' }} />
        <div className="flex items-center gap-3 mb-5">
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', flexShrink: 0 }}>
            <Icon name="globe" size={17} />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{t("storeSettings.customDomain")}</h2>
        </div>

        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4 mb-5 border border-gray-100">
          <div>
            <p className="text-[12px] text-[var(--sub)] mb-1">{t("storeSettings.currentDomain")}</p>
            <p className="text-[15px] font-bold text-[var(--ink)]" dir="ltr">{store?.customDomain || "—"}</p>
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
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label>{t("storeSettings.newDomain")}</label>
              <div className="field-shell">
                <input type="text" value={domainInput} onChange={(e) => setDomainInput(e.target.value)} dir="ltr" placeholder={t("storeSettings.domainPlaceholder")} />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary shrink-0">{saving ? t("storeSettings.domainSaving") : t("storeSettings.saveAndLink")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

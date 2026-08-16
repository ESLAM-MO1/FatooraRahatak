"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { isAuthenticated, getUserType } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import "@/lib/i18n/config";

import type { TFunction } from "i18next";

type TabKey = "homepage" | "features" | "about" | "faq" | "contact";

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: "homepage", labelKey: "admin.homepage" },
  { key: "features", labelKey: "admin.features" },
  { key: "about", labelKey: "admin.about" },
  { key: "faq", labelKey: "admin.faq" },
  { key: "contact", labelKey: "admin.contact" },
];

const FEATURE_PAGES = [
  { key: "accounting-system", labelKey: "page.accountingSystem" },
  { key: "pos-system", labelKey: "page.posSystem" },
  { key: "invoicing", labelKey: "page.invoicing" },
  { key: "ecommerce", labelKey: "page.ecommerce" },
  { key: "inventory-management", labelKey: "page.inventoryManagement" },
  { key: "smart-reports", labelKey: "page.smartReports" },
  { key: "payment-links", labelKey: "page.paymentLinks" },
  { key: "pos", labelKey: "page.pos" },
  { key: "payment-gateway", labelKey: "page.paymentGateway" },
  { key: "website-integration", labelKey: "page.websiteIntegration" },
  { key: "users-permissions", labelKey: "page.usersPermissions" },
  { key: "packages-domains", labelKey: "page.packagesDomains" },
  { key: "general-accounts", labelKey: "page.generalAccounts" },
  { key: "affiliate-marketing", labelKey: "page.affiliate" },
  { key: "product-management", labelKey: "page.productManagement" },
  { key: "customer-management", labelKey: "page.customerManagement" },
  { key: "purchases", labelKey: "page.purchases" },
  { key: "pricing", labelKey: "page.pricing" },
  { key: "suppliers", labelKey: "page.suppliers" },
  { key: "sales", labelKey: "page.sales" },
  { key: "reports", labelKey: "page.reports" },
];

const ABOUT_PAGES = [
  { key: "about", labelKey: "page.about" },
  { key: "careers", labelKey: "page.careers" },
  { key: "affiliate-marketing", labelKey: "page.affiliate" },
  { key: "free-tools", labelKey: "page.freeTools" },
  { key: "terms-of-use", labelKey: "page.terms" },
  { key: "privacy-policy", labelKey: "page.privacy" },
  { key: "shipping-policy", labelKey: "page.shippingPolicy" },
  { key: "return-policy", labelKey: "page.returnPolicy" },
];

const HELP_PAGES = [
  { key: "contact", labelKey: "page.contact" },
  { key: "help-center", labelKey: "page.helpCenter" },
  { key: "terms-of-use", labelKey: "page.terms" },
];

interface TicketReply { id: number; replyText: string; repliedByName: string; isAdminReply: boolean; createdAt: string }
interface ContactMessage { id: number; name: string; email: string; phone: string | null; subject: string; message: string; status: string; ticketNumber: string; createdAt: string; updatedAt: string; replies: TicketReply[] }

const STATUS_OPTIONS = ["New", "InProgress", "Replied", "Closed"];

export default function SiteContentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("homepage");
  const [authorized, setAuthorized] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated() || getUserType() !== "SuperAdmin") {
      router.push("/dashboard");
      return;
    }
    setAuthorized(true);
    setReady(true);
  }, [router]);

  if (!ready) return <LoadingState />;
  if (!authorized) return null;

  return (
    <div>
      <PageHeader icon="settings" title={t("admin.siteContent")} />
      <div className="tabs-bar">
        {TABS.map((tab) => (
          <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? "active" : ""}`} onClick={() => setActiveTab(tab.key)}>
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {activeTab === "homepage" && <HomepageEditor />}
      {activeTab === "features" && <FeaturesManager />}
      {activeTab === "about" && <AboutManager />}
      {activeTab === "faq" && <FaqManager />}
      {activeTab === "contact" && <ContactManager />}
    </div>
  );
}

/* ── Image Upload Widget ── */
function ImageUpload({ value, onChange, accept = "image/*", labelKey = "admin.uploadImage" }: { value: string; onChange: (url: string) => void; accept?: string; labelKey?: string }) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/admin/site/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(res.data.data.url);
    } catch { setError(t("error.serverError")); }
    finally { setUploading(false); }
  };
  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-[12px] font-bold" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="flex items-center gap-3">
        {value && <img src={value} alt="" className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: "var(--border)" }} />}
        <label className="btn btn-outline btn-sm cursor-pointer">
          {uploading ? t("common.loading") : t(labelKey)}
          <input type="file" accept={accept} onChange={handleFile} className="hidden" />
        </label>
        {value && <button onClick={() => onChange("")} className="btn btn-danger btn-sm">×</button>}
      </div>
    </div>
  );
}

/* ── Homepage / Landing Content Editor ── */
function HomepageEditor() {
  const { t } = useTranslation();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/site/landing-page");
      setContent(res.data.data);
    } catch { setError(t("error.serverError")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (path: string, value: any) => {
    setContent((prev: any) => {
      if (!prev) return prev;
      const obj = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let cur = obj;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = value;
      return obj;
    });
  };

  const handleSave = async () => {
    if (!content) return;
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      await api.put("/admin/site/landing-page", content);
      setSuccess(t("admin.saveSuccess"));
    } catch { setError(t("admin.saveError")); }
    finally { setSaving(false); }
  };

  const addArrItem = (path: string, item: any) => {
    setContent((prev: any) => {
      const obj = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let cur = obj;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = [...(cur[keys[keys.length - 1]] || []), item];
      return obj;
    });
  };

  const removeArrItem = (path: string, idx: number) => {
    setContent((prev: any) => {
      const obj = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let cur = obj;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      const arr = [...cur[keys[keys.length - 1]]];
      arr.splice(idx, 1);
      cur[keys[keys.length - 1]] = arr;
      return obj;
    });
  };

  if (loading) return <LoadingState />;
  if (!content) return <div className="alert alert--danger">{t("error.serverError")}</div>;

  return (
    <div className="card p-6">
      <SuccessToast message={success} fixed className="mb-4" />
      {error && <div className="alert alert--danger">{error}</div>}
      <p className="text-[13px] text-[var(--sub)] mb-5">{t("admin.homepage")}</p>

      <div className="space-y-8">
        <Section title={t("admin.hero")}>
          <Grid>
            <Field label={t("admin.heroTitle")}><textarea rows={3} value={content.hero?.title || ""} onChange={e => update("hero.title", e.target.value)} /></Field>
            <Field label={t("admin.heroDesc")}><textarea rows={3} value={content.hero?.description || ""} onChange={e => update("hero.description", e.target.value)} /></Field>
            <Field label={t("admin.heroImage")}>
              <ImageUpload value={content.hero?.backgroundImage || ""} onChange={v => update("hero.backgroundImage", v)} />
            </Field>
            <Field label={t("admin.heroPrimaryCta")}><input value={content.hero?.primaryCta || ""} onChange={e => update("hero.primaryCta", e.target.value)} /></Field>
            <Field label={t("admin.heroPrimaryLink")}><input value={content.hero?.primaryCtaHref || ""} onChange={e => update("hero.primaryCtaHref", e.target.value)} /></Field>
            <Field label={t("admin.heroSecondaryCta")}><input value={content.hero?.secondaryCta || ""} onChange={e => update("hero.secondaryCta", e.target.value)} /></Field>
            <Field label={t("admin.heroSecondaryLink")}><input value={content.hero?.secondaryCtaHref || ""} onChange={e => update("hero.secondaryCtaHref", e.target.value)} /></Field>
          </Grid>
        </Section>

        <Section title={t("admin.heroStats")}>
          {(content.hero?.stats || []).map((s: any, i: number) => (
            <div key={i} className="flex gap-2 mb-2">
              <input className="flex-1" placeholder={t("admin.statNumber")} value={s.number} onChange={e => { const arr = [...content.hero.stats]; arr[i] = { ...arr[i], number: e.target.value }; update("hero.stats", arr); }} />
              <input className="flex-1" placeholder={t("admin.statLabel")} value={s.label} onChange={e => { const arr = [...content.hero.stats]; arr[i] = { ...arr[i], label: e.target.value }; update("hero.stats", arr); }} />
              <button onClick={() => removeArrItem("hero.stats", i)} className="btn btn-danger btn-sm shrink-0">×</button>
            </div>
          ))}
          <button onClick={() => addArrItem("hero.stats", { number: "", label: "" })} className="btn btn-outline btn-sm mt-1">+ {t("admin.addStat")}</button>
        </Section>

        <Section title={t("admin.videoSection")}>
          <Field label={t("admin.videoTitle")}><input value={content.videoSection?.title || ""} onChange={e => update("videoSection.title", e.target.value)} /></Field>
          <Field label={t("admin.videoUpload")}>
            <ImageUpload value={content.videoSection?.videoUrl || ""} onChange={v => update("videoSection.videoUrl", v)} accept="video/*" labelKey="admin.videoUpload" />
            {content.videoSection?.videoUrl && (
              <video src={content.videoSection.videoUrl} controls className="mt-2 w-full max-h-40 rounded-lg" />
            )}
          </Field>
        </Section>

        <Section title={t("admin.featureSection")}>
          {(content.features || []).map((f: any, i: number) => (
            <div key={i} className="border rounded-lg p-4 mb-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex justify-between mb-3"><span className="font-bold text-sm">{t("admin.featureSection")} {i + 1}</span><button onClick={() => removeArrItem("features", i)} className="btn btn-danger btn-sm">{t("common.delete")}</button></div>
              <Grid>
                <Field label={t("admin.featureTitle")}><input value={f.title} onChange={e => { const arr = [...content.features]; arr[i] = { ...arr[i], title: e.target.value }; update("features", arr); }} /></Field>
                <Field label={t("admin.featureDesc")}><textarea rows={2} value={f.description} onChange={e => { const arr = [...content.features]; arr[i] = { ...arr[i], description: e.target.value }; update("features", arr); }} /></Field>
                <Field label={t("admin.featureImage")}>
                  <ImageUpload value={f.image || ""} onChange={v => { const arr = [...content.features]; arr[i] = { ...arr[i], image: v }; update("features", arr); }} />
                </Field>
                <Field label={t("admin.featureKnowMore")}><input value={f.knowMoreText} onChange={e => { const arr = [...content.features]; arr[i] = { ...arr[i], knowMoreText: e.target.value }; update("features", arr); }} /></Field>
                <Field label={t("admin.featureKnowMoreLink")}><input value={f.knowMoreHref} onChange={e => { const arr = [...content.features]; arr[i] = { ...arr[i], knowMoreHref: e.target.value }; update("features", arr); }} /></Field>
              </Grid>
            </div>
          ))}
          <button onClick={() => addArrItem("features", { title: "", description: "", image: "", knowMoreText: t("site.knowMore"), knowMoreHref: "#" })} className="btn btn-outline btn-sm">+ {t("admin.addFeature")}</button>
        </Section>

        <Section title={t("admin.distinctiveSection")}>
          <Field label={t("admin.distinctiveTitle")}><input value={content.distinctiveSection?.title || ""} onChange={e => update("distinctiveSection.title", e.target.value)} /></Field>
          <p className="text-[12px] text-[var(--sub)] mb-2">{t("admin.distinctiveCards")}:</p>
          {(content.distinctiveSection?.cards || []).map((c: any, i: number) => (
            <div key={i} className="flex gap-2 mb-2">
              <input className="flex-1" placeholder={t("admin.cardTitle")} value={c.title} onChange={e => { const arr = [...content.distinctiveSection.cards]; arr[i] = { ...arr[i], title: e.target.value }; update("distinctiveSection.cards", arr); }} />
              <input className="flex-1" placeholder={t("admin.cardDesc")} value={c.description} onChange={e => { const arr = [...content.distinctiveSection.cards]; arr[i] = { ...arr[i], description: e.target.value }; update("distinctiveSection.cards", arr); }} />
              <button onClick={() => removeArrItem("distinctiveSection.cards", i)} className="btn btn-danger btn-sm shrink-0">×</button>
            </div>
          ))}
          <button onClick={() => addArrItem("distinctiveSection.cards", { title: "", description: "" })} className="btn btn-outline btn-sm mt-1">+ {t("admin.addCard")}</button>
          <GridCols>
            <Field label={t("admin.ctaText")}><input value={content.distinctiveSection?.ctaText || ""} onChange={e => update("distinctiveSection.ctaText", e.target.value)} /></Field>
            <Field label={t("admin.ctaLink")}><input value={content.distinctiveSection?.ctaHref || ""} onChange={e => update("distinctiveSection.ctaHref", e.target.value)} /></Field>
          </GridCols>
        </Section>

        <Section title={t("admin.footerSection")}>
          <Field label={t("admin.footerDesc")}><textarea rows={2} value={content.footer?.description || ""} onChange={e => update("footer.description", e.target.value)} /></Field>
          <Field label={t("admin.copyright")}><input value={content.footer?.copyright || ""} onChange={e => update("footer.copyright", e.target.value)} /></Field>
        </Section>

        <Section title={t("admin.socialSection")}>
          <GridCols>
            <Field label={t("admin.facebook")}><input value={content.footer?.social?.facebook || ""} onChange={e => update("footer.social.facebook", e.target.value)} /></Field>
            <Field label={t("admin.instagram")}><input value={content.footer?.social?.instagram || ""} onChange={e => update("footer.social.instagram", e.target.value)} /></Field>
            <Field label={t("admin.whatsapp")}><input value={content.footer?.social?.whatsapp || ""} onChange={e => update("footer.social.whatsapp", e.target.value)} /></Field>
            <Field label={t("admin.snapchat")}><input value={content.footer?.social?.snapchat || ""} onChange={e => update("footer.social.snapchat", e.target.value)} /></Field>
            <Field label={t("admin.tiktok")}><input value={content.footer?.social?.tiktok || ""} onChange={e => update("footer.social.tiktok", e.target.value)} /></Field>
            <Field label={t("admin.telegram")}><input value={content.footer?.social?.telegram || ""} onChange={e => update("footer.social.telegram", e.target.value)} /></Field>
            <Field label={t("admin.linkedin")}><input value={content.footer?.social?.linkedin || ""} onChange={e => update("footer.social.linkedin", e.target.value)} /></Field>
          </GridCols>
        </Section>

        <div className="pt-6 border-t" style={{ borderColor: "var(--border)" }}>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary !px-10">
            {saving ? t("admin.saving") : t("admin.saveHomepage")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Page Editor ── */
function PageEditor({ pageKey }: { pageKey: string }) {
  const { t } = useTranslation();
  const [titleAr, setTitleAr] = useState("");
  const [contentAr, setContentAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true); setError("");
    api.get(`/admin/site/pages/${pageKey}`).then(r => {
      const d = r?.data?.data;
      setTitleAr(d?.titleAr ?? ""); setContentAr(d?.contentAr ?? "");
      setTitleEn(d?.titleEn ?? ""); setContentEn(d?.contentEn ?? "");
    }).catch(() => setError(t("error.serverError"))).finally(() => setLoading(false));
  }, [pageKey]);

  const save = async () => {
    setSaving(true); setSuccess(""); setError("");
    try {
      await api.put(`/admin/site/pages/${pageKey}`, { titleAr, contentAr, titleEn, contentEn });
      setSuccess(t("admin.saveSuccess"));
    } catch { setError(t("admin.saveError")); } finally { setSaving(false); }
  };

  if (loading) return <LoadingState />;
  return (
    <div className="space-y-4">
      <SuccessToast message={success} fixed className="mb-4" />
      {error && <div className="alert alert--danger">{error}</div>}
      <div>
        <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("admin.titleAr")}</label>
        <input dir="rtl" className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{borderColor:'var(--border)'}} value={titleAr} onChange={e => setTitleAr(e.target.value)} placeholder={t("admin.titleAr")} />
      </div>
      <div>
        <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("admin.contentAr")}</label>
        <textarea dir="rtl" className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{borderColor:'var(--border)',fontFamily:'monospace',minHeight:'200px'}} value={contentAr} onChange={e => setContentAr(e.target.value)} placeholder={t("admin.contentAr")} />
      </div>
      <div>
        <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("admin.titleEn")}</label>
        <input dir="ltr" className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{borderColor:'var(--border)'}} value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder={t("admin.titleEn")} />
      </div>
      <div>
        <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("admin.contentEn")}</label>
        <textarea dir="ltr" className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{borderColor:'var(--border)',fontFamily:'monospace',minHeight:'120px'}} value={contentEn} onChange={e => setContentEn(e.target.value)} placeholder={t("admin.contentEn")} />
      </div>
      <button onClick={save} disabled={saving} className="btn btn-primary">{saving ? t("admin.saving") : t("common.save")}</button>
    </div>
  );
}

/* ── Features Manager ── */
function FeaturesManager() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(FEATURE_PAGES[0].key);
  return (
    <div className="card p-6 space-y-5">
      <p className="text-[13px] text-[var(--sub)]">{t("admin.manageFeatures")}</p>
      <select className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{borderColor:'var(--border)'}} value={selected} onChange={e => setSelected(e.target.value)}>
        {FEATURE_PAGES.map(p => <option key={p.key} value={p.key}>{t(p.labelKey)}</option>)}
      </select>
      <PageEditor pageKey={selected} />
    </div>
  );
}

/* ── About Manager ── */
function AboutManager() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(ABOUT_PAGES[0].key);
  return (
    <div className="card p-6 space-y-5">
      <p className="text-[13px] text-[var(--sub)]">{t("admin.manageAbout")}</p>
      <select className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{borderColor:'var(--border)'}} value={selected} onChange={e => setSelected(e.target.value)}>
        {ABOUT_PAGES.map(p => <option key={p.key} value={p.key}>{t(p.labelKey)}</option>)}
      </select>
      <PageEditor pageKey={selected} />
    </div>
  );
}

/* ── FAQ Manager ── */
function FaqManager() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await api.get("/admin/site/faq"); setItems(r.data.data || []); }
    catch { setError(t("error.serverError")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true); setSuccess(""); setError("");
    try {
      const body = { questionAr: editing.questionAr, questionEn: editing.questionEn, answerAr: editing.answerAr, answerEn: editing.answerEn, displayOrder: editing.displayOrder, isPublished: editing.isPublished };
      if (editing.id) {
        await api.put(`/admin/site/faq/${editing.id}`, body);
      } else {
        await api.post("/admin/site/faq", body);
      }
      setSuccess(t("admin.saveSuccess"));
      setEditing(null);
      load();
    } catch { setError(t("admin.saveError")); }
    finally { setSaving(false); }
  };

  const togglePublish = async (id: number) => {
    try { await api.put(`/admin/site/faq/${id}/toggle-publish`); load(); }
    catch { setError(t("error.serverError")); }
  };

  const remove = async (id: number) => {
    if (!confirm(t("common.confirmDelete"))) return;
    try { await api.delete(`/admin/site/faq/${id}`); load(); }
    catch { setError(t("error.serverError")); }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="card p-6 space-y-5">
      <SuccessToast message={success} fixed className="mb-4" />
      {error && <div className="alert alert--danger">{error}</div>}
      <p className="text-[13px] text-[var(--sub)]">{t("admin.manageFaq")}</p>

      <div className="space-y-4">
        {items.map((item: any) => (
          <div key={item.id} className="border rounded-lg p-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-[14px] font-bold">{item.questionAr}</p>
                <p className="text-[12px] text-[var(--sub)] mt-1 line-clamp-2">{item.answerAr}</p>
                <p className="text-[11px] text-[var(--sub)] mt-1">EN: {item.questionEn}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => togglePublish(item.id)} className={`btn btn-sm ${item.isPublished ? "btn-outline" : "btn-warning"}`} title={item.isPublished ? t("common.hide") : t("common.show")}>
                  {item.isPublished ? t("common.show") : t("common.hide")}
                </button>
                <button onClick={() => setEditing({ ...item })} className="btn btn-outline btn-sm">{t("common.edit")}</button>
                <button onClick={() => remove(item.id)} className="btn btn-danger btn-sm">{t("common.delete")}</button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-[var(--sub)] py-4">{t("common.noData")}</p>}
      </div>

      <button onClick={() => setEditing({ questionAr: "", questionEn: "", answerAr: "", answerEn: "", displayOrder: items.length + 1, isPublished: true })} className="btn btn-primary btn-sm">
        + {t("admin.addFaq")}
      </button>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold">{editing.id ? t("common.edit") : t("admin.addFaq")}</h3>
            <div>
              <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("admin.questionAr")}</label>
              <input dir="rtl" className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{borderColor:'var(--border)'}} value={editing.questionAr} onChange={e => setEditing({...editing, questionAr: e.target.value})} />
            </div>
            <div>
              <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("admin.answerAr")}</label>
              <textarea dir="rtl" className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{borderColor:'var(--border)',minHeight:'100px'}} value={editing.answerAr} onChange={e => setEditing({...editing, answerAr: e.target.value})} />
            </div>
            <div>
              <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("admin.questionEn")}</label>
              <input dir="ltr" className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{borderColor:'var(--border)'}} value={editing.questionEn} onChange={e => setEditing({...editing, questionEn: e.target.value})} />
            </div>
            <div>
              <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("admin.answerEn")}</label>
              <textarea dir="ltr" className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{borderColor:'var(--border)',minHeight:'100px'}} value={editing.answerEn} onChange={e => setEditing({...editing, answerEn: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("admin.displayOrder")}</label>
                <input type="number" className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{borderColor:'var(--border)'}} value={editing.displayOrder} onChange={e => setEditing({...editing, displayOrder: parseInt(e.target.value) || 0})} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.isPublished} onChange={e => setEditing({...editing, isPublished: e.target.checked})} />
                  <span className="text-[13px]">{t("common.published")}</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={save} disabled={saving} className="btn btn-primary">{saving ? t("admin.saving") : t("common.save")}</button>
              <button onClick={() => setEditing(null)} className="btn btn-outline">{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Contact / Support Tickets Manager ── */
function ContactManager() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(HELP_PAGES[0].key);
  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-5">
        <p className="text-[13px] text-[var(--sub)]">{t("admin.manageContact")}</p>
        <select className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{borderColor:'var(--border)'}} value={selected} onChange={e => setSelected(e.target.value)}>
          {HELP_PAGES.map(p => <option key={p.key} value={p.key}>{t(p.labelKey)}</option>)}
        </select>
        <PageEditor pageKey={selected} />
      </div>
      <div className="card p-6">
        <h3 className="text-[15px] font-bold text-[var(--ink)] mb-4 pb-2 border-b" style={{ borderColor: "var(--border)" }}>{t("admin.messages")}</h3>
        <MessagesList />
      </div>
    </div>
  );
}

/* ── Status Helpers ── */
const STATUS_LABEL_KEYS: Record<string, string> = {
  New: "contact.statusNew",
  InProgress: "contact.statusInProgress",
  Replied: "contact.statusReplied",
  Closed: "contact.statusClosed"
};
const STATUS_BADGES: Record<string, string> = {
  New: "badge badge--blue",
  InProgress: "badge badge--yellow",
  Replied: "badge badge--green",
  Closed: "badge badge--gray"
};

function fmtDate(s: string, locale: string) {
  return new Date(s).toLocaleDateString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ── Ticket Detail Modal ── */
function TicketDetailModal({ ticket, onClose, onStatusChange, onReply }: { ticket: ContactMessage; onClose: () => void; onStatusChange: (id: number, status: string) => void; onReply: (id: number, text: string) => void }) {
  const { t, i18n } = useTranslation();
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    await onReply(ticket.id, replyText);
    setReplyText("");
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-[16px] font-bold text-[var(--ink)]">{t("admin.ticketDetails")} <span className="text-[var(--blue)]" dir="ltr">{ticket.ticketNumber}</span></h3>
          <button onClick={onClose} className="btn btn-outline btn-sm">×</button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-[13px]">
            <div><span className="text-[var(--sub)]">{t("auth.name")}:</span> <span className="font-medium">{ticket.name}</span></div>
            <div><span className="text-[var(--sub)]">{t("auth.email")}:</span> <span>{ticket.email}</span></div>
            <div><span className="text-[var(--sub)]">{t("auth.phone")}:</span> <span>{ticket.phone || "-"}</span></div>
            <div><span className="text-[var(--sub)]">{t("common.status")}:</span> <span className={STATUS_BADGES[ticket.status] || "badge badge--gray"}>{t(STATUS_LABEL_KEYS[ticket.status] || ticket.status)}</span></div>
            <div className="col-span-2"><span className="text-[var(--sub)]">{t("admin.messageSubject")}:</span> <span className="font-medium">{ticket.subject}</span></div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-[13px] leading-relaxed whitespace-pre-wrap">{ticket.message}</div>

          {/* Replies */}
          {ticket.replies && ticket.replies.length > 0 && (
            <div>
              <h4 className="text-[14px] font-bold mb-3">{t("admin.ticketReplies")}</h4>
              <div className="space-y-3">
                {ticket.replies.map(r => (
                  <div key={r.id} className={`p-3 rounded-lg text-[13px] ${r.isAdminReply ? "bg-[var(--blue-50)] mr-8" : "bg-gray-50 ml-8"}`}>
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-[12px]">{r.repliedByName}</span>
                      <span className="text-[11px] text-[var(--sub)]">{fmtDate(r.createdAt, i18n.language)}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{r.replyText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reply Form */}
          <div>
            <h4 className="text-[14px] font-bold mb-2">{t("admin.addReply")}</h4>
            <textarea className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{borderColor:'var(--border)'}} rows={3} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder={t("admin.writeReply")} />
            <div className="flex gap-2 mt-2">
              <button onClick={handleReply} disabled={sending || !replyText.trim()} className="btn btn-primary btn-sm">{sending ? t("common.loading") : t("common.send")}</button>
              <select className="rounded-lg border px-3 py-1.5 text-[13px] outline-none" style={{borderColor:'var(--border)'}} value={ticket.status} onChange={e => onStatusChange(ticket.id, e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{t(STATUS_LABEL_KEYS[s] || s)}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Messages / Tickets List ── */
function MessagesList() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<ContactMessage | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const loadMessages = useCallback(async (status?: string, search?: string) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const qs = params.toString();
      const res = await api.get(`/admin/site/contact-messages${qs ? `?${qs}` : ""}`);
      setMessages(res.data.data || []);
    } catch { setError(t("error.serverError")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadMessages(statusFilter, searchQuery); }, [statusFilter, searchQuery, loadMessages]);

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id); setError("");
    try {
      await api.put(`/admin/site/contact-messages/${id}/status`, { status });
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
      if (selectedTicket?.id === id) setSelectedTicket(prev => prev ? { ...prev, status } : null);
    } catch { setError(t("error.serverError")); } finally { setUpdatingId(null); }
  };

  const handleReply = async (id: number, replyText: string) => {
    setError("");
    try {
      const res = await api.post(`/admin/site/contact-messages/${id}/replies`, { replyText });
      const newReply = res.data.data;
      setMessages(prev => prev.map(m =>
        m.id === id
          ? { ...m, status: "Replied", replies: [...(m.replies || []), newReply] }
          : m
      ));
      if (selectedTicket?.id === id) {
        setSelectedTicket(prev => prev ? { ...prev, status: "Replied", replies: [...(prev.replies || []), newReply] } : null);
      }
    } catch { setError(t("error.serverError")); }
  };

  const handleDelete = async (id: number) => {
    setUpdatingId(id); setError("");
    try {
      await api.delete(`/admin/site/contact-messages/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedTicket?.id === id) setSelectedTicket(null);
      setDeleteConfirmId(null);
    } catch { setError(t("error.serverError")); } finally { setUpdatingId(null); }
  };

  const openDetails = async (msg: ContactMessage) => {
    try {
      const res = await api.get(`/admin/site/contact-messages/${msg.id}`);
      setSelectedTicket(res.data.data);
    } catch {
      setSelectedTicket(msg);
    }
  };

  if (loading && messages.length === 0) return <LoadingState />;

  return (
    <>
      {error && <div className="alert alert--danger mb-4">{error}</div>}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select className="rounded-lg border px-3 py-2 text-[13px] outline-none" style={{ borderColor: "var(--border)" }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{t("admin.allStatuses")}</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{t(STATUS_LABEL_KEYS[s] || s)}</option>)}
        </select>
        <input className="rounded-lg border px-3 py-2 text-[13px] outline-none flex-1 min-w-[200px]" style={{ borderColor: "var(--border)" }} placeholder={t("admin.searchTickets")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{t("admin.ticketNumber")}</th>
              <th>{t("admin.messageName")}</th>
              <th>{t("admin.messageEmail")}</th>
              <th>{t("admin.messagePhone")}</th>
              <th>{t("admin.messageSubject")}</th>
              <th>{t("common.status")}</th>
              <th>{t("admin.messageDate")}</th>
              <th>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {messages.map(msg => (
              <tr key={msg.id}>
                <td className="text-[var(--sub)]">{msg.id}</td>
                <td className="font-mono text-[12px] text-[var(--blue)]" dir="ltr">{msg.ticketNumber || "-"}</td>
                <td className="font-medium">{msg.name}</td>
                <td className="text-[var(--sub)]">{msg.email}</td>
                <td className="text-[var(--sub)]">{msg.phone || "-"}</td>
                <td className="text-[var(--sub)] max-w-[120px] truncate">{msg.subject}</td>
                <td><span className={STATUS_BADGES[msg.status] || "badge badge--gray"}>{t(STATUS_LABEL_KEYS[msg.status] || msg.status)}</span></td>
                <td className="text-[var(--sub)] text-[12px] whitespace-nowrap">{fmtDate(msg.createdAt, i18n.language)}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openDetails(msg)} className="btn btn-outline btn-sm">{t("admin.view")}</button>
                    <select className="rounded-lg border px-2 py-1 text-[12px] outline-none" style={{borderColor:'var(--border)'}} value={msg.status} disabled={updatingId === msg.id} onChange={e => updateStatus(msg.id, e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{t(STATUS_LABEL_KEYS[s] || s)}</option>)}
          
                    </select>
                    {deleteConfirmId === msg.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(msg.id)} disabled={updatingId === msg.id} className="btn btn-danger btn-sm">{t("common.confirm")}</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="btn btn-outline btn-sm">{t("common.cancel")}</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(msg.id)} className="btn btn-danger btn-sm">{t("common.delete")}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {messages.length === 0 && <p className="text-center text-[var(--sub)] py-8">{t("admin.noMessages")}</p>}
      </div>

      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onStatusChange={updateStatus} onReply={handleReply} />
      )}
    </>
  );
}

/* ── Helpers ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="text-[15px] font-bold text-[var(--ink)] mb-4 pb-2 border-b" style={{ borderColor: "var(--border)" }}>{title}</h3>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-3"><label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{label}</label><div className="field-shell">{children}</div></div>;
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}
function GridCols({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">{children}</div>;
}

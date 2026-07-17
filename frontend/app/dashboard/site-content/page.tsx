"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { isAuthenticated, getUserType } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import "@/lib/i18n/config";

import type { TFunction } from "i18next";

type TabKey = "homepage" | "features" | "about" | "contact";

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: "homepage", labelKey: "admin.homepage" },
  { key: "features", labelKey: "admin.features" },
  { key: "about", labelKey: "admin.about" },
  { key: "contact", labelKey: "admin.contact" },
];

const FEATURE_PAGES = [
  { key: "ecommerce", labelKey: "page.ecommerce" },
  { key: "invoicing", labelKey: "page.invoicing" },
  { key: "payment-links", labelKey: "page.paymentLinks" },
  { key: "pos", labelKey: "page.pos" },
  { key: "payment-gateway", labelKey: "page.paymentGateway" },
  { key: "website-integration", labelKey: "page.websiteIntegration" },
];

const ABOUT_PAGES = [
  { key: "about", labelKey: "page.about" },
  { key: "careers", labelKey: "page.careers" },
  { key: "affiliate-marketing", labelKey: "page.affiliate" },
  { key: "free-tools", labelKey: "page.freeTools" },
  { key: "security-standards", labelKey: "page.security" },
  { key: "agency-program", labelKey: "page.agency" },
];

const HELP_PAGES = [
  { key: "contact", labelKey: "page.contact" },
  { key: "help-center", labelKey: "page.helpCenter" },
  { key: "terms-of-use", labelKey: "page.terms" },
];

interface ContactMessage { id: number; name: string; email: string; phone: string | null; subject: string; message: string; status: string; createdAt: string }

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
      {activeTab === "contact" && <ContactManager />}
    </div>
  );
}

/* ── Image Upload Widget ── */
function ImageUpload({ value, onChange, accept = "image/*", labelKey = "admin.uploadImage" }: { value: string; onChange: (url: string) => void; accept?: string; labelKey?: string }) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/admin/site/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(res.data.data.url);
    } catch { alert(t("error.serverError")); }
    finally { setUploading(false); }
  };
  return (
    <div className="flex items-center gap-3">
      {value && <img src={value} alt="" className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: "var(--border)" }} />}
      <label className="btn btn-outline btn-sm cursor-pointer">
        {uploading ? t("common.loading") : t(labelKey)}
        <input type="file" accept={accept} onChange={handleFile} className="hidden" />
      </label>
      {value && <button onClick={() => onChange("")} className="btn btn-danger btn-sm">×</button>}
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
      {success && <div className="alert alert--success">{success}</div>}
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

/* ── Page Editor (reusable, robust) ── */
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
      const d = r.data.data;
      setTitleAr(d.titleAr || ""); setContentAr(d.contentAr || "");
      setTitleEn(d.titleEn || ""); setContentEn(d.contentEn || "");
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
      {success && <div className="alert alert--success">{success}</div>}
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

/* ── Contact Manager ── */
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

/* ── Messages List ── */
function MessagesList() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true); setError("");
    api.get("/admin/site/contact").then(r => setMessages(r.data.data || [])).catch(() => setError(t("error.serverError"))).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id); setError("");
    try { await api.put(`/admin/site/contact/${id}/status`, { status }); setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m)); }
    catch { setError(t("error.serverError")); } finally { setUpdatingId(null); }
  };

  const fmt = (s: string) => new Date(s).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const STATUS_LABELS: Record<string, string> = { New: t("admin.statusNew"), Read: t("admin.statusRead"), Resolved: t("admin.statusResolved") };
  const STATUS_BADGES: Record<string, string> = { New: "badge badge--yellow", Read: "badge badge--blue", Resolved: "badge badge--green" };

  if (loading) return <LoadingState />;
  return (
    <>
      {error && <div className="alert alert--danger mb-4">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>{t("admin.messageId")}</th><th>{t("admin.messageName")}</th><th>{t("admin.messageEmail")}</th><th>{t("admin.messagePhone")}</th><th>{t("admin.messageSubject")}</th><th>{t("admin.messageBody")}</th><th>{t("common.status")}</th><th>{t("admin.messageDate")}</th><th>{t("common.actions")}</th></tr></thead>
          <tbody>
            {messages.map(msg => (
              <tr key={msg.id}>
                <td className="text-[var(--sub)]">{msg.id}</td>
                <td className="font-medium">{msg.name}</td>
                <td className="text-[var(--sub)]">{msg.email}</td>
                <td className="text-[var(--sub)]">{msg.phone || "-"}</td>
                <td className="text-[var(--sub)] max-w-[120px] truncate">{msg.subject}</td>
                <td className="text-[var(--sub)] max-w-[160px] truncate">{msg.message}</td>
                <td><span className={STATUS_BADGES[msg.status] || "badge badge--gray"}>{STATUS_LABELS[msg.status] || msg.status}</span></td>
                <td className="text-[var(--sub)] text-[12px] whitespace-nowrap">{fmt(msg.createdAt)}</td>
                <td><div className="flex gap-1">{msg.status !== "Read" && <button onClick={() => updateStatus(msg.id, "Read")} disabled={updatingId === msg.id} className="btn btn-outline btn-sm">{t("admin.markRead")}</button>}{msg.status !== "Resolved" && <button onClick={() => updateStatus(msg.id, "Resolved")} disabled={updatingId === msg.id} className="btn btn-success btn-sm">{t("admin.markResolved")}</button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {messages.length === 0 && <p className="text-center text-[var(--sub)] py-8">{t("admin.noMessages")}</p>}
      </div>
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

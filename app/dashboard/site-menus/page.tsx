"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { isAuthenticated, getUserType } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import Toast from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import "@/lib/i18n/config";

interface SiteMenu {
  id: number;
  location: string;
  titleAr: string;
  titleEn: string;
  href: string;
  icon: string | null;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
}

type FormState = {
  location: string;
  titleAr: string;
  titleEn: string;
  href: string;
  icon: string;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
};

const LOCATIONS = ["features", "about", "footer-tools", "footer-about", "footer-help"];
const EMPTY_FORM: FormState = { location: "features", titleAr: "", titleEn: "", href: "", icon: "", parentId: "", sortOrder: 1, isActive: true };

export default function SiteMenusPage() {
  const { t, i18n } = useTranslation();
  const confirm = useConfirm();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [ready, setReady] = useState(false);
  const [menus, setMenus] = useState<SiteMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [defaultParent, setDefaultParent] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated() || getUserType() !== "SuperAdmin") {
      router.push("/dashboard");
      return;
    }
    setAuthorized(true);
    setReady(true);
  }, [router]);

  const load = useCallback(async () => {
    const res = await api.get("/admin/site/menus");
    setMenus(res.data.data || []);
  }, []);

  useEffect(() => {
    if (!ready) return;
    load().catch(() => setMessage({ type: "error", text: t("error.serverError") })).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, load]);

  const groups = LOCATIONS.map(loc => ({
    location: loc,
    items: menus
      .filter(m => m.location === loc)
      .sort((a, b) => (a.parentId ?? 0) - (b.parentId ?? 0) || a.sortOrder - b.sortOrder || a.id - b.id),
  }));

  const topLevel = (loc: string) => menus.filter(m => m.location === loc && !m.parentId);
  const childrenOf = (parentId: number) => menus.filter(m => m.parentId === parentId);

  const openCreate = (location: string, parentId: number | null = null) => {
    setEditingId(null);
    setDefaultParent(parentId);
    setForm({ ...EMPTY_FORM, location, parentId: parentId ? String(parentId) : "" });
    setModalOpen(true);
  };

  const openEdit = (m: SiteMenu) => {
    setEditingId(m.id);
    setDefaultParent(null);
    setForm({ location: m.location, titleAr: m.titleAr, titleEn: m.titleEn, href: m.href, icon: m.icon || "", parentId: m.parentId ? String(m.parentId) : "", sortOrder: m.sortOrder, isActive: m.isActive });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setDefaultParent(null);
    setForm(EMPTY_FORM);
  };

  const submit = async () => {
    if (!form.titleAr.trim() && !form.titleEn.trim()) {
      setMessage({ type: "error", text: t("siteMenus.titleAr") + " / " + t("siteMenus.titleEn") });
      return;
    }
    setSaving(true);
    setMessage(null);
    const payload = {
      location: form.location,
      titleAr: form.titleAr.trim(),
      titleEn: form.titleEn.trim(),
      href: form.href.trim() || "#",
      icon: form.icon.trim() || null,
      parentId: form.parentId ? Number(form.parentId) : 0,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };
    try {
      if (editingId) {
        await api.put(`/admin/site/menus/${editingId}`, payload);
      } else {
        await api.post("/admin/site/menus", payload);
      }
      await load();
      setMessage({ type: "success", text: t("siteMenus.saveSuccess") });
      closeModal();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (m: SiteMenu) => {
    try {
      await api.put(`/admin/site/menus/${m.id}/toggle`);
      await load();
    } catch {
      setMessage({ type: "error", text: t("error.serverError") });
    }
  };

  const remove = async (m: SiteMenu) => {
    if (!(await confirm(t("common.confirmDelete")))) return;
    try {
      await api.delete(`/admin/site/menus/${m.id}`);
      await load();
      setMessage({ type: "success", text: t("siteMenus.deleteSuccess") });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    }
  };

  if (!ready) return <LoadingState />;
  if (!authorized) return null;

  const renderItem = (m: SiteMenu, depth: number) => {
    const kids = childrenOf(m.id);
    return (
      <div key={m.id} className={depth > 0 ? "ms-6" : ""}>
        <div className="flex items-center gap-2 py-2 border-b border-[var(--border)] flex-wrap">
          <span className="w-6 text-center text-[12px] font-bold" style={{ color: "var(--sub)" }}>{m.sortOrder}</span>
          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-bold truncate" style={{ color: "var(--ink)" }}>
              {i18nText(m.titleAr, m.titleEn)}
              {kids.length > 0 && <span className="ms-2 text-[11px] font-bold" style={{ color: "var(--sub)" }}>({kids.length})</span>}
            </p>
            <p className="text-[11.5px] text-[var(--sub)] truncate" dir="ltr">{m.href}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${m.isActive ? "bg-green-50" : "bg-gray-100"}`} style={{ color: m.isActive ? "var(--green)" : "var(--sub)" }}>
            {m.isActive ? t("siteMenus.visible") : t("siteMenus.hidden")}
          </span>
          <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => openCreate(m.location, m.id)}>
            {t("siteMenus.addSub")}
          </button>
          <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => openEdit(m)}>
            {t("siteMenus.edit")}
          </button>
          <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => toggle(m)}>
            {m.isActive ? t("siteMenus.hide") : t("siteMenus.show")}
          </button>
          <button className="btn btn-outline !px-2 !py-1 !text-[11px] !text-red-600" onClick={() => remove(m)}>
            {t("siteMenus.delete")}
          </button>
        </div>
        {kids.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id).map(k => renderItem(k, depth + 1))}
      </div>
    );
  };

  return (
    <div>
      <PageHeader icon="menu" title={t("admin.siteMenus")} />
      <p className="mb-5 text-[13px]" style={{ color: "var(--sub)" }}>{t("siteMenus.pageIntro")}</p>
      {message && <Toast message={message.text} type={message.type} fixed />}

      <div className="grid grid-cols-1 gap-5">
        {groups.map(g => (
          <div key={g.location} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold" style={{ color: "var(--blue-deep)" }}>
                {locLabel(g.location)}
              </h2>
              <button className="btn btn-primary !py-2 !text-[12.5px]" onClick={() => openCreate(g.location)}>
                + {t("siteMenus.add")}
              </button>
            </div>
            {g.items.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--sub)" }}>{t("common.noData")}</p>
            ) : (
              <div>
                {g.items.filter(m => !m.parentId || !menus.some(p => p.id === m.parentId)).map(m => renderItem(m, 0))}
              </div>
            )}
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-bold" style={{ color: "var(--blue-deep)" }}>
                {editingId ? t("siteMenus.edit") : t("siteMenus.add")}
              </h3>
              <button type="button" onClick={closeModal} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("siteMenus.titleAr")}</label>
                <div className="field-shell"><input type="text" value={form.titleAr} onChange={e => setForm({ ...form, titleAr: e.target.value })} /></div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("siteMenus.titleEn")}</label>
                <div className="field-shell"><input type="text" dir="ltr" value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} /></div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("siteMenus.href")}</label>
                <div className="field-shell"><input type="text" dir="ltr" value={form.href} onChange={e => setForm({ ...form, href: e.target.value })} placeholder="/features" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("siteMenus.location")}</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-[13px]" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}>
                    {LOCATIONS.map(l => <option key={l} value={l}>{locLabel(l)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("siteMenus.sortOrder")}</label>
                  <div className="field-shell"><input type="number" min={0} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value === "" ? 0 : Number(e.target.value) })} /></div>
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("siteMenus.parent")}</label>
                <select className="w-full border rounded-lg px-3 py-2 text-[13px]" value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })}>
                  <option value="">{t("siteMenus.noParent")}</option>
                  {topLevel(form.location).filter(p => p.id !== editingId).map(p => (
                    <option key={p.id} value={p.id}>{i18nText(p.titleAr, p.titleEn)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("siteMenus.icon")}</label>
                <div className="field-shell"><input type="text" dir="ltr" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="store" /></div>
                <p className="text-[11px] mt-1" style={{ color: "var(--sub)" }}>{t("siteMenus.iconHint")}</p>
              </div>
              <label className="flex items-center gap-2 text-[13px] font-bold cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                {form.isActive ? t("siteMenus.visible") : t("siteMenus.hidden")}
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button disabled={saving} className="btn btn-primary flex-1 disabled:opacity-60" onClick={submit}>
                {saving ? t("common.loading") : t("common.save")}
              </button>
              <button className="btn btn-outline" onClick={closeModal}>{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function i18nText(ar: string, en: string) {
    return i18n.language === "ar" ? (ar || en) : (en || ar);
  }

  function locLabel(loc: string) {
    const map: Record<string, string> = {
      features: t("siteMenus.locFeatures"),
      about: t("siteMenus.locAbout"),
      "footer-tools": t("siteMenus.locFooterTools"),
      "footer-about": t("siteMenus.locFooterAbout"),
      "footer-help": t("siteMenus.locFooterHelp"),
    };
    return map[loc] || loc;
  }
}
"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { isAuthenticated, getUserType } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import Toast from "@/components/Toast";
import "@/lib/i18n/config";

interface DashboardLink {
  labelAr: string;
  labelEn: string;
  href: string;
  icon: string;
  perm: string | null;
}

interface DashboardSection {
  id: number;
  key: string;
  titleAr: string;
  titleEn: string;
  icon: string;
  role: string;
  sortOrder: number;
  isActive: boolean;
  links: DashboardLink[];
}

type FormState = {
  titleAr: string;
  titleEn: string;
  icon: string;
  role: string;
  sortOrder: number;
  isActive: boolean;
};

const ROLES = ["SuperAdmin", "Owner", "Employee"];
const ICON_OPTIONS = ["home", "box", "tag", "receipt", "wallet", "crown", "chart", "store", "package", "users", "userGroup", "settings", "layers", "share", "edit", "lock", "clock", "ledger", "clipboard", "warehouse", "truck", "book", "journal", "cashier", "card", "fixedAsset"];

const EMPTY_FORM: FormState = { titleAr: "", titleEn: "", icon: "settings", role: "SuperAdmin", sortOrder: 1, isActive: true };

export default function DashboardSectionsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [ready, setReady] = useState(false);
  const [sections, setSections] = useState<DashboardSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [links, setLinks] = useState<DashboardLink[]>([{ labelAr: "", labelEn: "", href: "", icon: "settings", perm: null }]);
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
    const res = await api.get("/admin/dashboard-sections");
    setSections(res.data.data || []);
  }, []);

  useEffect(() => {
    if (!ready) return;
    load().catch(() => setMessage({ type: "error", text: t("error.serverError") })).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setLinks([{ labelAr: "", labelEn: "", href: "", icon: "settings", perm: null }]);
    setModalOpen(true);
  };

  const openEdit = (s: DashboardSection) => {
    setEditingId(s.id);
    setForm({ titleAr: s.titleAr, titleEn: s.titleEn, icon: s.icon, role: s.role, sortOrder: s.sortOrder, isActive: s.isActive });
    setLinks(s.links.length > 0 ? [...s.links] : [{ labelAr: "", labelEn: "", href: "", icon: "settings", perm: null }]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setLinks([{ labelAr: "", labelEn: "", href: "", icon: "settings", perm: null }]);
  };

  const updateLink = (i: number, patch: Partial<DashboardLink>) => {
    setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  };

  const submit = async () => {
    if (!form.titleAr.trim() && !form.titleEn.trim()) {
      setMessage({ type: "error", text: t("dashboardSections.titleAr") + " / " + t("dashboardSections.titleEn") });
      return;
    }
    const validLinks = links.filter(l => (l.labelAr.trim() || l.labelEn.trim()) && l.href.trim());
    setSaving(true);
    setMessage(null);
    const payload = {
      titleAr: form.titleAr.trim(),
      titleEn: form.titleEn.trim(),
      icon: form.icon.trim() || "settings",
      role: form.role,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
      links: validLinks.map(l => ({
        labelAr: l.labelAr.trim(), labelEn: l.labelEn.trim(),
        href: l.href.trim(), icon: l.icon.trim() || "settings",
        perm: l.perm?.trim() || null,
      })),
    };
    try {
      if (editingId) {
        await api.put(`/admin/dashboard-sections/${editingId}`, payload);
      } else {
        await api.post("/admin/dashboard-sections", payload);
      }
      await load();
      setMessage({ type: "success", text: t("dashboardSections.saveSuccess") });
      closeModal();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (s: DashboardSection) => {
    try {
      await api.put(`/admin/dashboard-sections/${s.id}/toggle`);
      await load();
    } catch {
      setMessage({ type: "error", text: t("error.serverError") });
    }
  };

  const remove = async (s: DashboardSection) => {
    if (!window.confirm(t("common.confirmDelete"))) return;
    try {
      await api.delete(`/admin/dashboard-sections/${s.id}`);
      await load();
      setMessage({ type: "success", text: t("dashboardSections.deleteSuccess") });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    }
  };

  if (!ready) return <LoadingState />;
  if (!authorized) return null;

  const sorted = [...sections].sort((a, b) => a.role.localeCompare(b.role) || a.sortOrder - b.sortOrder || a.id - b.id);

  return (
    <div>
      <PageHeader icon="settings" title={t("admin.dashboardSections")} />
      <p className="mb-5 text-[13px]" style={{ color: "var(--sub)" }}>{t("dashboardSections.pageIntro")}</p>
      {message && <Toast message={message.text} type={message.type} fixed />}

      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px]" style={{ color: "var(--sub)" }}>{t("dashboardSections.count", { count: sections.length })}</span>
        <button className="btn btn-primary" onClick={openCreate}>+ {t("dashboardSections.add")}</button>
      </div>

      {loading ? (
        <LoadingState />
      ) : sorted.length === 0 ? (
        <div className="card p-10 text-center"><p className="text-[13.5px]" style={{ color: "var(--sub)" }}>{t("common.noData")}</p></div>
      ) : (
        <div className="space-y-3">
          {sorted.map(s => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold truncate" style={{ color: "var(--ink)" }}>
                    {i18nText(s.titleAr, s.titleEn)}
                    {s.links.length > 0 && <span className="ms-2 text-[11px] font-bold" style={{ color: "var(--sub)" }}>({s.links.length})</span>}
                  </p>
                  <p className="text-[11.5px] text-[var(--sub)] truncate" dir="ltr">icon: {s.icon} · role: {s.role} · order: {s.sortOrder}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${s.isActive ? "bg-green-50" : "bg-gray-100"}`} style={{ color: s.isActive ? "var(--green)" : "var(--sub)" }}>
                  {s.isActive ? t("dashboardSections.visible") : t("dashboardSections.hidden")}
                </span>
                <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => openEdit(s)}>
                  {t("dashboardSections.edit")}
                </button>
                <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => toggle(s)}>
                  {s.isActive ? t("dashboardSections.hide") : t("dashboardSections.show")}
                </button>
                <button className="btn btn-outline !px-2 !py-1 !text-[11px] !text-red-600" onClick={() => remove(s)}>
                  {t("dashboardSections.delete")}
                </button>
              </div>
              {s.links.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1.5">
                  {s.links.map((l, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--sub)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                      <span className="font-bold" style={{ color: "var(--ink)" }}>{i18nText(l.labelAr, l.labelEn)}</span>
                      <span dir="ltr">{l.href}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-[17px] font-bold mb-4" style={{ color: "var(--blue-deep)" }}>
              {editingId ? t("dashboardSections.edit") : t("dashboardSections.add")}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("dashboardSections.titleAr")}</label>
                <div className="field-shell"><input type="text" value={form.titleAr} onChange={e => setForm({ ...form, titleAr: e.target.value })} /></div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("dashboardSections.titleEn")}</label>
                <div className="field-shell"><input type="text" dir="ltr" value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("dashboardSections.icon")}</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-[13px]" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}>
                    {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("dashboardSections.role")}</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-[13px]" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("dashboardSections.sortOrder")}</label>
                  <div className="field-shell"><input type="number" min={1} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) || 1 })} /></div>
                </div>
                <label className="flex items-center gap-2 text-[13px] font-bold cursor-pointer pt-6">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                  {form.isActive ? t("dashboardSections.visible") : t("dashboardSections.hidden")}
                </label>
              </div>

              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-[12.5px] font-bold mb-2 text-[var(--ink)]">{t("dashboardSections.links")}</p>
                <div className="space-y-3">
                  {links.map((l, i) => (
                    <div key={i} className="p-3 rounded-xl border border-[var(--border)] space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input className="field-context"
                          style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", fontSize: 12.5, width: "100%" }}
                          value={l.labelAr}
                          onChange={e => updateLink(i, { labelAr: e.target.value })}
                          placeholder={t("dashboardSections.labelAr")} />
                        <input className="field-context" dir="ltr"
                          style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", fontSize: 12.5, width: "100%" }}
                          value={l.labelEn}
                          onChange={e => updateLink(i, { labelEn: e.target.value })}
                          placeholder={t("dashboardSections.labelEn")} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="field-context" dir="ltr"
                          style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", fontSize: 12.5, width: "100%" }}
                          value={l.href}
                          onChange={e => updateLink(i, { href: e.target.value })}
                          placeholder="/dashboard/page" />
                        <select className="field-context"
                          style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", fontSize: 12.5, width: "100%" }}
                          value={l.icon}
                          onChange={e => updateLink(i, { icon: e.target.value })}>
                          {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                        </select>
                      </div>
                      <input className="field-context" dir="ltr"
                        style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", fontSize: 12.5, width: "100%" }}
                        value={l.perm || ""}
                        onChange={e => updateLink(i, { perm: e.target.value })}
                        placeholder={t("dashboardSections.perm")} />
                    </div>
                  ))}
                </div>
                <button className="btn btn-outline mt-3 !text-[12.5px]" onClick={() => setLinks(prev => [...prev, { labelAr: "", labelEn: "", href: "", icon: "settings", perm: null }])}>
                  + {t("dashboardSections.addLink")}
                </button>
              </div>
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
}
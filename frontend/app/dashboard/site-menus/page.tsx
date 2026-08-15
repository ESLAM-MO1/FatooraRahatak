"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { isAuthenticated, getUserType } from "@/lib/auth";
import api from "@/lib/api";
import "@/lib/i18n/config";

const LOCATIONS = [
  { key: "features", labelKey: "siteMenus.locFeatures" },
  { key: "about", labelKey: "siteMenus.locAbout" },
  { key: "footer-tools", labelKey: "siteMenus.locFooterTools" },
  { key: "footer-about", labelKey: "siteMenus.locFooterAbout" },
  { key: "footer-help", labelKey: "siteMenus.locFooterHelp" },
];

interface MenuItem {
  id: number;
  location: string;
  titleAr: string;
  titleEn: string;
  href: string;
  icon?: string | null;
  parentId?: number | null;
  sortOrder: number;
  isActive: boolean;
}

export default function SiteMenusPage() {
  const { t } = useTranslation();
  const router = useRouter();
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

  return <SiteMenusManager />;
}

function SiteMenusManager() {
  const { t } = useTranslation();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await api.get("/admin/site/menus");
      setItems(r.data.data || []);
    } catch { setError(t("error.serverError")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true); setSuccess(""); setError("");
    try {
      const body = {
        location: editing.location,
        titleAr: editing.titleAr, titleEn: editing.titleEn,
        href: editing.href, icon: editing.icon || null,
        parentId: editing.parentId || null,
        sortOrder: editing.sortOrder,
        isActive: editing.isActive,
      };
      if (editing.id) {
        await api.put(`/admin/site/menus/${editing.id}`, body);
      } else {
        await api.post("/admin/site/menus", body);
      }
      setSuccess(t("admin.saveSuccess"));
      setEditing(null);
      load();
    } catch { setError(t("admin.saveError")); }
    finally { setSaving(false); }
  };

  const toggle = async (id: number) => {
    try { await api.put(`/admin/site/menus/${id}/toggle`); load(); }
    catch { setError(t("error.serverError")); }
  };

  const remove = async (id: number) => {
    if (!confirm(t("common.confirmDelete"))) return;
    try { await api.delete(`/admin/site/menus/${id}`); load(); }
    catch { setError(t("error.serverError")); }
  };

  const childrenOf = (parentId: number | null | undefined) =>
    items.filter(i => i.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-5">
      <PageHeader icon="settings" title={t("admin.siteMenus")} />
      <div className="card card-accent" style={{ padding: "1rem 1.25rem" }}>
        <p style={{ color: "var(--ink)", lineHeight: 1.8, fontSize: 14 }}>{t("siteMenus.pageIntro")}</p>
      </div>

      <SuccessToast message={success} fixed />
      {error && <div className="alert alert--danger">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {LOCATIONS.map(loc => {
          const topLevel = childrenOf(null).filter(i => i.location === loc.key);
          const subItems = items.filter(i => i.location === loc.key && i.parentId !== null);
          return (
            <div key={loc.key} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-bold">{t(loc.labelKey)}</h3>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setEditing({ id: 0, location: loc.key, titleAr: "", titleEn: "", href: "/", icon: null, parentId: null, sortOrder: (topLevel.length + subItems.length) + 1, isActive: true } as MenuItem)}
                >
                  + {t("siteMenus.add")}
                </button>
              </div>
              <p className="text-[12.5px] text-[var(--sub)] mb-3">{t("siteMenus.topLevelHint")}</p>
              <div className="space-y-2">
                {topLevel.map(item => (
                  <div key={item.id} className="border rounded-lg p-3" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-[13.5px] font-bold">{item.titleAr || item.titleEn || "—"}</p>
                        <p className="text-[11px] text-[var(--sub)]" dir="ltr" style={{ textAlign: "left" }}>{item.href}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button className="btn btn-sm btn-outline" onClick={() => setEditing({ ...item, titleAr: item.titleAr || "", titleEn: item.titleEn || "", href: item.href || "?", icon: item.icon || null })}>{t("common.edit")}</button>
                        <button className="btn btn-sm btn-outline" onClick={() => toggle(item.id)}>
                          {item.isActive ? t("common.hide") : t("common.show")}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => remove(item.id)}>{t("common.delete")}</button>
                      </div>
                    </div>
                    {subItems.filter(s => s.parentId === item.id).length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {subItems.filter(s => s.parentId === item.id).sort((a, b) => a.sortOrder - b.sortOrder).map(sub => (
                          <div key={sub.id} className="rounded-md bg-gray-50 px-3 py-1.5 flex items-center justify-between gap-2">
                            <p className="text-[12.5px] font-bold truncate">{sub.titleAr || sub.titleEn || "—"}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              <button className="btn btn-sm btn-outline" onClick={() => setEditing({ ...sub, titleAr: sub.titleAr || "", titleEn: sub.titleEn || "", href: sub.href || "?", icon: sub.icon || null })}>✎</button>
                              <button className="btn btn-sm btn-danger" onClick={() => remove(sub.id)}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      className="mt-2 text-[11.5px] font-bold text-[var(--blue)]"
                      onClick={() => setEditing({ id: 0, location: item.location, titleAr: "", titleEn: "", href: "/", icon: null, parentId: item.id, sortOrder: item.sortOrder, isActive: true } as MenuItem)}
                    >
                      + {t("siteMenus.addSub")}
                    </button>
                  </div>
                ))}
                {topLevel.length === 0 && <p className="text-center text-[var(--sub)] py-3 text-[12.5px]">{t("common.noData")}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold">{editing.id ? t("common.edit") : t("siteMenus.add")}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("siteMenus.titleAr")}</label>
                <input dir="rtl" className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{ borderColor: "var(--border)" }} value={editing.titleAr} onChange={e => setEditing({ ...editing, titleAr: e.target.value })} />
              </div>
              <div>
                <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("siteMenus.titleEn")}</label>
                <input dir="ltr" className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{ borderColor: "var(--border)" }} value={editing.titleEn} onChange={e => setEditing({ ...editing, titleEn: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("siteMenus.href")}</label>
              <input dir="ltr" className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{ borderColor: "var(--border)" }} value={editing.href} onChange={e => setEditing({ ...editing, href: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("siteMenus.location")}</label>
                <select className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{ borderColor: "var(--border)" }} value={editing.location} onChange={e => setEditing({ ...editing, location: e.target.value })}>
                  {LOCATIONS.map(l => <option key={l.key} value={l.key}>{t(l.labelKey)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("siteMenus.sortOrder")}</label>
                <input type="number" className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{ borderColor: "var(--border)" }} value={editing.sortOrder} onChange={e => setEditing({ ...editing, sortOrder: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <label className="text-[12.5px] font-bold text-[var(--sub)] mb-1 block">{t("siteMenus.icon")}</label>
              <input dir="ltr" placeholder="burger / chat / store ..." className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none" style={{ borderColor: "var(--border)" }} value={editing.icon || ""} onChange={e => setEditing({ ...editing, icon: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={editing.isActive} onChange={e => setEditing({ ...editing, isActive: e.target.checked })} />
              <span className="text-[13px]">{t("common.published")}</span>
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
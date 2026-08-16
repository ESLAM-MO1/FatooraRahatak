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

interface Course {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: string;
  duration: string;
  level: string;
  isActive: boolean;
  sortOrder: number;
}

type FormState = { titleAr: string; titleEn: string; descriptionAr: string; descriptionEn: string; category: string; duration: string; level: string; sortOrder: number; isActive: boolean };
const EMPTY_FORM: FormState = { titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "", category: "", duration: "", level: "Beginner", sortOrder: 1, isActive: true };
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const CATEGORIES = ["management", "accounting", "inventory", "sales", "software", "other"];

export default function AcademyAdminPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [ready, setReady] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
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
    const res = await api.get("/admin/courses");
    setCourses(res.data.data || []);
  }, []);

  useEffect(() => {
    if (!ready) return;
    load().catch(() => setMessage({ type: "error", text: t("error.serverError") })).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, load]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setModalOpen(true); };

  const openEdit = (c: Course) => {
    setEditingId(c.id);
    setForm({ titleAr: c.titleAr, titleEn: c.titleEn, descriptionAr: c.descriptionAr, descriptionEn: c.descriptionEn, category: c.category, duration: c.duration, level: c.level, sortOrder: c.sortOrder, isActive: c.isActive });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(EMPTY_FORM); };

  const submit = async () => {
    if (!form.titleAr.trim() && !form.titleEn.trim()) {
      setMessage({ type: "error", text: t("academy.titleAr") + " / " + t("academy.titleEn") });
      return;
    }
    setSaving(true);
    setMessage(null);
    const payload = {
      titleAr: form.titleAr.trim(), titleEn: form.titleEn.trim(),
      descriptionAr: form.descriptionAr.trim(), descriptionEn: form.descriptionEn.trim(),
      category: form.category.trim(), duration: form.duration.trim(), level: form.level.trim(),
      sortOrder: form.sortOrder, isActive: form.isActive,
    };
    try {
      if (editingId) {
        await api.put(`/admin/courses/${editingId}`, payload);
      } else {
        await api.post("/admin/courses", payload);
      }
      await load();
      setMessage({ type: "success", text: t("academy.saveSuccess") });
      closeModal();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: Course) => {
    try {
      await api.put(`/admin/courses/${c.id}`, { titleAr: c.titleAr, titleEn: c.titleEn, descriptionAr: c.descriptionAr, descriptionEn: c.descriptionEn, category: c.category, duration: c.duration, level: c.level, sortOrder: c.sortOrder, isActive: !c.isActive });
      await load();
    } catch { setMessage({ type: "error", text: t("error.serverError") }); }
  };

  const remove = async (c: Course) => {
    if (!window.confirm(t("common.confirmDelete"))) return;
    try {
      await api.delete(`/admin/courses/${c.id}`);
      await load();
      setMessage({ type: "success", text: t("academy.deleteSuccess") });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    }
  };

  if (!ready) return <LoadingState />;
  if (!authorized) return null;

  const sorted = [...courses].sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id);
  const categoryLabel = (key: string) => {
    const v = t(`academy.cat_${key}`);
    return v === `academy.cat_${key}` ? key : v;
  };

  return (
    <div>
      <PageHeader icon="star" title={t("admin.academy")} />
      <p className="mb-5 text-[13px]" style={{ color: "var(--sub)" }}>{t("academy.pageIntro")}</p>
      {message && <Toast message={message.text} type={message.type} fixed />}

      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px]" style={{ color: "var(--sub)" }}>{t("academy.count", { count: courses.length })}</span>
        <button className="btn btn-primary" onClick={openCreate}>+ {t("academy.addCourse")}</button>
      </div>

      {loading ? <LoadingState /> : sorted.length === 0 ? (
        <div className="card p-10 text-center"><p className="text-[13.5px]" style={{ color: "var(--sub)" }}>{t("common.noData")}</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map(c => (
            <div key={c.id} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold truncate" style={{ color: "var(--ink)" }}>{i18nText(c.titleAr, c.titleEn)}</p>
                  <p className="text-[11.5px] text-[var(--sub)] truncate">{categoryLabel(c.category)} · {c.level} · {c.duration}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${c.isActive ? "bg-green-50" : "bg-gray-100"}`} style={{ color: c.isActive ? "var(--green)" : "var(--sub)" }}>
                  {c.isActive ? t("academy.active") : t("academy.inactive")}
                </span>
                <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => openEdit(c)}>{t("common.edit")}</button>
                <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => toggle(c)}>{c.isActive ? t("academy.deactivate") : t("academy.activate")}</button>
                <button className="btn btn-outline !px-2 !py-1 !text-[11px] !text-red-600" onClick={() => remove(c)}>{t("common.delete")}</button>
              </div>
              {i18nText(c.descriptionAr, c.descriptionEn) && (
                <p className="text-[12.5px] mt-3" style={{ color: "var(--sub)" }}>{i18nText(c.descriptionAr, c.descriptionEn)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-[17px] font-bold mb-4" style={{ color: "var(--blue-deep)" }}>
              {editingId ? t("academy.editCourse") : t("academy.addCourse")}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.titleAr")}</label>
                  <div className="field-shell"><input type="text" value={form.titleAr} onChange={e => setForm({ ...form, titleAr: e.target.value })} /></div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.titleEn")}</label>
                  <div className="field-shell"><input type="text" dir="ltr" value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} /></div>
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.descriptionAr")}</label>
                <div className="field-shell"><textarea rows={3} value={form.descriptionAr} onChange={e => setForm({ ...form, descriptionAr: e.target.value })} /></div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.descriptionEn")}</label>
                <div className="field-shell"><textarea rows={3} dir="ltr" value={form.descriptionEn} onChange={e => setForm({ ...form, descriptionEn: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.category")}</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-[13px]" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(ca => <option key={ca} value={ca}>{categoryLabel(ca)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.level")}</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-[13px]" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                    {LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.duration")}</label>
                  <div className="field-shell"><input type="text" dir="ltr" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="10 hrs" /></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.sortOrder")}</label>
                  <div className="field-shell"><input type="number" min={1} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) || 1 })} /></div>
                </div>
                <label className="flex items-center gap-2 text-[13px] font-bold cursor-pointer pt-6">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                  {form.isActive ? t("academy.active") : t("academy.inactive")}
                </label>
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
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

interface Job {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  location: string;
  type: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface JobApplication {
  id: number;
  jobPostingId: number;
  jobTitleAr: string;
  jobTitleEn: string;
  applicantName: string;
  email: string;
  phone: string;
  message: string;
  cvUrl?: string;
  createdAt: string;
}

type FormState = { titleAr: string; titleEn: string; descriptionAr: string; descriptionEn: string; location: string; type: string; sortOrder: number; isActive: boolean };
const EMPTY_FORM: FormState = { titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "", location: "", type: "Full-time", sortOrder: 1, isActive: true };
const JOB_TYPES = ["Full-time", "Part-time", "Remote", "Freelance", "Internship"];

export default function CareersAdminPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"jobs" | "applications">("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
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

  const loadJobs = useCallback(async () => {
    const res = await api.get("/admin/jobs");
    setJobs(res.data.data || []);
  }, []);

  const loadApplications = useCallback(async () => {
    const res = await api.get("/admin/job-applications");
    setApplications(res.data.data || []);
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadJobs().catch(() => setMessage({ type: "error", text: t("error.serverError") })).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, loadJobs]);

  useEffect(() => {
    if (tab !== "applications") return;
    loadApplications().catch(() => {});
  }, [tab, loadApplications]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (j: Job) => {
    setEditingId(j.id);
    setForm({ titleAr: j.titleAr, titleEn: j.titleEn, descriptionAr: j.descriptionAr, descriptionEn: j.descriptionEn, location: j.location, type: j.type, sortOrder: j.sortOrder, isActive: j.isActive });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(EMPTY_FORM); };

  const submit = async () => {
    if (!form.titleAr.trim() && !form.titleEn.trim()) {
      setMessage({ type: "error", text: t("careers.titleAr") + " / " + t("careers.titleEn") });
      return;
    }
    setSaving(true);
    setMessage(null);
    const payload = {
      titleAr: form.titleAr.trim(), titleEn: form.titleEn.trim(),
      descriptionAr: form.descriptionAr.trim(), descriptionEn: form.descriptionEn.trim(),
      location: form.location.trim(), type: form.type.trim() || "Full-time",
      sortOrder: form.sortOrder, isActive: form.isActive,
    };
    try {
      if (editingId) {
        await api.put(`/admin/jobs/${editingId}`, payload);
      } else {
        await api.post("/admin/jobs", payload);
      }
      await loadJobs();
      setMessage({ type: "success", text: t("careers.saveSuccess") });
      closeModal();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (j: Job) => {
    try {
      await api.put(`/admin/jobs/${j.id}`, { titleAr: j.titleAr, titleEn: j.titleEn, descriptionAr: j.descriptionAr, descriptionEn: j.descriptionEn, location: j.location, type: j.type, sortOrder: j.sortOrder, isActive: !j.isActive });
      await loadJobs();
    } catch { setMessage({ type: "error", text: t("error.serverError") }); }
  };

  const remove = async (j: Job) => {
    if (!window.confirm(t("common.confirmDelete"))) return;
    try {
      await api.delete(`/admin/jobs/${j.id}`);
      await loadJobs();
      setMessage({ type: "success", text: t("careers.deleteSuccess") });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    }
  };

  const removeApp = async (a: JobApplication) => {
    if (!window.confirm(t("common.confirmDelete"))) return;
    try {
      await api.delete(`/admin/job-applications/${a.id}`);
      await loadApplications();
      setMessage({ type: "success", text: t("careers.deleteSuccess") });
    } catch { setMessage({ type: "error", text: t("error.serverError") }); }
  };

  if (!ready) return <LoadingState />;
  if (!authorized) return null;

  const sortedJobs = [...jobs].sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id);

  return (
    <div>
      <PageHeader icon="users" title={t("admin.careers")} />
      <p className="mb-5 text-[13px]" style={{ color: "var(--sub)" }}>{t("careers.pageIntro")}</p>
      {message && <Toast message={message.text} type={message.type} fixed />}

      <div className="flex items-center gap-2 mb-4">
        <button className={`btn ${tab === "jobs" ? "btn-primary" : "btn-outline"}`} onClick={() => setTab("jobs")}>{t("careers.jobs")}</button>
        <button className={`btn ${tab === "applications" ? "btn-primary" : "btn-outline"}`} onClick={() => setTab("applications")}>{t("careers.applications")} ({applications.length})</button>
        {tab === "jobs" && (
          <button className="btn btn-primary ms-auto" onClick={openCreate}>+ {t("careers.addJob")}</button>
        )}
      </div>

      {loading ? <LoadingState /> : tab === "jobs" ? (
        sortedJobs.length === 0 ? (
          <div className="card p-10 text-center"><p className="text-[13.5px]" style={{ color: "var(--sub)" }}>{t("common.noData")}</p></div>
        ) : (
          <div className="space-y-3">
            {sortedJobs.map(j => (
              <div key={j.id} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-bold truncate" style={{ color: "var(--ink)" }}>{i18nText(j.titleAr, j.titleEn)}</p>
                    <p className="text-[11.5px] text-[var(--sub)] truncate">{j.location} · {j.type} · {t("careers.order")} {j.sortOrder}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${j.isActive ? "bg-green-50" : "bg-gray-100"}`} style={{ color: j.isActive ? "var(--green)" : "var(--sub)" }}>
                    {j.isActive ? t("careers.active") : t("careers.inactive")}
                  </span>
                  <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => openEdit(j)}>{t("common.edit")}</button>
                  <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => toggle(j)}>{j.isActive ? t("careers.deactivate") : t("careers.activate")}</button>
                  <button className="btn btn-outline !px-2 !py-1 !text-[11px] !text-red-600" onClick={() => remove(j)}>{t("common.delete")}</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : applications.length === 0 ? (
        <div className="card p-10 text-center"><p className="text-[13.5px]" style={{ color: "var(--sub)" }}>{t("common.noData")}</p></div>
      ) : (
        <div className="space-y-3">
          {applications.map(a => (
            <div key={a.id} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold" style={{ color: "var(--ink)" }}>{a.applicantName} <span className="text-[11px] font-normal text-[var(--sub)]">{a.email} · {a.phone}</span></p>
                  <p className="text-[12px] text-[var(--sub)]">{i18nText(a.jobTitleAr, a.jobTitleEn)} · {new Date(a.createdAt).toLocaleString()}</p>
                  {a.message && <p className="text-[12.5px] mt-2 p-3 rounded-lg bg-[var(--bg)]" style={{ color: "var(--ink)" }}>{a.message}</p>}
                  {a.cvUrl && (
                    <a href={a.cvUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[12px] font-bold no-underline" style={{ color: "var(--blue)" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                      {t("careers.downloadCv")}
                    </a>
                  )}
                </div>
                <button className="btn btn-outline !px-2 !py-1 !text-[11px] !text-red-600" onClick={() => removeApp(a)}>{t("common.delete")}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-[17px] font-bold mb-4" style={{ color: "var(--blue-deep)" }}>
              {editingId ? t("careers.editJob") : t("careers.addJob")}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careers.titleAr")}</label>
                  <div className="field-shell"><input type="text" value={form.titleAr} onChange={e => setForm({ ...form, titleAr: e.target.value })} /></div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careers.titleEn")}</label>
                  <div className="field-shell"><input type="text" dir="ltr" value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} /></div>
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careers.descriptionAr")}</label>
                <div className="field-shell"><textarea rows={3} value={form.descriptionAr} onChange={e => setForm({ ...form, descriptionAr: e.target.value })} /></div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careers.descriptionEn")}</label>
                <div className="field-shell"><textarea rows={3} dir="ltr" value={form.descriptionEn} onChange={e => setForm({ ...form, descriptionEn: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careers.location")}</label>
                  <div className="field-shell"><input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careers.type")}</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-[13px]" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    {JOB_TYPES.map(ty => <option key={ty} value={ty}>{ty}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careers.sortOrder")}</label>
                  <div className="field-shell"><input type="number" min={1} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) || 1 })} /></div>
                </div>
              </div>
              <label className="flex items-center gap-2 text-[13px] font-bold cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                {form.isActive ? t("careers.active") : t("careers.inactive")}
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
}
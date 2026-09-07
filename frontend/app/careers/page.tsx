"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { SiteLayout } from "@/app/site-layout";
import Hero from "@/components/Hero";
import LoadingState from "@/components/LoadingState";
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

export default function CareersPage() {
  const { t, i18n } = useTranslation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedJob, setAppliedJob] = useState<number | null>(null);
  const [form, setForm] = useState({ applicantName: "", email: "", phone: "", message: "" });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/site/jobs").then((res) => setJobs(res.data?.data || [])).catch(() => setJobs([])).finally(() => setLoading(false));
  }, []);

  const loc = (ar: string, en: string) => (i18n.language === "ar" ? (ar || en) : (en || ar));

  const jobTypeLabel = (type: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      "Full-time": { ar: "دوام كامل", en: "Full-time" },
      "Part-time": { ar: "دوام جزئي", en: "Part-time" },
      Remote: { ar: "عن بُعد", en: "Remote" },
      Freelance: { ar: "عمل حر", en: "Freelance" },
      Internship: { ar: "تدريب", en: "Internship" },
    };
    const v = map[type];
    if (!v) return loc(type, type);
    return i18n.language === "ar" ? v.ar : v.en;
  };

  const openApply = (id: number) => {
    setAppliedJob(id);
    setDone(false);
    setError("");
    setCvFile(null);
    setForm({ applicantName: "", email: "", phone: "", message: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const apply = async () => {
    if (appliedJob == null) return;
    if (!form.applicantName.trim() || !form.email.trim()) {
      setError(t("careersPublic.requiredError"));
      return;
    }

    let cvUrl: string | undefined;
    if (cvFile) {
      setUploading(true);
      setError("");
      try {
        const fd = new FormData();
        fd.append("file", cvFile);
        const up = await api.post("/site/uploads/cv", fd, { headers: { "Content-Type": "multipart/form-data" } });
        cvUrl = up.data?.data?.url as string;
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        setError(err?.response?.data?.message || t("error.serverError"));
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    setSubmitting(true);
    setError("");
    try {
      await api.post(`/site/jobs/${appliedJob}/apply`, {
        applicantName: form.applicantName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
        cvUrl,
      });
      setDone(true);
      setAppliedJob(null);
      setForm({ applicantName: "", email: "", phone: "", message: "" });
      setCvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message || t("error.serverError"));
    } finally {
      setSubmitting(false);
    }
  };

  const currentJob = appliedJob != null ? jobs.find(j => j.id === appliedJob) : null;

  return (
    <SiteLayout>
      <Hero title={t("page.careers")} subtitle={t("careersPublic.intro")} />

      <div className="max-w-5xl mx-auto px-4 py-12">
        {loading ? (
          <LoadingState />
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-[var(--sub)]">{t("common.noData")}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {jobs.map((j) => (
              <div key={j.id} className="rounded-2xl border p-6 flex flex-col" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="text-[17px] font-bold" style={{ color: "var(--ink)" }}>{loc(j.titleAr, j.titleEn)}</h2>
                  <span className="px-3 py-1 rounded-full text-[11.5px] font-bold shrink-0" style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}>{jobTypeLabel(j.type)}</span>
                </div>
                {j.location && (
                  <p className="text-[12.5px] mb-2" style={{ color: "var(--sub)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block -mt-0.5 me-1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                    {j.location}
                  </p>
                )}
                {loc(j.descriptionAr, j.descriptionEn) && (
                  <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: "var(--ink)" }}>{loc(j.descriptionAr, j.descriptionEn)}</p>
                )}
                <button className="btn btn-primary mt-auto !text-[12.5px]" onClick={() => openApply(j.id)}>
                  {t("careersPublic.apply")}
                </button>
              </div>
            ))}
          </div>
        )}

        {appliedJob != null && !done && (
          <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-[17px] font-bold mb-1" style={{ color: "var(--blue-deep)" }}>{t("careersPublic.applyTitle")}</h3>
              {currentJob && (
                <p className="text-[12.5px] mb-4 text-[var(--sub)]">{loc(currentJob.titleAr, currentJob.titleEn)}</p>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careersPublic.name")}</label>
                  <div className="field-shell"><input type="text" value={form.applicantName} onChange={e => setForm({ ...form, applicantName: e.target.value })} /></div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careersPublic.email")}</label>
                  <div className="field-shell"><input type="email" dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careersPublic.phone")}</label>
                  <div className="field-shell"><input type="tel" dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careersPublic.message")}</label>
                  <div className="field-shell"><textarea rows={3} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careersPublic.cv")}</label>
                  <div className="field-shell">
                    <input
                      ref={fileInputRef}
                      type="file"
                      dir="ltr"
                      accept=".pdf,.doc,.docx"
                      className="!border-0 !bg-transparent !p-0 file:me-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-[12.5px] file:font-bold file:bg-[var(--blue-50)] file:text-[var(--blue)]"
                      onChange={e => setCvFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
                {error && <p className="text-[12.5px] font-bold text-red-600">{error}</p>}
              </div>
              <div className="flex gap-3 mt-6">
                <button disabled={submitting || uploading} className="btn btn-primary flex-1 disabled:opacity-60" onClick={apply}>
                  {uploading ? t("common.loading") : submitting ? t("common.loading") : t("common.save")}
                </button>
                <button className="btn btn-outline" onClick={() => setAppliedJob(null)}>{t("common.cancel")}</button>
              </div>
            </div>
          </div>
        )}

        {done && (
          <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-xl">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--green)", margin: "0 auto 12px" }}><path d="M20 6 9 17l-5-5" /></svg>
              <h3 className="text-[16px] font-bold mb-2" style={{ color: "var(--ink)" }}>{t("careersPublic.successTitle")}</h3>
              <p className="text-[13px] mb-5" style={{ color: "var(--sub)" }}>{t("careersPublic.successMsg")}</p>
              <button className="btn btn-primary w-full" onClick={() => setDone(false)}>{t("common.close")}</button>
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
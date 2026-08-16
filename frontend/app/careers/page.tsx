"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
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
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/site/jobs").then((res) => setJobs(res.data?.data || [])).catch(() => setJobs([])).finally(() => setLoading(false));
  }, []);

  const loc = (ar: string, en: string) => (i18n.language === "ar" ? (ar || en) : (en || ar));

  const apply = async () => {
    if (appliedJob == null) return;
    if (!form.applicantName.trim() || !form.email.trim()) {
      setError(t("jobs.requiredError"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post(`/site/jobs/${appliedJob}/apply`, {
        applicantName: form.applicantName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
      });
      setDone(true);
      setAppliedJob(null);
      setForm({ applicantName: "", email: "", phone: "", message: "" });
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message || t("error.serverError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white" style={{ paddingTop: 96 }}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: "var(--ink)" }}>{t("page.careers")}</h1>
        <p className="text-[15px] mb-8" style={{ color: "var(--sub)" }}>{t("careersPublic.intro")}</p>

        {loading ? (
          <div className="text-center py-16 text-[var(--sub)]">{t("common.loading")}</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-[var(--sub)]">{t("common.noData")}</div>
        ) : (
          <div className="space-y-4">
            {jobs.map((j) => (
              <div key={j.id} className="border rounded-2xl p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[17px] font-bold" style={{ color: "var(--ink)" }}>{loc(j.titleAr, j.titleEn)}</h2>
                    <p className="text-[12.5px] mt-1" style={{ color: "var(--sub)" }}>
                      {j.location} · {j.type}
                    </p>
                    {loc(j.descriptionAr, j.descriptionEn) && (
                      <p className="text-[13.5px] mt-3 leading-relaxed" style={{ color: "var(--ink)" }}>{loc(j.descriptionAr, j.descriptionEn)}</p>
                    )}
                  </div>
                  <button className="btn btn-primary shrink-0 !text-[12.5px]" onClick={() => { setAppliedJob(j.id); setDone(false); }}>
                    {t("careersPublic.apply")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {appliedJob != null && !done && (
          <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-[17px] font-bold mb-1" style={{ color: "var(--blue-deep)" }}>{t("careersPublic.applyTitle")}</h3>
              <p className="text-[12.5px] mb-4 text-[var(--sub)]">{jobs.find(j => j.id === appliedJob) ? loc(jobs.find(j => j.id === appliedJob)!.titleAr, jobs.find(j => j.id === appliedJob)!.titleEn) : ""}</p>
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
                {error && <p className="text-[12.5px] font-bold text-red-600">{error}</p>}
              </div>
              <div className="flex gap-3 mt-6">
                <button disabled={submitting} className="btn btn-primary flex-1 disabled:opacity-60" onClick={apply}>
                  {submitting ? t("common.loading") : t("common.save")}
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
    </main>
  );
}
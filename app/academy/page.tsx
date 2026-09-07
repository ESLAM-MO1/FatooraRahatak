"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { SiteLayout } from "@/app/site-layout";
import Hero from "@/components/Hero";
import LoadingState from "@/components/LoadingState";
import "@/lib/i18n/config";

interface Course {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  imageUrl?: string | null;
  category: string;
  duration: string;
  level: string;
  isActive: boolean;
  sortOrder: number;
  lessonsCount?: number;
}

interface Lesson {
  id: number;
  courseId: number;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  videoUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface CourseDetail extends Course {
  lessons: Lesson[];
}

const LEVEL_COLORS: Record<string, { fg: string; bg: string }> = {
  Beginner: { fg: "#0d9488", bg: "#f0fdfa" },
  Intermediate: { fg: "#2563eb", bg: "#eff6ff" },
  Advanced: { fg: "#7c3aed", bg: "#f5f3ff" },
  مبتدئ: { fg: "#0d9488", bg: "#f0fdfa" },
  متوسط: { fg: "#2563eb", bg: "#eff6ff" },
  متقدم: { fg: "#7c3aed", bg: "#f5f3ff" },
};

export default function AcademyPage() {
  const { t, i18n } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [intro, setIntro] = useState<{ titleAr: string; titleEn: string; descriptionAr: string; descriptionEn: string; imageUrl?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("all");
  const [selected, setSelected] = useState<CourseDetail | null>(null);
  const [enrollForm, setEnrollForm] = useState({ applicantName: "", email: "", phone: "", message: "" });
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);
  const [enrollDone, setEnrollDone] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  useEffect(() => {
    api.get("/site/courses").then((res) => setCourses(res.data?.data || [])).catch(() => setCourses([])).finally(() => setLoading(false));
    api.get("/site/academy-intro").then((res) => { const d = res.data?.data; if (d) setIntro(d); }).catch(() => {});
  }, []);

  const loc = (ar: string, en: string) => (i18n.language === "ar" ? (ar || en) : (en || ar));
  const catLabel = (key: string) => {
    const v = t(`academy.cat_${key}`);
    return v === `academy.cat_${key}` ? key : v;
  };

  const cats = Array.from(new Set(courses.map(c => c.category))).filter(Boolean);
  const filtered = activeCat === "all" ? courses : courses.filter(c => c.category === activeCat);

  const levelStyle = (level: string) => (LEVEL_COLORS[level] || { fg: "var(--blue)", bg: "var(--blue-50)" });

  const openDetails = async (id: number) => {
    setSelected(null);
    setEnrollForm({ applicantName: "", email: "", phone: "", message: "" });
    setEnrollDone(false);
    setEnrollError("");
    try {
      const res = await api.get(`/site/courses/${id}`);
      setSelected(res.data?.data || null);
    } catch {
      setSelected(null);
    }
  };

  const submitEnroll = async () => {
    if (!selected) return;
    if (!enrollForm.applicantName.trim() || !enrollForm.email.trim()) {
      setEnrollError(t("careersPublic.requiredError"));
      return;
    }
    setEnrollSubmitting(true);
    setEnrollError("");
    try {
      await api.post(`/site/courses/${selected.id}/enroll`, {
        applicantName: enrollForm.applicantName.trim(),
        email: enrollForm.email.trim(),
        phone: enrollForm.phone.trim(),
        message: enrollForm.message.trim(),
      });
      setEnrollDone(true);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setEnrollError(err?.response?.data?.message || t("error.serverError"));
    } finally {
      setEnrollSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <Hero title={t("page.academy")} subtitle={t("academyPublic.intro")} />

      {intro && (loc(intro.titleAr, intro.titleEn) || loc(intro.descriptionAr, intro.descriptionEn) || intro.imageUrl) && (
        <div className="max-w-5xl mx-auto px-4 pt-12">
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
            {intro.imageUrl && (
              <div className="w-full h-48 sm:h-64 bg-gray-100">
                <img src={intro.imageUrl} alt={loc(intro.titleAr, intro.titleEn)} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6 sm:p-8 text-center">
              {loc(intro.titleAr, intro.titleEn) && (
                <h2 className="text-[22px] sm:text-[26px] font-extrabold mb-3" style={{ color: "var(--blue-deep)" }}>{loc(intro.titleAr, intro.titleEn)}</h2>
              )}
              {loc(intro.descriptionAr, intro.descriptionEn) && (
                <p className="text-[14px] sm:text-[15px] leading-relaxed max-w-2xl mx-auto" style={{ color: "var(--sub)" }}>{loc(intro.descriptionAr, intro.descriptionEn)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-12">
        {loading ? (
          <LoadingState />
        ) : courses.length === 0 ? (
          <div className="text-center py-16 text-[var(--sub)]">{t("common.noData")}</div>
        ) : (
          <>
            {cats.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                <button className={`btn !py-2 !text-[12.5px] ${activeCat === "all" ? "btn-primary" : "btn-outline"}`} onClick={() => setActiveCat("all")}>{t("academyPublic.all")}</button>
                {cats.map(ca => (
                  <button key={ca} className={`btn !py-2 !text-[12.5px] ${activeCat === ca ? "btn-primary" : "btn-outline"}`} onClick={() => setActiveCat(ca)}>{catLabel(ca)}</button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filtered.map((c) => {
                const lvStyle = levelStyle(c.level);
                return (
                  <div key={c.id} className="rounded-2xl border p-6 flex flex-col" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
                    {(c as any).imageUrl && (
                      <div className="w-full h-36 rounded-xl overflow-hidden mb-4 bg-gray-100">
                        <img src={(c as any).imageUrl} alt={loc(c.titleAr, c.titleEn)} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 rounded-full text-[11.5px] font-bold" style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}>{catLabel(c.category)}</span>
                      {c.level && (
                        <span className="px-3 py-1 rounded-full text-[11.5px] font-bold" style={{ color: lvStyle.fg, backgroundColor: lvStyle.bg }}>{c.level}</span>
                      )}
                    </div>
                    <h2 className="text-[17px] font-bold mb-1" style={{ color: "var(--ink)" }}>{loc(c.titleAr, c.titleEn)}</h2>
                    <div className="flex items-center gap-4 mb-3 text-[12px]" style={{ color: "var(--sub)" }}>
                      {c.duration && (
                        <span>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block -mt-0.5 me-1"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                          {t("academyPublic.duration")}: {c.duration}
                        </span>
                      )}
                      {c.lessonsCount != null && <span>{c.lessonsCount} {t("academyPublic.lesson")}</span>}
                    </div>
                    {loc(c.descriptionAr, c.descriptionEn) && (
                      <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: "var(--ink)" }}>{loc(c.descriptionAr, c.descriptionEn)}</p>
                    )}
                    <button className="btn btn-primary mt-auto !text-[12.5px]" onClick={() => openDetails(c.id)}>
                      {t("academyPublic.details")}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {selected && (
          <div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="text-[17px] font-bold" style={{ color: "var(--blue-deep)" }}>{loc(selected.titleAr, selected.titleEn)}</h3>
                <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => setSelected(null)}>{t("common.close")}</button>
              </div>
              <p className="text-[12.5px] mb-4 text-[var(--sub)]">
                {catLabel(selected.category)} · {selected.level} {selected.duration && <>· {t("academyPublic.duration")}: {selected.duration}</>} · {selected.lessons.length} {t("academyPublic.lesson")}
              </p>
              {loc(selected.descriptionAr, selected.descriptionEn) && (
                <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: "var(--ink)" }}>{loc(selected.descriptionAr, selected.descriptionEn)}</p>
              )}

              <p className="text-[13px] font-bold mb-2" style={{ color: "var(--ink)" }}>{t("academyPublic.lessons")}</p>
              {selected.lessons.length === 0 ? (
                <p className="text-[12.5px] text-[var(--sub)] mb-5">{t("academyPublic.noLessons")}</p>
              ) : (
                <div className="space-y-2 mb-5">
                  {[...selected.lessons].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id).map((l, idx) => (
                    <div key={l.id} className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
                      <p className="text-[13px] font-bold" style={{ color: "var(--ink)" }}>{idx + 1}. {loc(l.titleAr, l.titleEn)}</p>
                      {loc(l.descriptionAr || "", l.descriptionEn || "") && (
                        <p className="text-[12px] mt-1 text-[var(--sub)]">{loc(l.descriptionAr || "", l.descriptionEn || "")}</p>
                      )}
                      {l.videoUrl && (
                        <a href={l.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[12px] font-bold no-underline" style={{ color: "var(--blue)" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                          <span dir="ltr">{l.videoUrl}</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-[var(--border)]">
                <p className="text-[13px] font-bold mb-3" style={{ color: "var(--ink)" }}>{t("academyPublic.enroll")}</p>
                {enrollDone ? (
                  <div className="text-center py-6">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--green)", margin: "0 auto 10px" }}><path d="M20 6 9 17l-5-5" /></svg>
                    <p className="text-[13.5px] font-bold" style={{ color: "var(--ink)" }}>{t("academyPublic.enrollSuccess")}</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careersPublic.name")}</label>
                        <div className="field-shell"><input type="text" value={enrollForm.applicantName} onChange={e => setEnrollForm({ ...enrollForm, applicantName: e.target.value })} /></div>
                      </div>
                      <div>
                        <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careersPublic.email")}</label>
                        <div className="field-shell"><input type="email" dir="ltr" value={enrollForm.email} onChange={e => setEnrollForm({ ...enrollForm, email: e.target.value })} /></div>
                      </div>
                      <div>
                        <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careersPublic.phone")}</label>
                        <div className="field-shell"><input type="tel" dir="ltr" value={enrollForm.phone} onChange={e => setEnrollForm({ ...enrollForm, phone: e.target.value })} /></div>
                      </div>
                      <div>
                        <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("careersPublic.message")}</label>
                        <div className="field-shell"><input type="text" value={enrollForm.message} onChange={e => setEnrollForm({ ...enrollForm, message: e.target.value })} /></div>
                      </div>
                    </div>
                    {enrollError && <p className="text-[12.5px] font-bold text-red-600 mt-2">{enrollError}</p>}
                    <button disabled={enrollSubmitting} className="btn btn-primary w-full mt-4 disabled:opacity-60" onClick={submitEnroll}>
                      {enrollSubmitting ? t("common.loading") : t("academyPublic.enroll")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
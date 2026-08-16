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
  category: string;
  duration: string;
  level: string;
  isActive: boolean;
  sortOrder: number;
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
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("all");

  useEffect(() => {
    api.get("/site/courses").then((res) => setCourses(res.data?.data || [])).catch(() => setCourses([])).finally(() => setLoading(false));
  }, []);

  const loc = (ar: string, en: string) => (i18n.language === "ar" ? (ar || en) : (en || ar));
  const catLabel = (key: string) => {
    const v = t(`academy.cat_${key}`);
    return v === `academy.cat_${key}` ? key : v;
  };

  const cats = Array.from(new Set(courses.map(c => c.category))).filter(Boolean);
  const filtered = activeCat === "all" ? courses : courses.filter(c => c.category === activeCat);

  const levelStyle = (level: string) => LEVEL_COLORS[level] || LEVEL_COLORS[level.startsWith("B") || level.startsWith("م") ? "Beginner" : "Intermediate"] || { fg: "var(--blue)", bg: "var(--blue-50)" };

  return (
    <SiteLayout>
      <Hero title={t("page.academy")} subtitle={t("academyPublic.intro")} />

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
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 rounded-full text-[11.5px] font-bold" style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}>{catLabel(c.category)}</span>
                      {c.level && (
                        <span className="px-3 py-1 rounded-full text-[11.5px] font-bold" style={{ color: lvStyle.fg, backgroundColor: lvStyle.bg }}>{c.level}</span>
                      )}
                    </div>
                    <h2 className="text-[17px] font-bold mb-1" style={{ color: "var(--ink)" }}>{loc(c.titleAr, c.titleEn)}</h2>
                    {c.duration && (
                      <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block -mt-0.5 me-1"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        {t("academyPublic.duration")}: {c.duration}
                      </p>
                    )}
                    {loc(c.descriptionAr, c.descriptionEn) && (
                      <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--ink)" }}>{loc(c.descriptionAr, c.descriptionEn)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/app/site-layout";
import LoadingState from "@/components/LoadingState";
import "@/lib/i18n/config";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

interface SitePageDto {
  id: number;
  pageKey: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
}

interface Props {
  pageKey: string;
  heroTitle?: string;
  heroSubtitle?: string;
}

export default function CmsPage({ pageKey, heroTitle, heroSubtitle }: Props) {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState<SitePageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAr = i18n.language === "ar";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/site/pages/${pageKey}`);
        const json = await res.json();
        setPage(json.data);
      } catch {
        setError(t("error.serverError"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pageKey, t]);

  const title = isAr ? page?.titleAr : page?.titleEn;
  const content = isAr ? page?.contentAr : page?.contentEn;

  if (loading)
    return (
      <SiteLayout>
        <LoadingState />
      </SiteLayout>
    );

  if (error) {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="alert alert--danger">{error}</div>
        </div>
      </SiteLayout>
    );
  }

  const hasHero = !!heroTitle;

  return (
    <SiteLayout>
      {hasHero && (
        <section
          className="py-16 text-center text-white"
          style={{ backgroundColor: "var(--blue-deep)" }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{heroTitle}</h1>
          {heroSubtitle && (
            <p className="text-[15px] opacity-80">{heroSubtitle}</p>
          )}
        </section>
      )}
      <div className={hasHero ? "max-w-4xl mx-auto px-4 py-12" : "max-w-3xl mx-auto px-4 py-16"}>
        <div
          className={
            hasHero
              ? "bg-white border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow)] p-8 md:p-12"
              : ""
          }
        >
          {title && (
            <h2
              className={
                hasHero
                  ? "text-xl font-bold text-[var(--ink)] mb-6"
                  : "text-3xl font-extrabold mb-6"
              }
              style={!hasHero ? { color: "var(--blue-deep)" } : undefined}
            >
              {title}
            </h2>
          )}
          <div
            className="leading-relaxed"
            style={{
              lineHeight: 1.8,
              color: "var(--ink-light)",
              ...(isAr ? { direction: "rtl", textAlign: "right" as const } : {}),
            }}
            dangerouslySetInnerHTML={{ __html: content || "" }}
          />
        </div>
      </div>
    </SiteLayout>
  );
}

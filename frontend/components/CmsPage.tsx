"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/app/site-layout";
import Hero from "@/components/Hero";
import LoadingState from "@/components/LoadingState";
import "@/lib/i18n/config";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

function scopeCss(css: string, wrap = ".cms-article"): string {
  const results: string[] = [];
  let i = 0;
  const n = css.length;
  while (i < n) {
    while (i < n && /\s/.test(css[i])) i++;
    if (i >= n) break;
    const open = css.indexOf("{", i);
    if (open === -1) { results.push(css.slice(i)); break; }
    let depth = 0;
    let j = open;
    let inString: string | null = null;
    let inComment = false;
    for (; j < n; j++) {
      const ch = css[j];
      if (inComment) { if (ch === "/" && css[j - 1] === "*") inComment = false; continue; }
      if (inString) { if (ch === "\\") { j++; continue; } if (ch === inString) inString = null; continue; }
      if (ch === '"' || ch === "'") { inString = ch; continue; }
      if (ch === "/" && css[j + 1] === "*") { inComment = true; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) { j++; break; } }
    }
    const pre = css.slice(i, open);
    const body = css.slice(open + 1, j - 1);
    const sel = pre.trim();
    if (sel.startsWith("@")) {
      results.push(body.includes("{") ? `${sel}{${scopeCss(body, wrap)}}` : `${sel}{${body}}`);
    } else {
      const scoped = sel
        .split(",")
        .map((s) => {
          const t = s.trim();
          return t ? `${wrap} ${t}` : t;
        })
        .join(", ");
      results.push(`${scoped}{${body}}`);
    }
    i = j;
  }
  return results.join("");
}

function scopeCmsStyles(html: string): string {
  return html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_m, css: string) => `<style>${scopeCss(css)}</style>`);
}

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
        <Hero title={heroTitle} subtitle={heroSubtitle} />
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
            className="leading-relaxed cms-article"
            style={{
              lineHeight: 1.8,
              color: "var(--ink-light)",
              ...(isAr ? { direction: "rtl", textAlign: "right" as const } : {}),
            }}
            dangerouslySetInnerHTML={{ __html: scopeCmsStyles(content || "") }}
          />
        </div>
      </div>
    </SiteLayout>
  );
}

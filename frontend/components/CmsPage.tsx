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
  imageAr?: string | null;
  imageEn?: string | null;
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
  const image = isAr ? page?.imageAr : page?.imageEn;

  useEffect(() => {
    if (!content) return;
    const article = document.querySelector(".cms-article");
    if (!article) return;
    const iconFor = (href: string): string => {
      const h = href.toLowerCase();
      if (h.startsWith("tel:")) return "M5 4a2 2 0 0 1 2-2h1.5a1 1 0 0 1 .94.66l1.19 3.57a1 1 0 0 1-.3 1.13L8.5 9.5a16 16 0 0 0 6 6l1.14-1.83a1 1 0 0 1 1.13-.3l3.57 1.19a1 1 0 0 1 .66.94V19a2 2 0 0 1-2 2A17 17 0 0 1 5 4Z";
      if (h.startsWith("mailto:")) return "M3 6.5C3 5.67 3.67 5 4.5 5h15c.83 0 1.5.67 1.5 1.5v11c0 .83-.67 1.5-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11ZM4 6.5 12 13l8-6.5";
      if (h.includes("wa.me")) return "M17.5 14.3c-.6.3-1.7 1.5-2.9 1.5s-2.5-.9-4.4-2.8C8.3 11 7.5 9.7 7.5 8.5s1.2-2.3 1.5-2.9c.1-.3.2-.7.1-1-.1-.4-.5-.8-.7-1-.3-.3-.6-.5-.9-.5h-.9c-.4 0-.8.1-1.1.4-.4.3-.9.9-1.2 1.5-.4.6-.7 1.5-.7 2.4 0 1.5.6 3 1.8 4.6 1.2 1.6 2.8 3.1 4.8 4.1 1.5.7 2.7 1 3.7 1.2.5.1 1 .1 1.5.1.5 0 1.1-.1 1.6-.4.5-.3 1-.7 1.3-1.2.3-.5.5-1 .5-1.6v-1c0-.3-.2-.6-.5-.7-.3-.1-.8-.3-1.4-.6Z";
      if (h.includes("t.me")) return "M20.7 4.2 3.7 10.9c-.8.3-1 1.4-.3 1.8l4 2.3.3 4.4c0 .6.8.9 1.4.5l2.5-1.9 3.9 2.8c.5.4 1.3.1 1.5-.6l3.6-14.6c.2-.8-.5-1.5-1.3-1.2zM8.4 14.6l9.6-6.6c.2-.1.4.1.2.3l-7.9 7.6c-.3.3-.5.7-.6 1.1l-.3 2.1c0 .3-.5.3-.5-.1l-.5-3.2c0-.4 0-.8 0-.8s0 0 .4-.4z";
      if (h.includes("instagram.com") || h.includes("instagr.am")) return "M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm5-9.5h.01";
      if (h.includes("snapchat.com")) return "M12 3c3.2 0 5.3 2.1 5.3 4.9 0 1.9-.3 3.1-.8 4.5-.1.3.1.5.4.5.4 0 1-.1 1.6-.3.2-.1.4.1.3.3-.2.9-2.1 2-3.6 2.3-.2 0-.3.3-.2.5.1.3.6.8 1.6.8.8-.1 1.3.2 1.3.6 0 .9-1.8 1.3-3.1 1.3-1.3 0-2-.4-2.9-.8-.7-.4-1.4-.3-2.2 0-.8.4-1.6.8-2.9.8-1.3 0-3.1-.4-3.1-1.3 0-.4.5-.7 1.3-.6 1 0 1.5-.5 1.6-.8 0-.2-.1-.5-.2-.5-1.5-.3-3.4-1.4-3.6-2.3 0-.2.1-.4.3-.3.6.2 1.2.3 1.6.3.3 0 .5-.2.4-.5-.5-1.4-.8-2.6-.8-4.5C6.7 5.1 8.8 3 12 3Z";
      if (h.includes("tiktok.com")) return "M13.5 3h3c.1 0 .2.1.2.3.1 1.6 1.1 2.9 2.6 3.2.2 0 .4.2.3.4v2.7c0 .3-.2.5-.5.5-1.2 0-2.3-.4-3.1-1.1v5.5c0 2.6-2 4.5-4.2 4.5A4.1 4.1 0 0 1 7.5 15c0-2.4 2-4.3 4.6-4.1.3 0 .6.1.9.3V13.5a2 2 0 0 0-1-.3 2.1 2.1 0 0 0 0 4.2c1.1 0 1.5-.8 1.5-2V3Z";
      if (h.includes("facebook.com")) return "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2Z";
      if (h.includes("linkedin.com")) return "M6.5 8H4v12h2.5V8zM6.5 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM20 13.4c0-3-1.6-4.6-3.8-4.6-1.3 0-2 .5-2.5 1.2V8.9H11V20h2.6v-6.1c0-1.2.6-2.1 1.8-2.1s1.6.9 1.6 2.1V20H20v-6.6Z";
      if (h.includes("x.com") || h.includes("twitter.com")) return "M12 6.4A5.2 5.2 0 0 1 17.6 1h4.9l-8 9.1 8.4 13h-5.4l-5-7.4L8 23H2.8l8.4-9.6L2.4 1h5.6l4 5.4Z";
      if (h.includes("youtube.com")) return "M22 12s0-3.3-.4-4.8a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.7 2 12 2 12s0 3.3.4 4.8a2.5 2.5 0 0 0 1.8 1.8c1.5.4 7.8.4 7.8.4s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.5.4-4.8.4-4.8ZM10 15V9l5 3Z";
      return "";
    };
    article.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
      if (a.querySelector("svg")) return;
      const d = iconFor(a.getAttribute("href") || "");
      if (!d) return;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("width", "15");
      svg.setAttribute("height", "15");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "1.8");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.setAttribute("style", "flex-shrink:0;vertical-align:middle;margin-inline-end:4px");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
      a.prepend(svg);
      a.style.display = "inline-flex";
      a.style.alignItems = "center";
    });
  }, [content]);

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
          {image ? (
            /* ✅ صورة الصفحة (حسب اللغة المختارة) — يعرضها الأدمن من لوحة التحكم */
            <div className="cms-image">
              <img
                src={image}
                alt={title || ""}
                className="w-full h-auto rounded-lg border border-[var(--border)] shadow-[var(--shadow)]"
                loading="lazy"
              />
            </div>
          ) : (
            /* النص الأصلي — يظهر فقط لو مفيش صورة مضافة */
            <div
              className="leading-relaxed cms-article"
              style={{
                lineHeight: 1.8,
                color: "var(--ink-light)",
                ...(isAr ? { direction: "rtl", textAlign: "right" as const } : {}),
              }}
              dangerouslySetInnerHTML={{ __html: scopeCmsStyles(content || "") }}
            />
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

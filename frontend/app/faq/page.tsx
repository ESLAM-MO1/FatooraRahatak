"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "../site-layout";
import Hero from "@/components/Hero";
import LoadingState from "@/components/LoadingState";
import "@/lib/i18n/config";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

interface FaqItem {
  id: number;
  questionAr: string;
  answerAr: string;
  displayOrder: number;
}

export default function FaqPage() {
  const { t } = useTranslation();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/site/faq`);
        const json = await res.json();
        const data = json.data || [];
        setFaqs(data.sort((a: FaqItem, b: FaqItem) => a.displayOrder - b.displayOrder));
        if (data.length > 0) setOpenId(data[0].id);
      } catch {
        setError(t("error.serverError"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggle = (id: number) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const filtered = faqs.filter(
    (faq) =>
      faq.questionAr.includes(search) ||
      faq.answerAr.includes(search)
  );

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

  return (
    <SiteLayout>
      <div>
        <Hero title={t("page.faq")} subtitle={t("common.help")} />
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="relative mb-8">
            <svg
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--sub)]"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="w-full pr-12 pl-4 py-3 rounded-xl border border-[var(--border)] text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--blue)]/20 focus:border-[var(--blue)] transition-all"
              style={{ color: "var(--ink)" }}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-[var(--sub)] py-12">{t("common.noData")}</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((faq) => (
                <div
                  key={faq.id}
                  className="border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden shadow-[var(--shadow-sm)]"
                >
                  <button
                    onClick={() => toggle(faq.id)}
                    className="w-full flex items-center justify-between px-6 py-4 text-right bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-bold text-[var(--ink)] text-[15px]">
                      {faq.questionAr}
                    </span>
                    <svg
                      className={`w-5 h-5 text-[var(--sub)] shrink-0 mr-4 transition-transform ${
                        openId === faq.id ? "rotate-180" : ""
                      }`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openId === faq.id && (
                    <div className="px-6 pb-4 text-[14px] text-[var(--ink-light)] leading-relaxed border-t border-[var(--border-light)] pt-4 bg-[var(--bg)]">
                      {faq.answerAr}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

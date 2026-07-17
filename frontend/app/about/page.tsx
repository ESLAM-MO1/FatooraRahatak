"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "../site-layout";
import LoadingState from "@/components/LoadingState";
import "@/lib/i18n/config";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

interface PageData {
  title: string;
  content: string;
}

export default function AboutPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/site/pages/about`);
        const json = await res.json();
        setData(json.data);
      } catch {
        setError(t("error.serverError"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
        <section
          className="py-16 text-center text-white"
          style={{ backgroundColor: "var(--blue-deep)" }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{t("page.about")}</h1>
          <p className="text-[15px] opacity-80">{t("brand.name")}</p>
        </section>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div
            className="bg-white border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow)] p-8 md:p-12"
          >
            {data?.title && (
              <h2 className="text-xl font-bold text-[var(--ink)] mb-6">{data.title}</h2>
            )}
            <div
              className="leading-relaxed"
              style={{ lineHeight: 1.8, color: "var(--ink-light)" }}
              dangerouslySetInnerHTML={{ __html: data?.content || "" }}
            />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

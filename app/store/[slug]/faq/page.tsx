"use client";
import { useEffect, useState } from "react";
import { useParams, redirect } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useStore } from "@/components/StoreContext";
import { useStorePageContent } from "@/lib/storePages";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

interface FaqItem {
  id: number;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  displayOrder: number;
}

export default function FaqPage() {
  const params = useParams();
  const slug = params.slug as string;
  const store = useStore();
  const { i18n, t } = useTranslation();
  const { isEnabled } = useStorePageContent("faq");

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/public/stores/${slug}/faq`)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => setFaqs(json.data || []))
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
  }, [slug]);

  if (!isEnabled) redirect(`/store/${slug}`);

  return (
    <div className="max-w-3xl mx-auto px-0">
      <nav className="mb-6" aria-label="breadcrumb">
        
          href={`/store/${slug}`}
          className="text-[13px] font-bold hover:underline"
          style={{ color: "var(--blue, #2563eb)" }}
        >
          {t("storePages.backToStore")}
        </a>
      </nav>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl sm:text-[28px] font-extrabold mb-5 leading-snug" style={{ color: "#111827" }}>
          {t("page.faq")}
        </h1>

        {loading ? (
          <p className="text-center py-8" style={{ color: "#9CA3AF" }}>
            {t("common.loading")}
          </p>
        ) : faqs.length === 0 ? (
          <p className="text-center py-8" style={{ color: "#9CA3AF" }}>
            {t("storePages.notAvailable")}
          </p>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => {
              const question = i18n.language === "ar" ? faq.questionAr : faq.questionEn;
              const answer = i18n.language === "ar" ? faq.answerAr : faq.answerEn;
              const open = openId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="border rounded-xl overflow-hidden"
                  style={{ borderColor: "#E5E7EB" }}
                >
                  <button
                    onClick={() => setOpenId(open ? null : faq.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-start"
                  >
                    <span className="text-[14px] sm:text-[15px] font-bold" style={{ color: "#111827" }}>
                      {question}
                    </span>
                    <svg
                      className="w-5 h-5 shrink-0 transition-transform"
                      style={{ transform: open ? "rotate(180deg)" : "none", color: "#6B7280" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {open && (
                    <div
                      className="px-4 pb-4 text-[13px] sm:text-[14px] leading-relaxed"
                      style={{ color: "#374151", lineHeight: 1.9 }}
                    >
                      {answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {store?.storeName && (
          <div className="mt-8 pt-5 border-t border-gray-100 text-[12px]" style={{ color: "#9CA3AF" }}>
            © {new Date().getFullYear()} {store.storeName}
          </div>
        )}
      </div>
    </div>
  );
}

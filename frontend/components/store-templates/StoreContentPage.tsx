"use client";
import { useTranslation } from "react-i18next";

interface StoreContentPageProps {
  slug: string;
  title: string;
  content: string;
  storeName?: string;
}

// صفحة محتوى عامة تستخدمها صفحات (من نحن / المدونة / الأسئلة الشائعة / السياسات)
// تُعرض داخل قالب المتجر عبر {children} ببطاقة أنيقة تناسب كل الثيمات.
export default function StoreContentPage({ slug, title, content, storeName }: StoreContentPageProps) {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto px-0">
      <nav className="mb-6" aria-label="breadcrumb">
        <a
          href={`/store/${slug}`}
          className="text-[13px] font-bold hover:underline"
          style={{ color: "var(--blue, #2563eb)" }}
        >
          {t("storePages.backToStore")}
        </a>
      </nav>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl sm:text-[28px] font-extrabold mb-5 leading-snug" style={{ color: "#111827" }}>
          {title}
        </h1>
        <div
          className="whitespace-pre-wrap leading-relaxed text-[15px]"
          style={{ color: "#374151", lineHeight: 1.9 }}
        >
          {content || t("storePages.notAvailable")}
        </div>
        {storeName && (
          <div className="mt-8 pt-5 border-t border-gray-100 text-[12px]" style={{ color: "#9CA3AF" }}>
            © {new Date().getFullYear()} {storeName}
          </div>
        )}
      </div>
    </div>
  );
}
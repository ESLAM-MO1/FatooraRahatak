"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";

export const PRODUCT_IMPORT_KEY = "productUrlImport";

export type ImportedProductData = {
  name?: string | null;
  description?: string | null;
  basePrice?: number | null;
  discountPrice?: number | null;
  currency?: string | null;
  sku?: string | null;
  category?: string | null;
  images: string[];
  sourceDomain?: string;
};

export default function ProductUrlImport() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const en = !!i18n.language?.startsWith("en");
  const s = en
    ? {
        btn: "Import from link",
        title: "Import a product from a link",
        hint: "Paste a link to a product page on any website and we'll fetch its name, description, price and images.",
        rights: "Make sure you have the right to use the product's content and images.",
        placeholder: "https://store.example.com/product/123",
        run: "Import",
        cancel: "Cancel",
        loading: "Fetching product data…",
        emptyUrl: "Paste a product link first.",
        empty: "No clear product data was found on that page.",
        fail: "Could not import from this link.",
      }
    : {
        btn: "استيراد من رابط",
        title: "استيراد منتج من رابط",
        hint: "الصق رابط صفحة منتج على أي موقع وهنجيب الاسم والوصف والسعر والصور تلقائيًا.",
        rights: "تأكد أن لديك حق استخدام محتوى وصور المنتج قبل الاستيراد.",
        placeholder: "https://store.example.com/product/123",
        run: "استيراد",
        cancel: "إلغاء",
        loading: "جاري جلب بيانات المنتج…",
        emptyUrl: "الصق رابط المنتج أولًا.",
        empty: "مفيش بيانات منتج واضحة في الصفحة دي.",
        fail: "تعذر الاستيراد من الرابط ده.",
      };

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setMounted(true), []);

  const run = async () => {
    const u = url.trim();
    if (!u) {
      setError(s.emptyUrl);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/products/import-url", { url: u });
      const data: ImportedProductData | undefined = res.data?.data;
      const images = data?.images || [];
      if (!data || (!data.name && data.basePrice == null && images.length === 0)) {
        setError(s.empty);
        setLoading(false);
        return;
      }
      sessionStorage.setItem(PRODUCT_IMPORT_KEY, JSON.stringify(data));
      router.push("/dashboard/products/new");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || s.fail);
      setLoading(false);
    }
  };

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        🔗 {s.btn}
      </button>
      {mounted &&
        open &&
        createPortal(
          <div className="modal-overlay" onClick={() => !loading && setOpen(false)}>
            <div className="card p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[17px] font-bold text-[var(--blue-deep)]">{s.title}</h2>
                <button type="button" onClick={() => !loading && setOpen(false)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={s.cancel}>
                  ✕
                </button>
              </div>
              <p className="text-[13px] text-[var(--sub)] mb-4">{s.hint}</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!loading) run();
                }}
              >
                <input
                  type="url"
                  dir="ltr"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] focus:outline-none focus:border-[var(--blue)]"
                  placeholder={s.placeholder}
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError("");
                  }}
                  autoFocus
                  disabled={loading}
                />
                <p className="text-[12px] text-[var(--sub)] mt-2">{s.rights}</p>

                {error && <div className="alert alert--danger mt-3">{error}</div>}

                {loading && (
                  <div className="mt-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 p-3 text-[13px] font-bold">
                    {s.loading}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-5">
                  <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={loading}>
                    {s.loading && loading ? "…" : s.run}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)} disabled={loading}>
                    {s.cancel}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

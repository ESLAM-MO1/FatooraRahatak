"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const SLUG_REGEX = /^[a-z0-9-]+$/;

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="18" height="18">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const alertPath = "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";

export default function CreateStorePage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateSlug = (slug: string) => {
    if (!slug) {
      setSlugError("الرابط الفرعي مطلوب");
      return false;
    }
    if (!SLUG_REGEX.test(slug)) {
      setSlugError(
        "الرابط الفرعي يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط (مثال: my-store-123)"
      );
      return false;
    }
    setSlugError("");
    return true;
  };

  const handleSlugChange = (value: string) => {
    setStoreSlug(value);
    if (value) validateSlug(value);
    else setSlugError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateSlug(storeSlug)) return;

    setLoading(true);
    try {
      await api.post("/stores", {
        storeName,
        storeSlug,
        defaultLanguage: "ar",
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء إنشاء المتجر");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl">
      <h1 className="text-[22px] font-bold text-[var(--blue-deep)] mb-6">إنشاء متجر جديد</h1>

      <div className="card p-6 max-w-lg">
        {error && (
          <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
            <Icon path={alertPath} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
              اسم المتجر
            </label>
            <div className="field-shell">
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                placeholder="مثال: متجر الأناقة"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
              الرابط الفرعي (Slug)
            </label>
            <div className="field-shell">
              <input
                type="text"
                value={storeSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                dir="ltr"
                placeholder="my-store"
              />
            </div>
            {slugError ? (
              <p className="text-[var(--danger)] text-[11.5px] mt-1.5">{slugError}</p>
            ) : (
              <p className="text-[var(--sub)] text-[11.5px] mt-1.5">
                أحرف إنجليزية صغيرة وأرقام وشرطات فقط
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading ? "جاري الإنشاء..." : "إنشاء المتجر"}
          </button>
        </form>
      </div>
    </div>
  );
}
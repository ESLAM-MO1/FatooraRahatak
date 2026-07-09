"use client";

import { useEffect, useState, FormEvent } from "react";
import api from "@/lib/api";

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="20" height="20">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const alertPath =
  "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";
const checkPath = "M20 6 9 17l-5-5";
const clockPath = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2";
const globePath =
  "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.5-2.5 3.5-5.5 3.5-9S14.5 5.5 12 3m0 18c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3M3.5 9h17M3.5 15h17";
const linkPath = "M9 17H7a5 5 0 1 1 0-10h2m6 0h2a5 5 0 1 1 0 10h-2M8 12h8";
const copyPath = "M9 9h10v10H9V9Zm-4-4h10v4H9V5H5v10h4";

type DomainStatus = "None" | "Pending" | "Active";

interface StoreData {
  id: number;
  storeName: string;
  storeSlug: string;
  status: string;
  packageName: string;
  createdAt: string;
  customDomain: string | null;
  customDomainStatus: DomainStatus;
  isOnline: boolean;
}

const statusConfig: Record<DomainStatus, { label: string; className: string }> = {
  None: { label: "لا يوجد", className: "bg-gray-100 text-gray-600" },
  Pending: { label: "قيد المراجعة", className: "bg-amber-50 text-amber-700" },
  Active: { label: "مفعّل", className: "bg-emerald-50 text-emerald-700" },
};

const STORE_BASE_URL =
  process.env.NEXT_PUBLIC_STORE_BASE_URL || "http://localhost:3000";

export default function StoreSettingsPage() {
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [domainInput, setDomainInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStore = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/stores/my-store");
      setStore(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل بيانات المتجر");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStore();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!domainInput.trim()) {
      setError("يجب إدخال الدومين");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put("/stores/custom-domain", { domain: domainInput.trim() });
      setSuccess("تم حفظ الدومين بنجاح، بانتظار المراجعة والتفعيل");
      setDomainInput("");
      setStore((prev) =>
        prev
          ? {
              ...prev,
              customDomain: res.data.data.customDomain,
              customDomainStatus: res.data.data.customDomainStatus,
            }
          : prev
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء حفظ الدومين");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOnline = async () => {
    if (!store) return;
    const confirmMsg = store.isOnline
      ? "هل أنت متأكد من تعطيل المتجر؟ لن يتمكن عملاؤك من الوصول إليه حتى تفعّله مجددًا."
      : "هل تريد تفعيل المتجر مجددًا؟";
    if (!window.confirm(confirmMsg)) return;

    setToggling(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.put("/stores/toggle-online");
      setStore((prev) => (prev ? { ...prev, isOnline: res.data.data.isOnline } : prev));
      setSuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تحديث حالة المتجر");
    } finally {
      setToggling(false);
    }
  };

  const storeUrl = store
    ? store.customDomainStatus === "Active" && store.customDomain
      ? `https://${store.customDomain}`
      : `${STORE_BASE_URL}/store/${store.storeSlug}`
    : "";

  const handleCopy = async () => {
    if (!storeUrl) return;
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("تعذّر نسخ الرابط");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--sub)]">
          <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
          جارٍ التحميل...
        </div>
      </div>
    );
  }

  const currentStatus = store?.customDomainStatus || "None";
  const statusInfo = statusConfig[currentStatus] || statusConfig.None;

  return (
    <div dir="rtl">
      <h1 className="text-[24px] font-bold text-[var(--blue-deep)] mb-7">إعدادات المتجر</h1>

      {error && (
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-5 text-sm flex items-start gap-2 max-w-2xl">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 rounded-xl p-4 mb-5 text-sm flex items-start gap-2 max-w-2xl">
          <Icon path={checkPath} className="shrink-0 mt-0.5" />
          {success}
        </div>
      )}

      {/* بوكس رابط المتجر + تفعيل/تعطيل */}
      <div className="card p-8 max-w-2xl mb-7 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[var(--blue-50)] flex items-center justify-center shrink-0">
            <Icon path={linkPath} className="text-[var(--blue)]" />
          </div>
          <h2 className="text-[18px] font-bold text-[var(--ink)]">رابط المتجر</h2>
        </div>

        <div className="flex items-center gap-2.5 bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
          <p className="flex-1 text-[14px] text-[var(--ink)] truncate font-medium" dir="ltr">
            {storeUrl}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 text-[12.5px] font-bold text-[var(--blue)] hover:bg-white rounded-lg transition-colors flex items-center gap-1.5 px-3 py-2"
          >
            <Icon path={copyPath} className="w-4 h-4" />
            {copied ? "تم النسخ" : "نسخ"}
          </button>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-[12.5px] font-bold text-white bg-[var(--blue)] hover:bg-[var(--blue-deep)] rounded-lg transition-colors px-4 py-2"
          >
            زيارة
          </a>
        </div>

        <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div>
            <p className="text-[14px] font-bold text-[var(--ink)]">المتجر متاح أونلاين</p>
            <p className="text-[12.5px] text-[var(--sub)] mt-1">
              {store?.isOnline
                ? "متجرك ظاهر ومتاح لعملائك الآن"
                : "متجرك مخفي حاليًا عن العملاء"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleOnline}
            disabled={toggling}
            className={`relative w-14 h-7.5 rounded-full transition-colors disabled:opacity-60 shrink-0 ${
              store?.isOnline ? "bg-emerald-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 w-6.5 h-6.5 bg-white rounded-full shadow transition-transform ${
                store?.isOnline ? "translate-x-[-30px]" : "translate-x-[-2px]"
              }`}
              style={{ right: 0 }}
            />
          </button>
        </div>
      </div>

      {/* قسم الدومين الخاص */}
      <div className="card p-8 max-w-2xl shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[var(--blue-50)] flex items-center justify-center shrink-0">
            <Icon path={globePath} className="text-[var(--blue)]" />
          </div>
          <h2 className="text-[18px] font-bold text-[var(--ink)]">الدومين الخاص</h2>
        </div>

        <div className="mb-6 flex items-center justify-between bg-gray-50 rounded-2xl p-5 border border-gray-100">
          <div>
            <p className="text-[12.5px] text-[var(--sub)] mb-1.5">الحالة الحالية</p>
            <p className="text-[15px] font-bold text-[var(--ink)]" dir="ltr">
              {store?.customDomain || "—"}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-[13px] font-bold ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>

        {currentStatus === "Pending" && (
          <div className="bg-amber-50 text-amber-700 rounded-2xl p-4 mb-6 text-[13px] flex items-start gap-2.5">
            <Icon path={clockPath} className="shrink-0 mt-0.5 w-4 h-4" />
            سيتم تفعيل الدومين خلال فترة من قِبَل فريق الدعم
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-[var(--ink)] mb-2">
              دومين جديد
            </label>
            <div className="field-shell">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                dir="ltr"
                placeholder="example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ وطلب الربط"}
          </button>
        </form>
      </div>
    </div>
  );
}
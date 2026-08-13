"use client";
import { useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import PhoneInputField from "@/components/PhoneInputField";

export default function TrackOrderPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [orderNumber, setOrderNumber] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = orderNumber.trim();
    if (!trimmed || !phoneInput.trim()) {
      setError(t("order.trackFillAll"));
      return;
    }
    sessionStorage.setItem(`order_phone_${trimmed}`, phoneInput.trim());
    router.push(`/store/${slug}/orders/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-[var(--theme)] bg-[var(--theme)]/10 mb-4">
          <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
            <path d="M16.5 3.5 21 8M16.5 3.5 12 8M16.5 3.5V12M21 8l-3.5 3.5M21 8l-4.5 4.5M3.5 21V9l5 5M8.5 14l5-5M3.5 21l5-5M8.5 14v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800">{t("order.trackTitle")}</h1>
        <p className="text-sm text-gray-500 mt-2">{t("order.trackSubtitle")}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("order.orderNumberLabel")}
          </label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            required
            placeholder={t("order.orderNumberPlaceholder")}
            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--theme)] outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("order.phoneUsedLabel")}
          </label>
          <PhoneInputField
            value={phoneInput}
            onChange={setPhoneInput}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-[var(--theme)]"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
        )}

        <button
          type="submit"
          className="store-btn w-full"
        >
          {t("order.trackSubmit")}
        </button>

        <Link href={`/store/${slug}`} className="block text-center store-link">
          {t("store.backToStore")}
        </Link>
      </form>
    </div>
  );
}

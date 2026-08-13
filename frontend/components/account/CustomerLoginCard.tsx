"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { setQuickCustomer, QuickLoginCustomer } from "@/lib/quickCustomer";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

interface Props {
  slug: string;
  onLoggedIn: (customer: QuickLoginCustomer) => void;
}

export default function CustomerLoginCard({ slug, onLoggedIn }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/public/stores/${slug}/quick-login/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || t("storefront.quickLoginError"));
        return;
      }
      setDevCode(data?.data?.devCode || "");
      setStep("code");
    } catch {
      setError(t("storefront.quickLoginNetworkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/public/stores/${slug}/quick-login/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || t("storefront.quickLoginCodeError"));
        return;
      }
      const customer = data.data as QuickLoginCustomer;
      setQuickCustomer(slug, customer);
      onLoggedIn(customer);
    } catch {
      setError(t("storefront.quickLoginNetworkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
      <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-[22px]">👤</div>
      <h1 className="text-lg font-bold text-gray-900 mb-2">{t("storefront.myAccount")}</h1>
      <p className="text-sm text-gray-500 mb-6">{t("storefront.notLoggedInHint")}</p>

      <form onSubmit={step === "phone" ? handleSend : handleVerify} className="space-y-3 text-left">
        {step === "phone" ? (
          <>
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1">{t("storefront.quickLoginPhone")}</label>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966 5XXXXXXXX"
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
              {loading ? t("storefront.quickLoginSending") : t("storefront.quickLoginSendCode")}
            </button>
          </>
        ) : (
          <>
            <p className="text-[12px] text-gray-500">{t("storefront.quickLoginCodeDesc")}</p>
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1">{t("storefront.quickLoginCode")}</label>
              <input
                type="text"
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••"
                maxLength={6}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {devCode && (
              <p className="rounded-lg px-3 py-2 text-[12px] bg-amber-50 border border-amber-200 text-amber-800">
                {t("storefront.quickLoginDevCode")}: <b dir="ltr">{devCode}</b>
              </p>
            )}
            <button type="submit" disabled={loading} className="w-full rounded-lg py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
              {loading ? t("storefront.quickLoginVerifying") : t("storefront.quickLoginVerify")}
            </button>
            <button type="button" onClick={() => setStep("phone")} className="w-full text-center text-[12px] text-gray-500 hover:text-gray-700">
              {t("storefront.quickLoginBack")}
            </button>
          </>
        )}
        {error && <p className="text-[12px] text-red-600">{error}</p>}
      </form>
    </div>
  );
}

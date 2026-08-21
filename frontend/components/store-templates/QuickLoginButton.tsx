"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { getQuickCustomer, setQuickCustomer, QuickLoginCustomer } from "@/lib/quickCustomer";
import { UserIcon } from "@/components/store-templates/icons";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

interface QuickLoginButtonProps {
  slug: string;
  darkHeader?: boolean;
  headerLinkColor?: string;
  compact?: boolean;
  onCustomer?: (customer: QuickLoginCustomer | null) => void;
}

export default function QuickLoginButton({ slug, darkHeader = false, headerLinkColor = "#1F2937", compact = false, onCustomer }: QuickLoginButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState<QuickLoginCustomer | null>(() => getQuickCustomer(slug));
  const [step, setStep] = useState<"phone" | "code" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const [maskedContact, setMaskedContact] = useState("");

  const applyCustomer = (c: QuickLoginCustomer) => {
    setCustomer(c);
    setQuickCustomer(slug, c);
    onCustomer?.(c);
  };

  const refreshFromServer = async () => {
    if (!customer?.sessionToken) return;
    try {
      const res = await fetch(`${API_BASE}/public/stores/${slug}/quick-login/me`, {
        headers: { Authorization: `Bearer ${customer.sessionToken}` },
      });
      const data = await res.json();
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok && data?.success) {
        applyCustomer({ ...customer, ...data.data, sessionToken: customer.sessionToken });
      }
    } catch {
      /* يبقى العرض من البيانات المخزّنة في حال تعذّر الاتصال */
    }
  };

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
      setMaskedContact(data?.data?.maskedContact || "");
      setStep("code");
    } catch (err: unknown) {
      const err2 = err as { response?: { data?: { message?: string } } };
      setError(err2.response?.data?.message || t("storefront.quickLoginNetworkError"));
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
      applyCustomer(data?.data as QuickLoginCustomer);
      setStep("done");
    } catch (err: unknown) {
      const err2 = err as { response?: { data?: { message?: string } } };
      setError(err2.response?.data?.message || t("storefront.quickLoginNetworkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setQuickCustomer(slug, null);
    setCustomer(null);
    onCustomer?.(null);
    setOpen(false);
  };

  const openModal = () => {
    setError("");
    setStep(customer ? "done" : "phone");
    setPhone("");
    setCode("");
    setDevCode("");
    setOpen(true);
    if (customer) {
      refreshFromServer();
    }
  };

  const btnStyle: React.CSSProperties = {
    color: headerLinkColor,
    background: darkHeader ? "rgba(255,255,255,0.14)" : "#F3F4F6",
    borderRadius: "9999px",
    fontSize: compact ? 12 : 13,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: compact ? "6px 10px" : "8px 14px",
  };

  return (
    <>
      <button type="button" onClick={openModal} className="shrink-0" style={btnStyle} aria-label={t("storefront.quickLogin")}>
        <span style={{ fontSize: compact ? 13 : 15 }}><UserIcon size={compact ? 14 : 16} /></span>
        <span className="hidden sm:inline max-w-[90px] truncate">{customer ? customer.fullName : t("storefront.quickLogin")}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.5)" }} onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" style={{ maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold" style={{ color: "#0F172A" }}>{t("storefront.quickLogin")}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-[20px] leading-none w-9 h-9 flex items-center justify-center rounded-full">×</button>
            </div>

            {step === "phone" && (
              <form onSubmit={handleSend} className="space-y-4">
                <p className="text-[13px] text-gray-500">{t("storefront.quickLoginPhoneDesc")}</p>
                <div>
                  <label className="block text-[12px] font-bold mb-1" style={{ color: "#0F172A" }}>{t("storefront.quickLoginPhone")}</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+966 5XXXXXXXX"
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {error && <p className="text-[12px] text-red-600">{error}</p>}
                <button type="submit" disabled={loading} className="w-full rounded-lg py-2.5 text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: "#1D4ED8" }}>
                  {loading ? t("storefront.quickLoginSending") : t("storefront.quickLoginSendCode")}
                </button>
              </form>
            )}

            {step === "code" && (
              <form onSubmit={handleVerify} className="space-y-4">
                <p className="text-[13px] text-gray-500">{t("storefront.quickLoginCodeDesc")}</p>
                {maskedContact && <p className="text-[12px] font-bold text-blue-700" dir="ltr">{maskedContact}</p>}
                <div>
                  <label className="block text-[12px] font-bold mb-1" style={{ color: "#0F172A" }}>{t("storefront.quickLoginCode")}</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="••••"
                    maxLength={6}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {devCode && (
                  <p className="rounded-lg px-3 py-2 text-[12px] bg-amber-50 border border-amber-200 text-amber-800">
                    {t("storefront.quickLoginDevCode")}: <b dir="ltr">{devCode}</b>
                  </p>
                )}
                {error && <p className="text-[12px] text-red-600">{error}</p>}
                <button type="submit" disabled={loading} className="w-full rounded-lg py-2.5 text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: "#1D4ED8" }}>
                  {loading ? t("storefront.quickLoginVerifying") : t("storefront.quickLoginVerify")}
                </button>
                <button type="button" onClick={() => setStep("phone")} className="w-full text-center text-[12px] font-medium text-gray-500 hover:text-gray-700">
                  {t("storefront.quickLoginBack")}
                </button>
              </form>
            )}

            {step === "done" && customer && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "#DBEAFE", color: "#1D4ED8" }}><UserIcon size={20} /></div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold truncate" style={{ color: "#0F172A" }}>{customer.fullName}</p>
                    <p className="text-[12px] text-gray-500 truncate" dir="ltr">{customer.email || customer.phone}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-2">
                  <p className="text-[12px] font-bold" style={{ color: "#0F172A" }}>{t("storefront.quickLoginSavedData")}</p>
                  {customer.phone && <p className="text-[12px] text-gray-600"><b>{t("storefront.quickLoginPhone")}:</b> <span dir="ltr">{customer.phone}</span></p>}
                  {customer.lastAddress && <p className="text-[12px] text-gray-600"><b>{t("storefront.quickLoginAddress")}:</b> {customer.lastAddress}</p>}
                  <p className="text-[12px] text-gray-600"><b>{t("storefront.quickLoginOrders")}:</b> {customer.orderCount ?? customer.recentOrders?.length ?? 0}</p>
                </div>
                <p className="text-[12px] text-gray-500">{t("storefront.quickLoginAutoFill")}</p>
                <a
                  href={`/store/${slug}/account`}
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-lg py-2.5 text-center text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#1D4ED8" }}
                >
                  {t("storefront.myAccount")}
                </a>
                <button type="button" onClick={handleLogout} className="w-full rounded-lg py-2.5 text-[13px] font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">
                  {t("storefront.quickLoginLogout")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

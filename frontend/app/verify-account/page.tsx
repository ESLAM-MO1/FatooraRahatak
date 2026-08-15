"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import LangSwitch from "@/components/LangSwitch";
import "@/lib/i18n/config";

function BrandPanel() {
  const { t } = useTranslation();
  return (
    <div className="auth-brand-panel">
      <div className="relative z-[2] flex justify-start">
        <LangSwitch />
      </div>

      <div className="relative z-[2] flex flex-col items-center my-2">
        <div className="brand-logo-frame" style={{ width: 220, height: 185 }}>
          <img src="/logo.png" alt={t("brand.name")} className="brand-logo" />
        </div>
        <div className="text-center mt-4">
          <p className="text-[27px] font-extrabold text-[var(--blue-deep)] leading-snug">{t("brand.name")}</p>
          <p className="mt-1.5 text-[13.5px] tracking-[2.5px] uppercase text-[var(--gold)] font-bold">
            faturat rahatik
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 mt-5">
          <span className="w-[38px] h-[5px] rounded-[4px]" style={{ background: "var(--blue)" }} />
          <span className="w-[38px] h-[5px] rounded-[4px]" style={{ background: "var(--gold)" }} />
          <span className="w-[38px] h-[5px] rounded-[4px]" style={{ background: "var(--green)" }} />
        </div>
      </div>

      <div className="relative z-[2] flex justify-between items-center border-t border-[var(--border)] pt-4.5">
        <span className="text-[12.5px] text-[var(--sub)]">&copy; {new Date().getFullYear()} {t("brand.name")}</span>
        <span className="text-[12.5px] text-[var(--sub)]">{t("footer.copyright")}</span>
      </div>
    </div>
  );
}

function VerifyAccountContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";
  const codeFromQuery = searchParams.get("code") || "";

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState(codeFromQuery);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSendCode = async () => {
    setError("");
    setSuccessMessage("");

    if (!email) {
      setError(t("auth.enterEmailFirst"));
      return;
    }

    setSending(true);
    try {
      const response = await api.post(`/auth/send-verification-code?email=${encodeURIComponent(email)}`);
      if (response.data.code) {
        setCode(response.data.code);
        setSuccessMessage(`${response.data.message || t("auth.codeSent")} — ${response.data.code}`);
      } else {
        setSuccessMessage(response.data.message || t("auth.codeSent"));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t("error.serverError"));
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    setVerifying(true);
    try {
      const response = await api.post("/auth/verify-account", { email, code });
      setSuccessMessage(response.data.message || t("auth.accountVerified"));
      setVerified(true);
    } catch (err: any) {
      setError(err.response?.data?.message || t("error.serverError"));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="brand-strip" />

      <div className="auth-form-panel">
        <div className="w-full max-w-[400px]">
          <div className="mb-9">
            <span className="block text-[13px] font-bold text-[var(--gold)] mb-2.5">{t("auth.stepFinal")}</span>
            <h1 className="text-[29px] font-extrabold text-[var(--blue-deep)] mb-2">{t("auth.verifyTitle")}</h1>
            <p className="text-[14.5px] text-[var(--sub)]">{t("auth.verifySubtitle")}</p>
          </div>

          {error && (
            <div className="alert alert--danger mb-4">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-[var(--green-soft)] border border-[#bfe8d7] text-[var(--green)] px-3.5 py-2.5 rounded-[10px] text-[13.5px] mb-4">
              {successMessage}
            </div>
          )}

          {verified ? (
            <div className="text-center">
              <a href="/login" className="text-[var(--blue)] font-bold hover:underline text-[13.5px]">
                {t("auth.goToLogin")}
              </a>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label htmlFor="email" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                  {t("auth.email")}
                </label>
                <div className="field-shell">
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={sending}
                className="btn-secondary w-full py-3 text-[14px] mb-6"
              >
                {sending ? t("common.loading") : t("auth.sendVerifyCode")}
              </button>

              <form onSubmit={handleVerify} noValidate>
                <div className="mb-6">
                  <label htmlFor="code" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                    {t("auth.verifyCodeLabel")}
                  </label>
                  <div className="field-shell">
                    <input
                      id="code"
                      type="text"
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      maxLength={6}
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-3.5 text-[15px]" disabled={verifying}>
                  {verifying && (
                    <span className="w-[15px] h-[15px] rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  {verifying ? t("common.loading") : t("auth.verifyButton")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <BrandPanel />
    </div>
  );
}

export default function VerifyAccountPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white text-[var(--sub)]">
          {t("common.loading")}
        </div>
      }
    >
      <VerifyAccountContent />
    </Suspense>
  );
}
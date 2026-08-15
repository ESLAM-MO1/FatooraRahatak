"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { login, googleAuth } from "@/lib/auth";
import LangSwitch from "@/components/LangSwitch";
import "@/lib/i18n/config";

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message || t("error.serverError"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleResponse = async (response: any) => {
    setError("");
    setLoading(true);
    try {
      await googleAuth(response.credential);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message || t("error.serverError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).google) {
      (window as any).google.accounts.id.initialize({
        client_id: "304538328791-q1j4pbgjnfu79jg0ps954gojuspaqjf4.apps.googleusercontent.com",
        callback: handleGoogleResponse,
      });
      (window as any).google.accounts.id.renderButton(
        document.getElementById("googleBtn"),
        { theme: "outline", size: "large", width: 400, text: "signin_with" }
      );
    }
  }, []);

  return (
    <div className="auth-layout">
      <div className="brand-strip" />

      <div className="auth-form-panel">
        <div className="w-full max-w-[400px]">
          <div className="mb-9">
            <span className="block text-[13px] font-bold text-[var(--gold)] mb-2.5">{t("auth.loginTitle")}</span>
            <h1 className="text-[29px] font-extrabold text-[var(--blue-deep)] mb-2">{t("auth.login")}</h1>
            <p className="text-[14.5px] text-[var(--sub)]">{t("auth.loginSubtitle")}</p>
          </div>

          {error && (
            <div className="alert alert--danger mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5">
              <label htmlFor="email" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                {t("auth.email")}
              </label>
              <div className="field-shell">
                <span className="text-[#9AA4AC]">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 6.5C3 5.67 3.67 5 4.5 5h15c.83 0 1.5.67 1.5 1.5v11c0 .83-.67 1.5-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path d="M4 6.5 12 13l8-6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
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

            <div className="mb-5">
              <label htmlFor="password" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                {t("auth.password")}
              </label>
              <div className="field-shell">
                <span className="text-[#9AA4AC]">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M8 11V7.5a4 4 0 0 1 8 0V11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="text-[#9AA4AC] hover:text-[var(--blue)]"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? t("auth.password") : t("auth.password")}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path
                        d="M10.6 5.2A10.9 10.9 0 0 1 12 5c5.5 0 9 5 9 7-.4.7-1.4 2.1-2.9 3.4M6.6 6.6C4.5 8 3.3 9.9 3 12c0 2 3.5 7 9 7 1.4 0 2.6-.3 3.7-.8"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <path d="M9.9 10a3 3 0 0 0 4.2 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" stroke="currentColor" strokeWidth="1.6" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 text-[13.5px] text-[var(--sub)]">
                <input type="checkbox" style={{ accentColor: "var(--green)" }} className="w-[15px] h-[15px]" />
                {t("common.remember")}
              </label>
              <a href="/forgot-password" className="text-[13.5px] font-bold text-[var(--blue)] hover:underline">
                {t("auth.forgotPassword")}
              </a>
            </div>

            <button type="submit" className="btn-primary w-full py-3.5 text-[15px]" disabled={loading}>
              {loading && (
                <span className="w-[15px] h-[15px] rounded-full border-2 border-white/40 border-t-white animate-spin" />
              )}
              {loading ? t("common.loading") : t("auth.submitButton")}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6 text-[#A6AFB6] text-[12.5px]">
            <span className="flex-1 h-px bg-[var(--border)]" />
            {t("common.or")}
            <span className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div id="googleBtn" className="flex justify-center mb-4" />

          <p className="text-center text-[13.5px] text-[var(--sub)]">
            {t("auth.noAccount")}{" "}
            <a href="/register" className="text-[var(--green)] font-bold hover:underline">
              {t("auth.register")}
            </a>
          </p>
        </div>
      </div>

      <div className="auth-brand-panel">
        <div className="relative z-[2] flex justify-start">
          <LangSwitch />
        </div>

        <div className="relative z-[2] flex flex-col items-center my-2">
          <div className="brand-logo-frame" style={{ width: 380, height: 322 }}>
            <img src="/logo.png" alt={t("brand.name")} className="brand-logo" />
          </div>
          <div className="text-center mt-4">
            <p className="text-[27px] font-extrabold text-[var(--blue-deep)] leading-snug">{t("brand.name")}</p>
            <p className="mt-1.5 text-[13.5px] tracking-[2.5px] uppercase text-[var(--gold)] font-bold">
              {t("brand.nameEn")}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 mt-5">
            <span className="w-[38px] h-[5px] rounded-[4px]" style={{ background: "var(--blue)" }} />
            <span className="w-[38px] h-[5px] rounded-[4px]" style={{ background: "var(--gold)" }} />
            <span className="w-[38px] h-[5px] rounded-[4px]" style={{ background: "var(--green)" }} />
          </div>

          <div className="text-center mt-6 max-w-xs">
            <p className="text-[15px] font-bold text-[var(--blue-deep)]">{t("auth.brandSubtitle")}</p>
            <p className="text-[12.5px] leading-relaxed text-[var(--sub)] mt-2">{t("auth.brandDescription")}</p>
          </div>
        </div>

        <div className="relative z-[2] flex justify-center items-center border-t border-[var(--border)] pt-4.5">
          <span className="text-[12.5px] text-[var(--sub)]">{t("footer.copyright")}</span>
        </div>
      </div>
    </div>
  );
}
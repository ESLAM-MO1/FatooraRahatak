"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { register, googleAuth } from "@/lib/auth";
import LangSwitch from "@/components/LangSwitch";
import "@/lib/i18n/config";
import PhoneInputField from "@/components/PhoneInputField";
import { isValidPhone, normalizePhone } from "@/lib/phone";

function RegisterForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("token");
  const referralParam = searchParams.get("ref");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState(referralParam || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  const validatePhone = (phone: string) => isValidPhone(phone, "SA");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateEmail(email)) {
      setError(t("auth.invalidEmail"));
      return;
    }

    if (!validatePhone(phone)) {
      setError(t("auth.invalidPhone"));
      return;
    }

    if (password.length < 6) {
      setError(t("error.passwordLength"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("error.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        fullName,
        email,
        phone: normalizePhone(phone, "SA") || phone,
        password,
        ...(invitationToken ? { invitationToken } : {}),
        ...(referralCode ? { referralCode: referralCode.trim().toUpperCase() } : {}),
      });
      if (invitationToken) {
        router.push("/dashboard");
      } else {
        if (result?.verificationCode) {
          router.push(`/verify-account?email=${encodeURIComponent(email)}&code=${result.verificationCode}`);
        } else {
          router.push(`/verify-account?email=${encodeURIComponent(email)}`);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t("error.serverError"));
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
        { theme: "outline", size: "large", text: "signin_with" }
      );
    }
  }, []);

  return (
    <div className="auth-layout">
      <div className="brand-strip" />

      <div className="auth-form-panel">
        <div className="w-full max-w-[400px]">
          <div className="mb-9">
            <span className="block text-[13px] font-bold text-[var(--gold)] mb-2.5">{t("auth.registerTitle")}</span>
            <h1 className="text-[29px] font-extrabold text-[var(--blue-deep)] mb-2">{t("auth.register")}</h1>
            <p className="text-[14.5px] text-[var(--sub)]">{t("auth.registerSubtitle")}</p>
          </div>

          {error && (
            <div className="alert alert--danger mb-4">
              {error}
            </div>
          )}

          {invitationToken && (
            <div className="bg-[var(--green-soft)] border border-[#c6efc6] text-[var(--green)] px-3.5 py-2.5 rounded-[10px] text-[13.5px] mb-4">
              {t("auth.invitationMessage")}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5">
              <label htmlFor="fullName" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                {t("auth.name")}
              </label>
              <div className="field-shell">
                <input
                  id="fullName"
                  type="text"
                  placeholder={t("auth.name")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-5">
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

            <div className="mb-5">
              <label htmlFor="phone" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                {t("auth.phone")}
              </label>
              <PhoneInputField id="phone" value={phone} onChange={setPhone} required />
            </div>

            <div className="mb-5">
              <label htmlFor="password" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                {t("auth.password")}
              </label>
              <div className="field-shell">
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                {t("auth.confirmPassword")}
              </label>
              <div className="field-shell">
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="referralCode" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                {t("register.referralCode")}
              </label>
              <p className="text-[11.5px] text-[var(--sub)] mb-2">{t("register.referralCodeHint")}</p>
              <div className="field-shell">
                <input
                  id="referralCode"
                  type="text"
                  placeholder={t("register.referralCodePlaceholder")}
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  dir="ltr"
                  className="text-left"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3.5 text-[15px]" disabled={loading}>
              {loading && (
                <span className="w-[15px] h-[15px] rounded-full border-2 border-white/40 border-t-white animate-spin" />
              )}
              {loading ? t("common.loading") : t("auth.registerButton")}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6 text-[#A6AFB6] text-[12.5px]">
            <span className="flex-1 h-px bg-[var(--border)]" />
            {t("common.or")}
            <span className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div id="googleBtn" className="w-full flex justify-center mb-4" />

          <p className="text-center text-[13.5px] text-[var(--sub)] mt-6">
            {t("auth.haveAccount")}{" "}
            <a href="/login" className="text-[var(--blue)] font-bold hover:underline">
              {t("auth.login")}
            </a>
          </p>
        </div>
      </div>

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
              {t("brand.nameEn")}
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
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
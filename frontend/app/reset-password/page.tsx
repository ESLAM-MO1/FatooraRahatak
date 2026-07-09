"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

function LangSwitch() {
  const [lang, setLang] = useState("ar");

  return (
    <div className="lang-switch" role="group" aria-label="اللغة / Language">
      <button type="button" className={lang === "ar" ? "active" : ""} onClick={() => setLang("ar")}>
        عربي
      </button>
      <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
        EN
      </button>
      <span className="lang-thumb" style={{ transform: lang === "ar" ? "translateX(0%)" : "translateX(-100%)" }} />
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="auth-brand-panel">
      <div className="relative z-[2] flex justify-start">
        <LangSwitch />
      </div>

      <div className="relative z-[2] flex flex-col items-center my-2">
        <div className="brand-logo-frame" style={{ width: 220, height: 185 }}>
          <img src="/logo.png" alt="فاتورة راحتك" className="brand-logo" />
        </div>
        <div className="text-center mt-4">
          <p className="text-[27px] font-extrabold text-[var(--blue-deep)] leading-snug">فاتورة راحتك</p>
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
        <span className="text-[12.5px] text-[var(--sub)]">© 2026 فاتورة راحتك</span>
        <span className="text-[12.5px] text-[var(--sub)]">جميع الحقوق محفوظة</span>
      </div>
    </div>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (newPassword !== confirmPassword) {
      setError("كلمة المرور الجديدة وتأكيدها غير متطابقين");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/reset-password", {
        email,
        code,
        newPassword,
      });
      setSuccessMessage(response.data.message || "تم تغيير كلمة المرور، يرجى تسجيل الدخول");
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تغيير كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout" dir="rtl">
      <div className="brand-strip" />

      <div className="auth-form-panel">
        <div className="w-full max-w-[400px]">
          <div className="mb-9">
            <span className="block text-[13px] font-bold text-[var(--gold)] mb-2.5">كلمة مرور جديدة</span>
            <h1 className="text-[29px] font-extrabold text-[var(--blue-deep)] mb-2">تعيين كلمة مرور جديدة</h1>
            <p className="text-[14.5px] text-[var(--sub)]">أدخل الرمز اللي وصلك وكلمة المرور الجديدة</p>
          </div>

          {error && (
            <div className="bg-[var(--danger-soft)] border border-[#efc6c6] text-[var(--danger)] px-3.5 py-2.5 rounded-[10px] text-[13.5px] mb-4">
              {error}
            </div>
          )}

          {successMessage ? (
            <div className="text-center">
              <div className="bg-[var(--green-soft)] border border-[#bfe8d7] text-[var(--green)] px-3.5 py-2.5 rounded-[10px] text-[13.5px] mb-4">
                {successMessage}
              </div>
              <a href="/login" className="text-[var(--blue)] font-bold hover:underline text-[13.5px]">
                اذهب لتسجيل الدخول
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-5">
                <label htmlFor="email" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                  البريد الإلكتروني
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
                <label htmlFor="code" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                  رمز التحقق (6 أرقام)
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

              <div className="mb-5">
                <label htmlFor="newPassword" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                  كلمة المرور الجديدة
                </label>
                <div className="field-shell">
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                  تأكيد كلمة المرور الجديدة
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

              <button type="submit" className="btn-primary w-full py-3.5 text-[15px]" disabled={loading}>
                {loading && (
                  <span className="w-[15px] h-[15px] rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                {loading ? "جارٍ التعيين..." : "تعيين كلمة المرور"}
              </button>
            </form>
          )}
        </div>
      </div>

      <BrandPanel />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white text-[var(--sub)]">
          جارٍ التحميل...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
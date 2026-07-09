"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

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

export default function LoginPage() {
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
      setError(err?.response?.data?.message || "حدث خطأ أثناء تسجيل الدخول");
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
            <span className="block text-[13px] font-bold text-[var(--gold)] mb-2.5">بوابة الدخول</span>
            <h1 className="text-[29px] font-extrabold text-[var(--blue-deep)] mb-2">تسجيل الدخول</h1>
            <p className="text-[14.5px] text-[var(--sub)]">يرجى إدخال بيانات حسابك للمتابعة</p>
          </div>

          {error && (
            <div className="bg-[var(--danger-soft)] border border-[#efc6c6] text-[var(--danger)] px-3.5 py-2.5 rounded-[10px] text-[13.5px] mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5">
              <label htmlFor="email" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                البريد الإلكتروني
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
                كلمة المرور
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
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
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
                تذكرني على هذا الجهاز
              </label>
              <a href="/forgot-password" className="text-[13.5px] font-bold text-[var(--blue)] hover:underline">
                نسيت كلمة المرور؟
              </a>
            </div>

            <button type="submit" className="btn-primary w-full py-3.5 text-[15px]" disabled={loading}>
              {loading && (
                <span className="w-[15px] h-[15px] rounded-full border-2 border-white/40 border-t-white animate-spin" />
              )}
              {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6 text-[#A6AFB6] text-[12.5px]">
            <span className="flex-1 h-px bg-[var(--border)]" />
            أو
            <span className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <p className="text-center text-[13.5px] text-[var(--sub)]">
            ليس لديك حساب؟{" "}
            <a href="/register" className="text-[var(--green)] font-bold hover:underline">
              أنشئ حسابًا جديدًا
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
    </div>
  );
}
"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "../site-layout";
import "@/lib/i18n/config";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

export default function ContactPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/site/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || t("error.serverError"));
      }
      setSuccess(t("common.success"));
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err: any) {
      setError(err.message || t("error.serverError"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div
            className="max-w-lg w-full p-10 text-center rounded-[var(--radius-md)] shadow-[var(--shadow)] border border-green-200 bg-white"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--ink)] mb-3">{t("common.success")}</h2>
            <p className="text-[14px] text-[var(--sub)] leading-relaxed">{success}</p>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div>
        <section
          className="py-16 text-center text-white"
          style={{ backgroundColor: "var(--blue-deep)" }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{t("page.contact")}</h1>
          <p className="text-[15px] opacity-80">{t("common.help")}</p>
        </section>
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow)] p-8 md:p-10">
                {error && (
                  <div className="alert alert--danger mb-6">{error}</div>
                )}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label>{t("auth.name")}</label>
                      <div className="field-shell">
                        <input name="name" value={form.name} onChange={handleChange} placeholder={t("auth.name")} required />
                      </div>
                    </div>
                    <div>
                      <label>{t("auth.email")}</label>
                      <div className="field-shell">
                        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder={t("auth.email")} required />
                      </div>
                    </div>
                    <div>
                      <label>{t("auth.phone")}</label>
                      <div className="field-shell">
                        <input name="phone" value={form.phone} onChange={handleChange} placeholder={t("auth.phone")} />
                      </div>
                    </div>
                    <div>
                      <label>{t("admin.messageSubject")}</label>
                      <div className="field-shell">
                        <input name="subject" value={form.subject} onChange={handleChange} placeholder={t("admin.messageSubject")} required />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label>{t("admin.messageBody")}</label>
                    <div className="field-shell">
                      <textarea name="message" value={form.message} onChange={handleChange} placeholder={t("admin.messageBody")} rows={5} required />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
                    {loading ? t("common.loading") : t("common.save")}
                  </button>
                </form>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow)] p-6">
                <h3 className="text-[15px] font-bold text-[var(--ink)] mb-4">{t("page.contact")}</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-[12px] text-[var(--sub)]">{t("auth.email")}</p>
                      <p className="text-[13px] font-bold text-[var(--ink)]">support@rahatik.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 4a2 2 0 012-2h1.5a1 1 0 01.94.66l1.19 3.57a1 1 0 01-.3 1.13L8.5 9.5a16 16 0 006 6l1.14-1.83a1 1 0 011.13-.3l3.57 1.19a1 1 0 01.66.94V19a2 2 0 01-2 2A17 17 0 015 4z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-[12px] text-[var(--sub)]">{t("auth.phone")}</p>
                      <p className="text-[13px] font-bold text-[var(--ink)]" dir="ltr">+966 123 456 789</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-[12px] text-[var(--sub)]">{t("common.help")}</p>
                      <p className="text-[13px] font-bold text-[var(--ink)]">{t("common.help")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow)] p-6">
                <h3 className="text-[15px] font-bold text-[var(--ink)] mb-4">{t("common.settings")}</h3>
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: "var(--blue-deep)" }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z" />
                    </svg>
                  </span>
                  <span className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: "var(--blue-deep)" }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 2H7a5 5 0 00-5 5v10a5 5 0 005 5h10a5 5 0 005-5V7a5 5 0 00-5-5zM12 16a4 4 0 100-8 4 4 0 000 8zm5-9.5h.01" />
                    </svg>
                  </span>
                  <span className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: "var(--blue-deep)" }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.5 14.3c-.6.3-1.7 1.5-2.9 1.5s-2.5-.9-4.4-2.8C8.3 11 7.5 9.7 7.5 8.5s1.2-2.3 1.5-2.9c.1-.3.2-.7.1-1-.1-.4-.5-.8-.7-1-.3-.3-.6-.5-.9-.5h-.9c-.4 0-.8.1-1.1.4-.4.3-.9.9-1.2 1.5-.4.6-.7 1.5-.7 2.4 0 1.5.6 3 1.8 4.6 1.2 1.6 2.8 3.1 4.8 4.1 1.5.7 2.7 1 3.7 1.2.5.1 1 .1 1.5.1.5 0 1.1-.1 1.6-.4.5-.3 1-.7 1.3-1.2.3-.5.5-1 .5-1.6v-1c0-.3-.2-.6-.5-.7-.3-.1-.8-.3-1.4-.6z" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

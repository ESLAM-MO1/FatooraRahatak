"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "../site-layout";
import Hero from "@/components/Hero";
import "@/lib/i18n/config";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string) {
  return /^[\d\s\-\+\(\)]{7,20}$/.test(phone) || phone === "";
}

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
  const [ticketNumber, setTicketNumber] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = t("common.required");
    if (!form.email.trim()) errors.email = t("common.required");
    else if (!validateEmail(form.email)) errors.email = t("error.invalidEmail");
    if (form.phone && !validatePhone(form.phone)) errors.phone = t("error.invalidPhone");
    if (!form.subject.trim()) errors.subject = t("common.required");
    if (!form.message.trim()) errors.message = t("common.required");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError("");
    setSuccess("");
    setTicketNumber("");
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
      const ticketNum = json.data?.ticketNumber || "";
      setTicketNumber(ticketNum);
      setSuccess(t("common.ticketCreated"));
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
          <div className="max-w-lg w-full p-10 text-center rounded-[var(--radius-md)] shadow-[var(--shadow)] border border-green-200 bg-white">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--ink)] mb-3">{t("common.success")}</h2>
            {ticketNumber && (
              <p className="text-[15px] font-bold text-[var(--blue)] mb-2" dir="ltr">{ticketNumber}</p>
            )}
            <p className="text-[14px] text-[var(--sub)] leading-relaxed">{success}</p>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div>
        <Hero title={t("page.contact")} subtitle={t("common.help")} />
        <div className="max-w-3xl mx-auto px-4 py-12">
          {error && (
            <div className="alert alert--danger mb-6">{error}</div>
          )}
          <div className="bg-white border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow)] p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label>{t("auth.name")} <span className="text-red-500">*</span></label>
                  <div className="field-shell">
                    <input name="name" value={form.name} onChange={handleChange} placeholder={t("auth.name")} />
                  </div>
                  {fieldErrors.name && <p className="text-red-500 text-[12px] mt-1">{fieldErrors.name}</p>}
                </div>
                <div>
                  <label>{t("auth.email")} <span className="text-red-500">*</span></label>
                  <div className="field-shell">
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder={t("auth.email")} />
                  </div>
                  {fieldErrors.email && <p className="text-red-500 text-[12px] mt-1">{fieldErrors.email}</p>}
                </div>
                <div>
                  <label>{t("auth.phone")}</label>
                  <div className="field-shell">
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder={t("auth.phone")} />
                  </div>
                  {fieldErrors.phone && <p className="text-red-500 text-[12px] mt-1">{fieldErrors.phone}</p>}
                </div>
                <div>
                  <label>{t("admin.messageSubject")} <span className="text-red-500">*</span></label>
                  <div className="field-shell">
                    <input name="subject" value={form.subject} onChange={handleChange} placeholder={t("admin.messageSubject")} />
                  </div>
                  {fieldErrors.subject && <p className="text-red-500 text-[12px] mt-1">{fieldErrors.subject}</p>}
                </div>
              </div>
              <div>
                <label>{t("admin.messageBody")} <span className="text-red-500">*</span></label>
                <div className="field-shell">
                  <textarea name="message" value={form.message} onChange={handleChange} placeholder={t("admin.messageBody")} rows={5} />
                </div>
                {fieldErrors.message && <p className="text-red-500 text-[12px] mt-1">{fieldErrors.message}</p>}
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
                {loading ? t("common.loading") : t("common.save")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

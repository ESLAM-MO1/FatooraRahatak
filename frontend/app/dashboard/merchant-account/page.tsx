"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

type LicenseValue =
  | "CommercialRegister"
  | "License"
  | "Freelance"
  | "LLC"
  | "SoleProprietorship"
  | "Partnership"
  | "Corporation";

const LICENSE_TYPES: { value: LicenseValue; labelKey: string }[] = [
  { value: "CommercialRegister", labelKey: "merchantAccount.licenseCommercial" },
  { value: "License", labelKey: "merchantAccount.licenseLicense" },
  { value: "Freelance", labelKey: "merchantAccount.licenseFreelance" },
  { value: "LLC", labelKey: "merchantAccount.licenseLLC" },
  { value: "SoleProprietorship", labelKey: "merchantAccount.licenseSoleProprietorship" },
  { value: "Partnership", labelKey: "merchantAccount.licensePartnership" },
  { value: "Corporation", labelKey: "merchantAccount.licenseCorporation" },
];

// Label "رقم الترخيص" بيتغير حسب نوع الترخيص المختار
const LICENSE_NUMBER_LABEL_KEY: Record<LicenseValue, string> = {
  CommercialRegister: "merchantAccount.licenseNumberCommercial",
  License: "merchantAccount.licenseNumberLicense",
  Freelance: "merchantAccount.licenseNumberFreelance",
  LLC: "merchantAccount.licenseNumberDefault",
  SoleProprietorship: "merchantAccount.licenseNumberDefault",
  Partnership: "merchantAccount.licenseNumberDefault",
  Corporation: "merchantAccount.licenseNumberDefault",
};

const COUNTRIES: { code: string; ar: string; en: string }[] = [
  { code: "SA", ar: "السعودية", en: "Saudi Arabia" },
  { code: "AE", ar: "الإمارات", en: "United Arab Emirates" },
  { code: "QA", ar: "قطر", en: "Qatar" },
  { code: "KW", ar: "الكويت", en: "Kuwait" },
  { code: "BH", ar: "البحرين", en: "Bahrain" },
  { code: "OM", ar: "عمان", en: "Oman" },
  { code: "YE", ar: "اليمن", en: "Yemen" },
  { code: "EG", ar: "مصر", en: "Egypt" },
  { code: "IQ", ar: "العراق", en: "Iraq" },
  { code: "SY", ar: "سوريا", en: "Syria" },
  { code: "JO", ar: "الأردن", en: "Jordan" },
  { code: "LB", ar: "لبنان", en: "Lebanon" },
  { code: "PS", ar: "فلسطين", en: "Palestine" },
  { code: "MA", ar: "المغرب", en: "Morocco" },
  { code: "DZ", ar: "الجزائر", en: "Algeria" },
  { code: "TN", ar: "تونس", en: "Tunisia" },
  { code: "LY", ar: "ليبيا", en: "Libya" },
  { code: "SD", ar: "السودان", en: "Sudan" },
  { code: "MR", ar: "موريتانيا", en: "Mauritania" },
  { code: "SO", ar: "الصومال", en: "Somalia" },
  { code: "DJ", ar: "جيبوتي", en: "Djibouti" },
  { code: "TR", ar: "تركيا", en: "Turkey" },
  { code: "US", ar: "الولايات المتحدة", en: "United States" },
  { code: "GB", ar: "بريطانيا", en: "United Kingdom" },
  { code: "FR", ar: "فرنسا", en: "France" },
  { code: "DE", ar: "ألمانيا", en: "Germany" },
  { code: "CA", ar: "كندا", en: "Canada" },
  { code: "AU", ar: "أستراليا", en: "Australia" },
  { code: "IN", ar: "الهند", en: "India" },
  { code: "PK", ar: "باكستان", en: "Pakistan" },
  { code: "BD", ar: "بنغلاديش", en: "Bangladesh" },
  { code: "CN", ar: "الصين", en: "China" },
];

const RequiredMark = () => <span className="text-red-500"> *</span>;

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 sm:p-7">
      <h2 className="text-[16px] font-extrabold text-[var(--ink)] mb-6 flex items-center gap-2">
        <span className="w-5 h-5 rounded-md bg-[var(--blue-50)] flex items-center justify-center shrink-0">
          <span className="w-2 h-2 rounded-sm" style={{ background: "var(--blue)" }} />
        </span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[13px] font-bold text-[var(--ink)]">{children}</label>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[12px] text-[var(--danger)] mt-1">{message}</p>;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] bg-white focus:outline-none focus:border-[var(--blue)] transition-colors placeholder:text-[var(--sub-light)]";

export default function MerchantAccountPage() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    brandName: "",
    websiteUrl: "",
    legalName: "",
    licenseType: "" as LicenseValue | "",
    licenseNumber: "",
    ownerFirstName: "",
    ownerMiddleName: "",
    ownerLastName: "",
    ownerEmail: "",
    ownerCountryCode: "966",
    ownerPhone: "",
    addressCountry: "",
    addressCity: "",
    birthDate: "",
    nationalIdNumber: "",
  });
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoName, setLogoName] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    api
      .get("/owner/merchant-account")
      .then((res) => {
        const d = res.data.data;
        if (!d) return;
        setForm({
          brandName: d.brandName || "",
          websiteUrl: d.websiteUrl || "",
          legalName: d.legalName || "",
          licenseType: (d.licenseType as LicenseValue) || "",
          licenseNumber: d.licenseNumber || "",
          ownerFirstName: d.ownerFirstName || "",
          ownerMiddleName: d.ownerMiddleName || "",
          ownerLastName: d.ownerLastName || "",
          ownerEmail: d.ownerEmail || "",
          ownerCountryCode: d.ownerCountryCode || "966",
          ownerPhone: d.ownerPhone || "",
          addressCountry: d.addressCountry || "",
          addressCity: d.addressCity || "",
          birthDate: d.birthDate ? d.birthDate.slice(0, 10) : "",
          nationalIdNumber: d.nationalIdNumber || "",
        });
        setLogoPath(d.logoPath || null);
      })
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { message?: string } } };
        setError(e.response?.data?.message || t("merchantAccount.loadError"));
      })
      .finally(() => setLoading(false));
  }, [t]);

  const isUrlValid = (v: string) => /^(https?:\/\/)/i.test(v.trim());
  const isEmailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const isDigitsOnly = (v: string) => /^\d+$/.test(v);
  const isDateValid = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  const calcAge = (v: string) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return NaN;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    return age;
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setSuccess("");
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "png" && ext !== "jpg" && ext !== "jpeg") {
      setErrors((prev) => ({ ...prev, logo: t("merchantAccount.logoInvalidType") }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, logo: t("merchantAccount.logoTooLarge") }));
      return;
    }
    setErrors((prev) => ({ ...prev, logo: "" }));
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/owner/merchant-account/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLogoPath(res.data.data.logoPath || null);
      setLogoName(file.name);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t("merchantAccount.logoUploadError"));
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const req = t("merchantAccount.required");
    if (!form.brandName.trim()) e.brandName = req;
    if (!form.websiteUrl.trim()) e.websiteUrl = req;
    else if (!isUrlValid(form.websiteUrl)) e.websiteUrl = t("merchantAccount.websiteInvalid");
    if (!form.legalName.trim()) e.legalName = req;
    if (!form.licenseType) e.licenseType = req;
    if (!form.licenseNumber.trim()) e.licenseNumber = req;
    if (!form.ownerFirstName.trim()) e.ownerFirstName = req;
    if (!form.ownerLastName.trim()) e.ownerLastName = req;
    if (!form.ownerEmail.trim()) e.ownerEmail = req;
    else if (!isEmailValid(form.ownerEmail)) e.ownerEmail = t("merchantAccount.emailInvalid");
    if (!form.ownerCountryCode.trim()) e.ownerCountryCode = req;
    if (!form.ownerPhone.trim()) e.ownerPhone = req;
    else if (!isDigitsOnly(form.ownerPhone.replace(/[^\d]/g, ""))) e.ownerPhone = t("merchantAccount.phoneInvalid");
    if (!form.addressCountry) e.addressCountry = req;
    if (!form.addressCity.trim()) e.addressCity = req;
    if (!form.birthDate) e.birthDate = req;
    else if (!isDateValid(form.birthDate)) e.birthDate = t("merchantAccount.birthDateInvalid");
    else if (calcAge(form.birthDate) < 18) e.birthDate = t("merchantAccount.birthDateTooYoung");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setError("");
    setSuccess("");
    if (!validate()) return;
    setSaving(true);
    try {
      await api.put("/owner/merchant-account", {
        brandName: form.brandName,
        websiteUrl: form.websiteUrl,
        legalName: form.legalName,
        licenseType: form.licenseType,
        licenseNumber: form.licenseNumber,
        ownerFirstName: form.ownerFirstName,
        ownerMiddleName: form.ownerMiddleName || null,
        ownerLastName: form.ownerLastName,
        ownerEmail: form.ownerEmail,
        ownerCountryCode: form.ownerCountryCode,
        ownerPhone: form.ownerPhone,
        addressCountry: form.addressCountry,
        addressCity: form.addressCity,
        birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : null,
        nationalIdNumber: form.nationalIdNumber || null,
      });
      setSuccess(t("merchantAccount.saved"));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t("merchantAccount.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  const isAr = i18n.language !== "en";
  const licenseNumberLabelKey = LICENSE_NUMBER_LABEL_KEY[(form.licenseType as LicenseValue) || "LLC"];
  const licensePlaceholder = isAr
    ? "مثال: LLC, Sole Proprietorship, etc"
    : "Example: LLC, Sole Proprietorship, etc";

  return (
    <div className="space-y-6">
      <PageHeader icon="userGroup" title={t("merchantAccount.title")}>
        <p className="text-[12px] text-[var(--sub)]">{t("merchantAccount.subtitle")}</p>
      </PageHeader>

      {error && <div className="alert alert--danger">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* ── 1) معلومات العلامة التجارية ── */}
        <SectionCard title={t("merchantAccount.sectionBrand")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <FieldLabel>
                {t("merchantAccount.brandName")}
                <RequiredMark />
              </FieldLabel>
              <input
                type="text"
                value={form.brandName}
                onChange={set("brandName")}
                className={inputClass}
                placeholder={isAr ? "اسم متجرك" : "Your store name"}
              />
              <FieldError message={errors.brandName} />
            </div>

            <div>
              <FieldLabel>
                {t("merchantAccount.websiteUrl")}
                <RequiredMark />
              </FieldLabel>
              <input
                type="url"
                value={form.websiteUrl}
                onChange={set("websiteUrl")}
                dir="ltr"
                className={`${inputClass} text-left`}
                placeholder="https://example.com"
              />
              <FieldError message={errors.websiteUrl} />
            </div>
          </div>

          {/* لوجو العلامة */}
          <div className="mt-5">
            <FieldLabel>
              {t("merchantAccount.logo")}
              <span className="text-[--sub-light]"> ({t("merchantAccount.optional")})</span>
            </FieldLabel>
            <div className="flex items-center gap-4 flex-wrap">
              {logoPath ? (
                <img
                  src={logoPath}
                  alt={t("merchantAccount.logo")}
                  className="w-16 h-16 rounded-xl object-cover border border-gray-200 bg-gray-50"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-[22px] text-[var(--sub-light)] bg-gray-50">
                  📷
                </div>
              )}
              <div className="flex-1 min-w-[220px]">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <span className="btn btn-outline btn-sm pointer-events-none">
                    {logoUploading ? t("common.loading") : t("merchantAccount.logoChoose")}
                  </span>
                  <input type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={handleLogoChange} className="hidden" />
                </label>
                <p className="text-[11.5px] text-[var(--sub)] mt-1.5">
                  {logoName || t("merchantAccount.logoNoFile")}
                </p>
              </div>
            </div>
            <p className="text-[11.5px] text-[var(--sub)] mt-2">{t("merchantAccount.logoHint")}</p>
            <FieldError message={errors.logo} />
          </div>
        </SectionCard>

        {/* ── 2) بيانات الكيان القانوني ── */}
        <SectionCard title={t("merchantAccount.sectionLegal")}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <FieldLabel>
                {t("merchantAccount.legalName")}
                <RequiredMark />
              </FieldLabel>
              <input
                type="text"
                value={form.legalName}
                onChange={set("legalName")}
                className={inputClass}
                placeholder={isAr ? "الاسم القانوني المسجل" : "Registered legal name"}
              />
              <FieldError message={errors.legalName} />
            </div>

            <div>
              <FieldLabel>
                {t("merchantAccount.licenseType")}
                <RequiredMark />
              </FieldLabel>
              <select
                value={form.licenseType}
                onChange={set("licenseType")}
                className={inputClass}
              >
                <option value="" disabled>
                  {licensePlaceholder}
                </option>
                {LICENSE_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
              <FieldError message={errors.licenseType} />
            </div>

            <div>
              <FieldLabel>
                {t(licenseNumberLabelKey)}
                <RequiredMark />
              </FieldLabel>
              <input
                type="text"
                value={form.licenseNumber}
                onChange={set("licenseNumber")}
                className={inputClass}
                placeholder={t(licenseNumberLabelKey)}
              />
              <FieldError message={errors.licenseNumber} />
            </div>
          </div>
        </SectionCard>

        {/* ── 3) بيانات المسؤول الرئيسي ── */}
        <SectionCard title={t("merchantAccount.sectionOwner")}>
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel>
                  {t("merchantAccount.firstName")}
                  <RequiredMark />
                </FieldLabel>
                <input type="text" value={form.ownerFirstName} onChange={set("ownerFirstName")} className={inputClass} />
                <FieldError message={errors.ownerFirstName} />
              </div>
              <div>
                <FieldLabel>
                  {t("merchantAccount.middleName")}
                  <span className="text-[--sub-light]"> ({t("merchantAccount.optional")})</span>
                </FieldLabel>
                <input type="text" value={form.ownerMiddleName} onChange={set("ownerMiddleName")} className={inputClass} />
              </div>
            </div>

            <div>
              <FieldLabel>
                {t("merchantAccount.lastName")}
                <RequiredMark />
              </FieldLabel>
              <input type="text" value={form.ownerLastName} onChange={set("ownerLastName")} className={inputClass} />
              <FieldError message={errors.ownerLastName} />
            </div>

            <div>
              <FieldLabel>
                {t("merchantAccount.email")}
                <RequiredMark />
              </FieldLabel>
              <input
                type="email"
                value={form.ownerEmail}
                onChange={set("ownerEmail")}
                dir="ltr"
                className={`${inputClass} text-left`}
                placeholder="name@example.com"
              />
              <FieldError message={errors.ownerEmail} />
            </div>

            {/* رمز الدولة prefix + رقم الجوال */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-4">
                <FieldLabel>
                  {t("merchantAccount.countryCode")}
                  <RequiredMark />
                </FieldLabel>
                <input
                  type="text"
                  value={form.ownerCountryCode}
                  onChange={set("ownerCountryCode")}
                  dir="ltr"
                  className={`${inputClass} text-left`}
                  placeholder="966"
                />
                <FieldError message={errors.ownerCountryCode} />
              </div>
              <div className="md:col-span-8">
                <FieldLabel>
                  {t("merchantAccount.phone")}
                  <RequiredMark />
                </FieldLabel>
                <input
                  type="text"
                  value={form.ownerPhone}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, "");
                    setForm((f) => ({ ...f, ownerPhone: v }));
                  }}
                  dir="ltr"
                  className={`${inputClass} text-left`}
                  placeholder="5xxxxxxxx"
                  inputMode="numeric"
                />
                <FieldError message={errors.ownerPhone} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-6">
                <FieldLabel>
                  {t("merchantAccount.addressCountry")}
                  <RequiredMark />
                </FieldLabel>
                <select value={form.addressCountry} onChange={set("addressCountry")} className={inputClass}>
                  <option value="" disabled>
                    {isAr ? "مثال: SA, EG, etc" : "Example: SA, EG, etc"}
                  </option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {isAr ? c.ar : c.en}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.addressCountry} />
              </div>
              <div className="md:col-span-6">
                <FieldLabel>
                  {t("merchantAccount.addressCity")}
                  <RequiredMark />
                </FieldLabel>
                <input type="text" value={form.addressCity} onChange={set("addressCity")} className={inputClass} />
                <FieldError message={errors.addressCity} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-6">
                <FieldLabel>
                  {t("merchantAccount.birthDate")}
                  <RequiredMark />
                </FieldLabel>
                <input type="date" value={form.birthDate} onChange={set("birthDate")} className={inputClass} />
                <p className="text-[11.5px] text-[var(--sub)] mt-1">YYYY-MM-DD</p>
                <FieldError message={errors.birthDate} />
              </div>
              <div className="md:col-span-6">
                <FieldLabel>
                  {t("merchantAccount.nationalId")}
                  <span className="text-[--sub-light]"> ({t("merchantAccount.optional")})</span>
                </FieldLabel>
                <input type="text" value={form.nationalIdNumber} onChange={set("nationalIdNumber")} className={inputClass} />
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="flex items-center justify-end gap-3">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? t("merchantAccount.saving") : t("merchantAccount.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
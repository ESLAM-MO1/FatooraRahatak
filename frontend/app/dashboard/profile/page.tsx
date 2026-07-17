"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { logout } from "@/lib/auth";

export default function ProfilePage() {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    api.get("/auth/profile").then((res) => {
      const d = res.data.data;
      setFullName(d.fullName);
      setEmail(d.email);
      setPhone(d.phone);
      setProfileImage(d.profileImage || "");
    }).catch(() => {
      setMessage({ type: "error", text: t("profile.loadError") });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put("/auth/profile", { fullName, email, phone, profileImage: profileImage || undefined });
      localStorage.setItem("fullName", fullName);
      localStorage.setItem("email", email);
      setMessage({ type: "success", text: t("profile.updateSuccess") });
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || t("profile.saveError") });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/products/upload-image", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setProfileImage(res.data.data.url);
    } catch {
      setMessage({ type: "error", text: t("profile.uploadFailed") });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="w-5 h-5 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-[22px] font-bold text-[var(--blue-deep)] mb-6">{t("common.profile")}</h1>

      {message && (
        <div className={`alert ${message.type === "success" ? "alert--success" : "alert--danger"} mb-4`}>
          {message.text}
        </div>
      )}

      <div className="card p-6 mb-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--border)] mb-3 bg-gray-100">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[32px] font-bold text-[var(--sub)] bg-gray-100">
                {fullName ? fullName.charAt(0) : "?"}
              </div>
            )}
          </div>
          <label className="text-[13px] text-[var(--blue)] font-bold cursor-pointer hover:underline">
            {t("profile.changeImage")}
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("profile.fullName")}</label>
            <div className="field-shell">
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("auth.email")}</label>
            <div className="field-shell">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("auth.phone")}</label>
            <div className="field-shell">
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary w-full disabled:opacity-60">
            {saving ? t("common.saving") : t("profile.saveChanges")}
          </button>
        </form>
      </div>

      <button onClick={() => logout()} className="btn btn-outline w-full">
        {t("common.logout")}
      </button>
    </div>
  );
}

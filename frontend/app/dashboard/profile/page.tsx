"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { logout } from "@/lib/auth";
import Toast from "@/components/Toast";
import PhoneInputField from "@/components/PhoneInputField";
import { normalizePhone } from "@/lib/phone";

type ApiError = { response?: { data?: { message?: string } } };

function errMessage(err: unknown, fallback: string): string {
  const e = err as ApiError;
  return e?.response?.data?.message || fallback;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const getStorageKey = () => "profileImage_" + (localStorage.getItem("userId") || "");

  useEffect(() => {
    api.get("/auth/profile")
      .then((res) => {
        const d = res.data.data;
        setFullName(d.fullName);
        setEmail(d.email);
        setPhone(d.phone || "");
        setProfileImage(d.profileImage || "");
      })
      .catch(() => {
        setMessage({ type: "error", text: t("profile.loadError") });
      })
      .finally(() => setLoading(false));

    api.get("/stores/my-store")
      .then((res) => {
        if (res.data?.data?.storeName) setStoreName(res.data.data.storeName);
      })
      .catch(() => {
        // لا يوجد متجر مرتبط — لا حاجة لرسالة
      });
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/auth/profile-image", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setProfileImage(res.data.data.url);
      localStorage.setItem(getStorageKey(), res.data.data.url);
      localStorage.setItem("profileImage", res.data.data.url);
      window.dispatchEvent(new Event("profileUpdated"));
      setMessage({ type: "success", text: t("profile.uploadSuccess") });
    } catch (err) {
      setMessage({ type: "error", text: errMessage(err, t("profile.uploadFailed")) });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const changingPassword = newPassword.length > 0 || confirmPassword.length > 0;
    if (changingPassword) {
      if (newPassword.length < 6) {
        setMessage({ type: "error", text: t("error.passwordLength") });
        return;
      }
      if (newPassword !== confirmPassword) {
        setMessage({ type: "error", text: t("error.passwordMismatch") });
        return;
      }
    }

    if (!otpStep) {
      setSaving(true);
      try {
        const res = await api.post("/auth/send-profile-otp");
        const code = res.data?.code || "";
        setOtpCode(code);
        setOtpStep(true);
        setMessage({ type: "success", text: `${res.data?.message || t("profile.otpSent")}${code ? ` — ${code}` : ""}` });
      } catch (err) {
        setMessage({ type: "error", text: errMessage(err, t("profile.saveError")) });
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      await api.put("/auth/profile", {
        fullName,
        email,
        phone: normalizePhone(phone, "SA") || phone,
        profileImage: profileImage || undefined,
        storeName: storeName || undefined,
        newPassword: changingPassword ? newPassword : undefined,
        code: otpCode,
      });
      localStorage.setItem("fullName", fullName);
      localStorage.setItem("email", email);
      localStorage.setItem(getStorageKey(), profileImage);
      localStorage.removeItem("profileImage");
      window.dispatchEvent(new Event("profileUpdated"));
      setOtpStep(false);
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
      if (changingPassword) {
        setMessage({ type: "success", text: t("profile.savedWithPassword") });
        setTimeout(() => logout(), 1800);
      } else {
        setMessage({ type: "success", text: t("profile.updateSuccess") });
      }
    } catch (err) {
      setMessage({ type: "error", text: errMessage(err, t("profile.saveError")) });
    } finally {
      setSaving(false);
    }
  };

  const cancelOtp = () => {
    setOtpStep(false);
    setOtpCode("");
    setMessage(null);
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

      {message && <Toast message={message.text} type={message.type} fixed />}

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

        <form onSubmit={handleSave} noValidate className="space-y-4">
          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("profile.fullName")}</label>
            <div className="field-shell">
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("profile.storeName")}</label>
            <div className="field-shell">
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
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
            <PhoneInputField value={phone} onChange={setPhone} required />
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <h2 className="text-[15px] font-bold text-[var(--blue-deep)] mb-1">{t("profile.changePassword")}</h2>
            <p className="text-[12px] text-[var(--sub)] mb-3">{t("profile.changePasswordHint")}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("profile.newPassword")}</label>
                <div className="field-shell">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("profile.confirmPassword")}</label>
                <div className="field-shell">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                  />
                </div>
              </div>
            </div>
          </div>

          {otpStep && (
            <div className="bg-[var(--green-soft)] border border-[#bfe8d7] rounded-[10px] p-4 space-y-3">
              <p className="text-[13px] font-bold text-[var(--green)]">{t("profile.enterOtp")}</p>
              <div className="field-shell">
                <input
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  maxLength={6}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn btn-primary flex-1 disabled:opacity-60">
              {saving ? t("common.loading") : otpStep ? t("profile.confirmSave") : t("profile.saveChanges")}
            </button>
            {otpStep && (
              <button type="button" onClick={cancelOtp} className="btn btn-outline disabled:opacity-60">
                {t("profile.cancel")}
              </button>
            )}
          </div>
        </form>
      </div>

      <button onClick={() => logout()} className="btn btn-outline w-full">
        {t("common.logout")}
      </button>
    </div>
  );
}

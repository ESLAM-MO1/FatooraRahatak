"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Setting {
  settingKey: string;
  settingValue: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/settings");
      setSettings(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleValueChange = (index: number, value: string) => {
    setSettings((prev) =>
      prev.map((s, i) => (i === index ? { ...s, settingValue: value } : s))
    );
  };

  const handleAddRow = () => {
    setSettings((prev) => [...prev, { settingKey: "", settingValue: "" }]);
  };

  const handleKeyChange = (index: number, key: string) => {
    setSettings((prev) =>
      prev.map((s, i) => (i === index ? { ...s, settingKey: key } : s))
    );
  };

  const handleRemoveRow = (index: number) => {
    setSettings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const validSettings = settings.filter((s) => s.settingKey.trim() !== "");
      await api.put("/admin/settings", { settings: validSettings });
      setSuccess("تم حفظ الإعدادات بنجاح");
      await loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--sub)]">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
        جارٍ التحميل...
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--blue-deep)]">الإعدادات العامة</h1>
        <button onClick={handleAddRow} className="btn-secondary">
          + إضافة إعداد جديد
        </button>
      </div>

      {error && <div className="alert alert--danger">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      <div className="card p-5 space-y-4">
        {settings.length === 0 && (
          <p className="text-[var(--sub)] text-sm">لا توجد إعدادات بعد. اضغط "إضافة إعداد جديد" للبدء.</p>
        )}

        {settings.map((setting, index) => (
          <div key={index} className="flex gap-3 items-center">
            <div className="field-shell w-1/3">
              <input
                type="text"
                placeholder="اسم الإعداد (مثل platform_name)"
                value={setting.settingKey}
                onChange={(e) => handleKeyChange(index, e.target.value)}
              />
            </div>
            <div className="field-shell flex-1">
              <input
                type="text"
                placeholder="القيمة"
                value={setting.settingValue}
                onChange={(e) => handleValueChange(index, e.target.value)}
              />
            </div>
            <button
              onClick={() => handleRemoveRow(index)}
              className="px-3 py-1.5 text-sm rounded-md text-[var(--danger)] hover:bg-[var(--danger-soft)] transition"
            >
              حذف
            </button>
          </div>
        ))}

        <div className="pt-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-40">
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      </div>
    </div>
  );
}
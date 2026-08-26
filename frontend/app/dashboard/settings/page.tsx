"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";

interface Setting {
  settingKey: string;
  settingValue: string;
}

interface BankAccount {
  bankName: string;
  accountHolder: string;
  iban: string;
}

const EMPTY_BANK: BankAccount = { bankName: "", accountHolder: "", iban: "" };

export default function SettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [bank, setBank] = useState<BankAccount>(EMPTY_BANK);
  const [bankSaved, setBankSaved] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/settings");
      const rows = res.data.data;
      setSettings(rows);
      // تحميل حساب المنصة البنكي إن وُجد (platform_bank_account)
      const bankRow = rows.find((r: Setting) => r.settingKey === "platform_bank_account");
      if (bankRow?.settingValue) {
        try {
          setBank(JSON.parse(bankRow.settingValue));
        } catch {
          setBank(EMPTY_BANK);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t("settings.loadError"));
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
      setSuccess(t("settings.saveSuccess"));
      await loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.message || t("settings.saveError"));
    } finally {
      setSaving(false);
    }
  };

  // حفظ حساب المنصة البنكي في platform_bank_account (JSON)
  const handleSaveBank = async () => {
    if (!bank.bankName.trim() || !bank.iban.trim()) {
      setError(t("settings.bankRequired"));
      return;
    }
    setBankSaved(true);
    setError("");
    setSuccess("");
    try {
      const idx = settings.findIndex((s) => s.settingKey === "platform_bank_account");
      const next = [...settings];
      if (idx >= 0) next[idx] = { settingKey: "platform_bank_account", settingValue: JSON.stringify(bank) };
      else next.push({ settingKey: "platform_bank_account", settingValue: JSON.stringify(bank) });
      await api.put("/admin/settings", { settings: next });
      setSuccess(t("settings.bankSaved"));
      await loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.message || t("settings.saveError"));
    } finally {
      setBankSaved(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <PageHeader icon="settings" title={t("settings.title")}>
        <button onClick={handleAddRow} className="btn btn-secondary">
          + {t("settings.addNew")}
        </button>
      </PageHeader>

      {error && <div className="alert alert--danger">{error}</div>}
      <SuccessToast message={success} fixed className="mb-4" />

      {/* ── حساب المنصة البنكي (واجهة مخصصة بدل JSON الخام) ── */}
      <div className="card p-5">
        <h3 className="text-[15px] font-bold text-[var(--ink)] mb-1">{t("settings.bankAccountTitle")}</h3>
        <p className="text-[12.5px] text-[var(--sub)] mb-4">{t("settings.bankAccountDesc")}</p>
        <div className="space-y-3">
          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("settings.bankName")}</label>
            <div className="field-shell">
              <input type="text" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} placeholder="مثال: البنك الأهلي السعودي" />
            </div>
          </div>
          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("settings.accountHolder")}</label>
            <div className="field-shell">
              <input type="text" value={bank.accountHolder} onChange={(e) => setBank({ ...bank, accountHolder: e.target.value })} placeholder="مثال: فاتورة راحتك" />
            </div>
          </div>
          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("settings.iban")}</label>
            <div className="field-shell">
              <input type="text" dir="ltr" value={bank.iban} onChange={(e) => setBank({ ...bank, iban: e.target.value })} placeholder="SA00 0000 0000 0000 0000 0000" />
            </div>
          </div>
          <button onClick={handleSaveBank} disabled={bankSaved} className="btn btn-primary disabled:opacity-40">
            {bankSaved ? t("common.saving") : t("settings.saveBank")}
          </button>
        </div>
      </div>

      {/* ── الإعدادات العامة (key-value) ── */}
      <div className="card p-5 space-y-4">
        {settings.length === 0 && (
          <p className="text-[var(--sub)] text-sm">{t("settings.noSettings")}</p>
        )}

        {settings.map((setting, index) => (
          <div key={index} className="flex gap-3 items-center">
            <div className="field-shell w-1/3">
              <input
                type="text"
                placeholder={t("settings.keyPlaceholder")}
                value={setting.settingKey}
                onChange={(e) => handleKeyChange(index, e.target.value)}
              />
            </div>
            <div className="field-shell flex-1">
              <input
                type="text"
                placeholder={t("settings.valuePlaceholder")}
                value={setting.settingValue}
                onChange={(e) => handleValueChange(index, e.target.value)}
              />
            </div>
            <button
              onClick={() => handleRemoveRow(index)}
              className="px-3 py-1.5 text-sm rounded-md text-[var(--danger)] hover:bg-[var(--danger-soft)] transition"
            >
              {t("common.delete")}
            </button>
          </div>
        ))}

        <div className="pt-2">
          <button onClick={handleSave} disabled={saving} className="btn btn-primary disabled:opacity-40">
            {saving ? t("common.saving") : t("settings.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

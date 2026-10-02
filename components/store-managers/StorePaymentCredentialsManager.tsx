"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import ToggleSwitch from "@/components/ToggleSwitch";
import SuccessToast from "@/components/SuccessToast";
import "@/lib/i18n/config";

type Provider = "Tabby" | "Tamara";

interface Status {
  provider: string;
  publicKey: string | null;
  merchantCode: string | null;
  hasSecretKey: boolean;
  hasNotificationToken: boolean;
  isEnabled: boolean;
  isTestMode: boolean;
  isConfigured: boolean;
}

interface FormState {
  publicKey: string;
  secretKey: string;
  merchantCode: string;
  notificationToken: string;
  isEnabled: boolean;
  isTestMode: boolean;
}

const emptyForm: FormState = {
  publicKey: "",
  secretKey: "",
  merchantCode: "",
  notificationToken: "",
  isEnabled: false,
  isTestMode: false,
};

const PROVIDERS: Provider[] = ["Tabby", "Tamara"];

export default function StorePaymentCredentialsManager({ storeId }: { storeId?: number }) {
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [forms, setForms] = useState<Record<Provider, FormState>>({ Tabby: emptyForm, Tamara: emptyForm });
  const [saving, setSaving] = useState<Provider | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/stores/payment-credentials");
      const list = res.data.data as Status[];
      const map: Record<string, Status> = {};
      list.forEach((s) => {
        map[s.provider] = s;
      });
      setStatuses(map);
      setForms((prev) => {
        const next = { ...prev };
        list.forEach((s) => {
          const key = s.provider as Provider;
          if (key in next) {
            next[key] = {
              publicKey: s.publicKey || "",
              merchantCode: s.merchantCode || "",
              isEnabled: s.isEnabled,
              isTestMode: s.isTestMode,
              secretKey: "",
              notificationToken: "",
            };
          }
        });
        return next;
      });
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.genericError"));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (p: Provider, patch: Partial<FormState>) => {
    setForms((prev) => ({ ...prev, [p]: { ...prev[p], ...patch } }));
  };

  const save = async (p: Provider) => {
    setSaving(p);
    setError("");
    setSuccess("");
    const f = forms[p];
    try {
      await api.put("/stores/payment-credentials", {
        provider: p,
        publicKey: f.publicKey || null,
        secretKey: f.secretKey || null,
        merchantCode: f.merchantCode || null,
        notificationToken: f.notificationToken || null,
        isEnabled: f.isEnabled,
        isTestMode: f.isTestMode,
      });
      setSuccess(t("storeSettings.bnplSaved"));
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeSettings.genericError"));
    } finally {
      setSaving(null);
    }
  };

  const apiBase = String(api.defaults.baseURL || "").replace(/\/$/, "");
  const tabbyWebhook = `${apiBase}/payments/webhook/tabby/${storeId ?? ""}`;

  const renderInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { secret?: boolean; hasValue?: boolean }
  ) => (
    <div>
      <label>{label}</label>
      <div className="field-shell">
        <input
          type={opts?.secret ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={opts?.secret && opts.hasValue ? "••••••••" : ""}
          autoComplete="off"
          dir="ltr"
        />
      </div>
      {opts?.secret && opts.hasValue && (
        <p className="text-[11px] text-[var(--sub)] mt-1">{t("storeSettings.bnplSecretKept")}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {error && <div className="alert alert--danger">{error}</div>}
      <SuccessToast message={success} fixed className="mb-2" />
      <p className="text-[12px] text-[var(--sub)]">{t("storeSettings.bnplDesc")}</p>

      {PROVIDERS.map((p) => {
        const f = forms[p];
        const s = statuses[p];
        return (
          <div key={p} className="border border-gray-100 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-bold text-[var(--ink)]">{t(`storeSettings.payment${p}`)}</p>
                <span className={s?.isConfigured ? "badge badge--green" : "badge badge--gray"}>
                  {s?.isConfigured ? t("storeSettings.bnplConfigured") : t("storeSettings.bnplIncomplete")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[var(--sub)]">{t("storeSettings.bnplEnable")}</span>
                <ToggleSwitch enabled={f.isEnabled} onToggle={() => setField(p, { isEnabled: !f.isEnabled })} />
              </div>
            </div>

            {p === "Tabby" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderInput(t("storeSettings.bnplPublicKey"), f.publicKey, (v) => setField(p, { publicKey: v }))}
                {renderInput(t("storeSettings.bnplMerchantCode"), f.merchantCode, (v) => setField(p, { merchantCode: v }))}
                {renderInput(t("storeSettings.bnplSecretKey"), f.secretKey, (v) => setField(p, { secretKey: v }), {
                  secret: true,
                  hasValue: !!s?.hasSecretKey,
                })}
              </div>
            )}

            {p === "Tamara" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderInput(t("storeSettings.bnplApiToken"), f.secretKey, (v) => setField(p, { secretKey: v }), {
                  secret: true,
                  hasValue: !!s?.hasSecretKey,
                })}
                {renderInput(t("storeSettings.bnplNotificationToken"), f.notificationToken, (v) => setField(p, { notificationToken: v }), {
                  secret: true,
                  hasValue: !!s?.hasNotificationToken,
                })}
                <div className="flex items-center gap-2 pt-6">
                  <ToggleSwitch enabled={f.isTestMode} onToggle={() => setField(p, { isTestMode: !f.isTestMode })} />
                  <span className="text-[12.5px] text-[var(--ink)]">{t("storeSettings.bnplTestMode")}</span>
                </div>
              </div>
            )}

            {p === "Tabby" && storeId && (
              <div>
                <label>{t("storeSettings.bnplWebhook")}</label>
                <div className="field-shell">
                  <input type="text" value={tabbyWebhook} readOnly dir="ltr" />
                </div>
              </div>
            )}

            <button type="button" onClick={() => save(p)} disabled={saving === p} className="btn btn-primary btn-sm">
              {saving === p ? t("storeSettings.saving") : t("storeSettings.save")}
            </button>
          </div>
        );
      })}
    </div>
  );
}

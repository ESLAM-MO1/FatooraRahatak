"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import ToggleSwitch from "@/components/ToggleSwitch";
import SuccessToast from "@/components/SuccessToast";
import "@/lib/i18n/config";

type Provider = "Moyasar" | "Tabby" | "Tamara";

interface Status {
  provider: string;
  publicKey: string | null;
  merchantCode: string | null;
  hasSecretKey: boolean;
  hasNotificationToken: boolean;
  isEnabled: boolean;
  isTestMode: boolean;
  isConfigured: boolean;
  secretKey: string | null;
  notificationToken: string | null;
}

interface FormState {
  publicKey: string;
  merchantCode: string;
  secretKey: string;
  notificationToken: string;
  tabbyWebhookBaseUrl: string;
  isTestMode: boolean;
}

const PROVIDERS: Provider[] = ["Moyasar", "Tabby", "Tamara"];

const emptyForm: FormState = {
  publicKey: "",
  merchantCode: "",
  secretKey: "",
  notificationToken: "",
  tabbyWebhookBaseUrl: "",
  isTestMode: false,
};

export default function StorePaymentCredentialsManager({ storeId: _storeId }: { storeId?: number } = {}) {
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<Record<Provider, Status | null>>({
    Moyasar: null,
    Tabby: null,
    Tamara: null,
  });
  const [forms, setForms] = useState<Record<Provider, FormState>>({
    Moyasar: { ...emptyForm },
    Tabby: { ...emptyForm },
    Tamara: { ...emptyForm },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Provider | null>(null);
  const [testing, setTesting] = useState<Provider | null>(null);
  const [testResults, setTestResults] = useState<Record<Provider, { ok: boolean; msg: string } | null>>({
    Moyasar: null,
    Tabby: null,
    Tamara: null,
  });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await api.get("/stores/payment-credentials");
      const list: Status[] = res.data.data || [];
      const map: Record<Provider, Status | null> = { Moyasar: null, Tabby: null, Tamara: null };
      const f: Record<Provider, FormState> = {
        Moyasar: { ...emptyForm },
        Tabby: { ...emptyForm },
        Tamara: { ...emptyForm },
      };
      list.forEach((s) => {
        const p = s.provider as Provider;
        if (!PROVIDERS.includes(p)) return;
        map[p] = s;
        f[p] = {
          publicKey: s.publicKey || "",
          merchantCode: s.merchantCode || "",
          secretKey: s.secretKey || "",
          notificationToken: s.notificationToken || "",
          tabbyWebhookBaseUrl: "",
          isTestMode: !!s.isTestMode,
        };
      });
      setStatuses(map);
      setForms(f);
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const save = async (p: Provider) => {
    setSaving(p);
    setError("");
    try {
      const f = forms[p];
      await api.put("/stores/payment-credentials", {
        provider: p,
        publicKey: f.publicKey || null,
        secretKey: f.secretKey || null,
        merchantCode: f.merchantCode || null,
        notificationToken: f.notificationToken || null,
        isEnabled: statuses[p]?.isEnabled ?? false,
        isTestMode: f.isTestMode,
      });
      setToast(true);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || t("common.error"));
    } finally {
      setSaving(null);
    }
  };

  const toggleEnabled = async (p: Provider) => {
    const current = statuses[p];
    if (!current) return;
    setError("");
    try {
      const f = forms[p];
      await api.put("/stores/payment-credentials", {
        provider: p,
        publicKey: f.publicKey || null,
        secretKey: f.secretKey || null,
        merchantCode: f.merchantCode || null,
        notificationToken: f.notificationToken || null,
        isEnabled: !current.isEnabled,
        isTestMode: f.isTestMode,
      });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || t("common.error"));
    }
  };

  const test = async (p: Provider) => {
    setTesting(p);
    setError("");
    try {
      const f = forms[p];
      const res = await api.post("/stores/payment-credentials/test", {
        provider: p,
        publicKey: f.publicKey || null,
        secretKey: f.secretKey || null,
        merchantCode: f.merchantCode || null,
        notificationToken: f.notificationToken || null,
        isTestMode: f.isTestMode,
      });
      setTestResults((prev) => ({
        ...prev,
        [p]: { ok: !!res.data.success, msg: res.data.message || "" },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [p]: { ok: false, msg: err?.response?.data?.message || t("common.error") },
      }));
    } finally {
      setTesting(null);
    }
  };

  const renderInput = (
    p: Provider,
    field: keyof FormState,
    label: string,
    placeholder: string,
    type: "text" | "password" = "text"
  ) => (
    <div>
      <label className="form-label">{label}</label>
      <div className="field-shell" style={{ position: "relative" }}>
        <input
          className="form-input"
          type={type === "password" && revealed[`${p}:${field}`] ? "text" : type}
          placeholder={placeholder}
          value={String(forms[p][field] ?? "")}
          onChange={(e) =>
            setForms((prev) => ({
              ...prev,
              [p]: { ...prev[p], [field]: e.target.value },
            }))
          }
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() =>
              setRevealed((prev) => ({
                ...prev,
                [`${p}:${field}`]: !prev[`${p}:${field}`],
              }))
            }
            className="btn btn--ghost btn--sm"
            style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)" }}
          >
            {revealed[`${p}:${field}`] ? "🙈" : "👁"}
          </button>
        )}
      </div>
    </div>
  );

  const renderTestResult = (p: Provider) => {
    const r = testResults[p];
    if (!r) return null;
    return (
      <div style={{ fontSize: 13, marginTop: 8, color: r.ok ? "#16a34a" : "#dc2626" }}>{r.msg}</div>
    );
  };

  if (loading) return <div className="card"><div className="card__body">{t("common.loading")}</div></div>;

  return (
    <div className="stack">
      <SuccessToast message={toast ? t("common.saved") : null} onClose={() => setToast(false)} />
      {error && <div className="alert alert--danger">{error}</div>}

      {PROVIDERS.map((p) => {
        const s = statuses[p];
        const f = forms[p];
        const configured = !!s?.isConfigured;
        const badgeClass = configured && s?.isEnabled ? "badge badge--green" : configured ? "badge" : "badge badge--danger";
        const badgeText = configured && s?.isEnabled
          ? t("storeSettings.gatewayEnabled")
          : configured
          ? t("storeSettings.gatewayDisabled")
          : t("storeSettings.gatewayIncomplete");
        return (
          <div key={p} className="card">
            <div className="card__body">
              <div className="flex items-center justify-between gap-3 flex-wrap" style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>{t(`storeSettings.payment${p}`)}</h3>
                <div className="flex items-center gap-2">
                  <span className={badgeClass}>{badgeText}</span>
                  <ToggleSwitch
                    enabled={!!s?.isEnabled}
                    onToggle={() => toggleEnabled(p)}
                  />
                </div>
              </div>

              <div className="form-grid form-grid--2">
                {p === "Moyasar" && (
                  <>
                    {renderInput(p, "publicKey", t("storeSettings.bnplPublicKey"), t("storeSettings.bnplPublicKeyPlaceholder"))}
                    {renderInput(p, "secretKey", t("storeSettings.bnplSecretKey"), t("storeSettings.bnplSecretKeyPlaceholder"), "password")}
                  </>
                )}
                {p === "Tabby" && (
                  <>
                    {renderInput(p, "publicKey", t("storeSettings.bnplPublicKey"), t("storeSettings.bnplPublicKeyPlaceholder"))}
                    {renderInput(p, "merchantCode", t("storeSettings.tabbyMerchantCode"), t("storeSettings.tabbyMerchantCodePlaceholder"))}
                    {renderInput(p, "secretKey", t("storeSettings.bnplSecretKey"), t("storeSettings.bnplSecretKeyPlaceholder"), "password")}
                    {renderInput(p, "tabbyWebhookBaseUrl", t("storeSettings.tabbyWebhookUrl"), t("storeSettings.tabbyWebhookUrlPlaceholder"))}
                  </>
                )}
                {p === "Tamara" && (
                  <>
                    {renderInput(p, "secretKey", t("storeSettings.bnplSecretKey"), t("storeSettings.bnplSecretKeyPlaceholder"), "password")}
                    {renderInput(p, "notificationToken", t("storeSettings.tamaraNotificationToken"), t("storeSettings.tamaraNotificationTokenPlaceholder"), "password")}
                  </>
                )}
              </div>

              {(p === "Tabby" || p === "Tamara") && (
                <div style={{ marginTop: 12 }}>
                  <label className="toggle-row" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <ToggleSwitch
                      enabled={f.isTestMode}
                      onToggle={() => setForms((prev) => ({ ...prev, [p]: { ...prev[p], isTestMode: !f.isTestMode } }))}
                    />
                    <span style={{ fontSize: 14 }}>{t("storeSettings.useSandbox")}</span>
                  </label>
                </div>
              )}

              {f.isTestMode && <div className="alert alert--info" style={{ marginTop: 12 }}>{t("storeSettings.testModeActive")}</div>}

              {s?.hasSecretKey === false && <div className="alert alert--info" style={{ marginTop: 12 }}>{t("storeSettings.bnplSecretKept")}</div>}

              {renderTestResult(p)}

              <div className="flex items-center justify-end gap-3 flex-wrap" style={{ marginTop: 20 }}>
                <button type="button" className="btn btn--secondary" onClick={() => test(p)} disabled={testing === p || saving === p}>
                  {testing === p ? `${t("storeSettings.testConnection")}…` : `⚡ ${t("storeSettings.testConnection")}`}
                </button>
                <button type="button" className="btn btn--primary" onClick={() => save(p)} disabled={saving === p || testing === p}>
                  {saving === p ? `${t("common.save")}…` : t("common.save")}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

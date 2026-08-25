"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import Can from "@/components/Can";
import { useConfirm } from "@/components/ConfirmDialog";

interface PlatformIntegration {
  id: number;
  storeId: number;
  platformCode: string;
  apiKeyMasked: string | null;
  apiSecretMasked: string | null;
  storeUrl: string | null;
  isConnected: boolean;
  isEnabled: boolean;
  syncProducts: boolean;
  syncOrders: boolean;
  syncInventory: boolean;
  lastSyncedAt: string | null;
  lastSyncMessage: string | null;
}

interface PlatformGroup {
  key: string;
  labelKey: string;
  platforms: string[];
}

const PLATFORM_GROUPS: PlatformGroup[] = [
  {
    key: "local",
    labelKey: "integrations.groupLocal",
    platforms: ["Salla", "Zid", "Shopify", "WooCommerce"],
  },
  {
    key: "marketplaces",
    labelKey: "integrations.groupMarketplaces",
    platforms: ["Noon", "Amazon", "Jahez", "HungerStation"],
  },
  {
    key: "global",
    labelKey: "integrations.groupGlobal",
    platforms: ["Alibaba", "AliExpress", "Temu"],
  },
];

interface PlatformMeta {
  domain: string;
  color: string;
}

const PLATFORM_META: Record<string, PlatformMeta> = {
  Salla: { domain: "salla.sa", color: "#00857D" },
  Zid: { domain: "zid.sa", color: "#1D5B8C" },
  Shopify: { domain: "shopify.com", color: "#96BF48" },
  WooCommerce: { domain: "woocommerce.com", color: "#7F54B3" },
  Noon: { domain: "noon.com", color: "#FFC400" },
  Amazon: { domain: "amazon.sa", color: "#FF9900" },
  Jahez: { domain: "jahez.net", color: "#E4002B" },
  HungerStation: { domain: "hungerstation.com", color: "#FEBD11" },
  Alibaba: { domain: "alibaba.com", color: "#FF6A00" },
  AliExpress: { domain: "aliexpress.com", color: "#E62E04" },
  Temu: { domain: "temu.com", color: "#B0201A" },
};

const FAVICON_URL = "https://www.google.com/s2/favicons?domain=";

const emptyForm = {
  apiKey: "",
  apiSecret: "",
  storeUrl: "",
  syncProducts: true,
  syncOrders: true,
  syncInventory: true,
};

export default function IntegrationsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [integrations, setIntegrations] = useState<PlatformIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [connectingCode, setConnectingCode] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/stores/platform-integrations");
      setIntegrations(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || t("integrations.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const integrationFor = (code: string) => integrations.find((i) => i.platformCode === code);

  const openConnect = (code: string) => {
    const existing = integrationFor(code);
    setConnectingCode(code);
    setForm({
      apiKey: "",
      apiSecret: "",
      storeUrl: existing?.storeUrl || "",
      syncProducts: existing?.syncProducts ?? true,
      syncOrders: existing?.syncOrders ?? true,
      syncInventory: existing?.syncInventory ?? true,
    });
    setError("");
    setShowModal(true);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.post("/stores/platform-integrations/connect", {
        platformCode: connectingCode,
        apiKey: form.apiKey || null,
        apiSecret: form.apiSecret || null,
        storeUrl: form.storeUrl || null,
        syncProducts: form.syncProducts,
        syncOrders: form.syncOrders,
        syncInventory: form.syncInventory,
      });
      setSuccess(res.data.message || t("integrations.connected"));
      setShowModal(false);
      setForm(emptyForm);
      await fetchIntegrations();
    } catch (err: any) {
      setError(err.response?.data?.message || t("integrations.connectError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (integration: PlatformIntegration) => {
    if (!(await confirm({ title: t("integrations.confirmDisconnect"), message: platformLabel(integration.platformCode), confirmLabel: t("common.confirm"), danger: true }))) return;
    setError("");
    setSuccess("");
    try {
      const res = await api.delete(`/stores/platform-integrations/${integration.id}`);
      setSuccess(res.data.message || t("integrations.disconnected"));
      await fetchIntegrations();
    } catch (err: any) {
      setError(err.response?.data?.message || t("integrations.disconnectError"));
    }
  };

  const handleToggle = async (integration: PlatformIntegration) => {
    setTogglingId(integration.id);
    setError("");
    try {
      await api.put(`/stores/platform-integrations/${integration.id}`, { isEnabled: !integration.isEnabled });
      setIntegrations((prev) => prev.map((i) => (i.id === integration.id ? { ...i, isEnabled: !i.isEnabled } : i)));
    } catch (err: any) {
      setError(err.response?.data?.message || t("integrations.toggleError"));
    } finally {
      setTogglingId(null);
    }
  };

  const platformLabel = (code: string) => t(`integrations.platform.${code}`, code);

  const platformDesc = (code: string) => t(`integrations.desc.${code}`, "");

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader icon="link" title={t("integrations.title")}>
        <p className="text-[12.5px] text-[var(--sub)] max-w-md hidden md:block">{t("integrations.subtitle")}</p>
      </PageHeader>

      {error && <div className="alert alert--danger">{error}</div>}
      <SuccessToast message={success} fixed className="mb-4" />

      {PLATFORM_GROUPS.map((group) => (
        <div key={group.key}>
          <h3 className="text-[15px] font-bold text-[var(--ink)] mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full" style={{ background: "var(--gold)" }} />
            {t(group.labelKey)}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.platforms.map((code) => {
              const integration = integrationFor(code);
              const meta = PLATFORM_META[code] || { icon: code[0], color: "#6366F1" };
              return (
                <div key={code} className="card p-5 flex flex-col" style={{ opacity: integration?.isEnabled === false ? 0.6 : 1 }}>
                  <div className="flex items-center gap-3">
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shrink-0 overflow-hidden bg-white border"
                      style={{ borderColor: `${meta.color}55` }}
                    >
                      <img
                        src={`${FAVICON_URL}${meta.domain}&sz=64`}
                        alt={platformLabel(code)}
                        className="w-7 h-7 object-contain"
                        loading="lazy"
                        onError={(e) => {
                          const el = e.currentTarget;
                          el.style.display = "none";
                          if (el.parentElement) el.parentElement.style.background = meta.color;
                          if (el.parentElement) el.parentElement.style.color = "#fff";
                          el.parentElement!.textContent = code[0];
                        }}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-[var(--ink)]">{platformLabel(code)}</p>
                      <p className="text-[11px] text-[var(--sub)] line-clamp-2">{platformDesc(code)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mt-4">
                    {integration?.isConnected ? (
                      <>
                        <span className="badge badge--green">{t("integrations.connectedBadge")}</span>
                        {!integration.isEnabled && <span className="badge badge--gray">{t("integrations.disabled")}</span>}
                        {integration.lastSyncedAt && (
                          <span className="text-[10.5px] text-[var(--sub)]">
                            {t("integrations.lastSync")}: {new Date(integration.lastSyncedAt).toLocaleDateString()}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="badge badge--gray">{t("integrations.notConnected")}</span>
                    )}
                  </div>

                  {integration?.isConnected && (
                    <div className="flex items-center gap-2 flex-wrap mt-2 text-[11px] text-[var(--sub)]">
                      {integration.syncProducts && <span className="badge badge--blue">{t("integrations.syncProducts")}</span>}
                      {integration.syncOrders && <span className="badge badge--blue">{t("integrations.syncOrders")}</span>}
                      {integration.syncInventory && <span className="badge badge--blue">{t("integrations.syncInventory")}</span>}
                      {!integration.syncProducts && !integration.syncOrders && !integration.syncInventory && (
                        <span className="text-[11px] text-[var(--sub)]">{t("integrations.noSync")}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                    <Can code="StoreSettings.Edit">
                      <button onClick={() => openConnect(code)} className="btn btn-primary btn-sm">
                        {integration?.isConnected ? t("integrations.manage") : t("integrations.connect")}
                      </button>
                      {integration?.isConnected && (
                        <>
                          <button
                            onClick={() => handleToggle(integration)}
                            disabled={togglingId === integration.id}
                            className="btn btn-outline btn-sm"
                          >
                            {togglingId === integration.id ? t("common.loading") : integration.isEnabled ? t("integrations.disable") : t("integrations.enable")}
                          </button>
                          <button onClick={() => handleDisconnect(integration)} className="btn btn-danger btn-sm">
                            {t("integrations.disconnect")}
                          </button>
                        </>
                      )}
                    </Can>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="card p-5 mt-2" style={{ background: "var(--blue-50)/40" }}>
        <p className="text-[13px] font-bold text-[var(--ink)] mb-1">{t("integrations.noteTitle")}</p>
        <p className="text-[12px] text-[var(--sub)] leading-6">{t("integrations.noteDesc")}</p>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-bold text-[var(--blue-deep)]">
                {t("integrations.connectTitle")} — {platformLabel(connectingCode)}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
            </div>
            <form onSubmit={handleConnect}>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-bold text-[var(--ink)] mb-1.5">{t("integrations.apiKey")}</label>
                  <div className="field-shell">
                    <input type="text" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder={t("integrations.apiKeyPlaceholder")} />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-[var(--ink)] mb-1.5">{t("integrations.apiSecret")}</label>
                  <div className="field-shell">
                    <input type="password" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} placeholder={t("integrations.apiSecretPlaceholder")} />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-[var(--ink)] mb-1.5">{t("integrations.storeUrl")}</label>
                  <div className="field-shell">
                    <input type="text" dir="ltr" value={form.storeUrl} onChange={(e) => setForm({ ...form, storeUrl: e.target.value })} placeholder="https://…" />
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <p className="text-[12.5px] font-bold text-[var(--ink)]">{t("integrations.syncSettings")}</p>
                  {[
                    { key: "syncProducts" as const, label: t("integrations.syncProducts"), desc: t("integrations.syncProductsDesc") },
                    { key: "syncOrders" as const, label: t("integrations.syncOrders"), desc: t("integrations.syncOrdersDesc") },
                    { key: "syncInventory" as const, label: t("integrations.syncInventory"), desc: t("integrations.syncInventoryDesc") },
                  ].map((item) => (
                    <label key={item.key} className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 accent-[var(--blue)]"
                        checked={form[item.key]}
                        onChange={(e) => setForm({ ...form, [item.key]: e.target.checked })}
                      />
                      <span>
                        <span className="block text-[12.5px] font-bold text-[var(--ink)]">{item.label}</span>
                        <span className="block text-[11px] text-[var(--sub)]">{item.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 mt-6">
                <button type="submit" disabled={saving} className="btn btn-primary flex-1 py-2.5">
                  {saving ? t("common.saving") : t("integrations.saveAndConnect")}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline flex-1 py-2.5">
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
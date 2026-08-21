"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { useConfirm } from "@/components/ConfirmDialog";

interface Integration {
  id: number;
  channel: string;
  code: string | null;
  additionalCode: string | null;
  isEnabled: boolean;
  accessTokenMasked: string | null;
  hasAccessToken: boolean;
  enableServerSideTracking: boolean;
  supportsServerSideTracking: boolean;
}

interface Campaign {
  id: number;
  name: string;
  channel: string;
  couponCode: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

interface ChannelPerformance {
  channel: string;
  ordersCount: number;
  revenue: number;
  customersCount: number;
  sharePct: number;
}

const CHANNELS = ["FacebookPixel", "GoogleAnalytics", "TikTokPixel", "SnapchatPixel", "WhatsAppBusiness"] as const;

const emptyCampaign = { name: "", channel: "FacebookPixel", couponCode: "", startDate: "", endDate: "", isActive: true };

export default function MarketingPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [performances, setPerformances] = useState<ChannelPerformance[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCampaign, setShowCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState(emptyCampaign);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [savingChannel, setSavingChannel] = useState<string | null>(null);
  const [tokenDrafts, setTokenDrafts] = useState<Record<string, string>>({});
  const [serverTrackingDrafts, setServerTrackingDrafts] = useState<Record<string, boolean>>({});
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});

  const SERVER_SIDE_CHANNELS = ["FacebookPixel", "GoogleAnalytics"];

  const channelLabel = (c: string) => t(`marketing.channel.${c}`, c);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [intRes, perfRes, campRes] = await Promise.all([
        api.get("/owner/marketing/integrations"),
        api.get("/owner/marketing/performance"),
        api.get("/owner/marketing/campaigns"),
      ]);
      setIntegrations(intRes.data.data || []);
      setPerformances(perfRes.data.data?.channels || []);
      setTotalOrders(perfRes.data.data?.totalTrackedOrders || 0);
      setTotalRevenue(perfRes.data.data?.totalTrackedRevenue || 0);
      setCampaigns(campRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || t("marketing.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const integrationFor = (channel: string) => integrations.find((i) => i.channel === channel);

  const saveIntegration = async (channel: string) => {
    const existing = integrationFor(channel);
    const code = existing?.code || "";
    const isServerSide = SERVER_SIDE_CHANNELS.includes(channel);
    const draftToken = tokenDrafts[channel];
    const draftEnabled = serverTrackingDrafts[channel] ?? existing?.enableServerSideTracking ?? false;

    setSavingChannel(channel);
    setError("");
    try {
      await api.put("/owner/marketing/integrations", {
        channel,
        code,
        additionalCode: existing?.additionalCode || null,
        isEnabled: existing?.isEnabled ?? true,
        // draftToken == undefined يعني المستخدم مامسّش الحقل، فمن غير المفروض نستبدل التوكن المحفوظ.
        // لو اتكتب فيه حاجة (حتى لو فاضية بعد المسح) نبعتها صراحةً.
        accessToken: isServerSide ? draftToken : undefined,
        enableServerSideTracking: isServerSide ? draftEnabled : false,
      });
      setSuccess(t("marketing.saved"));
      setTokenDrafts((d) => { const n = { ...d }; delete n[channel]; return n; });
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || t("marketing.saveError"));
    } finally {
      setSavingChannel(null);
    }
  };

  const testConversion = async (integration: Integration) => {
    setTestingChannel(integration.channel);
    setTestResults((r) => { const n = { ...r }; delete n[integration.channel]; return n; });
    setError("");
    try {
      const res = await api.post(`/owner/marketing/integrations/${integration.id}/test`);
      setTestResults((r) => ({ ...r, [integration.channel]: { success: res.data.success, message: res.data.message } }));
    } catch (err: any) {
      setTestResults((r) => ({ ...r, [integration.channel]: { success: false, message: err.response?.data?.message || t("marketing.testError") } }));
    } finally {
      setTestingChannel(null);
    }
  };

  const toggleIntegration = async (channel: string) => {
    const existing = integrationFor(channel);
    if (!existing) return;
    setError("");
    try {
      await api.put(`/owner/marketing/integrations/${existing.id}/toggle`);
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || t("marketing.saveError"));
    }
  };

  const updateCode = (channel: string, value: string) => {
    setIntegrations((list) =>
      list.some((i) => i.channel === channel)
        ? list.map((i) => (i.channel === channel ? { ...i, code: value } : i))
        : [...list, { id: 0, channel, code: value, additionalCode: null, isEnabled: true, accessTokenMasked: null, hasAccessToken: false, enableServerSideTracking: false, supportsServerSideTracking: false }]
    );
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.name.trim()) { setError(t("marketing.campaignNameRequired")); return; }
    const payload = {
      name: campaignForm.name.trim(),
      channel: campaignForm.channel,
      couponCode: campaignForm.couponCode.trim() || null,
      startDate: campaignForm.startDate || null,
      endDate: campaignForm.endDate || null,
      isActive: campaignForm.isActive,
    };
    setSavingCampaign(true);
    setError("");
    try {
      if (editingCampaign) {
        await api.put(`/owner/marketing/campaigns/${editingCampaign.id}`, payload);
      } else {
        await api.post("/owner/marketing/campaigns", payload);
      }
      setSuccess(t("marketing.campaignSaved"));
      setShowCampaign(false);
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || t("marketing.saveError"));
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleDeleteCampaign = async (c: Campaign) => {
    if (!(await confirm({ title: t("marketing.deleteCampaign"), message: c.name, confirmLabel: t("common.confirm"), danger: true }))) return;
    try {
      await api.delete(`/owner/marketing/campaigns/${c.id}`);
      setSuccess(t("marketing.campaignDeleted"));
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || t("marketing.saveError"));
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader icon="share" title={t("marketing.title")} />

      {error && <div className="alert alert--danger">{error}</div>}
      <SuccessToast message={success} fixed className="mb-4" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-[12px] text-[var(--sub)]">{t("marketing.trackedOrders")}</p>
          <p className="text-2xl font-bold text-[var(--ink)] mt-1">{totalOrders}</p>
        </div>
        <div className="card p-5">
          <p className="text-[12px] text-[var(--sub)]">{t("marketing.trackedRevenue")}</p>
          <p className="text-2xl font-bold text-[var(--ink)] mt-1">{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="card p-5">
          <p className="text-[12px] text-[var(--sub)]">{t("marketing.channelsCount")}</p>
          <p className="text-2xl font-bold text-[var(--ink)] mt-1">{performances.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5">
            <h3 className="text-[15px] font-bold text-[var(--ink)] mb-4">{t("marketing.integrationsTitle")}</h3>
            <div className="space-y-3">
              {CHANNELS.map((channel) => {
                const existing = integrationFor(channel);
                const enabled = existing?.isEnabled ?? false;
                const code = existing?.code || "";
                const isServerSide = SERVER_SIDE_CHANNELS.includes(channel);
                const advancedOpen = showAdvanced[channel] ?? false;
                const draftEnabled = serverTrackingDrafts[channel] ?? existing?.enableServerSideTracking ?? false;
                const draftToken = tokenDrafts[channel];
                const testResult = testResults[channel];
                return (
                  <div key={channel} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-[180px]">
                        <p className="text-[13px] font-bold text-[var(--ink)]">{channelLabel(channel)}</p>
                        <p className="text-[11px] text-[var(--sub)]">{t("marketing.channelDesc")}</p>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <div className="field-shell !mb-0">
                          <input
                            type="text"
                            value={code}
                            onChange={(e) => updateCode(channel, e.target.value)}
                            placeholder={t("marketing.codePlaceholder")}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleIntegration(channel)}
                        disabled={!existing}
                        className={`text-[11.5px] font-bold px-3 py-1.5 rounded-lg transition-colors ${enabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-[var(--sub)]"}`}
                      >
                        {enabled ? t("marketing.enabled") : t("marketing.disabled")}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveIntegration(channel)}
                        disabled={savingChannel === channel}
                        className="btn-primary btn-sm"
                      >
                        {savingChannel === channel ? t("common.loading") : t("common.save")}
                      </button>
                    </div>

                    {isServerSide && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setShowAdvanced((s) => ({ ...s, [channel]: !advancedOpen }))}
                          className="text-[11.5px] font-bold text-[var(--blue)] flex items-center gap-1"
                        >
                          {advancedOpen ? t("marketing.hideConversionApi") : t("marketing.showConversionApi")}
                          {existing?.enableServerSideTracking && (
                            <span className="badge badge--green">{t("marketing.conversionApiActive")}</span>
                          )}
                        </button>

                        {advancedOpen && (
                          <div className="mt-3 space-y-3 bg-[var(--blue-50)]/40 rounded-lg p-3">
                            <p className="text-[11px] text-[var(--sub)] leading-5">
                              {channel === "FacebookPixel" ? t("marketing.metaCapiHelp") : t("marketing.ga4Help")}
                            </p>
                            <div>
                              <label className="mb-1 block text-[11.5px] font-bold text-[var(--ink)]">
                                {channel === "FacebookPixel" ? t("marketing.metaAccessToken") : t("marketing.ga4ApiSecret")}
                              </label>
                              <div className="field-shell !mb-0">
                                <input
                                  type="password"
                                  value={draftToken ?? ""}
                                  onChange={(e) => setTokenDrafts((d) => ({ ...d, [channel]: e.target.value }))}
                                  placeholder={existing?.hasAccessToken ? existing.accessTokenMasked || "" : t("marketing.tokenPlaceholder")}
                                />
                              </div>
                              {existing?.hasAccessToken && !draftToken && (
                                <p className="text-[10.5px] text-[var(--sub)] mt-1">{t("marketing.tokenSavedHint")}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`server-side-${channel}`}
                                checked={draftEnabled}
                                onChange={(e) => setServerTrackingDrafts((s) => ({ ...s, [channel]: e.target.checked }))}
                                className="accent-[var(--blue)]"
                              />
                              <label htmlFor={`server-side-${channel}`} className="!mb-0 text-[12px]">
                                {t("marketing.enableServerSide")}
                              </label>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button type="button" onClick={() => saveIntegration(channel)} disabled={savingChannel === channel} className="btn-primary btn-sm">
                                {savingChannel === channel ? t("common.loading") : t("common.save")}
                              </button>
                              {existing?.hasAccessToken && existing.enableServerSideTracking && (
                                <button
                                  type="button"
                                  onClick={() => testConversion(existing)}
                                  disabled={testingChannel === channel}
                                  className="btn btn-outline btn-sm"
                                >
                                  {testingChannel === channel ? t("common.loading") : t("marketing.sendTestEvent")}
                                </button>
                              )}
                            </div>
                            {testResult && (
                              <div className={`text-[11.5px] rounded-lg p-2 ${testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                {testResult.message}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-[var(--ink)]">{t("marketing.performanceTitle")}</h3>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => { setEditingCampaign(null); setCampaignForm(emptyCampaign); setShowCampaign(true); }}
              >
                {t("marketing.newCampaign")}
              </button>
            </div>

            {performances.length === 0 ? (
              <p className="text-[13px] text-[var(--sub)]">{t("marketing.noPerformance")}</p>
            ) : (
              <>
              <div className="overflow-x-auto">
                <table className="data-table w-full text-[13px] hidden md:table">
                  <thead>
                    <tr>
                      <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("marketing.channel")}</th>
                      <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("marketing.orders")}</th>
                      <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("marketing.revenue")}</th>
                      <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("marketing.customers")}</th>
                      <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("marketing.share")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performances.map((p) => (
                      <tr key={p.channel} className="border-b border-gray-50">
                        <td className="p-3 font-bold text-[var(--ink)]">{channelLabel(p.channel)}</td>
                        <td className="p-3 text-[var(--sub)]">{p.ordersCount}</td>
                        <td className="p-3 font-bold text-[var(--ink)]">{p.revenue.toFixed(2)}</td>
                        <td className="p-3 text-[var(--sub)]">{p.customersCount}</td>
                        <td className="p-3 text-[var(--sub)]">{p.sharePct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {performances.map((p) => (
                  <div key={p.channel} className="card p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] font-bold text-[var(--sub)]">{t("marketing.channel")}</p>
                        <p className="text-[12px] font-bold text-[var(--ink)]">{channelLabel(p.channel)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[var(--sub)]">{t("marketing.orders")}</p>
                        <p className="text-[12px] text-[var(--sub)]">{p.ordersCount}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[var(--sub)]">{t("marketing.revenue")}</p>
                        <p className="text-[12px] font-bold text-[var(--ink)]">{p.revenue.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[var(--sub)]">{t("marketing.customers")}</p>
                        <p className="text-[12px] text-[var(--sub)]">{p.customersCount}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[var(--sub)]">{t("marketing.share")}</p>
                        <p className="text-[12px] text-[var(--sub)]">{p.sharePct}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
        </div>

        <div className="card p-5 h-fit">
          <h3 className="text-[15px] font-bold text-[var(--ink)] mb-4">{t("marketing.campaignsTitle")}</h3>
          {campaigns.length === 0 ? (
            <p className="text-[13px] text-[var(--sub)]">{t("marketing.noCampaigns")}</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <div key={c.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold text-[var(--ink)]">{c.name}</p>
                    <span className={`badge ${c.isActive ? "badge--green" : "badge--yellow"}`}>
                      {c.isActive ? t("marketing.active") : t("marketing.inactive")}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-[var(--sub)] mt-1">
                    {channelLabel(c.channel)}
                    {c.couponCode ? ` • ${c.couponCode}` : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setEditingCampaign(c);
                        setCampaignForm({
                          name: c.name,
                          channel: c.channel,
                          couponCode: c.couponCode || "",
                          startDate: c.startDate?.slice(0, 10) || "",
                          endDate: c.endDate?.slice(0, 10) || "",
                          isActive: c.isActive,
                        });
                        setShowCampaign(true);
                      }}
                    >
                      {t("common.edit")}
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => handleDeleteCampaign(c)}>
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-[16px] font-bold text-[var(--ink)] mb-4">
              {editingCampaign ? t("marketing.editCampaign") : t("marketing.newCampaign")}
            </h3>
            <form onSubmit={handleSaveCampaign} className="space-y-4">
              <div>
                <label>{t("marketing.campaignName")}</label>
                <div className="field-shell">
                  <input type="text" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} required />
                </div>
              </div>
              <div>
                <label>{t("marketing.channel")}</label>
                <div className="field-shell">
                  <select value={campaignForm.channel} onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })}>
                    {CHANNELS.map((c) => (
                      <option key={c} value={c}>{channelLabel(c)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label>{t("marketing.couponCode")}</label>
                <div className="field-shell">
                  <input type="text" value={campaignForm.couponCode} onChange={(e) => setCampaignForm({ ...campaignForm, couponCode: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label>{t("marketing.startDate")}</label>
                  <div className="field-shell">
                    <input type="date" value={campaignForm.startDate} onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label>{t("marketing.endDate")}</label>
                  <div className="field-shell">
                    <input type="date" value={campaignForm.endDate} onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="campaign-active" checked={campaignForm.isActive} onChange={(e) => setCampaignForm({ ...campaignForm, isActive: e.target.checked })} className="accent-[var(--blue)]" />
                <label htmlFor="campaign-active" className="!mb-0">{t("marketing.active")}</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCampaign(false)} className="btn btn-outline">{t("common.cancel")}</button>
                <button type="submit" disabled={savingCampaign} className="btn-primary">{savingCampaign ? t("common.loading") : t("common.save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
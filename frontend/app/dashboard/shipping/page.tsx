"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { useConfirm } from "@/components/ConfirmDialog";
import Can from "@/components/Can";

interface ShippingCompany {
  id: number;
  name: string;
  code: string;
  enabled: boolean;
  isDefault: boolean;
  rateConfigJson: string | null;
  createdAt: string;
}

interface QuoteResult {
  shippingCompanyId: number;
  companyName: string;
  companyCode: string;
  estimatedCost: number;
  codFee: number | null;
  currency: string;
  estimatedDeliveryDays: number;
}

interface ShipmentList {
  id: number;
  orderId: number;
  orderNumber: string;
  shippingCompanyName: string;
  shippingCompanyCode: string;
  awb: string;
  status: string;
  destinationCity: string;
  shippingCost: number;
  createdAt: string;
  lastSyncedAt: string | null;
}

interface ShipmentEvent {
  id: number;
  eventCode: string;
  description: string;
  eventAt: string | null;
}

interface ShipmentDetail {
  id: number;
  orderId: number;
  orderNumber: string;
  shippingCompanyName: string;
  shippingCompanyCode: string;
  awb: string;
  status: string;
  labelUrl: string | null;
  destinationCity: string;
  destinationAddress: string;
  recipientName: string | null;
  recipientPhone: string | null;
  weight: number;
  codAmount: number | null;
  shippingCost: number;
  currency: string;
  notes: string | null;
  isSimulation: boolean;
  createdAt: string;
  lastSyncedAt: string | null;
  events: ShipmentEvent[];
}

interface ProviderDraft {
  enabled: boolean;
  isDefault: boolean;
  baseRate: string;
  perKg: string;
  codFeePercent: string;
  estimatedDeliveryDays: string;
  cityRates: string;
}

// شركات الشحن المتاحة على المنصة — صاحب المتجر يفعّل منها فقط ولا ينشئ شركة
const PROVIDERS = [
  { code: "Smsa", labelKey: "shipping.provider.Smsa" },
  { code: "Aramex", labelKey: "shipping.provider.Aramex" },
  { code: "Zajil", labelKey: "shipping.provider.Zajil" },
  { code: "Naqel", labelKey: "shipping.provider.Naqel" },
  { code: "Manual", labelKey: "shipping.provider.Manual" },
];

const parseCityRates = (raw: string): Record<string, number> => {
  const result: Record<string, number> = {};
  raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [city, value] = pair.split("=");
      if (city && value) {
        const num = Number(value.trim());
        if (!isNaN(num)) result[city.trim()] = num;
      }
    });
  return result;
};

const SHIPMENT_STATUSES = [
  "Pending",
  "Registered",
  "PickedUp",
  "InTransit",
  "OutForDelivery",
  "Delivered",
  "Failed",
  "Cancelled",
  "Returned",
];

function buildSimulatedLabelHtml(detail: ShipmentDetail, t: (k: string) => string) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>${t("shipping.labelTitle")} - ${detail.orderNumber}</title>
<style>
  body { font-family: Tahoma, Arial, sans-serif; padding: 24px; color: #111; }
  .box { border: 2px solid #111; border-radius: 8px; padding: 20px; max-width: 480px; margin: 0 auto; }
  .sim-banner { background: #fff3cd; border: 1px solid #ffca2c; color: #664d03; padding: 8px 12px;
    border-radius: 6px; font-weight: bold; text-align: center; margin-bottom: 16px; font-size: 13px; }
  h2 { margin: 0 0 4px; font-size: 18px; }
  .awb { font-size: 20px; font-weight: bold; letter-spacing: 1px; margin: 8px 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 6px 0; vertical-align: top; }
  td.k { color: #666; width: 40%; }
  td.v { font-weight: bold; }
  hr { border: none; border-top: 1px dashed #999; margin: 14px 0; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="box">
    <div class="sim-banner">⚠️ ${t("shipping.labelSimulationNotice")}</div>
    <h2>${detail.shippingCompanyName}</h2>
    <div class="awb">${detail.awb}</div>
    <hr />
    <table>
      <tr><td class="k">${t("shipping.orderId")}</td><td class="v">${detail.orderNumber}</td></tr>
      <tr><td class="k">${t("shipping.recipient")}</td><td class="v">${detail.recipientName || "-"}</td></tr>
      <tr><td class="k">${t("shipping.recipientPhone")}</td><td class="v">${detail.recipientPhone || "-"}</td></tr>
      <tr><td class="k">${t("shipping.destinationCity")}</td><td class="v">${detail.destinationCity || "-"}</td></tr>
      <tr><td class="k">${t("shipping.destinationAddress")}</td><td class="v">${detail.destinationAddress || "-"}</td></tr>
      <tr><td class="k">${t("shipping.weightKg")}</td><td class="v">${detail.weight}</td></tr>
      ${detail.codAmount ? `<tr><td class="k">${t("shipping.codAmount")}</td><td class="v">${detail.codAmount} ${detail.currency}</td></tr>` : ""}
    </table>
  </div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;
}

function printSimulatedLabel(detail: ShipmentDetail, t: (k: string) => string) {
  const w = window.open("", "_blank", "width=520,height=700");
  if (!w) return;
  w.document.write(buildSimulatedLabelHtml(detail, t));
  w.document.close();
}

export default function ShippingPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [shipments, setShipments] = useState<ShipmentList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [tab, setTab] = useState<"companies" | "quote" | "shipments">("companies");

  const [detail, setDetail] = useState<ShipmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ shippingCompanyId: "", city: "", weight: "1", codAmount: "" });

  const [providersState, setProvidersState] = useState<Record<string, ProviderDraft>>({});

  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [addCompanyForm, setAddCompanyForm] = useState({ name: "", code: "Manual" });
  const [addCompanySaving, setAddCompanySaving] = useState(false);
  const [fetchingCompanies, setFetchingCompanies] = useState(false);
  const [shipmentForm, setShipmentForm] = useState({
    orderId: "",
    shippingCompanyId: "",
    weight: "1",
    notes: "",
  });

  function syncProviders(list: ShippingCompany[]) {
    const next: Record<string, ProviderDraft> = {};
    for (const p of PROVIDERS) {
      const comp = list.find((c) => c.code === p.code);
      if (comp) {
        let cfg: { [key: string]: unknown } = {};
        try {
          cfg = comp.rateConfigJson
            ? (JSON.parse(comp.rateConfigJson) as { [key: string]: unknown })
            : {};
        } catch {
          cfg = {};
        }
        const cityRates = (cfg.cityRates || {}) as Record<string, number>;
        next[p.code] = {
          enabled: comp.enabled,
          isDefault: comp.isDefault,
          baseRate: String(cfg.baseRate ?? 0),
          perKg: String(cfg.perKg ?? 0),
          codFeePercent: String(cfg.codFeePercent ?? 0),
          estimatedDeliveryDays: String(cfg.estimatedDeliveryDays ?? 0),
          cityRates: Object.entries(cityRates)
            .map(([c, v]) => `${c}=${v}`)
            .join(", "),
        };
      } else {
        next[p.code] = {
          enabled: false,
          isDefault: false,
          baseRate: "0",
          perKg: "0",
          codFeePercent: "0",
          estimatedDeliveryDays: "0",
          cityRates: "",
        };
      }
    }
    setProvidersState(next);
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [compRes, shipRes] = await Promise.all([
        api.get("/shipping/companies"),
        api.get("/shipping/shipments"),
      ]);
      setCompanies(compRes.data.data);
      setShipments(shipRes.data.data?.items ?? []);
      syncProviders(compRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("shipping.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.get(`/shipping/shipments/${id}`);
      setDetail(res.data.data);
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("shipping.loadError"));
    } finally {
      setDetailLoading(false);
    }
  };

  async function saveProvider(code: string, override?: Partial<ProviderDraft>) {
    const draft = { ...providersState[code], ...override };
    if (!draft) return;
    setActionError("");
    const payload: Record<string, unknown> = {
      name: t(`shipping.provider.${code}`),
      code,
      enabled: draft.enabled,
      isDefault: draft.isDefault,
      rateConfigJson: JSON.stringify({
        baseRate: Number(draft.baseRate) || 0,
        perKg: Number(draft.perKg) || 0,
        codFeePercent: Number(draft.codFeePercent) || 0,
        estimatedDeliveryDays: Number(draft.estimatedDeliveryDays) || 0,
        cityRates: parseCityRates(draft.cityRates),
      }),
    };
    try {
      const existing = companies.find((c) => c.code === code);
      if (existing) {
        await api.put(`/shipping/companies/${existing.id}`, payload);
      } else {
        await api.post("/shipping/companies", payload);
      }
      setActionSuccess(t("shipping.companyUpdated"));
      await loadAll();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionError(e.response?.data?.message || t("shipping.saveError"));
    }
  };

  async function toggleProvider(code: string, enabled: boolean) {
    setProvidersState((s) => ({ ...s, [code]: { ...s[code], enabled } }));
    await saveProvider(code, { enabled });
  };

  async function setDefaultProvider(code: string) {
    setProvidersState((s) => ({ ...s, [code]: { ...s[code], isDefault: true } }));
    await saveProvider(code, { isDefault: true });
  };

  const handleDeleteCompany = async (company: ShippingCompany) => {
    if (!(await confirm(t("shipping.confirmDeleteCompany")))) return;
    try {
      await api.delete(`/shipping/companies/${company.id}`);
      setActionSuccess(t("shipping.companyDeleted"));
      await loadAll();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("shipping.deleteError"));
    }
  };

  const handleFetchCompanies = async () => {
    setFetchingCompanies(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await api.post("/shipping/companies/fetch");
      setActionSuccess(res.data.message || t("shipping.fetchCompaniesDone"));
      await loadAll();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("shipping.fetchCompaniesError"));
    } finally {
      setFetchingCompanies(false);
    }
  };

  const handleAddCompany = async () => {
    if (!addCompanyForm.name.trim()) {
      setActionError(t("shipping.companyNameRequired"));
      return;
    }    setAddCompanySaving(true);
    setActionError("");
    try {
      await api.post("/shipping/companies", {
        name: addCompanyForm.name.trim(),
        code: addCompanyForm.code || "Manual",
        enabled: true,
        isDefault: false,
        rateConfigJson: JSON.stringify({
          baseRate: 0, perKg: 0, codFeePercent: 0, estimatedDeliveryDays: 0, cityRates: {},
        }),
      });
      setActionSuccess(t("shipping.companyCreated"));
      setAddCompanyOpen(false);
      setAddCompanyForm({ name: "", code: "Manual" });
      await loadAll();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("shipping.saveError"));
    } finally {
      setAddCompanySaving(false);
    }
  };

  const handleQuote = async () => {
    setQuoteLoading(true);
    setQuote(null);
    setActionError("");
    try {
      const res = await api.post("/shipping/quote", {
        shippingCompanyId: Number(quoteForm.shippingCompanyId),
        destinationCity: quoteForm.city,
        weight: Number(quoteForm.weight) || 1,
        codAmount: quoteForm.codAmount ? Number(quoteForm.codAmount) : undefined,
      });
      setQuote(res.data.data);
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("shipping.quoteError"));
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleCreateShipment = async () => {
    setActionError("");
    try {
      await api.post("/shipping/shipments", {
        orderNumber: shipmentForm.orderId.trim(),
        shippingCompanyId: Number(shipmentForm.shippingCompanyId),
        weight: Number(shipmentForm.weight) || 1,
        notes: shipmentForm.notes || undefined,
      });
      setShipmentOpen(false);
      setActionSuccess(t("shipping.shipmentCreated"));
      setShipmentForm({ orderId: "", shippingCompanyId: "", weight: "1", notes: "" });
      await loadAll();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("shipping.saveError"));
    }
  };

  const handleSync = async (id: number) => {
    setActionError("");
    try {
      await api.post(`/shipping/shipments/${id}/sync`);
      setActionSuccess(t("shipping.trackingSynced"));
      await loadAll();
      if (detail?.id === id) await openDetail(id);
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("shipping.syncError"));
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!detail) return;
    setActionError("");
    try {
      await api.post(`/shipping/shipments/${detail.id}/status`, { status });
      setActionSuccess(t("shipping.statusUpdated"));
      await openDetail(detail.id);
      await loadAll();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("shipping.saveError"));
    }
  };

  const handleLabel = async () => {
    if (!detail) return;
    setActionError("");
    try {
      const res = await api.get(`/shipping/shipments/${detail.id}/label`);
      const labelUrl = res.data?.data?.labelUrl;
      if (labelUrl) {
        window.open(labelUrl, "_blank", "noopener,noreferrer");
        return;
      }
      // لا يوجد رابط بوليصة حقيقي من شركة الشحن (وضع تجريبي — بدون مفاتيح API فعلية).
      // المزامنة لن تُنتج رابطًا أبدًا في هذه الحالة، فنطبع بوليصة مبسّطة محليًا بدلًا من طريق مسدود.
      if (detail.isSimulation) {
        printSimulatedLabel(detail, t);
      } else {
        setActionError(t("shipping.labelUnavailable"));
      }
    } catch {
      if (detail.isSimulation) {
        printSimulatedLabel(detail, t);
      } else {
        setActionError(t("shipping.labelUnavailable"));
      }
    }
  };

  const getStatusLabel = (status: string) => t(`shipping.status.${status}`, { defaultValue: status });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Delivered":
        return "badge badge--green";
      case "Pending":
      case "Cancelled":
      case "Failed":
      case "Returned":
        return "badge badge--red";
      case "OutForDelivery":
        return "badge badge--blue";
      default:
        return "badge badge--yellow";
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader icon="truck" title={t("shipping.title")} />

      {error && <div className="alert alert--danger">{error}</div>}
      {actionError && <div className="alert alert--danger">{actionError}</div>}
      <SuccessToast message={actionSuccess} fixed />

      <div className="flex gap-2 flex-wrap">
        {(["companies", "quote", "shipments"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`btn ${tab === key ? "btn-primary" : "btn-outline"}`}
          >
            {t(`shipping.tab.${key}`)}
          </button>
        ))}
      </div>

      {tab === "companies" && (
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h3 className="text-lg font-medium text-[var(--ink)]">{t("shipping.companiesTitle")}</h3>
            <Can code="ShippingCompanies.Add">
              <div className="flex items-center gap-2">
                <button onClick={handleFetchCompanies} disabled={fetchingCompanies} className="btn btn-outline btn-sm">
                  {fetchingCompanies ? t("common.loading") : t("shipping.fetchCompanies")}
                </button>
                <button onClick={() => { setAddCompanyOpen(true); setActionError(""); }} className="btn btn-primary btn-sm">
                  + {t("shipping.addCompany")}
                </button>
              </div>
            </Can>
          </div>

          <div className="space-y-3">
            {PROVIDERS.map((p) => {
              const draft = providersState[p.code];
              const comp = companies.find((c) => c.code === p.code);
              return (
                <div key={p.code} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-[var(--ink)]">{t(p.labelKey)}</p>
                      {draft?.enabled ? (
                        <span className="badge badge--green">{t("shipping.enabled")}</span>
                      ) : (
                        <span className="badge badge--gray">{t("shipping.disabled")}</span>
                      )}
                      {draft?.isDefault && (
                        <span className="badge badge--blue">{t("shipping.isDefault")}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {draft?.enabled && !draft?.isDefault && (
                        <button
                          onClick={() => setDefaultProvider(p.code)}
                          className="btn btn-outline btn-sm"
                        >
                          {t("shipping.setDefault")}
                        </button>
                      )}
                      <label className="flex items-center gap-2 text-[13px] font-bold text-[var(--ink)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draft?.enabled ?? false}
                          onChange={(e) => toggleProvider(p.code, e.target.checked)}
                        />
                        {draft?.enabled ? t("shipping.enabled") : t("shipping.enable")}
                      </label>
                      {comp && (
                        <button onClick={() => handleDeleteCompany(comp)} className="btn btn-danger btn-sm">
                          {t("shipping.delete")}
                        </button>
                      )}
                    </div>
                  </div>

                  {draft?.enabled && (
                    <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.baseRate")}</label>
                          <input
                            className="field-input mt-1"
                            type="number"
                            value={draft.baseRate}
                            onChange={(e) =>
                              setProvidersState((s) => ({
                                ...s,
                                [p.code]: { ...s[p.code], baseRate: e.target.value },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.perKg")}</label>
                          <input
                            className="field-input mt-1"
                            type="number"
                            value={draft.perKg}
                            onChange={(e) =>
                              setProvidersState((s) => ({
                                ...s,
                                [p.code]: { ...s[p.code], perKg: e.target.value },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.codFeePercent")}</label>
                          <input
                            className="field-input mt-1"
                            type="number"
                            value={draft.codFeePercent}
                            onChange={(e) =>
                              setProvidersState((s) => ({
                                ...s,
                                [p.code]: { ...s[p.code], codFeePercent: e.target.value },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.estimatedDays")}</label>
                          <input
                            className="field-input mt-1"
                            type="number"
                            value={draft.estimatedDeliveryDays}
                            onChange={(e) =>
                              setProvidersState((s) => ({
                                ...s,
                                [p.code]: { ...s[p.code], estimatedDeliveryDays: e.target.value },
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.cityRates")}</label>
                        <input
                          className="field-input mt-1"
                          dir="ltr"
                          value={draft.cityRates}
                          onChange={(e) =>
                            setProvidersState((s) => ({
                              ...s,
                              [p.code]: { ...s[p.code], cityRates: e.target.value },
                            }))
                          }
                          placeholder={t("shipping.cityRatesPlaceholder")}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveProvider(p.code)} className="btn-primary">
                          {t("shipping.save")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "quote" && (
        <div className="card p-5">
          <h3 className="text-lg font-medium text-[var(--ink)] mb-4">{t("shipping.quoteTitle")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.company")}</label>
              <select
                className="field-input mt-1"
                value={quoteForm.shippingCompanyId}
                onChange={(e) => setQuoteForm({ ...quoteForm, shippingCompanyId: e.target.value })}
              >
                <option value="">{t("shipping.selectCompany")}</option>
                {companies.filter((c) => c.enabled).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.city")}</label>
              <input
                className="field-input mt-1"
                value={quoteForm.city}
                onChange={(e) => setQuoteForm({ ...quoteForm, city: e.target.value })}
                placeholder={t("shipping.cityPlaceholder")}
              />
            </div>
            <div>
              <label className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.weightKg")}</label>
              <input
                className="field-input mt-1"
                type="number"
                value={quoteForm.weight}
                onChange={(e) => setQuoteForm({ ...quoteForm, weight: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.codAmount")}</label>
              <input
                className="field-input mt-1"
                type="number"
                value={quoteForm.codAmount}
                onChange={(e) => setQuoteForm({ ...quoteForm, codAmount: e.target.value })}
              />
            </div>
          </div>
          <button onClick={handleQuote} disabled={quoteLoading} className="btn-primary">
            {quoteLoading ? t("shipping.calculating") : t("shipping.calculate")}
          </button>

          {quote && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.company")}</p>
                <p className="text-[14px] font-bold text-[var(--ink)]">{quote.companyName}</p>
              </div>
              <div>
                <p className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.estimatedCost")}</p>
                <p className="text-[16px] font-extrabold text-[var(--blue)]">
                  {quote.estimatedCost.toFixed(2)} {quote.currency}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.estimatedDays")}</p>
                <p className="text-[14px] font-bold text-[var(--ink)]">{quote.estimatedDeliveryDays}</p>
              </div>
              {quote.codFee != null && (
                <div>
                  <p className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.codFee")}</p>
                  <p className="text-[14px] font-bold text-[var(--ink)]">{quote.codFee.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "shipments" && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[var(--ink)]">{t("shipping.shipmentsTitle")}</h3>
            <Can code="ShippingCompanies.Add">
              <button onClick={() => setShipmentOpen(!shipmentOpen)} className="btn-primary">
                {t("shipping.createShipment")}
              </button>
            </Can>
          </div>

          {shipmentOpen && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.orderId")}</label>
                  <input
                    className="field-input mt-1"
                    type="text"
                    dir="ltr"
                    placeholder="ORD-20260812225750943"
                    value={shipmentForm.orderId}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, orderId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.company")}</label>
                  <select
                    className="field-input mt-1"
                    value={shipmentForm.shippingCompanyId}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, shippingCompanyId: e.target.value })}
                  >
                    <option value="">{t("shipping.selectCompany")}</option>
                    {companies.filter((c) => c.enabled).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.weightKg")}</label>
                  <input
                    className="field-input mt-1"
                    type="number"
                    value={shipmentForm.weight}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, weight: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-[12px] font-bold text-[var(--sub)]">{t("shipping.notes")}</label>
                <input
                  className="field-input mt-1"
                  value={shipmentForm.notes}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateShipment} className="btn-primary">
                  {t("shipping.createShipment")}
                </button>
                <button onClick={() => setShipmentOpen(false)} className="btn-outline">
                  {t("shipping.cancel")}
                </button>
              </div>
            </div>
          )}

          {shipments.length === 0 ? (
            <p className="text-[13px] text-[var(--sub)]">{t("shipping.emptyShipments")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-right border-b" style={{ borderColor: "var(--border)" }}>
                    <th className="py-2 px-2 text-[var(--sub)] font-bold">{t("shipping.orderNumber")}</th>
                    <th className="py-2 px-2 text-[var(--sub)] font-bold">{t("shipping.company")}</th>
                    <th className="py-2 px-2 text-[var(--sub)] font-bold">{t("shipping.awb")}</th>
                    <th className="py-2 px-2 text-[var(--sub)] font-bold">{t("shipping.destinationCity")}</th>
                    <th className="py-2 px-2 text-[var(--sub)] font-bold">{t("shipping.shippingCost")}</th>
                    <th className="py-2 px-2 text-[var(--sub)] font-bold">{t("shipping.status")}</th>
                    <th className="py-2 px-2 text-[var(--sub)] font-bold">{t("shipping.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="py-2 px-2 font-bold text-[var(--ink)]">{s.orderNumber}</td>
                      <td className="py-2 px-2 text-[var(--ink)]">{s.shippingCompanyName}</td>
                      <td className="py-2 px-2 text-[var(--ink)]" dir="ltr">{s.awb || "—"}</td>
                      <td className="py-2 px-2 text-[var(--ink)]">{s.destinationCity}</td>
                      <td className="py-2 px-2 text-[var(--ink)]">{s.shippingCost.toFixed(2)}</td>
                      <td className="py-2 px-2">
                        <span className={getStatusBadge(s.status)}>{getStatusLabel(s.status)}</span>
                      </td>
                      <td className="py-2 px-2">
                        <button onClick={() => openDetail(s.id)} className="btn btn-outline btn-sm">
                          {t("shipping.view")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {detailLoading && <LoadingState />}

          {detail && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mt-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-bold text-[var(--ink)]">
                  {t("shipping.shipmentDetails")} — {detail.orderNumber}
                </h4>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => handleSync(detail.id)} className="btn btn-outline btn-sm">
                    {t("shipping.syncTracking")}
                  </button>
                  <button onClick={handleLabel} className="btn btn-outline btn-sm">
                    {t("shipping.printLabel")}
                  </button>
                  <button onClick={() => setDetail(null)} className="btn-outline btn-sm">
                    {t("shipping.close")}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13px]">
                <div>
                  <p className="text-[var(--sub)] font-bold text-[11.5px]">{t("shipping.awb")}</p>
                  <p className="font-bold text-[var(--ink)]" dir="ltr">{detail.awb || "—"}</p>
                </div>
                <div>
                  <p className="text-[var(--sub)] font-bold text-[11.5px]">{t("shipping.company")}</p>
                  <p className="font-bold text-[var(--ink)]">{detail.shippingCompanyName}</p>
                </div>
                <div>
                  <p className="text-[var(--sub)] font-bold text-[11.5px]">{t("shipping.status")}</p>
                  <span className={getStatusBadge(detail.status)}>{getStatusLabel(detail.status)}</span>
                </div>
                <div>
                  <p className="text-[var(--sub)] font-bold text-[11.5px]">{t("shipping.shippingCost")}</p>
                  <p className="font-bold text-[var(--ink)]">{detail.shippingCost.toFixed(2)} {detail.currency}</p>
                </div>
                <div>
                  <p className="text-[var(--sub)] font-bold text-[11.5px]">{t("shipping.recipient")}</p>
                  <p className="font-bold text-[var(--ink)]">{detail.recipientName || "—"}</p>
                </div>
                <div>
                  <p className="text-[var(--sub)] font-bold text-[11.5px]">{t("shipping.recipientPhone")}</p>
                  <p className="font-bold text-[var(--ink)]" dir="ltr">{detail.recipientPhone || "—"}</p>
                </div>
                <div>
                  <p className="text-[var(--sub)] font-bold text-[11.5px]">{t("shipping.weightKg")}</p>
                  <p className="font-bold text-[var(--ink)]">{detail.weight}</p>
                </div>
                <div>
                  <p className="text-[var(--sub)] font-bold text-[11.5px]">{t("shipping.codAmount")}</p>
                  <p className="font-bold text-[var(--ink)]">{detail.codAmount != null ? `${detail.codAmount.toFixed(2)} ${detail.currency}` : "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[var(--sub)] font-bold text-[11.5px]">{t("shipping.destinationCity")}</p>
                  <p className="font-bold text-[var(--ink)]">{detail.destinationCity} — {detail.destinationAddress}</p>
                </div>
              </div>

              <div>
                <p className="text-[13px] font-bold text-[var(--ink)] mb-2">{t("shipping.updateStatus")}</p>
                <div className="flex flex-wrap gap-2">
                  {SHIPMENT_STATUSES.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(status)}
                      className={`btn btn-sm ${detail.status === status ? "btn-primary" : "btn-outline"}`}
                    >
                      {getStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[13px] font-bold text-[var(--ink)] mb-2">{t("shipping.trackingEvents")}</p>
                {detail.events.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--sub)]">{t("shipping.emptyEvents")}</p>
                ) : (
                  <div className="space-y-2">
                    {[...detail.events].sort((a, b) => (b.eventAt || "").localeCompare(a.eventAt || "")).map((evt) => (
                      <div key={evt.id} className="flex items-start gap-3 bg-white rounded-xl px-4 py-2.5 border border-gray-200">
                        <div className="w-2 h-2 rounded-full bg-[var(--blue)] mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-[13px] font-bold text-[var(--ink)]">{evt.description || evt.eventCode}</p>
                          {evt.eventAt && (
                            <p className="text-[11px] text-[var(--sub)]">
                              {new Date(evt.eventAt).toLocaleString("ar-SA-u-nu-latn")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {addCompanyOpen && (
        <div className="modal-overlay" onClick={() => setAddCompanyOpen(false)}>
          <div className="modal-card max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-bold text-[var(--blue-deep)]">{t("shipping.addCompanyTitle")}</h2>
              <button onClick={() => setAddCompanyOpen(false)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
            </div>
            {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
            <div className="space-y-4">
              <div>
                <label>{t("shipping.companyName")}</label>
                <div className="field-shell mt-1">
                  <input value={addCompanyForm.name} onChange={(e) => setAddCompanyForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("shipping.companyNamePlaceholder")} />
                </div>
              </div>
              <div>
                <label>{t("shipping.companyCode")}</label>
                <div className="field-shell mt-1">
                  <input value={addCompanyForm.code} onChange={(e) => setAddCompanyForm((f) => ({ ...f, code: e.target.value }))} placeholder="Manual" />
                </div>
                <p className="text-[11px] text-[var(--sub)] mt-1">{t("shipping.companyCodeHint")}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setAddCompanyOpen(false)} className="btn btn-outline flex-1">{t("common.cancel")}</button>
                <button onClick={handleAddCompany} disabled={addCompanySaving} className="btn btn-primary flex-1">
                  {addCompanySaving ? t("common.saving") : t("common.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { getUserType } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { formatNumber } from "@/lib/formatNumber";
import InfoTooltip from "@/components/InfoTooltip";

interface Package {
  id: number;
  packageName: string;
  monthlyPrice: number;
  maxProducts: number | null;
  maxOrdersPerMonth: number | null;
  maxEmployees: number;
  maxWarehouses: number;
  maxBranchesPOS: number;
  maxPaymentGateways: number;
  maxShippingCompanies: number;
  hasAccountingFull: boolean;
  hasPayroll: boolean;
  hasZatcaInvoice: boolean;
  hasCustomDomain: boolean;
  hasAffiliateMarketing: boolean;
  hasApiAccess: boolean;
  hasPos: boolean;
  hasLogo: boolean;
  maxThemes: number;
  commissionPercentage: number;
  color: string;
  hasShippingIntegration: boolean;
  hasShippingCalculator: boolean;
  hasShippingTracking: boolean;
  hasShippingLabelPrinting: boolean;
  hasFreeShipping: boolean;
  hasCashOnDelivery: boolean;
  hasShippingDiscounts: boolean;
  isActive: boolean;
}

interface RevenueData {
  mrr: number;
  arr: number;
  churnRate: number;
  ltv: number;
}

interface PlatformInvoice {
  id: number;
  storeId: number;
  storeName: string;
  storeSlug: string;
  packageName: string;
  amount: number;
  dueDate: string;
  status: string;
}

const FEATURE_LABELS: Record<string, string> = {
  hasAccountingFull: "packagesAdmin.featureAccounting",
  hasZatcaInvoice: "packagesAdmin.featureZatcaInvoice",
  hasPos: "packagesAdmin.featurePos",
  hasPayroll: "packagesAdmin.featurePayroll",
  hasCustomDomain: "packagesAdmin.featureCustomDomain",
  hasApiAccess: "packagesAdmin.featureApiAccess",
  hasAffiliateMarketing: "packagesAdmin.featureAffiliateMarketing",
  hasLogo: "packagesAdmin.featureLogo",
};

const SHIPPING_FEATURE_LABELS: Record<string, string> = {
  hasShippingCalculator: "packagesAdmin.featureShippingCalculator",
  hasShippingTracking: "packagesAdmin.featureShippingTracking",
  hasShippingLabelPrinting: "packagesAdmin.featureShippingLabelPrinting",
  hasCashOnDelivery: "packagesAdmin.featureCashOnDelivery",
  hasFreeShipping: "packagesAdmin.featureFreeShipping",
  hasShippingDiscounts: "packagesAdmin.featureShippingDiscounts",
};

const PACKAGE_COLORS = [
  { value: "#6B7280", labelKey: "packagesAdmin.colorGray" },
  { value: "#12A8DB", labelKey: "packagesAdmin.colorBlue" },
  { value: "#1FB983", labelKey: "packagesAdmin.colorGreen" },
  { value: "#C9A227", labelKey: "packagesAdmin.colorGold" },
];

const LIMIT_FIELDS = [
  { key: "maxProducts" as keyof Package, label: "packagesAdmin.limitProducts", tooltipKey: "packagesAdmin.limitProductsTooltip" },
  { key: "maxEmployees" as keyof Package, label: "packagesAdmin.limitEmployees", tooltipKey: "packagesAdmin.limitEmployeesTooltip" },
  { key: "maxWarehouses" as keyof Package, label: "packagesAdmin.limitWarehouses", tooltipKey: "packagesAdmin.limitWarehousesTooltip" },
];

const STATUS_STYLES: Record<string, { badge: string; labelKey: string }> = {
  Paid: { badge: "badge badge--green", labelKey: "packagesAdmin.paid" },
  Pending: { badge: "badge badge--yellow", labelKey: "packagesAdmin.pending" },
  Overdue: { badge: "badge badge--red", labelKey: "packagesAdmin.overdue" },
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

export default function PackagesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("packages");
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Package>>({});

  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [exporting, setExporting] = useState(false);

  const userType = getUserType();

  useEffect(() => {
    if (userType !== "SuperAdmin") {
      setError(t("packagesAdmin.unauthorized"));
      setLoading(false);
      return;
    }
    fetchPackages();
  }, [userType, t]);

  useEffect(() => {
    if (userType !== "SuperAdmin" || activeTab === "packages") return;
    if (activeTab === "revenue") fetchRevenue();
    if (activeTab === "invoices") fetchInvoices();
  }, [activeTab, overdueOnly]);

  const fetchPackages = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/packages");
      setPackages(res.data.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError(t("packagesAdmin.unauthorizedSuperAdmin"));
      } else {
        setError(err.response?.data?.message || t("packagesAdmin.loadError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenue = async () => {
    try {
      const res = await api.get("/admin/billing/revenue");
      setRevenue(res.data.data);
    } catch { }
  };

  const fetchInvoices = async () => {
    try {
      const res = await api.get(`/admin/billing/invoices${overdueOnly ? "?overdueOnly=true" : ""}`);
      setInvoices(res.data.data);
    } catch { }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get("/admin/billing/invoices/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "platform-invoices.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { }
    setExporting(false);
  };

  const handleEditClick = (pkg: Package) => {
    setEditingId(pkg.id);
    setEditForm({
      monthlyPrice: pkg.monthlyPrice,
      maxProducts: pkg.maxProducts,
      maxEmployees: pkg.maxEmployees,
      maxWarehouses: pkg.maxWarehouses,
      hasAccountingFull: pkg.hasAccountingFull,
      hasPayroll: pkg.hasPayroll,
      hasZatcaInvoice: pkg.hasZatcaInvoice,
      hasCustomDomain: pkg.hasCustomDomain,
      hasAffiliateMarketing: pkg.hasAffiliateMarketing,
      hasApiAccess: pkg.hasApiAccess,
      hasPos: pkg.hasPos,
      hasLogo: pkg.hasLogo,
      maxThemes: pkg.maxThemes,
      commissionPercentage: pkg.commissionPercentage,
      color: pkg.color,
      hasShippingIntegration: pkg.hasShippingIntegration,
      hasShippingCalculator: pkg.hasShippingCalculator,
      hasShippingTracking: pkg.hasShippingTracking,
      hasShippingLabelPrinting: pkg.hasShippingLabelPrinting,
      hasFreeShipping: pkg.hasFreeShipping,
      hasCashOnDelivery: pkg.hasCashOnDelivery,
      hasShippingDiscounts: pkg.hasShippingDiscounts,
      isActive: pkg.isActive,
    });
    setActionError("");
    setActionSuccess("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setActionError("");
    setActionSuccess("");
  };

  const handleSave = async (pkg: Package) => {
    setActionError("");
    setActionSuccess("");
    try {
      await api.put(`/admin/packages/${pkg.id}`, editForm);
      setActionSuccess(t("packagesAdmin.updateSuccess", { name: pkg.packageName }));
      setEditingId(null);
      setEditForm({});
      await fetchPackages();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("packagesAdmin.updateError"));
    }
  };

  const getLimitDisplay = (value: number | null) => {
    if (value === null) return t("packagesAdmin.unlimited");
    if (value === -1) return t("packagesAdmin.unlimited");
    return value.toString();
  };

  const getPriceDisplay = (price: number) => {
    return `${formatNumber(price)} ${t("packagesAdmin.perMonth")}`;
  };

  const renderLimitField = (pkg: Package, field: { key: keyof Package; label: string; tooltipKey?: string }) => {
    const isEditing = editingId === pkg.id;
    const value = pkg[field.key] as number | null;
    const editValue = editForm[field.key] as number | null | undefined;

    if (isEditing) {
      return (
        <div key={field.key} className="flex items-center justify-between text-[12.5px] mb-2 gap-3">
          <label className="text-[var(--sub)] shrink-0 flex items-center gap-1">{t(field.label)}{field.tooltipKey && <InfoTooltip messageKey={field.tooltipKey} />}</label>
          <div className="field-shell py-1 px-2.5 w-24">
            <input
              type="number"
              value={editValue !== undefined ? (editValue === null || editValue === -1 ? "" : editValue) : ""}
              onChange={(e) => {
                const val = e.target.value === "" ? null : parseInt(e.target.value) || 0;
                setEditForm({ ...editForm, [field.key]: val });
              }}
              min={0}
              dir="ltr"
              placeholder={t("packagesAdmin.unlimited")}
              className="text-left"
            />
          </div>
        </div>
      );
    }

    return (
      <div key={field.key} className="flex justify-between text-[12.5px] mb-2">
        <span className="text-[var(--sub)] flex items-center gap-1">{t(field.label)}{field.tooltipKey && <InfoTooltip messageKey={field.tooltipKey} />}</span>
        <span className="font-bold text-[var(--ink)]">{getLimitDisplay(value)}</span>
      </div>
    );
  };

  const renderFeatureField = (pkg: Package, key: keyof Package, label: string) => {
    const isEditing = editingId === pkg.id;
    const value = pkg[key] as boolean;
    const editValue = editForm[key] as boolean | undefined;
    const active = isEditing ? editValue !== undefined ? editValue : value : value;

    if (isEditing) {
      return (
        <label key={key} className="flex items-center gap-2 text-[11.5px]">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setEditForm({ ...editForm, [key]: e.target.checked })}
            className="w-4 h-4 accent-[var(--blue)]"
          />
          <span className={active ? "text-[var(--green)]" : "text-[var(--sub)]"}>{t(label)}</span>
        </label>
      );
    }

    return (
      <span key={key} className={`feature-chip ${active ? "feature-chip--on" : "feature-chip--off"}`}>
        {active ? <CheckIcon /> : <CrossIcon />}
        {t(label)}
      </span>
    );
  };

  const renderThemesField = (pkg: Package) => {
    const isEditing = editingId === pkg.id;
    const value = pkg.maxThemes;
    const editValue = editForm.maxThemes;
    const themesValue = isEditing ? (editValue !== undefined ? editValue : value) : value;
    const active = themesValue > 0;

    if (isEditing) {
      return (
        <div key="maxThemes" className="flex items-center gap-2 text-[11.5px]">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setEditForm({ ...editForm, maxThemes: e.target.checked ? (themesValue > 0 ? themesValue : 1) : 0 })}
            className="w-4 h-4 accent-[var(--blue)]"
          />
          <span className={active ? "text-[var(--green)]" : "text-[var(--sub)]"}>{t("packagesAdmin.featureThemes")}</span>
          {active && (
            <div className="field-shell py-1 px-2 w-16">
              <input
                type="number"
                value={themesValue}
                onChange={(e) => setEditForm({ ...editForm, maxThemes: parseInt(e.target.value) || 0 })}
                min={1}
                dir="ltr"
                className="text-left"
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <span key="maxThemes" className={`feature-chip ${active ? "feature-chip--on" : "feature-chip--off"}`}>
        {active ? <CheckIcon /> : <CrossIcon />}
        {getThemesAdminLabel(themesValue)}
      </span>
    );
  };

  const getThemesAdminLabel = (v: number) => {
    if (v <= 0) return t("packagesAdmin.featureThemes");
    return `${v} ${t("packagesAdmin.themes")}`;
  };

  const renderShippingCompaniesField = (pkg: Package) => {
    const isEditing = editingId === pkg.id;
    const value = pkg.maxShippingCompanies;
    const editValue = editForm.maxShippingCompanies;
    const compValue = isEditing ? (editValue !== undefined ? editValue : value) : value;
    const active = compValue !== 0;
    const isUnlimited = compValue === -1;

    if (isEditing) {
      return (
        <div key="maxShippingCompanies" className="flex items-center gap-2 text-[11.5px]">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setEditForm({ ...editForm, maxShippingCompanies: e.target.checked ? (compValue !== 0 ? compValue : 2) : 0 })}
            className="w-4 h-4 accent-[var(--blue)]"
          />
          <span className={active ? "text-[var(--green)]" : "text-[var(--sub)]"}>
            {t("packagesAdmin.featureShippingIntegration")}
          </span>
          {active && !isUnlimited && (
            <>
              <div className="field-shell py-1 px-2 w-16">
                <input
                  type="number"
                  value={compValue}
                  onChange={(e) => setEditForm({ ...editForm, maxShippingCompanies: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
                  min={1}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, maxShippingCompanies: -1 })}
                className="text-[10.5px] text-[var(--blue)] underline"
              >
                {t("packagesAdmin.shippingUnlimited")}
              </button>
            </>
          )}
          {active && isUnlimited && (
            <span className="font-bold text-[var(--green)]">{t("packagesAdmin.shippingUnlimited")}</span>
          )}
        </div>
      );
    }

    return (
      <span key="maxShippingCompanies" className={`feature-chip ${active ? "feature-chip--on" : "feature-chip--off"}`}>
        {active ? <CheckIcon /> : <CrossIcon />}
        {getShippingCompaniesAdminLabel(compValue)}
      </span>
    );
  };

  const getShippingCompaniesAdminLabel = (v: number) => {
    if (v === -1) return t("packagesAdmin.shippingUnlimited");
    if (v === 0) return t("packagesAdmin.featureShippingIntegration");
    if (v === 2) return t("packagesAdmin.shippingTwo");
    return `${v} ${t("packagesAdmin.shippingCompanies")}`;
  };

  const KPI_ICONS: Record<string, { viewBox: string; paths: string[] }> = {
    money: {
      viewBox: "0 0 24 24",
      paths: [
        "M23 4v6h-6",
        "M1 20v-6h6",
        "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
      ],
    },
    chart: {
      viewBox: "0 0 24 24",
      paths: [
        "M3 4v16h18",
        "M7 16v-4",
        "M11 16v-8",
        "M15 16v-2",
        "M19 16v-6",
      ],
    },
    users: {
      viewBox: "0 0 24 24",
      paths: [
        "M23 18v-2a4 4 0 0 0-3-3.87",
        "M16 18v-2a4 4 0 0 0-3-3.87",
        "M3 18v-2a4 4 0 0 1 3-3.87",
        "M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM8 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM16 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
      ],
    },
    target: {
      viewBox: "0 0 24 24",
      paths: [
        "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z",
        "M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z",
        "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
      ],
    },
  };

  const renderKpiCard = (label: string, value: string, icon: string, color: string, sub?: string) => {
    const svg = KPI_ICONS[icon];
    return (
      <div className="stat-card flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          <svg viewBox={svg?.viewBox || "0 0 24 24"} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            {svg?.paths.map((d, i) => <path key={i} d={d} />)}
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[12px] text-[var(--sub)] font-medium">{label}</p>
          <p className="text-[22px] font-bold text-[var(--ink)] mt-0.5">{value}</p>
          {sub && <p className="text-[11px] text-[var(--sub)] mt-0.5">{sub}</p>}
        </div>
      </div>
    );
  };

  const formatCurrency = (amount: number) =>
    formatNumber(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + t("common.sar");

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <div className="alert alert--danger">{error}</div>;
  }

  return (
    <div>
      <PageHeader icon="package" title={t("packagesAdmin.title")} />

      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
        {["packages", "revenue", "invoices"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-[13px] font-bold border-b-2 transition-colors ${
              activeTab === tab
                ? "text-[var(--blue)] border-[var(--blue)]"
                : "text-[var(--sub)] border-transparent hover:text-[var(--ink)]"
            }`}
          >
            {t(`packagesAdmin.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
          </button>
        ))}
      </div>

      {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
      <SuccessToast message={actionSuccess} fixed className="mb-4" />

      {activeTab === "packages" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg) => {
            const isEditing = editingId === pkg.id;
            const activeNow = isEditing ? editForm.isActive ?? pkg.isActive : pkg.isActive;
            const cardColor = isEditing ? editForm.color ?? pkg.color : pkg.color;

            return (
              <div key={pkg.id} className={`package-card ${isEditing ? "package-card--current" : ""}`}>
                {isEditing && <span className="package-card__badge">{t("packagesAdmin.editing")}</span>}

                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: cardColor }}
                  />
                  <h3 className="text-[15px] font-bold text-[var(--blue-deep)]">{pkg.packageName}</h3>
                </div>

                <div className="mb-4">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <label className="text-[12.5px] text-[var(--sub)] shrink-0">{t("packagesAdmin.price")}</label>
                      <div className="field-shell py-1 px-2.5 w-28">
                        <input
                          type="number"
                          value={editForm.monthlyPrice ?? pkg.monthlyPrice}
                          onChange={(e) =>
                            setEditForm({ ...editForm, monthlyPrice: parseFloat(e.target.value) || 0 })
                          }
                          min={0}
                          step="0.01"
                          dir="ltr"
                          className="text-left"
                        />
                      </div>
                      <span className="text-[12px] text-[var(--sub)]">{t("packagesAdmin.perMonth")}</span>
                    </div>
                  ) : (
                    <p className="text-[22px] font-bold" style={{ color: cardColor }}>{getPriceDisplay(pkg.monthlyPrice)}</p>
                  )}
                </div>

                {isEditing && (
                  <div className="flex items-center gap-2 mb-4">
                    <label className="text-[12.5px] text-[var(--sub)] shrink-0">{t("packagesAdmin.color")}</label>
                    <div className="flex items-center gap-2">
                      {PACKAGE_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, color: c.value })}
                          title={t(c.labelKey)}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            (editForm.color ?? pkg.color) === c.value ? "border-[var(--blue)] scale-110" : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {isEditing && (
                  <div className="flex items-center gap-2 mb-4">
                    <label className="text-[12.5px] text-[var(--sub)] shrink-0 flex items-center gap-1">{t("packagesAdmin.commission")}<InfoTooltip messageKey="packagesAdmin.commissionTooltip" /></label>
                    <div className="field-shell py-1 px-2.5 w-20">
                      <input
                        type="number"
                        value={editForm.commissionPercentage ?? pkg.commissionPercentage}
                        onChange={(e) =>
                          setEditForm({ ...editForm, commissionPercentage: parseFloat(e.target.value) || 0 })
                        }
                        min={0} max={100} step="0.1"
                        dir="ltr" className="text-left"
                      />
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="flex justify-between text-[12.5px] mb-4">
                    <span className="text-[var(--sub)] flex items-center gap-1">{t("packagesAdmin.commission")}<InfoTooltip messageKey="packagesAdmin.commissionTooltip" /></span>
                    <span className="font-bold text-[var(--ink)]">{pkg.commissionPercentage}%</span>
                  </div>
                )}

                <div className="space-y-1 mb-4 border-t border-[var(--border)] pt-4">
                  {LIMIT_FIELDS.map((field) => renderLimitField(pkg, field))}
                </div>

                <div className="space-y-2 mb-4 border-t border-[var(--border)] pt-4">
                  <p className="text-[11.5px] text-[var(--sub)] mb-1">{t("packagesAdmin.features")}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.entries(FEATURE_LABELS) as [keyof Package, string][]).map(([key, label]) =>
                      renderFeatureField(pkg, key, label)
                    )}
                  </div>
                  <div className="mt-1.5">
                    {renderThemesField(pkg)}
                  </div>
                </div>

                <div className="space-y-2 mb-4 border-t border-[var(--border)] pt-4">
                  <p className="text-[11.5px] text-[var(--sub)] mb-1">{t("packagesAdmin.shipping")}</p>
                  <div className="mt-1.5 mb-1.5">
                    {renderShippingCompaniesField(pkg)}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.entries(SHIPPING_FEATURE_LABELS) as [keyof Package, string][]).map(([key, label]) =>
                      renderFeatureField(pkg, key, label)
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  {isEditing ? (
                    <label className="flex items-center gap-2 text-[12.5px]">
                      <input
                        type="checkbox"
                        checked={activeNow}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                        className="w-4 h-4 accent-[var(--blue)]"
                      />
                      <span className={activeNow ? "text-[var(--green)]" : "text-[var(--danger)]"}>
                        {activeNow ? t("packagesAdmin.active") : t("packagesAdmin.inactive")}
                      </span>
                    </label>
                  ) : (
                    <span className={`status-badge ${pkg.isActive ? "status-badge--active" : "status-badge--suspended"}`}>
                      {pkg.isActive ? t("packagesAdmin.active") : t("packagesAdmin.inactive")}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {isEditing ? (
                    <>
                      <button onClick={() => handleSave(pkg)} className="btn-primary w-full">
                        {t("common.save")}
                      </button>
                      <button onClick={handleCancelEdit} className="btn-outline w-full">
                        {t("common.cancel")}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleEditClick(pkg)} className="btn-primary w-full">
                      {t("common.edit")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "revenue" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[14px] text-[var(--sub)]">{t("packagesAdmin.revenueDesc")}</p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-primary btn-sm"
            >
              {exporting ? t("packagesAdmin.exporting") : t("packagesAdmin.exportExcel")}
            </button>
          </div>

          {revenue ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderKpiCard(
                t("packagesAdmin.mrr"),
                formatCurrency(revenue.mrr),
                "money",
                "#12A8DB",
                t("packagesAdmin.mrrDesc")
              )}
              {renderKpiCard(
                t("packagesAdmin.arr"),
                formatCurrency(revenue.arr),
                "chart",
                "#1EC8C8",
                t("packagesAdmin.arrDesc")
              )}
              {renderKpiCard(
                t("packagesAdmin.churnRate"),
                `${revenue.churnRate}%`,
                "users",
                "#0b5e78",
                t("packagesAdmin.churnDesc")
              )}
              {renderKpiCard(
                t("packagesAdmin.ltv"),
                formatCurrency(revenue.ltv),
                "target",
                "#8A7B1F",
                t("packagesAdmin.ltvDesc")
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-[var(--sub)]">{t("common.loading")}</div>
          )}
        </div>
      )}

      {activeTab === "invoices" && (
        <div>
          <div className="card p-4 mb-4 flex items-center gap-4">
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="w-4 h-4 accent-[var(--blue)]"
              />
              {t("packagesAdmin.overdueFilter")}
            </label>
          </div>

          <div className="card overflow-hidden">
            {invoices.length === 0 ? (
              <p className="p-5 text-center text-[var(--sub)] text-sm">{t("packagesAdmin.noInvoices")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--border)] border-b" style={{ borderColor: "var(--border)" }}>
                    <tr>
                      <th className="text-right p-3 font-medium text-[var(--sub)]">{t("store.name")}</th>
                      <th className="text-right p-3 font-medium text-[var(--sub)]">{t("store.slug")}</th>
                      <th className="text-right p-3 font-medium text-[var(--sub)]">{t("store.package")}</th>
                      <th className="text-right p-3 font-medium text-[var(--sub)]">{t("packagesAdmin.invoiceAmount")}</th>
                      <th className="text-right p-3 font-medium text-[var(--sub)]">{t("packagesAdmin.dueDate")}</th>
                      <th className="text-right p-3 font-medium text-[var(--sub)]">{t("packagesAdmin.invoiceStatus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, index) => {
                      const st = STATUS_STYLES[inv.status] || STATUS_STYLES.Pending;
                      return (
                        <tr
                          key={inv.id ?? `${inv.storeId}-${index}`}
                          className="border-b hover:bg-[var(--border)]"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <td className="p-3 text-[var(--ink)] font-medium">{inv.storeName}</td>
                          <td className="p-3 text-[var(--sub)]" dir="ltr">{inv.storeSlug}</td>
                          <td className="p-3 text-[var(--sub)]">{inv.packageName}</td>
                          <td className="p-3 text-[var(--ink)] font-bold">{formatCurrency(inv.amount)}</td>
                          <td className="p-3 text-[var(--sub)]" dir="ltr">
                            {new Date(inv.dueDate).toLocaleDateString("ar-SA-u-nu-latn")}
                          </td>
                          <td className="p-3">
                            <span className={st.badge}>{t(st.labelKey)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

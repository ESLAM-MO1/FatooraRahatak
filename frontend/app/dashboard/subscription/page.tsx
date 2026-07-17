"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

interface SubscriptionStatus {
  currentPackage: string;
  status: string;
  billingCycleDate: string;
  gracePeriodEnd: string | null;
  currentProductsCount: number;
  maxProducts: number | null;
  currentEmployeesCount: number;
  maxEmployees: number;
  currentWarehousesCount: number;
  maxWarehouses: number;
}

interface PackageInfo {
  name: string;
  monthlyPrice: number;
  maxProducts: number | null;
  maxEmployees: number;
  maxWarehouses: number;
  maxThemes: number;
  commissionPercentage: number;
  features: {
    accountingFull: boolean;
    payroll: boolean;
    zatcaInvoice: boolean;
    customDomain: boolean;
    affiliateMarketing: boolean;
    apiAccess: boolean;
  };
}

const PACKAGE_ORDER = ["free", "starter", "growth", "enterprise"];

const PACKAGES: PackageInfo[] = [
  {
    name: "free",
    monthlyPrice: 0,
    maxProducts: 20,
    maxEmployees: 2,
    maxWarehouses: 1,
    maxThemes: 1,
    commissionPercentage: 0,
    features: {
      accountingFull: false,
      payroll: false,
      zatcaInvoice: false,
      customDomain: false,
      affiliateMarketing: false,
      apiAccess: false,
    },
  },
  {
    name: "starter",
    monthlyPrice: 99,
    maxProducts: 500,
    maxEmployees: 10,
    maxWarehouses: 3,
    maxThemes: 2,
    commissionPercentage: 5,
    features: {
      accountingFull: true,
      payroll: false,
      zatcaInvoice: true,
      customDomain: false,
      affiliateMarketing: false,
      apiAccess: false,
    },
  },
  {
    name: "growth",
    monthlyPrice: 299,
    maxProducts: 2000,
    maxEmployees: 25,
    maxWarehouses: 10,
    maxThemes: 3,
    commissionPercentage: 3,
    features: {
      accountingFull: true,
      payroll: true,
      zatcaInvoice: true,
      customDomain: true,
      affiliateMarketing: true,
      apiAccess: false,
    },
  },
  {
    name: "enterprise",
    monthlyPrice: 799,
    maxProducts: null,
    maxEmployees: 999,
    maxWarehouses: 999,
    maxThemes: 3,
    commissionPercentage: 5,
    features: {
      accountingFull: true,
      payroll: true,
      zatcaInvoice: true,
      customDomain: true,
      affiliateMarketing: true,
      apiAccess: true,
    },
  },
];

export default function SubscriptionPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const FEATURE_LIST: { key: keyof PackageInfo["features"]; label: string }[] = [
    { key: "accountingFull", label: t("subscription.featureAccountingFull") },
    { key: "payroll", label: t("subscription.featurePayroll") },
    { key: "zatcaInvoice", label: t("subscription.featureZatcaInvoice") },
    { key: "customDomain", label: t("subscription.featureCustomDomain") },
    { key: "affiliateMarketing", label: t("subscription.featureAffiliateMarketing") },
    { key: "apiAccess", label: t("subscription.featureApiAccess") },
  ];

  const packageNameMap: Record<string, string> = {
    "free": t("subscription.packageFree"),
    "starter": t("subscription.packageStarter"),
    "growth": t("subscription.packageGrowth"),
    "enterprise": t("subscription.packageEnterprise"),
    "المجانية": t("subscription.packageFree"),
    "الإنطلاق": t("subscription.packageStarter"),
    "التوسع": t("subscription.packageGrowth"),
    "الريادة": t("subscription.packageEnterprise"),
  };

  const tPackageName = (name: string) => packageNameMap[name] || name;

  const fetchStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/subscriptions/status");
      setStatus(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("subscription.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getCurrentPackageIndex = () => {
    if (!status) return -1;
    return PACKAGE_ORDER.indexOf(status.currentPackage);
  };

  const isHigherPackage = (packageName: string) => {
    const currentIndex = getCurrentPackageIndex();
    const targetIndex = PACKAGE_ORDER.indexOf(packageName);
    return currentIndex >= 0 && targetIndex > currentIndex;
  };

  const isLowerPackage = (packageName: string) => {
    const currentIndex = getCurrentPackageIndex();
    const targetIndex = PACKAGE_ORDER.indexOf(packageName);
    return currentIndex >= 0 && targetIndex < currentIndex;
  };

  const handlePackageChange = async (packageName: string, isUpgrade: boolean) => {
    const confirmMsg = isUpgrade
      ? `${t("subscription.confirmUpgrade")} "${tPackageName(packageName)}"؟`
      : `${t("subscription.confirmDowngrade")} "${tPackageName(packageName)}"؟`;
    if (!window.confirm(confirmMsg)) return;

    setActionError("");
    setActionSuccess("");
    setProcessing(packageName);

    try {
      const endpoint = isUpgrade ? "/subscriptions/upgrade" : "/subscriptions/downgrade";
      await api.post(endpoint, { packageName });
      setActionSuccess(isUpgrade ? t("subscription.upgradeSuccess") : t("subscription.downgradeSuccess"));
      await fetchStatus();
    } catch (err: any) {
      setActionError(err.response?.data?.message || (isUpgrade ? t("subscription.upgradeError") : t("subscription.downgradeError")));
    } finally {
      setProcessing(null);
    }
  };

  const handleRenew = async () => {
    if (!window.confirm(t("subscription.confirmRenew"))) return;

    setActionError("");
    setActionSuccess("");
    setProcessing("renew");

    try {
      await api.post("/subscriptions/renew");
      setActionSuccess(t("subscription.renewSuccess"));
      await fetchStatus();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("subscription.renewError"));
    } finally {
      setProcessing(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(t("subscription.confirmCancel"))) return;

    setActionError("");
    setActionSuccess("");
    setProcessing("cancel");

    try {
      await api.post("/subscriptions/cancel");
      setActionSuccess(t("subscription.cancelSuccess"));
      await fetchStatus();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("subscription.cancelError"));
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getLimitLabel = (max: number | null) => {
    if (max === null || max === -1) return t("subscription.unlimited");
    return max.toString();
  };

  const getProgressPercent = (current: number, max: number | null) => {
    if (max === null || max === -1 || max === 0) return 0;
    return Math.min(100, (current / max) * 100);
  };

  const getStatusBadgeClass = (statusStr: string) => {
    switch (statusStr) {
      case "Active":
        return "badge badge--green";
      case "Suspended":
        return "badge badge--red";
      case "Trial":
        return "badge badge--blue";
      case "Expired":
        return "badge badge--yellow";
      default:
        return "badge badge--gray";
    }
  };

  const getStatusLabel = (statusStr: string) => {
    switch (statusStr) {
      case "Active":
        return t("subscription.statusActive");
      case "Suspended":
        return t("subscription.statusSuspended");
      case "Trial":
        return t("subscription.statusTrial");
      case "Expired":
        return t("subscription.statusExpired");
      default:
        return statusStr;
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <div className="alert alert--danger">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader icon="crown" title={t("subscription.title")} />

      {status && (
        <div className="card p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-[var(--ink)]">
                {t("subscription.currentPackage")}: <span className="text-[var(--blue)]">{tPackageName(status.currentPackage)}</span>
              </h2>
              <p className="text-[var(--sub)] mt-1 flex items-center gap-2">
                {t("subscription.status")}:
                <span className={getStatusBadgeClass(status.status)}>
                  {getStatusLabel(status.status)}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleRenew} disabled={processing === "renew"} className="btn-primary">
                {processing === "renew" ? t("subscription.renewing") : t("subscription.renewBtn")}
              </button>
              <button onClick={handleCancel} disabled={processing === "cancel"} className="btn-outline">
                {processing === "cancel" ? t("subscription.cancelling") : t("subscription.cancelAutoRenew")}
              </button>
            </div>
          </div>

          <div className="border-t pt-6" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-lg font-medium text-[var(--ink)] mb-4">{t("subscription.subscriptionDetails")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-[var(--sub)]">{t("subscription.billingCycleDate")}</p>
                <p className="font-medium text-[var(--ink)]">{formatDate(status.billingCycleDate)}</p>
              </div>
              {status.gracePeriodEnd && (
                <div>
                  <p className="text-[var(--sub)]">{t("subscription.gracePeriodEnd")}</p>
                  <p className="font-medium text-[var(--danger)]">{formatDate(status.gracePeriodEnd)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {status && (
        <div className="card p-5">
          <h3 className="text-lg font-medium text-[var(--ink)] mb-4">{t("subscription.limitUsage")}</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--ink)]">{t("subscription.products")}</span>
                <span className="text-[var(--sub)]">
                  {status.currentProductsCount} / {getLimitLabel(status.maxProducts)}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgressPercent(status.currentProductsCount, status.maxProducts)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--ink)]">{t("subscription.employees")}</span>
                <span className="text-[var(--sub)]">
                  {status.currentEmployeesCount} / {getLimitLabel(status.maxEmployees)}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgressPercent(status.currentEmployeesCount, status.maxEmployees)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--ink)]">{t("subscription.warehouses")}</span>
                <span className="text-[var(--sub)]">
                  {status.currentWarehousesCount} / {getLimitLabel(status.maxWarehouses)}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgressPercent(status.currentWarehousesCount, status.maxWarehouses)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="text-lg font-medium text-[var(--ink)] mb-4">{t("subscription.availablePackages")}</h3>

        {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
        {actionSuccess && <div className="alert alert--success mb-4">{actionSuccess}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PACKAGES.map((pkg) => {
            const isCurrent = pkg.name === status?.currentPackage;
            const isHigher = isHigherPackage(pkg.name);
            const isLower = isLowerPackage(pkg.name);

            return (
              <div
                key={pkg.name}
                className={`package-card ${isCurrent ? "package-card--current" : ""}`}
              >
                {isCurrent && <span className="package-card__badge">{t("subscription.currentBadge")}</span>}

                <div className="text-center mb-4">
                  <h4 className="text-lg font-bold text-[var(--ink)]">{tPackageName(pkg.name)}</h4>
                  <p className="text-2xl font-bold text-[var(--blue)] mt-1">
                    {pkg.monthlyPrice === 0 ? t("subscription.free") : `${pkg.monthlyPrice} ${t("subscription.perMonth")}`}
                  </p>
                </div>

                <div className="space-y-3 mb-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                  <div className="text-sm">
                    <span className="text-[var(--sub)]">{t("subscription.products")}: </span>
                    <span className="font-medium text-[var(--ink)]">{getLimitLabel(pkg.maxProducts)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-[var(--sub)]">{t("subscription.employees")}: </span>
                    <span className="font-medium text-[var(--ink)]">{getLimitLabel(pkg.maxEmployees)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-[var(--sub)]">{t("subscription.warehouses")}: </span>
                    <span className="font-medium text-[var(--ink)]">{getLimitLabel(pkg.maxWarehouses)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-[var(--sub)]">{t("subscription.themes")}: </span>
                    <span className="font-medium text-[var(--ink)]">{getLimitLabel(pkg.maxThemes)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-[var(--sub)]">{t("subscription.marketingCommission")}: </span>
                    <span className="font-medium text-[var(--ink)]">{pkg.commissionPercentage}%</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs text-[var(--sub)] text-center">{t("subscription.features")}:</p>
                  <div className="grid grid-cols-2 gap-1">
                    {FEATURE_LIST.map((feature) => (
                      <span
                        key={feature.key}
                        className={`feature-chip ${
                          pkg.features[feature.key] ? "feature-chip--on" : "feature-chip--off"
                        }`}
                      >
                        {pkg.features[feature.key] ? (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                        {feature.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {isCurrent ? (
                    <button disabled className="btn-secondary w-full">
                      {t("subscription.currentBadge")}
                    </button>
                  ) : isHigher ? (
                    <button
                      onClick={() => handlePackageChange(pkg.name, true)}
                      disabled={processing === pkg.name}
                      className="btn-primary w-full"
                    >
                      {processing === pkg.name ? t("subscription.upgrading") : t("subscription.upgradeTo")}
                    </button>
                  ) : isLower ? (
                    <button
                      onClick={() => handlePackageChange(pkg.name, false)}
                      disabled={processing === pkg.name}
                      className="btn-secondary w-full"
                    >
                      {processing === pkg.name ? t("subscription.downgrading") : t("subscription.downgradeTo")}
                    </button>
                  ) : (
                    <button disabled className="btn-secondary w-full">
                      {t("subscription.notAvailable")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

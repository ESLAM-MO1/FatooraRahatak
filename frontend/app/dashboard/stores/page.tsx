"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { getUserType } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { useConfirm } from "@/components/ConfirmDialog";

interface Store {
  id: number;
  storeName: string;
  storeSlug: string;
  ownerName: string;
  ownerEmail: string;
  packageName: string;
  status: string;
  createdAt: string;
  packageConsumptionPercent: number;
}

const statusLabel = (status: string, t: (key: string) => string) => {
  switch (status) {
    case "Active":
      return t("store.statusActive");
    case "Suspended":
      return t("store.statusSuspended");
    case "PendingApproval":
      return t("store.statusPendingApproval");
    case "Closed":
      return t("store.statusClosed");
    default:
      return status;
  }
};

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "Active":
      return "badge badge--green";
    case "Suspended":
      return "badge badge--red";
    case "PendingApproval":
      return "badge badge--yellow";
    case "Closed":
      return "badge badge--gray";
    default:
      return "badge badge--gray";
  }
};

export default function StoresPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [packageFilter, setPackageFilter] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);

  const userType = getUserType();

  useEffect(() => {
    if (userType !== "SuperAdmin") {
      setError(t("store.unauthorized"));
      setLoading(false);
      return;
    }
    fetchStores();
  }, [userType]);

  const fetchStores = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/stores");
      setStores(res.data.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError(t("store.unauthorizedSuperAdmin"));
      } else {
        setError(err.response?.data?.message || t("store.loadError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (store: Store) => {
    if (!(await confirm(t("store.suspendConfirm", { name: store.storeName })))) return;

    setActionError("");
    setActionSuccess("");
    setProcessingId(store.id);
    try {
      await api.put(`/admin/stores/${store.id}/suspend`);
      setActionSuccess(t("store.suspendSuccess", { name: store.storeName }));
      await fetchStores();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("store.suspendError"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivate = async (store: Store) => {
    if (!(await confirm(t("store.activateConfirm", { name: store.storeName })))) return;

    setActionError("");
    setActionSuccess("");
    setProcessingId(store.id);
    try {
      await api.put(`/admin/stores/${store.id}/activate`);
      setActionSuccess(t("store.activateSuccess", { name: store.storeName }));
      await fetchStores();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("store.activateError"));
    } finally {
      setProcessingId(null);
    }
  };

  const filteredStores = stores.filter((store) => {
    const statusMatch = !statusFilter || store.status === statusFilter;
    const packageMatch = !packageFilter || store.packageName === packageFilter;
    return statusMatch && packageMatch;
  });

  const statuses = [...new Set(stores.map((s) => s.status))];
  const packages = [...new Set(stores.map((s) => s.packageName))];

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <div className="alert alert--danger">{error}</div>;
  }

  return (
    <div>
      <PageHeader icon="store" title={t("store.manage")} />

      {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
      <SuccessToast message={actionSuccess} fixed className="mb-4" />

      <div className="card p-4 mb-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[var(--ink)]">{t("store.filterStatus")}</label>
          <div className="field-shell">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-transparent w-full outline-none"
            >
              <option value="">{t("common.all")}</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status, t)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[var(--ink)]">{t("store.filterPackage")}</label>
          <div className="field-shell">
            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-transparent w-full outline-none"
            >
              <option value="">{t("common.all")}</option>
              {packages.map((pkg) => (
                <option key={pkg} value={pkg}>
                  {pkg}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filteredStores.length === 0 ? (
          <p className="p-5 text-[var(--sub)] text-sm text-center">
            {t("store.noStores")}{statusFilter || packageFilter ? t("store.noStoresFilter") : ""}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="hidden lg:table w-full text-sm">
              <thead className="bg-[var(--border)] border-b" style={{ borderColor: "var(--border)" }}>
                <tr>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("store.name")}</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("store.slug")}</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("store.owner")}</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("store.email")}</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("store.package")}</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("store.consumption")}</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("store.status")}</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("store.registrationDate")}</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredStores.map((store) => (
                  <tr
                    key={store.id}
                    className="border-b hover:bg-[var(--border)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="p-3 text-[var(--ink)] font-medium">{store.storeName}</td>
                    <td className="p-3 text-[var(--sub)]" dir="ltr">
                      {store.storeSlug}
                    </td>
                    <td className="p-3 text-[var(--ink)]">{store.ownerName}</td>
                    <td className="p-3 text-[var(--sub)]" dir="ltr">
                      {store.ownerEmail}
                    </td>
                    <td className="p-3 text-[var(--sub)]">{store.packageName}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(store.packageConsumptionPercent, 100)}%`,
                              backgroundColor:
                                store.packageConsumptionPercent > 90
                                  ? "#ef4444"
                                  : store.packageConsumptionPercent >= 70
                                  ? "#f59e0b"
                                  : "#10b981",
                            }}
                          />
                        </div>
                        <span
                          className="text-[12px] font-bold shrink-0"
                          style={{
                            color:
                              store.packageConsumptionPercent > 90
                                ? "#ef4444"
                                : store.packageConsumptionPercent >= 70
                                ? "#f59e0b"
                                : "#10b981",
                          }}
                        >
                          {store.packageConsumptionPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={statusBadgeClass(store.status)}>{statusLabel(store.status, t)}</span>
                    </td>
                    <td className="p-3 text-[var(--sub)]" dir="ltr">
                      {new Date(store.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/stores/${store.id}`}
                          className="text-[var(--blue)] hover:underline text-sm"
                        >
                          {t("store.details")}
                        </Link>
                        {store.status === "Active" && (
                          <button
                            onClick={() => handleSuspend(store)}
                            disabled={processingId === store.id}
                            className="text-[var(--danger)] hover:underline text-sm disabled:opacity-50"
                          >
                            {processingId === store.id ? t("store.suspending") : t("store.suspend")}
                          </button>
                        )}
                        {store.status === "Suspended" && (
                          <button
                            onClick={() => handleActivate(store)}
                            disabled={processingId === store.id}
                            className="text-[var(--green)] hover:underline text-sm disabled:opacity-50"
                          >
                            {processingId === store.id ? t("store.activating") : t("store.activate")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="lg:hidden space-y-3">
              {filteredStores.map((store) => (
                <div key={store.id} className="card p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("store.name")}</p>
                      <p className="text-[12px] text-[var(--ink)] font-medium">{store.storeName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("store.status")}</p>
                      <span className={statusBadgeClass(store.status)}>{statusLabel(store.status, t)}</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("store.slug")}</p>
                      <p className="text-[12px] text-[var(--sub)]" dir="ltr">{store.storeSlug}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("store.owner")}</p>
                      <p className="text-[12px] text-[var(--ink)]">{store.ownerName}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("store.email")}</p>
                      <p className="text-[12px] text-[var(--sub)]" dir="ltr">{store.ownerEmail}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("store.package")}</p>
                      <p className="text-[12px] text-[var(--sub)]">{store.packageName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("store.consumption")}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(store.packageConsumptionPercent, 100)}%`,
                              backgroundColor:
                                store.packageConsumptionPercent > 90
                                  ? "#ef4444"
                                  : store.packageConsumptionPercent >= 70
                                  ? "#f59e0b"
                                  : "#10b981",
                            }}
                          />
                        </div>
                        <span
                          className="text-[12px] font-bold shrink-0"
                          style={{
                            color:
                              store.packageConsumptionPercent > 90
                                ? "#ef4444"
                                : store.packageConsumptionPercent >= 70
                                ? "#f59e0b"
                                : "#10b981",
                          }}
                        >
                          {store.packageConsumptionPercent}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("store.registrationDate")}</p>
                      <p className="text-[12px] text-[var(--sub)]" dir="ltr">
                        {new Date(store.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <Link href={`/dashboard/stores/${store.id}`} className="text-[var(--blue)] hover:underline text-sm">
                      {t("store.details")}
                    </Link>
                    {store.status === "Active" && (
                      <button
                        onClick={() => handleSuspend(store)}
                        disabled={processingId === store.id}
                        className="text-[var(--danger)] hover:underline text-sm disabled:opacity-50"
                      >
                        {processingId === store.id ? t("store.suspending") : t("store.suspend")}
                      </button>
                    )}
                    {store.status === "Suspended" && (
                      <button
                        onClick={() => handleActivate(store)}
                        disabled={processingId === store.id}
                        className="text-[var(--green)] hover:underline text-sm disabled:opacity-50"
                      >
                        {processingId === store.id ? t("store.activating") : t("store.activate")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

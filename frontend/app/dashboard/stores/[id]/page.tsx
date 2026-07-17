"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { getUserType } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

interface StoreDetail {
  id: number;
  storeName: string;
  storeSlug: string;
  ownerName: string;
  ownerEmail: string;
  packageName: string;
  status: string;
  createdAt: string;
  productsCount: number;
  employeesCount: number;
  customDomain: string | null;
  customDomainStatus: string;
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "Active":
      return "status-badge status-badge--active";
    case "Suspended":
      return "status-badge status-badge--suspended";
    case "PendingApproval":
      return "status-badge status-badge--pending";
    case "Closed":
      return "status-badge status-badge--closed";
    default:
      return "status-badge";
  }
};

const domainStatusBadgeClass = (status: string) => {
  switch (status) {
    case "Active":
      return "badge badge--green";
    case "Pending":
      return "badge badge--yellow";
    default:
      return "badge badge--gray";
  }
};

export default function StoreDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const storeId = params.id as string;
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [processing, setProcessing] = useState(false);

  const statusLabel = (status: string) => {
    switch (status) {
      case "Active": return t("storeDetail.statusActive");
      case "Suspended": return t("storeDetail.statusSuspended");
      case "PendingApproval": return t("storeDetail.statusPending");
      case "Closed": return t("storeDetail.statusClosed");
      default: return status;
    }
  };

  const domainStatusLabel = (status: string) => {
    switch (status) {
      case "None": return t("storeDetail.domainNone");
      case "Pending": return t("storeDetail.domainPending");
      case "Active": return t("storeDetail.domainActive");
      default: return status;
    }
  };

  const userType = getUserType();

  useEffect(() => {
    if (userType !== "SuperAdmin") {
      setError(t("storeDetail.unauthorized"));
      setLoading(false);
      return;
    }
    fetchStore();
  }, [userType, storeId, t]);

  const fetchStore = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/admin/stores/${storeId}`);
      setStore(res.data.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError(t("storeDetail.forbidden"));
      } else if (err.response?.status === 404) {
        setError(t("storeDetail.notFound"));
      } else {
        setError(err.response?.data?.message || t("storeDetail.loadError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!store) return;
    if (!window.confirm(t("storeDetail.suspendConfirm", { name: store.storeName }))) return;

    setActionError("");
    setActionSuccess("");
    setProcessing(true);
    try {
      await api.put(`/admin/stores/${store.id}/suspend`);
      setActionSuccess(t("storeDetail.suspendSuccess", { name: store.storeName }));
      await fetchStore();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("storeDetail.suspendError"));
    } finally {
      setProcessing(false);
    }
  };

  const handleActivate = async () => {
    if (!store) return;
    if (!window.confirm(t("storeDetail.activateConfirm", { name: store.storeName }))) return;

    setActionError("");
    setActionSuccess("");
    setProcessing(true);
    try {
      await api.put(`/admin/stores/${store.id}/activate`);
      setActionSuccess(t("storeDetail.activateSuccess", { name: store.storeName }));
      await fetchStore();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("storeDetail.activateError"));
    } finally {
      setProcessing(false);
    }
  };

  const handleActivateDomain = async () => {
    if (!store) return;
    if (!window.confirm(t("storeDetail.activateDomainConfirm", { domain: store.customDomain }))) return;

    setActionError("");
    setActionSuccess("");
    setProcessing(true);
    try {
      await api.put(`/admin/stores/${store.id}/custom-domain/activate`);
      setActionSuccess(t("storeDetail.activateDomainSuccess"));
      await fetchStore();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("storeDetail.activateDomainError"));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="alert alert--danger">
        {error}
        <div className="mt-3">
          <Link href="/dashboard/stores" className="btn-primary inline-block">
            {t("storeDetail.backToList")}
          </Link>
        </div>
      </div>
    );
  }

  if (!store) {
    return <div className="alert alert--danger">{t("storeDetail.notFound")}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/stores" className="text-[var(--blue)] hover:underline text-sm mb-2 inline-block">
            {t("storeDetail.backToList")}
          </Link>
          <h1 className="text-2xl font-bold text-[var(--ink)]">{t("storeDetail.title", { name: store.storeName })}</h1>
        </div>
      </div>

      {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
      {actionSuccess && <div className="alert alert--success mb-4">{actionSuccess}</div>}

      <div className="card p-5 mb-6">
        <h2 className="text-lg font-medium text-[var(--ink)] mb-4">{t("storeDetail.basicInfo")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-[var(--sub)]">{t("storeDetail.storeName")}</p>
            <p className="font-medium text-[var(--ink)]">{store.storeName}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">{t("storeDetail.subdomain")}</p>
            <p className="font-medium text-[var(--ink)]" dir="ltr">{store.storeSlug}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">{t("storeDetail.package")}</p>
            <p className="font-medium text-[var(--blue)]">{store.packageName}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">{t("storeDetail.status")}</p>
            <p className="font-medium">
              <span className={statusBadgeClass(store.status)}>{statusLabel(store.status)}</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">{t("storeDetail.owner")}</p>
            <p className="font-medium text-[var(--ink)]">{store.ownerName}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">{t("storeDetail.ownerEmail")}</p>
            <p className="font-medium text-[var(--ink)]" dir="ltr">{store.ownerEmail}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">{t("storeDetail.productsCount")}</p>
            <p className="font-medium text-[var(--ink)]" dir="ltr">{store.productsCount}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">{t("storeDetail.employeesCount")}</p>
            <p className="font-medium text-[var(--ink)]" dir="ltr">{store.employeesCount}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">{t("storeDetail.registrationDate")}</p>
            <p className="font-medium text-[var(--ink)]" dir="ltr">
              {new Date(store.createdAt).toLocaleDateString("ar-SA", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <h2 className="text-lg font-medium text-[var(--ink)] mb-4">{t("storeDetail.customDomain")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-[var(--sub)]">{t("storeDetail.domain")}</p>
            <p className="font-medium text-[var(--ink)]" dir="ltr">{store.customDomain || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">{t("storeDetail.domainStatusLabel")}</p>
            <p className="font-medium">
              <span className={domainStatusBadgeClass(store.customDomainStatus)}>
                {domainStatusLabel(store.customDomainStatus)}
              </span>
            </p>
          </div>
        </div>
        {store.customDomainStatus === "Pending" && (
          <button onClick={handleActivateDomain} disabled={processing} className="btn-success">
            {processing ? t("storeDetail.activatingDomain") : t("storeDetail.activateDomain")}
          </button>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-medium text-[var(--ink)] mb-4">{t("storeDetail.actions")}</h2>
        <div className="flex flex-wrap gap-3">
          {store.status === "Active" && (
            <button onClick={handleSuspend} disabled={processing} className="btn-danger">
              {processing ? t("storeDetail.suspending") : t("storeDetail.suspendStore")}
            </button>
          )}
          {store.status === "Suspended" && (
            <button onClick={handleActivate} disabled={processing} className="btn-success">
              {processing ? t("storeDetail.activating") : t("storeDetail.activateStore")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
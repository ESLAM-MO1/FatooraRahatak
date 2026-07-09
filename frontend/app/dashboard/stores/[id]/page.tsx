"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { getUserType } from "@/lib/auth";

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

const statusLabel = (status: string) => {
  switch (status) {
    case "Active":
      return "نشط";
    case "Suspended":
      return "معلق";
    case "PendingApproval":
      return "بانتظار الموافقة";
    case "Closed":
      return "مغلق";
    default:
      return status;
  }
};

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

const domainStatusLabel = (status: string) => {
  switch (status) {
    case "None":
      return "لا يوجد";
    case "Pending":
      return "قيد المراجعة";
    case "Active":
      return "مفعّل";
    default:
      return status;
  }
};

const domainStatusBadgeClass = (status: string) => {
  switch (status) {
    case "Active":
      return "status-badge status-badge--active";
    case "Pending":
      return "status-badge status-badge--pending";
    default:
      return "status-badge";
  }
};

export default function StoreDetailPage() {
  const params = useParams();
  const storeId = params.id as string;
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [processing, setProcessing] = useState(false);

  const userType = getUserType();

  useEffect(() => {
    if (userType !== "SuperAdmin") {
      setError("غير مصرح لك - هذه الصفحة للمدراء العامين فقط");
      setLoading(false);
      return;
    }
    fetchStore();
  }, [userType, storeId]);

  const fetchStore = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/admin/stores/${storeId}`);
      setStore(res.data.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError("غير مصرح لك - يتطلب صلاحيات SuperAdmin");
      } else if (err.response?.status === 404) {
        setError("المتجر غير موجود");
      } else {
        setError(err.response?.data?.message || "حدث خطأ أثناء تحميل تفاصيل المتجر");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!store) return;
    if (!window.confirm(`هل أنت متأكد من تعليق المتجر "${store.storeName}"؟`)) return;

    setActionError("");
    setActionSuccess("");
    setProcessing(true);
    try {
      await api.put(`/admin/stores/${store.id}/suspend`);
      setActionSuccess(`تم تعليق المتجر "${store.storeName}" بنجاح`);
      await fetchStore();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "حدث خطأ أثناء تعليق المتجر");
    } finally {
      setProcessing(false);
    }
  };

  const handleActivate = async () => {
    if (!store) return;
    if (!window.confirm(`هل أنت متأكد من تفعيل المتجر "${store.storeName}"؟`)) return;

    setActionError("");
    setActionSuccess("");
    setProcessing(true);
    try {
      await api.put(`/admin/stores/${store.id}/activate`);
      setActionSuccess(`تم تفعيل المتجر "${store.storeName}" بنجاح`);
      await fetchStore();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "حدث خطأ أثناء تفعيل المتجر");
    } finally {
      setProcessing(false);
    }
  };

  const handleActivateDomain = async () => {
    if (!store) return;
    if (!window.confirm(`هل أنت متأكد من تفعيل الدومين "${store.customDomain}"؟`)) return;

    setActionError("");
    setActionSuccess("");
    setProcessing(true);
    try {
      await api.put(`/admin/stores/${store.id}/custom-domain/activate`);
      setActionSuccess(`تم تفعيل الدومين الخاص بنجاح`);
      await fetchStore();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "حدث خطأ أثناء تفعيل الدومين");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <p className="text-[var(--sub)]">جاري التحميل...</p>;
  }

  if (error) {
    return (
      <div className="alert alert--danger">
        {error}
        <div className="mt-3">
          <Link href="/dashboard/stores" className="btn-primary inline-block">
            رجوع لقائمة المتاجر
          </Link>
        </div>
      </div>
    );
  }

  if (!store) {
    return <div className="alert alert--danger">المتجر غير موجود</div>;
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/stores" className="text-[var(--blue)] hover:underline text-sm mb-2 inline-block">
            ← رجوع لقائمة المتاجر
          </Link>
          <h1 className="text-2xl font-bold text-[var(--ink)]">تفاصيل المتجر: {store.storeName}</h1>
        </div>
      </div>

      {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
      {actionSuccess && <div className="alert alert--success mb-4">{actionSuccess}</div>}

      <div className="card p-5 mb-6">
        <h2 className="text-lg font-medium text-[var(--ink)] mb-4">معلومات المتجر الأساسية</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-[var(--sub)]">اسم المتجر</p>
            <p className="font-medium text-[var(--ink)]">{store.storeName}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">الرابط الفرعي</p>
            <p className="font-medium text-[var(--ink)]" dir="ltr">{store.storeSlug}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">الباقة الحالية</p>
            <p className="font-medium text-[var(--blue)]">{store.packageName}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">الحالة</p>
            <p className="font-medium">
              <span className={statusBadgeClass(store.status)}>{statusLabel(store.status)}</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">صاحب المتجر</p>
            <p className="font-medium text-[var(--ink)]">{store.ownerName}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">إيميل صاحب المتجر</p>
            <p className="font-medium text-[var(--ink)]" dir="ltr">{store.ownerEmail}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">عدد المنتجات</p>
            <p className="font-medium text-[var(--ink)]" dir="ltr">{store.productsCount}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">عدد الموظفين (النشطين)</p>
            <p className="font-medium text-[var(--ink)]" dir="ltr">{store.employeesCount}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">تاريخ التسجيل</p>
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
        <h2 className="text-lg font-medium text-[var(--ink)] mb-4">الدومين الخاص</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-[var(--sub)]">الدومين</p>
            <p className="font-medium text-[var(--ink)]" dir="ltr">{store.customDomain || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--sub)]">حالة الدومين</p>
            <p className="font-medium">
              <span className={domainStatusBadgeClass(store.customDomainStatus)}>
                {domainStatusLabel(store.customDomainStatus)}
              </span>
            </p>
          </div>
        </div>
        {store.customDomainStatus === "Pending" && (
          <button onClick={handleActivateDomain} disabled={processing} className="btn-success">
            {processing ? "جاري التفعيل..." : "تفعيل الدومين"}
          </button>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-medium text-[var(--ink)] mb-4">إجراءات</h2>
        <div className="flex flex-wrap gap-3">
          {store.status === "Active" && (
            <button onClick={handleSuspend} disabled={processing} className="btn-danger">
              {processing ? "جاري التعليق..." : "تعليق المتجر"}
            </button>
          )}
          {store.status === "Suspended" && (
            <button onClick={handleActivate} disabled={processing} className="btn-success">
              {processing ? "جاري التفعيل..." : "تفعيل المتجر"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
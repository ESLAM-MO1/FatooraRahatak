"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { getUserType } from "@/lib/auth";

interface Store {
  id: number;
  storeName: string;
  storeSlug: string;
  ownerName: string;
  ownerEmail: string;
  packageName: string;
  status: string;
  createdAt: string;
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

export default function StoresPage() {
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
      setError("غير مصرح لك - هذه الصفحة للمدراء العامين فقط");
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
        setError("غير مصرح لك - يتطلب صلاحيات SuperAdmin");
      } else {
        setError(err.response?.data?.message || "حدث خطأ أثناء تحميل المتاجر");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (store: Store) => {
    if (!window.confirm(`هل أنت متأكد من تعليق المتجر "${store.storeName}"؟`)) return;

    setActionError("");
    setActionSuccess("");
    setProcessingId(store.id);
    try {
      await api.put(`/admin/stores/${store.id}/suspend`);
      setActionSuccess(`تم تعليق المتجر "${store.storeName}" بنجاح`);
      await fetchStores();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "حدث خطأ أثناء تعليق المتجر");
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivate = async (store: Store) => {
    if (!window.confirm(`هل أنت متأكد من تفعيل المتجر "${store.storeName}"؟`)) return;

    setActionError("");
    setActionSuccess("");
    setProcessingId(store.id);
    try {
      await api.put(`/admin/stores/${store.id}/activate`);
      setActionSuccess(`تم تفعيل المتجر "${store.storeName}" بنجاح`);
      await fetchStores();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "حدث خطأ أثناء تفعيل المتجر");
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
    return <p className="text-[var(--sub)]">جاري التحميل...</p>;
  }

  if (error) {
    return <div className="alert alert--danger">{error}</div>;
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--ink)]">إدارة المتاجر</h1>
      </div>

      {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
      {actionSuccess && <div className="alert alert--success mb-4">{actionSuccess}</div>}

      <div className="card p-4 mb-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[var(--ink)]">الحالة:</label>
          <div className="field-shell">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-transparent w-full outline-none"
            >
              <option value="">الكل</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[var(--ink)]">الباقة:</label>
          <div className="field-shell">
            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-transparent w-full outline-none"
            >
              <option value="">الكل</option>
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
            لا يوجد متاجر{statusFilter || packageFilter ? " تطابق الفلاتر" : ""}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--border)] border-b" style={{ borderColor: "var(--border)" }}>
                <tr>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">الاسم</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">الرابط الفرعي</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">صاحب المتجر</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">الإيميل</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">الباقة</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">الحالة</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">تاريخ التسجيل</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">إجراءات</th>
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
                      <span className={statusBadgeClass(store.status)}>{statusLabel(store.status)}</span>
                    </td>
                    <td className="p-3 text-[var(--sub)]" dir="ltr">
                      {new Date(store.createdAt).toLocaleDateString("ar-SA")}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/stores/${store.id}`}
                          className="text-[var(--blue)] hover:underline text-sm"
                        >
                          التفاصيل
                        </Link>
                        {store.status === "Active" && (
                          <button
                            onClick={() => handleSuspend(store)}
                            disabled={processingId === store.id}
                            className="text-[var(--danger)] hover:underline text-sm disabled:opacity-50"
                          >
                            {processingId === store.id ? "جاري التعليق..." : "تعليق"}
                          </button>
                        )}
                        {store.status === "Suspended" && (
                          <button
                            onClick={() => handleActivate(store)}
                            disabled={processingId === store.id}
                            className="text-[var(--green)] hover:underline text-sm disabled:opacity-50"
                          >
                            {processingId === store.id ? "جاري التفعيل..." : "تفعيل"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
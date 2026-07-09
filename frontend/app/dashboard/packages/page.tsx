"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { getUserType } from "@/lib/auth";

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
  isActive: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  hasAccountingFull: "محاسبة كاملة",
  hasPayroll: "رواتب",
  hasZatcaInvoice: "فاتورة إلكترونية (ZATCA)",
  hasCustomDomain: "دومين مخصص",
  hasAffiliateMarketing: "تسويق بالعمولة",
  hasApiAccess: "API",
};

const LIMIT_FIELDS = [
  { key: "maxProducts" as keyof Package, label: "المنتجات" },
  { key: "maxOrdersPerMonth" as keyof Package, label: "الطلبات/شهر" },
  { key: "maxEmployees" as keyof Package, label: "الموظفين" },
  { key: "maxWarehouses" as keyof Package, label: "المخازن" },
  { key: "maxBranchesPOS" as keyof Package, label: "فروع POS" },
  { key: "maxPaymentGateways" as keyof Package, label: "بوابات الدفع" },
  { key: "maxShippingCompanies" as keyof Package, label: "شركات الشحن" },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Package>>({});

  const userType = getUserType();

  useEffect(() => {
    if (userType !== "SuperAdmin") {
      setError("غير مصرح لك - هذه الصفحة للمدراء العامين فقط");
      setLoading(false);
      return;
    }
    fetchPackages();
  }, [userType]);

  const fetchPackages = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/packages");
      setPackages(res.data.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError("غير مصرح لك - يتطلب صلاحيات SuperAdmin");
      } else {
        setError(err.response?.data?.message || "حدث خطأ أثناء تحميل الباقات");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (pkg: Package) => {
    setEditingId(pkg.id);
    setEditForm({
      monthlyPrice: pkg.monthlyPrice,
      maxProducts: pkg.maxProducts,
      maxOrdersPerMonth: pkg.maxOrdersPerMonth,
      maxEmployees: pkg.maxEmployees,
      maxWarehouses: pkg.maxWarehouses,
      maxBranchesPOS: pkg.maxBranchesPOS,
      maxPaymentGateways: pkg.maxPaymentGateways,
      maxShippingCompanies: pkg.maxShippingCompanies,
      hasAccountingFull: pkg.hasAccountingFull,
      hasPayroll: pkg.hasPayroll,
      hasZatcaInvoice: pkg.hasZatcaInvoice,
      hasCustomDomain: pkg.hasCustomDomain,
      hasAffiliateMarketing: pkg.hasAffiliateMarketing,
      hasApiAccess: pkg.hasApiAccess,
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
      setActionSuccess(`تم تحديث باقة "${pkg.packageName}" بنجاح`);
      setEditingId(null);
      setEditForm({});
      await fetchPackages();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "حدث خطأ أثناء تحديث الباقة");
    }
  };

  const getLimitDisplay = (value: number | null) => {
    if (value === null) return "غير محدود";
    if (value === -1) return "غير محدود";
    return value.toString();
  };

  const getPriceDisplay = (price: number) => {
    return price === 0 ? "مجاني" : `${price.toLocaleString("ar-SA")} ر.س/شهر`;
  };

  const renderLimitField = (pkg: Package, field: { key: keyof Package; label: string }) => {
    const isEditing = editingId === pkg.id;
    const value = pkg[field.key] as number | null;
    const editValue = editForm[field.key] as number | null | undefined;

    if (isEditing) {
      return (
        <div key={field.key} className="flex items-center justify-between text-[12.5px] mb-2 gap-3">
          <label className="text-[var(--sub)] shrink-0">{field.label}</label>
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
              placeholder="غير محدود"
              className="text-left"
            />
          </div>
        </div>
      );
    }

    return (
      <div key={field.key} className="flex justify-between text-[12.5px] mb-2">
        <span className="text-[var(--sub)]">{field.label}</span>
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
          <span className={active ? "text-[var(--green)]" : "text-[var(--sub)]"}>{label}</span>
        </label>
      );
    }

    return (
      <span key={key} className={`feature-chip ${active ? "feature-chip--on" : "feature-chip--off"}`}>
        {active ? <CheckIcon /> : <CrossIcon />}
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--sub)]">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
        جارٍ التحميل...
      </div>
    );
  }

  if (error) {
    return <div className="alert alert--danger">{error}</div>;
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--blue-deep)]">إدارة الباقات</h1>
      </div>

      {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
      {actionSuccess && <div className="alert alert--success mb-4">{actionSuccess}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {packages.map((pkg) => {
          const isEditing = editingId === pkg.id;
          const activeNow = isEditing ? editForm.isActive ?? pkg.isActive : pkg.isActive;

          return (
            <div key={pkg.id} className={`package-card ${isEditing ? "package-card--current" : ""}`}>
              {isEditing && <span className="package-card__badge">قيد التعديل</span>}

              <h3 className="text-[15px] font-bold text-[var(--blue-deep)] mb-2">{pkg.packageName}</h3>

              <div className="mb-4">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <label className="text-[12.5px] text-[var(--sub)] shrink-0">السعر</label>
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
                    <span className="text-[12px] text-[var(--sub)]">ر.س/شهر</span>
                  </div>
                ) : (
                  <p className="text-[22px] font-bold text-[var(--blue)]">{getPriceDisplay(pkg.monthlyPrice)}</p>
                )}
              </div>

              <div className="space-y-1 mb-4 border-t border-[var(--border)] pt-4">
                {LIMIT_FIELDS.map((field) => renderLimitField(pkg, field))}
              </div>

              <div className="space-y-2 mb-4 border-t border-[var(--border)] pt-4">
                <p className="text-[11.5px] text-[var(--sub)] mb-1">المميزات</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.entries(FEATURE_LABELS) as [keyof Package, string][]).map(([key, label]) =>
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
                      {activeNow ? "باقة نشطة" : "باقة غير نشطة"}
                    </span>
                  </label>
                ) : (
                  <span className={`status-badge ${pkg.isActive ? "status-badge--active" : "status-badge--suspended"}`}>
                    {pkg.isActive ? "باقة نشطة" : "باقة غير نشطة"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {isEditing ? (
                  <>
                    <button onClick={() => handleSave(pkg)} className="btn-primary w-full">
                      حفظ
                    </button>
                    <button onClick={handleCancelEdit} className="btn-outline w-full">
                      إلغاء
                    </button>
                  </>
                ) : (
                  <button onClick={() => handleEditClick(pkg)} className="btn-primary w-full">
                    تعديل
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
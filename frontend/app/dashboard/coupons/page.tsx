"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import Can from "@/components/Can";
import { useConfirm } from "@/components/ConfirmDialog";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

interface Coupon {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  usageLimitTotal: number | null;
  minOrderAmount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

interface CouponForm {
  code: string;
  discountType: string;
  discountValue: string;
  usageLimitTotal: string;
  minOrderAmount: string;
  validFrom: string;
  validUntil: string;
}

const emptyForm: CouponForm = {
  code: "",
  discountType: "Percentage",
  discountValue: "",
  usageLimitTotal: "",
  minOrderAmount: "0",
  validFrom: "",
  validUntil: "",
};

const discountTypeLabels: Record<string, string> = {
  Percentage: "coupons.percentDiscount",
  FixedAmount: "coupons.fixedDiscount",
};

export default function CouponsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/coupons");
      setCoupons(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("coupons.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const openAddModal = () => {
    setForm(emptyForm);
    setActionError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(emptyForm);
    setActionError("");
  };

  const discountTypeLabel = (type: string) =>
    discountTypeLabels[type] ? t(discountTypeLabels[type]) : type;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setSubmitting(true);
    try {
      await api.post("/coupons", {
        code: form.code.trim(),
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue) || 0,
        usageLimitTotal: form.usageLimitTotal.trim()
          ? parseInt(form.usageLimitTotal) || null
          : null,
        minOrderAmount: parseFloat(form.minOrderAmount) || 0,
        validFrom: new Date(form.validFrom).toISOString(),
        validUntil: new Date(form.validUntil).toISOString(),
      });
      setActionSuccess(t("coupons.createSuccess"));
      closeModal();
      await fetchCoupons();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("coupons.saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (coupon: Coupon) => {
    if (!(await confirm(t("coupons.deactivateConfirm", { code: coupon.code })))) return;
    setDeactivatingId(coupon.id);
    setActionError("");
    setActionSuccess("");
    try {
      await api.put(`/coupons/${coupon.id}/deactivate`);
      setActionSuccess(t("coupons.deactivateSuccess"));
      await fetchCoupons();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("coupons.deactivateError"));
    } finally {
      setDeactivatingId(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("ar-SA-u-nu-latn");

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader icon="tag" title={t("coupons.title")} />

      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-[var(--sub)]">{t("coupons.desc")}</p>
        <Can code="Coupons.Add">
          <button onClick={openAddModal} className="btn btn-primary btn-sm">
            <Icon name="plus" size={15} /> {t("coupons.addNew")}
          </button>
        </Can>
      </div>

      {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
      <SuccessToast message={actionSuccess} fixed className="mb-4" />

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      {coupons.length === 0 ? (
        <div className="card p-10 text-center text-[var(--sub)] text-sm">
          {t("coupons.noCoupons")}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--border)] border-b" style={{ borderColor: "var(--border)" }}>
                <tr>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("coupons.code")}</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("coupons.discount")}</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("coupons.minOrder")}</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("coupons.validFrom")}</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("coupons.validUntil")}</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]">{t("coupons.status")}</th>
                  <th className="text-right p-3 font-medium text-[var(--sub)]"></th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b hover:bg-[var(--border)]" style={{ borderColor: "var(--border)" }}>
                    <td className="p-3 font-bold text-[var(--ink)]" dir="ltr">{coupon.code}</td>
                    <td className="p-3 text-[var(--ink)]">
                      {coupon.discountType === "Percentage"
                        ? `${coupon.discountValue}%`
                        : `${coupon.discountValue} ${t("common.sar")}`}
                    </td>
                    <td className="p-3 text-[var(--sub)]">
                      {coupon.minOrderAmount > 0 ? `${coupon.minOrderAmount} ${t("common.sar")}` : "—"}
                    </td>
                    <td className="p-3 text-[var(--sub)]">{formatDate(coupon.validFrom)}</td>
                    <td className="p-3 text-[var(--sub)]">{formatDate(coupon.validUntil)}</td>
                    <td className="p-3">
                      {coupon.isActive ? (
                        <span className="badge badge--green">{t("coupons.active")}</span>
                      ) : (
                        <span className="badge badge--gray">{t("coupons.inactive")}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {coupon.isActive ? (
                        <Can code="Coupons.Edit">
                          <button
                            onClick={() => handleDeactivate(coupon)}
                            disabled={deactivatingId === coupon.id}
                            className="text-[12px] text-[var(--danger)] hover:underline disabled:opacity-50"
                          >
                            {deactivatingId === coupon.id ? t("common.saving") : t("coupons.deactivate")}
                          </button>
                        </Can>
                      ) : (
                        <span className="text-[12px] text-[var(--sub)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeModal}>
          <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-[var(--blue-deep)]">{t("coupons.addTitle")}</h2>
              <button onClick={closeModal} className="text-[var(--sub)] hover:text-[var(--ink)]">
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {actionError && <div className="alert alert--danger">{actionError}</div>}

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("coupons.code")}</label>
                <div className="field-shell">
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    required
                    dir="ltr"
                    placeholder="SAVE10"
                    className="text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("coupons.discountType")}</label>
                  <div className="field-shell">
                    <select
                      value={form.discountType}
                      onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    >
                      <option value="Percentage">{t("coupons.percentDiscount")}</option>
                      <option value="FixedAmount">{t("coupons.fixedDiscount")}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("coupons.discountValue")}</label>
                  <div className="field-shell">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.discountValue}
                      onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                      required
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("coupons.usageLimit")}</label>
                  <div className="field-shell">
                    <input
                      type="number"
                      min="1"
                      value={form.usageLimitTotal}
                      onChange={(e) => setForm({ ...form, usageLimitTotal: e.target.value })}
                      dir="ltr"
                      className="text-left"
                      placeholder={t("coupons.unlimited")}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("coupons.minOrder")}</label>
                  <div className="field-shell">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.minOrderAmount}
                      onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("coupons.validFrom")}</label>
                  <div className="field-shell">
                    <input
                      type="datetime-local"
                      value={form.validFrom}
                      onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("coupons.validUntil")}</label>
                  <div className="field-shell">
                    <input
                      type="datetime-local"
                      value={form.validUntil}
                      onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1 disabled:opacity-60">
                  {submitting ? t("common.saving") : t("coupons.create")}
                </button>
                <button type="button" onClick={closeModal} className="btn btn-outline">
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

"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

interface Supplier {
  id: number | null;
  name: string;
  phone: string | null;
  city: string | null;
  invoicesCount: number;
  totalPurchases: number;
}

export default function SuppliersPage() {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", city: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/owner/customers/suppliers");
      setSuppliers(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || t("suppliers.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleAdd = async () => {
    if (!form.fullName.trim()) {
      setError(t("suppliers.addError"));
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/owner/customers/suppliers", form);
      setAddOpen(false);
      setForm({ fullName: "", phone: "", city: "", notes: "" });
      setSuccess(t("suppliers.addSuccess"));
      await fetchSuppliers();
    } catch (err: any) {
      setError(err.response?.data?.message || t("suppliers.addError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  const totalPurchases = suppliers.reduce((s, x) => s + x.totalPurchases, 0);

  return (
    <div>
      <PageHeader icon="truck" title={t("suppliers.title")}>
        <button type="button" onClick={() => setAddOpen(true)} className="btn btn-primary btn-sm">
          <Icon name="plus" size={16} />
          {t("suppliers.add")}
        </button>
      </PageHeader>

      {error && <div className="alert alert--danger mb-4">{error}</div>}
      {success && <div className="alert alert--success mb-4">{success}</div>}

      {suppliers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="stat-card">
            <p className="text-[12px] text-[var(--sub)]">{t("suppliers.count")}</p>
            <p className="text-[22px] font-bold text-[var(--blue-deep)] mt-1">{suppliers.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-[12px] text-[var(--sub)]">{t("suppliers.totalPurchases")}</p>
            <p className="text-[22px] font-bold text-[var(--blue-deep)] mt-1">
              {totalPurchases.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-[12px] text-[var(--sub)]">{t("suppliers.average")}</p>
            <p className="text-[22px] font-bold text-[var(--blue-deep)] mt-1">
              {(totalPurchases / suppliers.length).toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 2 })} {t("common.sar")}
            </p>
          </div>
        </div>
      )}

      <div className="table-wrap">
        {suppliers.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("suppliers.empty")}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("suppliers.name")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("suppliers.phone")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("suppliers.city")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("suppliers.invoicesCount")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("suppliers.totalPurchases")}</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, i) => (
                <tr key={s.id ?? `legacy-${i}`} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                  <td className="p-4 font-medium text-[var(--ink)]">
                    <span className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold" style={{ background: "var(--blue-50)", color: "var(--blue)" }}>
                        {s.name.trim().charAt(0) || "؟"}
                      </span>
                      {s.name}
                      {s.id == null && <span className="mr-2 badge badge--yellow">{t("suppliers.legacy")}</span>}
                    </span>
                  </td>
                  <td className="p-4 text-[var(--sub)]" dir="ltr">{s.phone || "—"}</td>
                  <td className="p-4 text-[var(--sub)]">{s.city || "—"}</td>
                  <td className="p-4 text-[var(--sub)]">{s.invoicesCount}</td>
                  <td className="p-4 text-[var(--ink)] font-medium">
                    {s.totalPurchases.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {addOpen && (
        <div
          className="fixed inset-0 bg-[var(--blue-deep)]/50 flex items-center justify-center z-[100] p-4"
          onClick={() => !saving && setAddOpen(false)}
        >
          <div
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-[var(--border)] shrink-0">
              <div>
                <h3 className="text-[16px] font-bold text-[var(--blue-deep)] mb-1">{t("suppliers.addTitle")}</h3>
              </div>
              <button
                type="button"
                onClick={() => !saving && setAddOpen(false)}
                className="text-[#9AA4AC] hover:text-[var(--ink)] shrink-0"
                aria-label={t("common.close")}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto p-6">
              <div>
                <p className="text-[12px] font-bold text-[var(--sub)] mb-1.5">{t("suppliers.fullName")} *</p>
                <div className="field-shell">
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <p className="text-[12px] font-bold text-[var(--sub)] mb-1.5">{t("suppliers.phone")}</p>
                <div className="field-shell">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
              </div>
              <div>
                <p className="text-[12px] font-bold text-[var(--sub)] mb-1.5">{t("suppliers.city")}</p>
                <div className="field-shell">
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <p className="text-[12px] font-bold text-[var(--sub)] mb-1.5">{t("suppliers.notes")}</p>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="border border-gray-200 rounded-xl px-3.5 py-2.5 w-full text-[13px] focus:outline-none focus:border-[var(--blue)] resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-4 border-t border-[var(--border)] shrink-0">
              <button type="button" onClick={() => setAddOpen(false)} disabled={saving} className="btn flex-1" style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}>
                {t("common.cancel")}
              </button>
              <button type="button" onClick={handleAdd} disabled={saving} className="btn btn-primary flex-1">
                {saving ? t("suppliers.saving") : t("suppliers.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

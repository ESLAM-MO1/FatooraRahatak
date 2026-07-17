"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

interface Warehouse {
  id: number;
  warehouseName: string;
  address: string | null;
  isDefault: boolean;
  isActive: boolean;
}

const emptyForm = {
  warehouseName: "",
  address: "",
};

export default function WarehousesPage() {
  const { t } = useTranslation();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/warehouses");
      setWarehouses(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("warehouse.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setSubmitting(true);

    try {
      await api.post("/warehouses", {
        warehouseName: form.warehouseName,
        address: form.address || null,
      });
      closeModal();
      await fetchWarehouses();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("warehouse.createError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader icon="warehouse" title={t("warehouse.title")}>
        <button onClick={openAddModal} className="btn btn-primary text-[13.5px]">
          {t("warehouse.add")}
        </button>
      </PageHeader>

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      {actionError && !showModal && <div className="alert alert--danger mb-4">{actionError}</div>}

      <div className="table-wrap">
        {warehouses.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-[13.5px]">{t("warehouse.empty")}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("warehouse.name")}</th>
                <th>{t("warehouse.address")}</th>
                <th>{t("warehouse.status")}</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((warehouse) => (
                <tr key={warehouse.id}>
                  <td>
                    <span className="flex items-center gap-2">
                      {warehouse.warehouseName}
                      {warehouse.isDefault && <span className="badge badge--blue">{t("warehouse.defaultBadge")}</span>}
                    </span>
                  </td>
                  <td className="text-[var(--sub)]">{warehouse.address || "—"}</td>
                  <td>
                    <span className={`badge ${warehouse.isActive ? "badge--green" : "badge--gray"}`}>
                      {warehouse.isActive ? t("warehouse.active") : t("warehouse.inactive")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 className="text-[17px] font-bold text-[var(--blue-deep)] mb-5">{t("warehouse.addTitle")}</h2>

            {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="warehouseName" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                  {t("warehouse.name")}
                </label>
                <div className="field-shell">
                  <input
                    id="warehouseName"
                    type="text"
                    value={form.warehouseName}
                    onChange={(e) => setForm({ ...form, warehouseName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="address" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                  {t("warehouse.addressOptional")}
                </label>
                <div className="field-shell">
                  <input
                    id="address"
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2.5">
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1 py-2.5">
                  {submitting ? t("common.saving") : t("common.save")}
                </button>
                <button type="button" onClick={closeModal} className="btn btn-outline flex-1 py-2.5">
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

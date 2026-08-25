"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

interface Props {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function AddWarehouseModal({ onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const [warehouseName, setWarehouseName] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setSubmitting(true);
    try {
      await api.post("/warehouses", {
        warehouseName,
        address: address || null,
      });
      onSuccess(t("warehouse.createSuccess"));
      onClose();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("warehouse.createError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold text-[var(--blue-deep)]">{t("warehouse.add")}</h2>
          <button type="button" onClick={onClose} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
        </div>
        {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">{t("warehouse.name")}</label>
            <div className="field-shell"><input type="text" value={warehouseName} onChange={e => setWarehouseName(e.target.value)} required /></div>
          </div>
          <div className="mb-6">
            <label className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">{t("warehouse.address")}</label>
            <div className="field-shell"><input type="text" value={address} onChange={e => setAddress(e.target.value)} /></div>
          </div>
          <div className="flex gap-2.5">
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1 py-2.5">{submitting ? t("common.loading") : t("warehouse.add")}</button>
            <button type="button" onClick={onClose} className="btn btn-outline flex-1 py-2.5">{t("common.cancel")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

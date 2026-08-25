"use client";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

interface Props {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

interface Category {
  id: number;
  nameAr: string;
  nameEn?: string;
}

const emptyForm = {
  categoryId: "",
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  barcode: "",
  basePrice: "",
  discountPrice: "",
  costPrice: "",
  weight: "",
};

export default function AddProductModal({ onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    api.get("/categories").then(r => setCategories(r.data.data)).catch(() => {});
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setSubmitting(true);
    try {
      const payload: any = {};
      if (form.categoryId) payload.categoryId = parseInt(form.categoryId);
      payload.nameAr = form.nameAr;
      payload.nameEn = form.nameEn;
      if (form.descriptionAr) payload.descriptionAr = form.descriptionAr;
      if (form.descriptionEn) payload.descriptionEn = form.descriptionEn;
      if (form.barcode) payload.barcode = form.barcode;
      payload.basePrice = parseFloat(form.basePrice) || 0;
      if (form.discountPrice) payload.discountPrice = parseFloat(form.discountPrice);
      if (form.costPrice) payload.costPrice = parseFloat(form.costPrice);
      if (form.weight) payload.weight = parseFloat(form.weight);
      const res = await api.post("/products", payload);
      const sku = res.data.data?.sku;
      onSuccess(sku ? `${t("product.createSuccess")} — ${t("product.skuLabel")}: ${sku}` : t("product.createSuccess"));
      onClose();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("product.saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-bold text-[var(--blue-deep)]">{t("product.add")}</h2>
          <button type="button" onClick={onClose} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
        </div>
        {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="field-shell">
            <select value={form.categoryId} onChange={set("categoryId")}>
              <option value="">{t("product.selectCategory")}</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="field-shell"><input type="text" value={form.nameAr} onChange={set("nameAr")} required placeholder={t("product.nameAr")} /></div>
            <div className="field-shell"><input type="text" value={form.nameEn} onChange={set("nameEn")} placeholder={t("product.nameEn")} /></div>
          </div>
          <div className="field-shell items-start"><textarea rows={2} value={form.descriptionAr} onChange={set("descriptionAr")} placeholder={t("product.descriptionAr")} /></div>
          <div className="field-shell items-start" dir="ltr"><textarea rows={2} value={form.descriptionEn} onChange={set("descriptionEn")} placeholder={t("product.descriptionEn")} /></div>
          <div className="field-shell"><input type="text" value={form.barcode} onChange={set("barcode")} placeholder={t("product.barcode")} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="field-shell"><input type="number" min={0} step="0.01" value={form.basePrice} onChange={set("basePrice")} required placeholder={t("product.basePrice")} /></div>
            <div className="field-shell"><input type="number" min={0} step="0.01" value={form.discountPrice} onChange={set("discountPrice")} placeholder={t("product.discountPrice")} /></div>
            <div className="field-shell"><input type="number" min={0} step="0.01" value={form.costPrice} onChange={set("costPrice")} placeholder={t("product.costPrice")} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="field-shell"><input type="number" min={0} step="0.01" value={form.weight} onChange={set("weight")} placeholder={t("product.weight")} /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1 disabled:opacity-60">{submitting ? t("common.loading") : t("product.add")}</button>
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">{t("common.cancel")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

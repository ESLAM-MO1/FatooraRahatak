"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

interface Category {
  id: number;
  nameAr: string;
}

interface Product {
  id: number;
  categoryId: number | null;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  sku: string;
  barcode: string | null;
  basePrice: number;
  discountPrice: number | null;
  costPrice: number;
  weight: number | null;
  status: string;
  availableQuantity: number;
}

interface ProductForm {
  categoryId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  sku: string;
  barcode: string;
  basePrice: string;
  discountPrice: string;
  costPrice: string;
  weight: string;
  initialQuantity: string;
}

const emptyForm: ProductForm = {
  categoryId: "",
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  sku: "",
  barcode: "",
  basePrice: "",
  discountPrice: "",
  costPrice: "0",
  weight: "",
  initialQuantity: "0",
};

const statusStyles: Record<string, string> = {
  Active: "badge badge--green",
  Draft: "badge badge--yellow",
  Archived: "badge badge--gray",
  OutOfStock: "badge badge--red",
};

export default function ProductsPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const statusLabels: Record<string, string> = {
    Active: t("product.statusActive"),
    Draft: t("product.statusDraft"),
    Archived: t("product.statusArchived"),
    OutOfStock: t("product.statusOutOfStock"),
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
      ]);
      setProducts(productsRes.data.data);
      setCategories(categoriesRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("product.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.nameAr.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    );
  }, [products, search]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setActionError("");
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setForm({
      categoryId: product.categoryId?.toString() ?? "",
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      descriptionAr: product.descriptionAr ?? "",
      descriptionEn: product.descriptionEn ?? "",
      sku: product.sku,
      barcode: product.barcode ?? "",
      basePrice: product.basePrice.toString(),
      discountPrice: product.discountPrice?.toString() ?? "",
      costPrice: product.costPrice.toString(),
      weight: product.weight?.toString() ?? "",
      initialQuantity: "0",
    });
    setActionError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setActionError("");
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      nameAr: form.nameAr,
      nameEn: form.nameEn,
      descriptionAr: form.descriptionAr || null,
      descriptionEn: form.descriptionEn || null,
      barcode: form.barcode || null,
      basePrice: parseFloat(form.basePrice) || 0,
      discountPrice: form.discountPrice
        ? parseFloat(form.discountPrice)
        : null,
      costPrice: parseFloat(form.costPrice) || 0,
      weight: form.weight ? parseFloat(form.weight) : null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
    };

    if (!editingId) {
      payload.sku = form.sku || null;
      payload.initialQuantity = parseInt(form.initialQuantity) || 0;
    }

    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setSubmitting(true);

    try {
      const payload = buildPayload();
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        setSuccessMessage(t("product.updateSuccess"));
        closeModal();
      } else {
        const res = await api.post("/products", payload);
        const sku = res.data.data?.sku;
        setSuccessMessage(
          sku
            ? `${t("product.createSuccess")} — ${t("product.skuLabel")}: ${sku}`
            : t("product.createSuccess")
        );
        closeModal();
      }
      await fetchData();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("product.saveError")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (product: Product) => {
    if (
      !window.confirm(
        `${t("product.archiveConfirm")} "${product.nameAr}"؟`
      )
    ) {
      return;
    }

    setActionError("");
    setSuccessMessage("");
    try {
      await api.delete(`/products/${product.id}`);
      setSuccessMessage(t("product.archiveSuccess"));
      await fetchData();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("product.archiveError")
      );
    }
  };

  const isPackageLimitError =
    actionError.toLowerCase().includes("limit") ||
    actionError.toLowerCase().includes("upgrade");

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader icon="box" title={t("product.title")}>
        <button onClick={openAddModal} className="btn btn-primary">
          <Icon name="plus" />
          {t("product.add")}
        </button>
      </PageHeader>

      {error && <div className="alert alert--danger">{error}</div>}

      {successMessage && <div className="alert alert--success">{successMessage}</div>}

      {actionError && !showModal && <div className="alert alert--danger">{actionError}</div>}

      <div className="mb-4 max-w-sm">
        <div className="field-shell">
          <Icon name="search" className="text-[var(--sub)] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("product.searchPlaceholder")}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {filteredProducts.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">
            {search ? t("product.noResults") : t("product.noProducts")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("product.name")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("product.skuLabel")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("product.basePrice")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("product.discountPrice")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("product.availableQuantity")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("product.status")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("product.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium">{product.nameAr}</td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">{product.sku}</td>
                    <td className="p-4 text-[var(--ink)]">{product.basePrice.toLocaleString("ar-SA")} ر.س</td>
                    <td className="p-4 text-[var(--sub)]">
                      {product.discountPrice != null
                        ? `${product.discountPrice.toLocaleString("ar-SA")} ر.س`
                        : "—"}
                    </td>
                    <td className="p-4 text-[var(--sub)]">{product.availableQuantity}</td>
                    <td className="p-4">
                      <span className={statusStyles[product.status] ?? "badge badge--gray"}>
                        {statusLabels[product.status] ?? product.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => openEditModal(product)} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]">
                          {t("product.edit")}
                        </button>
                        <Link href={`/dashboard/products/${product.id}`} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]">
                          {t("product.variants")}
                        </Link>
                        {product.status !== "Archived" && (
                          <button onClick={() => handleArchive(product)} className="text-[var(--danger)] hover:opacity-80 font-medium text-[13px]">
                            {t("product.archive")}
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

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-[18px] font-bold text-[var(--blue-deep)]">
              {editingId ? t("product.edit") : t("product.add")}
            </h2><button onClick={closeModal} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button></div>

            {actionError && (
              <div className="alert alert--danger">
                {actionError}
                {isPackageLimitError && (
                  <div className="mt-2">
                    <Link href="/dashboard/subscription" className="font-bold hover:underline">
                      {t("product.upgradePackage")}
                    </Link>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("product.category")}</label>
                <div className="field-shell">
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  >
                    <option value="">{t("product.noCategory")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("product.nameAr")}</label>
                  <div className="field-shell">
                    <input
                      type="text"
                      value={form.nameAr}
                      onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("product.nameEn")}</label>
                  <div className="field-shell">
                    <input
                      type="text"
                      value={form.nameEn}
                      onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                      required
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("product.descriptionAr")}</label>
                <div className="field-shell items-start">
                  <textarea
                    value={form.descriptionAr}
                    onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("product.descriptionEn")}</label>
                <div className="field-shell items-start">
                  <textarea
                    value={form.descriptionEn}
                    onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                    rows={2}
                    dir="ltr"
                  />
                </div>
              </div>

              {!editingId && (
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("product.skuLabel")}</label>
                  <div className="field-shell">
                    <input
                      type="text"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      dir="ltr"
                      placeholder={t("product.skuAutoGenerate")}
                    />
                  </div>
                </div>
              )}

              {editingId && (
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("product.skuLabel")}</label>
                  <div className="field-shell bg-[#F7F8F9]">
                    <input type="text" value={form.sku} disabled dir="ltr" className="text-[var(--sub)]" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("product.barcode")}</label>
                <div className="field-shell">
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("product.basePrice")}</label>
                  <div className="field-shell">
                    <input
                      type="number"
                      value={form.basePrice}
                      onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                      required
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("product.discountPrice")}</label>
                  <div className="field-shell">
                    <input
                      type="number"
                      value={form.discountPrice}
                      onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("product.costPrice")}</label>
                  <div className="field-shell">
                    <input
                      type="number"
                      value={form.costPrice}
                      onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="field-shell">
                    <input
                      type="number"
                      value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: e.target.value })}
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>
                {!editingId && (
                  <div>
                    <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("product.initialQuantity")}</label>
                    <div className="field-shell">
                      <input
                        type="number"
                        value={form.initialQuantity}
                        onChange={(e) => setForm({ ...form, initialQuantity: e.target.value })}
                        min={0}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1 disabled:opacity-60">
                  {submitting ? t("product.saving") : t("common.save")}
                </button>
                <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">
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

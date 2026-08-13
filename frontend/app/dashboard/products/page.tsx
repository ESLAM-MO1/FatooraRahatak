"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { useConfirm } from "@/components/ConfirmDialog";
import Can from "@/components/Can";
import Pagination from "@/components/Pagination";

interface Category {
  id: number;
  nameAr: string;
}

interface OwnerReview {
  id: number;
  productId: number;
  productName: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
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
  const confirm = useConfirm();
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
  const [activeTab, setActiveTab] = useState<"products" | "archive" | "reviews">("products");
  const [reviews, setReviews] = useState<OwnerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);

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
        api.get("/products", { params: { page, pageSize } }),
        api.get("/categories"),
      ]);
      setProducts(productsRes.data.data.items || []);
      setTotalPages(productsRes.data.data.totalPages || 1);
      setTotalCount(productsRes.data.data.totalCount || 0);
      setCategories(categoriesRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("product.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError("");
    try {
      const res = await api.get("/owner/orders/reviews");
      setReviews(res.data.data);
    } catch (err: unknown) {
      const err2 = err as { response?: { data?: { message?: string } } };
      setReviewsError(err2.response?.data?.message || t("reviews.loadError"));
    } finally {
      setReviewsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (activeTab === "reviews") {
      fetchReviews(); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [activeTab, fetchReviews]);

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

  const activeProducts = useMemo(
    () => filteredProducts.filter((p) => p.status !== "Archived"),
    [filteredProducts]
  );

  const archivedProducts = useMemo(
    () => filteredProducts.filter((p) => p.status === "Archived"),
    [filteredProducts]
  );

  const tabProducts = activeTab === "archive" ? archivedProducts : activeProducts;

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
      !(await confirm(
        `${t("product.archiveConfirm")} "${product.nameAr}"؟`
      ))
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

  const handleRestore = async (product: Product) => {
    if (
      !(await confirm(
        `${t("product.restoreConfirm")} "${product.nameAr}"؟`
      ))
    ) {
      return;
    }

    setActionError("");
    setSuccessMessage("");
    try {
      await api.post(`/products/${product.id}/restore`);
      setSuccessMessage(t("product.restoreSuccess"));
      await fetchData();
    } catch (err: unknown) {
      const err2 = err as { response?: { data?: { message?: string } } };
      setActionError(
        err2.response?.data?.message || t("product.restoreError")
      );
    }
  };

  const handlePermanentDelete = async (product: Product) => {
    if (
      !(await confirm(
        `${t("product.deletePermanentConfirm")} "${product.nameAr}"؟`
      ))
    ) {
      return;
    }

    setActionError("");
    setSuccessMessage("");
    try {
      await api.delete(`/products/${product.id}/permanent`);
      setSuccessMessage(t("product.deletePermanentSuccess"));
      await fetchData();
    } catch (err: unknown) {
      const err2 = err as { response?: { data?: { message?: string } } };
      setActionError(
        err2.response?.data?.message || t("product.deletePermanentError")
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
        <Can code="Products.Add">
          <button onClick={openAddModal} className="btn btn-primary">
            <Icon name="plus" />
            {t("product.add")}
          </button>
        </Can>
      </PageHeader>

      <div className="mb-5 inline-flex rounded-xl bg-gray-100 p-1 gap-1">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-colors ${activeTab === "products" ? "bg-white shadow text-[var(--ink)]" : "text-[var(--sub)] hover:text-[var(--ink)]"}`}
        >
          {t("product.title")}
        </button>
        <button
          onClick={() => setActiveTab("archive")}
          className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-colors ${activeTab === "archive" ? "bg-white shadow text-[var(--ink)]" : "text-[var(--sub)] hover:text-[var(--ink)]"}`}
        >
          {t("product.tabArchive")}
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-colors ${activeTab === "reviews" ? "bg-white shadow text-[var(--ink)]" : "text-[var(--sub)] hover:text-[var(--ink)]"}`}
        >
          ★ {t("reviews.title")}
        </button>
      </div>

      {error && <div className="alert alert--danger">{error}</div>}

      <SuccessToast message={successMessage} fixed className="mb-4" />

      {activeTab === "reviews" ? (
        reviewsLoading && reviews.length === 0 ? (
          <LoadingState />
        ) : (
          <div className="space-y-3">
            {reviewsError && <div className="alert alert--danger">{reviewsError}</div>}
            {reviews.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-[40px] mb-3">⭐</p>
                <p className="text-[15px] font-bold text-[var(--ink)] mb-1">{t("reviews.emptyTitle")}</p>
                <p className="text-[13px] text-[var(--sub)]">{t("reviews.emptyDesc")}</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-bold" style={{ background: "var(--blue-50)", color: "var(--blue)" }}>
                        {review.customerName.charAt(0) || "؟"}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[var(--ink)]">{review.customerName}</p>
                        <div className="flex items-center gap-2">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} style={{ color: i < review.rating ? "#F59E0B" : "#D1D5DB", fontSize: 14 }}>★</span>
                          ))}
                          <span className="text-[11px] text-[var(--sub)]">
                            {new Date(review.createdAt).toLocaleDateString("ar-SA")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/dashboard/products/${review.productId}`} className="text-[12px] font-medium text-[var(--blue)] hover:underline">
                      {review.productName}
                    </Link>
                  </div>
                  {review.comment && (
                    <p className="text-[13px] text-[var(--sub)] leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )
      ) : (
      <>
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
        {activeTab === "archive" && archivedProducts.length > 0 && (
          <div className="px-4 pt-4 text-[12.5px] text-[var(--sub)] flex items-center gap-2">
            <Icon name="alert" className="shrink-0" />
            <span>{t("product.archivedHint")}</span>
          </div>
        )}
        {tabProducts.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">
            {search
              ? t("product.noResults")
              : activeTab === "archive"
                ? t("product.noArchived")
                : t("product.noProducts")}
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
                {tabProducts.map((product) => (
                  <tr key={product.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium">{product.nameAr}</td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">{product.sku}</td>
                    <td className="p-4 text-[var(--ink)]">{product.basePrice.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}</td>
                    <td className="p-4 text-[var(--sub)]">
                      {product.discountPrice != null
                        ? `${product.discountPrice.toLocaleString("ar-SA-u-nu-latn")} ${t("common.sar")}`
                        : "—"}
                    </td>
                    <td className="p-4 text-[var(--sub)]">{product.availableQuantity}</td>
                    <td className="p-4">
                      <span className={statusStyles[product.status] ?? "badge badge--gray"}>
                        {statusLabels[product.status] ?? product.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {activeTab === "archive" ? (
                        <div className="flex flex-wrap gap-3">
                          <Can code="Products.Edit">
                            <button onClick={() => handleRestore(product)} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]">
                              {t("product.restore")}
                            </button>
                          </Can>
                          <Can code="Products.Delete">
                            <button onClick={() => handlePermanentDelete(product)} className="text-[var(--danger)] hover:opacity-80 font-medium text-[13px]">
                              {t("product.deletePermanent")}
                            </button>
                          </Can>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          <Can code="Products.Edit">
                            <button onClick={() => openEditModal(product)} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]">
                              {t("product.edit")}
                            </button>
                          </Can>
                          <Link href={`/dashboard/products/${product.id}`} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]">
                            {t("product.variants")}
                          </Link>
                          <Can code="Products.Delete">
                            <button onClick={() => handleArchive(product)} className="text-[var(--danger)] hover:opacity-80 font-medium text-[13px]">
                              {t("product.archive")}
                            </button>
                          </Can>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === "products" && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        )}
      </div>
      </>
      )}

      {showModal && activeTab === "products" && (
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
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("product.weight")}</label>
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

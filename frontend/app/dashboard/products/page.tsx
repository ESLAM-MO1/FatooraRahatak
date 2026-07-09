"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

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

const statusLabels: Record<string, string> = {
  Active: "نشط",
  Draft: "مسودة",
  Archived: "مؤرشف",
  OutOfStock: "نفدت الكمية",
};

const statusStyles: Record<string, string> = {
  Active: "text-[var(--green)] bg-[var(--green-soft)]",
  Draft: "text-[var(--gold-deep)] bg-[var(--gold-soft)]",
  Archived: "text-[var(--sub)] bg-[#F1F2F4]",
  OutOfStock: "text-[var(--danger)] bg-[var(--danger-soft)]",
};

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="18" height="18">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const plusPath = "M12 5v14M5 12h14";
const searchPath = "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35";
const alertPath = "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";
const checkPath = "M20 6 9 17l-5-5";

export default function ProductsPage() {
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
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل المنتجات");
    } finally {
      setLoading(false);
    }
  }, []);

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
        setSuccessMessage("تم تحديث المنتج بنجاح");
        closeModal();
      } else {
        const res = await api.post("/products", payload);
        const sku = res.data.data?.sku;
        setSuccessMessage(
          sku
            ? `تم إنشاء المنتج بنجاح — رمز SKU: ${sku}`
            : "تم إنشاء المنتج بنجاح"
        );
        closeModal();
      }
      await fetchData();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء حفظ المنتج"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (product: Product) => {
    if (
      !window.confirm(
        `هل أنت متأكد من أرشفة المنتج "${product.nameAr}"؟`
      )
    ) {
      return;
    }

    setActionError("");
    setSuccessMessage("");
    try {
      await api.delete(`/products/${product.id}`);
      setSuccessMessage("تم أرشفة المنتج بنجاح");
      await fetchData();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء أرشفة المنتج"
      );
    }
  };

  const isPackageLimitError =
    actionError.includes("وصلت للحد الأقصى") ||
    actionError.includes("ترقية باقتك");

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--sub)]">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
        جاري التحميل...
      </div>
    );
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]">المنتجات</h1>
        <button onClick={openAddModal} className="btn-primary">
          <Icon path={plusPath} />
          إضافة منتج
        </button>
      </div>

      {error && (
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-[var(--green-soft)] text-[var(--green)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={checkPath} className="shrink-0 mt-0.5" />
          {successMessage}
        </div>
      )}

      {actionError && !showModal && (
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {actionError}
        </div>
      )}

      <div className="mb-4 max-w-sm">
        <div className="field-shell">
          <Icon path={searchPath} className="text-[var(--sub)] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو SKU..."
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {filteredProducts.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">
            {search ? "لا توجد نتائج مطابقة." : "لا توجد منتجات بعد."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الاسم</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">SKU</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">السعر الأساسي</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">سعر الخصم</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الكمية</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الحالة</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">إجراءات</th>
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
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusStyles[product.status] ?? "text-[var(--sub)] bg-[#F1F2F4]"}`}>
                        {statusLabels[product.status] ?? product.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => openEditModal(product)} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]">
                          تعديل
                        </button>
                        <Link href={`/dashboard/products/${product.id}`} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]">
                          المتغيرات والصور
                        </Link>
                        {product.status !== "Archived" && (
                          <button onClick={() => handleArchive(product)} className="text-[var(--danger)] hover:opacity-80 font-medium text-[13px]">
                            أرشفة
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
        <div className="fixed inset-0 bg-[var(--blue-deep)]/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-[18px] font-bold text-[var(--blue-deep)] mb-4">
              {editingId ? "تعديل منتج" : "إضافة منتج"}
            </h2>

            {actionError && (
              <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm">
                {actionError}
                {isPackageLimitError && (
                  <div className="mt-2">
                    <Link href="/dashboard/subscription" className="text-[var(--blue)] font-bold hover:underline">
                      قم بترقية باقتك
                    </Link>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">التصنيف</label>
                <div className="field-shell">
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  >
                    <option value="">بدون تصنيف</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الاسم (عربي)</label>
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
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الاسم (إنجليزي)</label>
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
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الوصف (عربي)</label>
                <div className="field-shell items-start">
                  <textarea
                    value={form.descriptionAr}
                    onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الوصف (إنجليزي)</label>
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
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">SKU</label>
                  <div className="field-shell">
                    <input
                      type="text"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      dir="ltr"
                      placeholder="يُولَّد تلقائيًا إذا تُرك فارغًا"
                    />
                  </div>
                </div>
              )}

              {editingId && (
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">SKU</label>
                  <div className="field-shell bg-[#F7F8F9]">
                    <input type="text" value={form.sku} disabled dir="ltr" className="text-[var(--sub)]" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الباركود</label>
                <div className="field-shell">
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">السعر الأساسي</label>
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
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">سعر الخصم</label>
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
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">سعر التكلفة</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الوزن (كجم)</label>
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
                    <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الكمية الابتدائية</label>
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
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-60">
                  {submitting ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
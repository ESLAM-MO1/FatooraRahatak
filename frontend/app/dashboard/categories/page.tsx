"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

interface Category {
  id: number;
  parentCategoryId: number | null;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  sortOrder: number;
}

interface CategoryForm {
  nameAr: string;
  nameEn: string;
  parentCategoryId: string;
  sortOrder: number;
}

const emptyForm: CategoryForm = {
  nameAr: "",
  nameEn: "",
  parentCategoryId: "",
  sortOrder: 0,
};

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="18" height="18">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const plusPath = "M12 5v14M5 12h14";
const alertPath = "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/categories");
      setCategories(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل التصنيفات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setActionError("");
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingId(category.id);
    setForm({
      nameAr: category.nameAr,
      nameEn: category.nameEn,
      parentCategoryId: category.parentCategoryId?.toString() ?? "",
      sortOrder: category.sortOrder,
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

  const buildPayload = () => ({
    nameAr: form.nameAr,
    nameEn: form.nameEn,
    parentCategoryId: form.parentCategoryId
      ? Number(form.parentCategoryId)
      : null,
    sortOrder: form.sortOrder,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setSubmitting(true);

    try {
      const payload = buildPayload();
      if (editingId) {
        await api.put(`/categories/${editingId}`, payload);
      } else {
        await api.post("/categories", payload);
      }
      closeModal();
      await fetchCategories();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء حفظ التصنيف"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (
      !window.confirm(`هل أنت متأكد من حذف التصنيف "${category.nameAr}"؟`)
    ) {
      return;
    }

    setActionError("");
    try {
      await api.delete(`/categories/${category.id}`);
      await fetchCategories();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء حذف التصنيف"
      );
    }
  };

  const parentOptions = categories.filter((c) => c.id !== editingId);

  const getParentName = (parentId: number | null) => {
    if (!parentId) return "—";
    const parent = categories.find((c) => c.id === parentId);
    return parent?.nameAr ?? "—";
  };

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
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]">التصنيفات</h1>
        <button onClick={openAddModal} className="btn-primary">
          <Icon path={plusPath} />
          إضافة تصنيف
        </button>
      </div>

      {error && (
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {actionError && !showModal && (
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {actionError}
        </div>
      )}

      <div className="card overflow-hidden">
        {categories.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">لا توجد تصنيفات بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الاسم (عربي)</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الاسم (إنجليزي)</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">التصنيف الرئيسي</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الترتيب</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الحالة</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium">{category.nameAr}</td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">{category.nameEn}</td>
                    <td className="p-4 text-[var(--sub)]">{getParentName(category.parentCategoryId)}</td>
                    <td className="p-4 text-[var(--sub)]">{category.sortOrder}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          category.isActive
                            ? "text-[var(--green)] bg-[var(--green-soft)]"
                            : "text-[var(--sub)] bg-[#F1F2F4]"
                        }`}
                      >
                        {category.isActive ? "مفعّل" : "غير مفعّل"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <button onClick={() => openEditModal(category)} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]">
                          تعديل
                        </button>
                        <button onClick={() => handleDelete(category)} className="text-[var(--danger)] hover:opacity-80 font-medium text-[13px]">
                          حذف
                        </button>
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
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-[18px] font-bold text-[var(--blue-deep)] mb-4">
              {editingId ? "تعديل تصنيف" : "إضافة تصنيف"}
            </h2>

            {actionError && (
              <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">التصنيف الرئيسي (اختياري)</label>
                <div className="field-shell">
                  <select
                    value={form.parentCategoryId}
                    onChange={(e) => setForm({ ...form, parentCategoryId: e.target.value })}
                  >
                    <option value="">بدون تصنيف رئيسي</option>
                    {parentOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الترتيب</label>
                <div className="field-shell">
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
                    }
                    min={0}
                  />
                </div>
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
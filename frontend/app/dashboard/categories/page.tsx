"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import { useConfirm } from "@/components/ConfirmDialog";
import Can from "@/components/Can";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

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

export default function CategoriesPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
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
      setError(err.response?.data?.message || t("category.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
        err.response?.data?.message || t("category.saveError")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (
      !(await confirm(t("category.confirmDelete", { name: category.nameAr })))
    ) {
      return;
    }

    setActionError("");
    try {
      await api.delete(`/categories/${category.id}`);
      await fetchCategories();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("category.deleteError")
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
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader icon="tag" title={t("category.title")}>
        <Can code="Categories.Add">
          <button onClick={openAddModal} className="btn btn-primary">
            <Icon name="plus" />
            {t("category.add")}
          </button>
        </Can>
      </PageHeader>

      {error && <div className="alert alert--danger">{error}</div>}

      {actionError && !showModal && <div className="alert alert--danger">{actionError}</div>}

      <div className="card overflow-hidden">
        {categories.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("category.noCategories")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("category.nameAr")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("category.nameEn")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("category.parent")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("category.sortOrder")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("category.status")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("category.actions")}</th>
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
                      <span className={`badge ${category.isActive ? "badge--green" : "badge--gray"}`}>
                        {category.isActive ? t("category.active") : t("category.inactive")}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <Can code="Categories.Edit">
                          <button onClick={() => openEditModal(category)} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]">
                            {t("common.edit")}
                          </button>
                        </Can>
                        <Can code="Categories.Delete">
                          <button onClick={() => handleDelete(category)} className="text-[var(--danger)] hover:opacity-80 font-medium text-[13px]">
                            {t("common.delete")}
                          </button>
                        </Can>
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
          <div className="card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-[18px] font-bold text-[var(--blue-deep)]">
              {editingId ? t("category.edit") : t("category.add")}
            </h2><button onClick={closeModal} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button></div>

            {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("category.nameAr")}</label>
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
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("category.nameEn")}</label>
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
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("category.parentOptional")}</label>
                <div className="field-shell">
                  <select
                    value={form.parentCategoryId}
                    onChange={(e) => setForm({ ...form, parentCategoryId: e.target.value })}
                  >
                    <option value="">{t("category.noParent")}</option>
                    {parentOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("category.sortOrder")}</label>
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
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1 disabled:opacity-60">
                  {submitting ? t("common.saving") : t("common.save")}
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

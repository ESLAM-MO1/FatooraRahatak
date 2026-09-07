"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import SuccessToast from "@/components/SuccessToast";
import Can from "@/components/Can";
import { useConfirm } from "@/components/ConfirmDialog";

interface FaqItem {
  id: number;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  displayOrder: number;
  isPublished: boolean;
}

const emptyForm = {
  questionAr: "",
  questionEn: "",
  answerAr: "",
  answerEn: "",
  displayOrder: 1,
  isPublished: true,
};

export default function StoreFaqManager() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await api.get("/store-faq");
      setItems(r.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || t("error.serverError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      const body = {
        questionAr: editing.questionAr,
        questionEn: editing.questionEn,
        answerAr: editing.answerAr,
        answerEn: editing.answerEn,
        displayOrder: editing.displayOrder,
        isPublished: editing.isPublished,
      };
      if (editing.id) {
        await api.put(`/store-faq/${editing.id}`, body);
      } else {
        await api.post("/store-faq", body);
      }
      setSuccess(t("storeFaq.saved"));
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeFaq.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (item: FaqItem) => {
    setTogglingId(item.id);
    setError("");
    try {
      await api.put(`/store-faq/${item.id}/toggle-publish`);
      setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, isPublished: !p.isPublished } : p)));
    } catch (err: any) {
      setError(err.response?.data?.message || t("error.serverError"));
    } finally {
      setTogglingId(null);
    }
  };

  const remove = async (item: FaqItem) => {
    if (!(await confirm(`${t("storeFaq.confirmDelete")} "${item.questionAr}"؟`))) return;
    setError("");
    try {
      await api.delete(`/store-faq/${item.id}`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeFaq.deleteError"));
    }
  };

  return (
    <div>
      <SuccessToast message={success} fixed className="mb-4" />
      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-[var(--sub)]">{t("storeFaq.desc")}</p>
        <Can code="StoreSettings.Add">
          <button onClick={() => setEditing({ ...emptyForm, displayOrder: Math.max(0, ...items.map((i) => i.displayOrder)) + 1 })} className="btn btn-primary btn-sm shrink-0">
            + {t("storeFaq.addFaq")}
          </button>
        </Can>
      </div>

      {loading ? (
        <p className="text-center text-[var(--sub)] py-8">{t("common.loading")}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="border rounded-xl p-4 bg-white"
              style={{ borderColor: "var(--border)", opacity: item.isPublished ? 1 : 0.55 }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[var(--sub)] bg-gray-100 rounded-md px-1.5 py-0.5 shrink-0">#{item.displayOrder}</span>
                    <p className="text-[14px] font-bold text-[var(--ink)] truncate">{item.questionAr || item.questionEn}</p>
                  </div>
                  <p className="text-[12px] text-[var(--sub)] mt-1 line-clamp-2">{item.answerAr || item.answerEn}</p>
                  <p className="text-[11px] text-[var(--sub)] mt-1 truncate" dir="ltr">
                    EN: {item.questionEn}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span
                    className={`text-[11px] font-bold px-2 py-1 rounded-full ${item.isPublished ? "badge badge--green" : "badge badge--gray"}`}
                  >
                    {item.isPublished ? t("storeFaq.published") : t("storeFaq.hidden")}
                  </span>
                  <Can code="StoreSettings.Edit">
                    <button onClick={() => togglePublish(item)} disabled={togglingId === item.id} className="btn btn-outline btn-sm">
                      {togglingId === item.id ? t("storeFaq.processing") : item.isPublished ? t("storeFaq.hide") : t("storeFaq.show")}
                    </button>
                    <button onClick={() => setEditing({ ...item })} className="btn btn-outline btn-sm">
                      {t("common.edit")}
                    </button>
                  </Can>
                  <Can code="StoreSettings.Delete">
                    <button onClick={() => remove(item)} className="btn btn-danger btn-sm">
                      {t("common.delete")}
                    </button>
                  </Can>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-center text-[var(--sub)] py-8">{t("storeFaq.noData")}</p>}
        </div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-card max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--ink)]">{editing.id ? t("storeFaq.editFaq") : t("storeFaq.addFaq")}</h2>
              <button onClick={() => setEditing(null)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label>{t("storeFaq.questionAr")}</label>
                <div className="field-shell">
                  <input dir="rtl" value={editing.questionAr} onChange={(e) => setEditing({ ...editing, questionAr: e.target.value })} placeholder={t("storeFaq.questionPlaceholder")} />
                </div>
              </div>
              <div>
                <label>{t("storeFaq.answerAr")}</label>
                <div className="field-shell">
                  <textarea dir="rtl" rows={4} value={editing.answerAr} onChange={(e) => setEditing({ ...editing, answerAr: e.target.value })} placeholder={t("storeFaq.answerPlaceholder")} />
                </div>
              </div>
              <div>
                <label>{t("storeFaq.questionEn")}</label>
                <div className="field-shell">
                  <input dir="ltr" value={editing.questionEn} onChange={(e) => setEditing({ ...editing, questionEn: e.target.value })} placeholder={t("storeFaq.questionPlaceholder")} />
                </div>
              </div>
              <div>
                <label>{t("storeFaq.answerEn")}</label>
                <div className="field-shell">
                  <textarea dir="ltr" rows={4} value={editing.answerEn} onChange={(e) => setEditing({ ...editing, answerEn: e.target.value })} placeholder={t("storeFaq.answerPlaceholder")} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label>{t("storeFaq.displayOrder")}</label>
                  <div className="field-shell">
                    <input type="number" value={editing.displayOrder} onChange={(e) => setEditing({ ...editing, displayOrder: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="flex items-end pb-2">
                  <Can code="StoreSettings.Edit">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editing.isPublished} onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })} />
                      <span className="text-[13px]">{t("storeFaq.isPublished")}</span>
                    </label>
                  </Can>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Can code="StoreSettings.Add">
                  <button onClick={save} disabled={saving} className="btn btn-primary">
                    {saving ? t("storeFaq.saving") : t("common.save")}
                  </button>
                </Can>
                <button onClick={() => setEditing(null)} className="btn btn-outline">
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
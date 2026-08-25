"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import SuccessToast from "@/components/SuccessToast";
import Can from "@/components/Can";
import { useConfirm } from "@/components/ConfirmDialog";

interface Banner {
  id: number;
  storeId: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

interface BannerForm {
  title: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  sortOrder: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const POSITIONS = ["HomeTop", "HomeMiddle", "HomeBottom"];

const emptyForm: BannerForm = {
  title: "",
  imageUrl: "",
  linkUrl: "",
  position: "HomeTop",
  sortOrder: 1,
  startDate: "",
  endDate: "",
  isActive: true,
};

export default function StoreBannersManager() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await api.get("/stores/banners");
      setBanners(r.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || t("banners.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing({ ...emptyForm, sortOrder: Math.max(0, ...banners.map((b) => b.sortOrder)) + 1 });
    setActionError("");
  };

  const openEdit = (b: Banner) => {
    setEditing({
      id: b.id,
      title: b.title,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl || "",
      position: b.position,
      sortOrder: b.sortOrder,
      startDate: b.startDate ? b.startDate.slice(0, 10) : "",
      endDate: b.endDate ? b.endDate.slice(0, 10) : "",
      isActive: b.isActive,
    });
    setActionError("");
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setSuccess("");
    setActionError("");
    try {
      const body = {
        title: editing.title,
        imageBase64: editing.imageUrl,
        linkUrl: editing.linkUrl || null,
        position: editing.position,
        sortOrder: editing.sortOrder,
        startDate: editing.startDate ? new Date(editing.startDate).toISOString() : null,
        endDate: editing.endDate ? new Date(editing.endDate).toISOString() : null,
        isActive: editing.isActive,
      };
      if (editing.id) {
        await api.put(`/stores/banners/${editing.id}`, body);
        setSuccess(t("banners.updated"));
      } else {
        await api.post("/stores/banners", body);
        setSuccess(t("banners.added"));
      }
      setEditing(null);
      await load();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("banners.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (b: Banner) => {
    setDeletingId(b.id);
    setError("");
    try {
      await api.put(`/stores/banners/${b.id}`, { isActive: !b.isActive });
      setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, isActive: !x.isActive } : x)));
    } catch (err: any) {
      setError(err.response?.data?.message || t("banners.toggleError"));
    } finally {
      setDeletingId(null);
    }
  };

  const remove = async (b: Banner) => {
    if (!(await confirm(`${t("banners.confirmDelete")} "${b.title}"؟`))) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/stores/banners/${b.id}`);
      await load();
      setSuccess(t("banners.deleted"));
    } catch (err: any) {
      setError(err.response?.data?.message || t("banners.deleteError"));
    }
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setActionError("");
    const reader = new FileReader();
    reader.onload = () => {
      setEditing((prev: any) => (prev ? { ...prev, imageUrl: reader.result as string } : prev));
      setImageUploading(false);
    };
    reader.onerror = () => {
      setActionError(t("banners.readError"));
      setImageUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const positionLabel = (pos: string) => {
    switch (pos) {
      case "HomeTop": return t("banners.posHomeTop");
      case "HomeMiddle": return t("banners.posHomeMiddle");
      case "HomeBottom": return t("banners.posHomeBottom");
      default: return pos;
    }
  };

  return (
    <div>
      <SuccessToast message={success} fixed className="mb-4" />
      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-[var(--sub)]">{t("banners.desc")}</p>
        <Can code="StoreSettings.Add">
          <button onClick={openAdd} className="btn btn-primary btn-sm shrink-0">+ {t("banners.add")}</button>
        </Can>
      </div>

      {loading ? (
        <p className="text-center text-[var(--sub)] py-8">{t("common.loading")}</p>
      ) : banners.length === 0 ? (
        <div className="text-center py-10 border rounded-xl border-dashed">
          <p className="text-[14px] font-bold text-[var(--ink)] mb-1">{t("banners.emptyTitle")}</p>
          <p className="text-[13px] text-[var(--sub)]">{t("banners.emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="border rounded-xl p-4 bg-white" style={{ borderColor: "var(--border)", opacity: b.isActive ? 1 : 0.55 }}>
              <div className="flex items-center gap-4">
                <div className="w-28 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100 border border-gray-200 flex items-center justify-center">
                  {b.imageUrl ? <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" /> : <span className="text-[11px] text-[var(--sub)]">{t("banners.noImage")}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-bold text-[var(--ink)] truncate">{b.title}</p>
                    <span className="badge badge--gray text-[10.5px]">{positionLabel(b.position)}</span>
                    <span className="text-[10.5px] text-[var(--sub)] shrink-0">#{b.sortOrder}</span>
                  </div>
                  <p className="text-[12px] text-[var(--sub)] mt-1 truncate" dir="ltr">{b.linkUrl ? `↗ ${b.linkUrl}` : t("banners.noLink")}</p>
                  {(b.startDate || b.endDate) && (
                    <p className="text-[11px] text-[var(--sub)] mt-0.5">📅 {b.startDate ? b.startDate.slice(0, 10) : "—"} → {b.endDate ? b.endDate.slice(0, 10) : "∞"}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className={`badge ${b.isActive ? "badge--green" : "badge--gray"}`}>{b.isActive ? t("banners.active") : t("banners.inactive")}</span>
                  <Can code="StoreSettings.Edit">
                    <button onClick={() => toggleActive(b)} disabled={deletingId === b.id} className="btn btn-outline btn-sm">
                      {deletingId === b.id ? t("banners.processing") : b.isActive ? t("banners.deactivate") : t("banners.activate")}
                    </button>
                    <button onClick={() => openEdit(b)} className="btn btn-outline btn-sm">{t("common.edit")}</button>
                  </Can>
                  <Can code="StoreSettings.Delete">
                    <button onClick={() => remove(b)} className="btn btn-danger btn-sm">{t("common.delete")}</button>
                  </Can>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-card max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-bold text-[var(--blue-deep)]">{editing.id ? t("banners.editTitle") : t("banners.addTitle")}</h2>
              <button onClick={() => setEditing(null)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
            </div>
            {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label>{t("banners.titleLabel")}</label>
                  <div className="field-shell"><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required /></div>
                </div>
                <div>
                  <label>{t("banners.positionLabel")}</label>
                  <div className="field-shell">
                    <select value={editing.position} onChange={(e) => setEditing({ ...editing, position: e.target.value })}>
                      {POSITIONS.map((p) => <option key={p} value={p}>{positionLabel(p)}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label>{t("banners.imageLabel")}</label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="w-36 h-20 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    {editing.imageUrl ? <img src={editing.imageUrl} alt="banner-preview" className="w-full h-full object-cover" /> : <span className="text-[11px] text-[var(--sub)]">{t("banners.preview")}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
                    <button type="button" onClick={() => imageInputRef.current?.click()} disabled={imageUploading} className="btn btn-outline btn-sm">
                      {imageUploading ? t("banners.reading") : editing.imageUrl ? t("banners.changeImage") : t("banners.uploadImage")}
                    </button>
                    <p className="text-[11px] text-[var(--sub)] mt-2">{t("banners.imageHint")}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label>{t("banners.linkLabel")}</label>
                  <div className="field-shell"><input dir="ltr" value={editing.linkUrl} onChange={(e) => setEditing({ ...editing, linkUrl: e.target.value })} placeholder="https://…" /></div>
                </div>
                <div>
                  <label>{t("banners.sortOrderLabel")}</label>
                  <div className="field-shell"><input type="number" min={0} value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: parseInt(e.target.value) || 0 })} /></div>
                </div>
                <div>
                  <label>{t("banners.startDate")}</label>
                  <div className="field-shell"><input type="date" value={editing.startDate} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} /></div>
                </div>
                <div>
                  <label>{t("banners.endDate")}</label>
                  <div className="field-shell"><input type="date" value={editing.endDate} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} /></div>
                </div>
              </div>

              <Can code="StoreSettings.Edit">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
                  <span className="text-[13px] font-bold text-[var(--ink)]">{t("banners.isActive")}</span>
                </label>
              </Can>

              <div className="flex items-center gap-3 pt-2">
                <Can code="StoreSettings.Add">
                  <button onClick={save} disabled={saving} className="btn btn-primary">{saving ? t("common.saving") : t("common.save")}</button>
                </Can>
                <button onClick={() => setEditing(null)} className="btn btn-outline">{t("common.cancel")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
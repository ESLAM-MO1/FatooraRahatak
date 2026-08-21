"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import SuccessToast from "@/components/SuccessToast";
import Can from "@/components/Can";
import { useConfirm } from "@/components/ConfirmDialog";

interface BlogPost {
  id: number;
  titleAr: string;
  titleEn: string;
  slugAr: string;
  slugEn: string;
  contentAr: string;
  contentEn: string;
  featuredImage: string | null;
  authorName: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

const emptyForm = {
  titleAr: "",
  titleEn: "",
  slugAr: "",
  slugEn: "",
  contentAr: "",
  contentEn: "",
  featuredImage: "",
  authorName: "",
  status: "Draft",
  seoTitle: "",
  seoDescription: "",
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\u0621-\u064A\u0660-\u0669a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

export default function StoreBlogManager() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await api.get("/store-blog");
      setPosts(r.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || t("error.serverError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing({ ...emptyForm });
    setUploadError("");
  };

  const openEdit = (post: BlogPost) => {
    setEditing({
      id: post.id,
      titleAr: post.titleAr,
      titleEn: post.titleEn,
      slugAr: post.slugAr,
      slugEn: post.slugEn,
      contentAr: post.contentAr,
      contentEn: post.contentEn,
      featuredImage: post.featuredImage || "",
      authorName: post.authorName,
      status: post.status,
      seoTitle: post.seoTitle || "",
      seoDescription: post.seoDescription || "",
    });
    setUploadError("");
  };

  const handleTitleChange = (field: "titleAr" | "titleEn", value: string) => {
    setEditing((p: any) => ({
      ...p,
      [field]: value,
      [field === "titleAr" ? "slugAr" : "slugEn"]: slugify(value),
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/products/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.data?.url;
      if (url) setEditing((p: any) => ({ ...p, featuredImage: url }));
    } catch (err: any) {
      setUploadError(err.response?.data?.message || t("storeBlog.uploadError"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      const payload = {
        titleAr: editing.titleAr,
        titleEn: editing.titleEn,
        slugAr: editing.slugAr || slugify(editing.titleAr),
        slugEn: editing.slugEn || slugify(editing.titleEn),
        contentAr: editing.contentAr,
        contentEn: editing.contentEn,
        featuredImage: editing.featuredImage || null,
        authorName: editing.authorName,
        status: editing.status,
        seoTitle: editing.seoTitle || null,
        seoDescription: editing.seoDescription || null,
      };
      if (editing.id) {
        await api.put(`/store-blog/${editing.id}`, payload);
      } else {
        await api.post("/store-blog", payload);
      }
      setSuccess(t("storeBlog.saved"));
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeBlog.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (post: BlogPost) => {
    setTogglingId(post.id);
    setError("");
    try {
      await api.put(`/store-blog/${post.id}/toggle-publish`);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, status: p.status === "Published" ? "Draft" : "Published" } : p)));
    } catch (err: any) {
      setError(err.response?.data?.message || t("error.serverError"));
    } finally {
      setTogglingId(null);
    }
  };

  const remove = async (post: BlogPost) => {
    if (!(await confirm(`${t("storeBlog.confirmDelete")} "${post.titleAr}"؟`))) return;
    setError("");
    try {
      await api.delete(`/store-blog/${post.id}`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("storeBlog.deleteError"));
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ar-SA-u-nu-latn", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div>
      <SuccessToast message={success} fixed className="mb-4" />
      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-[var(--sub)]">{t("storeBlog.desc")}</p>
        <Can code="StoreSettings.Add">
          <button onClick={openAdd} className="btn btn-primary btn-sm shrink-0">
            + {t("storeBlog.addPost")}
          </button>
        </Can>
      </div>

      {loading ? (
        <p className="text-center text-[var(--sub)] py-8">{t("common.loading")}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("storeBlog.postTitle")}</th>
                <th>{t("storeBlog.author")}</th>
                <th>{t("storeBlog.status")}</th>
                <th>{t("storeBlog.date")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className="font-medium max-w-[220px] truncate">{post.titleAr || post.titleEn}</td>
                  <td className="text-[var(--sub)]">{post.authorName || "-"}</td>
                  <td>
                    <span className={post.status === "Published" ? "badge badge--green" : "badge badge--gray"}>
                      {post.status === "Published" ? t("storeBlog.published") : t("storeBlog.draft")}
                    </span>
                  </td>
                  <td className="text-[var(--sub)] whitespace-nowrap">{formatDate(post.publishedAt || post.createdAt)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Can code="StoreSettings.Edit">
                        <button
                          onClick={() => togglePublish(post)}
                          disabled={togglingId === post.id}
                          className={`btn btn-sm ${post.status === "Published" ? "btn-outline" : "btn-success"}`}
                        >
                          {togglingId === post.id
                            ? t("storeBlog.processing")
                            : post.status === "Published"
                            ? t("storeBlog.unpublish")
                            : t("storeBlog.publish")}
                        </button>
                        <button onClick={() => openEdit(post)} className="btn btn-outline btn-sm">
                          {t("common.edit")}
                        </button>
                      </Can>
                      <Can code="StoreSettings.Delete">
                        <button onClick={() => remove(post)} className="btn btn-danger btn-sm">
                          {t("common.delete")}
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {posts.length === 0 && <p className="text-center text-[var(--sub)] py-8">{t("storeBlog.noPosts")}</p>}
        </div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-card max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--ink)]">{editing.id ? t("storeBlog.editPost") : t("storeBlog.addNewPost")}</h2>
              <button onClick={() => setEditing(null)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label>{t("storeBlog.titleAr")}</label>
                  <div className="field-shell">
                    <input dir="rtl" value={editing.titleAr} onChange={(e) => handleTitleChange("titleAr", e.target.value)} placeholder={t("storeBlog.titlePlaceholder")} />
                  </div>
                </div>
                <div>
                  <label>{t("storeBlog.titleEn")}</label>
                  <div className="field-shell">
                    <input dir="ltr" value={editing.titleEn} onChange={(e) => handleTitleChange("titleEn", e.target.value)} placeholder={t("storeBlog.titlePlaceholder")} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label>{t("storeBlog.slugAr")}</label>
                  <div className="field-shell">
                    <input dir="rtl" value={editing.slugAr} onChange={(e) => setEditing({ ...editing, slugAr: e.target.value })} placeholder="---" />
                  </div>
                </div>
                <div>
                  <label>{t("storeBlog.slugEn")}</label>
                  <div className="field-shell">
                    <input dir="ltr" value={editing.slugEn} onChange={(e) => setEditing({ ...editing, slugEn: e.target.value })} placeholder="---" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label>{t("storeBlog.contentAr")}</label>
                  <div className="field-shell">
                    <textarea dir="rtl" rows={8} value={editing.contentAr} onChange={(e) => setEditing({ ...editing, contentAr: e.target.value })} placeholder={t("storeBlog.contentPlaceholder")} />
                  </div>
                </div>
                <div>
                  <label>{t("storeBlog.contentEn")}</label>
                  <div className="field-shell">
                    <textarea dir="ltr" rows={8} value={editing.contentEn} onChange={(e) => setEditing({ ...editing, contentEn: e.target.value })} placeholder={t("storeBlog.contentPlaceholder")} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label>{t("storeBlog.authorName")}</label>
                  <div className="field-shell">
                    <input value={editing.authorName} onChange={(e) => setEditing({ ...editing, authorName: e.target.value })} placeholder={t("storeBlog.authorPlaceholder")} />
                  </div>
                </div>
                <div>
                  <label>{t("storeBlog.status")}</label>
                  <div className="field-shell">
                    <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                      <option value="Draft">{t("storeBlog.draft")}</option>
                      <option value="Published">{t("storeBlog.published")}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label>{t("storeBlog.featuredImage")}</label>
                  {uploadError && <div className="alert alert--danger mt-1 mb-1 py-1 text-[11px]">{uploadError}</div>}
                  {uploading ? (
                    <p className="text-[12px] text-[var(--sub)] mt-2">{t("storeBlog.uploading")}</p>
                  ) : (
                    <label className="btn btn-outline btn-sm mt-2 cursor-pointer">
                      {t("storeBlog.uploadImage")}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
              </div>
              {editing.featuredImage && (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={editing.featuredImage}
                    alt={editing.titleAr}
                    className="w-full max-h-48 object-cover rounded-xl border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setEditing((p: any) => ({ ...p, featuredImage: "" }))}
                    className="btn btn-outline btn-sm mt-2"
                  >
                    {t("common.remove")}
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3 pt-2">
                <Can code="StoreSettings.Add">
                  <button onClick={save} disabled={saving} className="btn btn-primary">
                    {saving ? t("storeBlog.saving") : t("common.save")}
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
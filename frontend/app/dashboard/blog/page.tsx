"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { isAuthenticated, getUserType } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

interface BlogPost {
  id: number;
  titleAr: string;
  slug: string;
  contentAr: string;
  authorName: string;
  featuredImage: string | null;
  isPublished: boolean;
  createdAt: string;
}

export default function BlogManagementPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<BlogPost | null>(null);
  const [form, setForm] = useState({
    titleAr: "",
    contentAr: "",
    featuredImage: "",
    authorName: "",
  });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated() || getUserType() !== "SuperAdmin") {
      router.push("/dashboard");
      return;
    }
    setAuthorized(true);
    setReady(true);
  }, [router]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/site/blog");
      setPosts(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || t("blog.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready && authorized) load();
  }, [ready, authorized]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ titleAr: "", contentAr: "", featuredImage: "", authorName: "" });
    setModalOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditItem(post);
    setForm({
      titleAr: post.titleAr,
      contentAr: post.contentAr,
      featuredImage: post.featuredImage || "",
      authorName: post.authorName,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        featuredImage: form.featuredImage || null,
      };
      if (editItem) {
        await api.put(`/admin/site/blog/${editItem.id}`, payload);
      } else {
        await api.post("/admin/site/blog", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("blog.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!window.confirm(`${t("blog.confirmDelete")} "${post.titleAr}"؟`)) return;
    try {
      await api.delete(`/admin/site/blog/${post.id}`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("blog.deleteError"));
    }
  };

  const togglePublish = async (post: BlogPost) => {
    setTogglingId(post.id);
    setError("");
    try {
      const endpoint = post.isPublished
        ? `/admin/site/blog/${post.id}/unpublish`
        : `/admin/site/blog/${post.id}/publish`;
      await api.put(endpoint);
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, isPublished: !p.isPublished } : p))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || t("blog.updateError"));
    } finally {
      setTogglingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!ready) return <LoadingState />;
  if (!authorized) return null;

  return (
    <div>
      <PageHeader icon="edit" title={t("blog.managementTitle")}>
        <button onClick={openAdd} className="btn btn-primary">
          {t("blog.addPost")}
        </button>
      </PageHeader>

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      {loading ? (
        <LoadingState />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("blog.id")}</th>
                <th>{t("blog.postTitle")}</th>
                <th>{t("blog.author")}</th>
                <th>{t("blog.status")}</th>
                <th>{t("blog.date")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className="text-[var(--sub)]">{post.id}</td>
                  <td className="font-medium max-w-[200px] truncate">{post.titleAr}</td>
                  <td className="text-[var(--sub)]">{post.authorName || "-"}</td>
                  <td>
                    <span className={post.isPublished ? "badge badge--green" : "badge badge--gray"}>
                      {post.isPublished ? t("blog.published") : t("blog.draft")}
                    </span>
                  </td>
                  <td className="text-[var(--sub)] whitespace-nowrap">{formatDate(post.createdAt)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePublish(post)}
                        disabled={togglingId === post.id}
                        className={`btn btn-sm ${post.isPublished ? "btn-outline" : "btn-success"}`}
                      >
                        {togglingId === post.id
                          ? t("blog.processing")
                          : post.isPublished
                          ? t("blog.unpublish")
                          : t("blog.publish")}
                      </button>
                      <button onClick={() => openEdit(post)} className="btn btn-outline btn-sm">
                        {t("common.edit")}
                      </button>
                      <button onClick={() => handleDelete(post)} className="btn btn-danger btn-sm">
                        {t("common.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {posts.length === 0 && (
            <p className="text-center text-[var(--sub)] py-8">{t("blog.noPosts")}</p>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-card max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[var(--ink)] mb-5">
              {editItem ? t("blog.editPost") : t("blog.addNewPost")}
            </h2>
            <div className="space-y-4">
              <div>
                <label>{t("blog.titleAr")}</label>
                <div className="field-shell">
                  <input
                    value={form.titleAr}
                    onChange={(e) => setForm((p) => ({ ...p, titleAr: e.target.value }))}
                    placeholder={t("blog.titlePlaceholder")}
                  />
                </div>
              </div>
              <div>
                <label>{t("blog.contentAr")}</label>
                <div className="field-shell">
                  <textarea
                    value={form.contentAr}
                    onChange={(e) => setForm((p) => ({ ...p, contentAr: e.target.value }))}
                    rows={10}
                    placeholder={t("blog.contentPlaceholder")}
                    style={{ fontFamily: "monospace", fontSize: "13px" }}
                  />
                </div>
              </div>
              <div>
                <label>{t("blog.featuredImage")}</label>
                <div className="field-shell">
                  <input
                    value={form.featuredImage}
                    onChange={(e) => setForm((p) => ({ ...p, featuredImage: e.target.value }))}
                    placeholder={t("blog.imagePlaceholder")}
                  />
                </div>
              </div>
              <div>
                <label>{t("blog.authorName")}</label>
                <div className="field-shell">
                  <input
                    value={form.authorName}
                    onChange={(e) => setForm((p) => ({ ...p, authorName: e.target.value }))}
                    placeholder={t("blog.authorPlaceholder")}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                  {saving ? t("blog.saving") : t("common.save")}
                </button>
                <button onClick={() => setModalOpen(false)} className="btn btn-outline">
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

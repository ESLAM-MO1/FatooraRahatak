"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { isAuthenticated, getUserType } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import Toast from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import "@/lib/i18n/config";

interface Course {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  imageUrl?: string | null;
  category: string;
  duration: string;
  level: string;
  isActive: boolean;
  sortOrder: number;
  lessonsCount?: number;
}

interface Lesson {
  id: number;
  courseId: number;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  videoUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface Enrollment {
  id: number;
  courseId: number;
  courseTitleAr: string;
  courseTitleEn: string;
  applicantName: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  status: string;
  createdAt: string;
}

type FormState = { titleAr: string; titleEn: string; descriptionAr: string; descriptionEn: string; imageUrl: string; category: string; duration: string; level: string; sortOrder: number; isActive: boolean };
const EMPTY_FORM: FormState = { titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "", imageUrl: "", category: "", duration: "", level: "Beginner", sortOrder: 1, isActive: true };
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const CATEGORIES = ["management", "accounting", "inventory", "sales", "software", "other"];

type LessonForm = { titleAr: string; titleEn: string; descriptionAr: string; descriptionEn: string; videoUrl: string; sortOrder: number; isActive: boolean };
const EMPTY_LESSON: LessonForm = { titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "", videoUrl: "", sortOrder: 1, isActive: true };

export default function AcademyAdminPage() {
  const { t, i18n } = useTranslation();
  const confirm = useConfirm();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"courses" | "lessons" | "enrollments" | "page">("courses");

  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonForm>(EMPTY_LESSON);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pageIntro, setPageIntro] = useState({ titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "", imageUrl: "" });
  const [introLoading, setIntroLoading] = useState(false);
  const [introSaving, setIntroSaving] = useState(false);
  const [introUploading, setIntroUploading] = useState(false);
  const introFileRef = useRef<HTMLInputElement>(null);
  const [courseUploading, setCourseUploading] = useState(false);
  const courseFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated() || getUserType() !== "SuperAdmin") {
      router.push("/dashboard");
      return;
    }
    setAuthorized(true);
    setReady(true);
  }, [router]);

  const load = useCallback(async () => {
    const res = await api.get("/admin/courses");
    setCourses(res.data.data || []);
  }, []);

  const loadLessons = useCallback(async (courseId: number) => {
    const res = await api.get(`/admin/courses/${courseId}/lessons`);
    setLessons(res.data.data || []);
  }, []);

  const loadEnrollments = useCallback(async () => {
    const res = await api.get("/admin/course-enrollments");
    setEnrollments(res.data.data || []);
  }, []);

  const loadPageIntro = useCallback(async () => {
    setIntroLoading(true);
    try {
      const res = await api.get("/admin/academy-intro");
      const d = res.data?.data;
      if (d) setPageIntro({ titleAr: d.titleAr || "", titleEn: d.titleEn || "", descriptionAr: d.descriptionAr || "", descriptionEn: d.descriptionEn || "", imageUrl: d.imageUrl || "" });
    } catch { /* تجاهل */ }
    finally { setIntroLoading(false); }
  }, []);

  const savePageIntro = async () => {
    setIntroSaving(true);
    setMessage(null);
    try {
      await api.put("/admin/academy-intro", {
        titleAr: pageIntro.titleAr.trim(),
        titleEn: pageIntro.titleEn.trim(),
        descriptionAr: pageIntro.descriptionAr.trim(),
        descriptionEn: pageIntro.descriptionEn.trim(),
        imageUrl: pageIntro.imageUrl.trim() || null,
      });
      setMessage({ type: "success", text: t("academy.introSaved") });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    } finally {
      setIntroSaving(false);
    }
  };

  const uploadIntroImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIntroUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/admin/site/upload", fd);
      const url = res.data?.data?.url || res.data?.url;
      if (url) setPageIntro(prev => ({ ...prev, imageUrl: url }));
      else setMessage({ type: "error", text: t("academy.uploadError") });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("academy.uploadError") });
    } finally {
      setIntroUploading(false);
      if (introFileRef.current) introFileRef.current.value = "";
    }
  };

  const uploadCourseImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCourseUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/admin/site/upload", fd);
      const url = res.data?.data?.url || res.data?.url;
      if (url) setForm(prev => ({ ...prev, imageUrl: url }));
      else setMessage({ type: "error", text: t("academy.uploadError") });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("academy.uploadError") });
    } finally {
      setCourseUploading(false);
      if (courseFileRef.current) courseFileRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!ready) return;
    load().catch(() => setMessage({ type: "error", text: t("error.serverError") })).finally(() => setLoading(false));
    loadEnrollments().catch(() => {});
    loadPageIntro().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, load, loadEnrollments, loadPageIntro]);

  useEffect(() => {
    if (tab === "lessons" && selectedCourseId != null) {
      loadLessons(selectedCourseId).catch(() => {});
    }
    if (tab === "enrollments") {
      loadEnrollments().catch(() => {});
    }
  }, [tab, selectedCourseId, loadLessons, loadEnrollments]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setModalOpen(true); };

  const openEdit = (c: Course) => {
    setEditingId(c.id);
    setForm({ titleAr: c.titleAr, titleEn: c.titleEn, descriptionAr: c.descriptionAr, descriptionEn: c.descriptionEn, imageUrl: (c as any).imageUrl || "", category: c.category, duration: c.duration, level: c.level, sortOrder: c.sortOrder, isActive: c.isActive });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(EMPTY_FORM); };

  const submit = async () => {
    if (!form.titleAr.trim() && !form.titleEn.trim()) {
      setMessage({ type: "error", text: t("academy.titleAr") + " / " + t("academy.titleEn") });
      return;
    }
    setSaving(true);
    setMessage(null);
    const payload = {
      titleAr: form.titleAr.trim(), titleEn: form.titleEn.trim(),
      descriptionAr: form.descriptionAr.trim(), descriptionEn: form.descriptionEn.trim(),
      imageUrl: form.imageUrl.trim() || null,
      category: form.category.trim(), duration: form.duration.trim(), level: form.level.trim(),
      sortOrder: form.sortOrder, isActive: form.isActive,
    };
    try {
      if (editingId) {
        await api.put(`/admin/courses/${editingId}`, payload);
      } else {
        await api.post("/admin/courses", payload);
      }
      await load();
      setMessage({ type: "success", text: t("academy.saveSuccess") });
      closeModal();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: Course) => {
    try {
      await api.put(`/admin/courses/${c.id}`, { titleAr: c.titleAr, titleEn: c.titleEn, descriptionAr: c.descriptionAr, descriptionEn: c.descriptionEn, category: c.category, duration: c.duration, level: c.level, sortOrder: c.sortOrder, isActive: !c.isActive });
      await load();
    } catch { setMessage({ type: "error", text: t("error.serverError") }); }
  };

  const remove = async (c: Course) => {
    if (!(await confirm(t("common.confirmDelete")))) return;
    try {
      await api.delete(`/admin/courses/${c.id}`);
      await load();
      setMessage({ type: "success", text: t("academy.deleteSuccess") });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    }
  };

  const openLessonCreate = () => { setEditingLessonId(null); setLessonForm(EMPTY_LESSON); setLessonModalOpen(true); };

  const openLessonEdit = (l: Lesson) => {
    setEditingLessonId(l.id);
    setLessonForm({ titleAr: l.titleAr, titleEn: l.titleEn, descriptionAr: l.descriptionAr || "", descriptionEn: l.descriptionEn || "", videoUrl: l.videoUrl || "", sortOrder: l.sortOrder, isActive: l.isActive });
    setLessonModalOpen(true);
  };

  const closeLessonModal = () => { setLessonModalOpen(false); setEditingLessonId(null); setLessonForm(EMPTY_LESSON); };

  const submitLesson = async () => {
    if (selectedCourseId == null) return;
    if (!lessonForm.titleAr.trim() && !lessonForm.titleEn.trim()) {
      setMessage({ type: "error", text: t("academy.lessonTitleAr") + " / " + t("academy.lessonTitleEn") });
      return;
    }
    setSaving(true);
    setMessage(null);
    const payload = {
      titleAr: lessonForm.titleAr.trim(), titleEn: lessonForm.titleEn.trim(),
      descriptionAr: lessonForm.descriptionAr.trim() || null, descriptionEn: lessonForm.descriptionEn.trim() || null,
      videoUrl: lessonForm.videoUrl.trim() || null, sortOrder: lessonForm.sortOrder, isActive: lessonForm.isActive,
    };
    try {
      if (editingLessonId) {
        await api.put(`/admin/courses/lessons/${editingLessonId}`, payload);
      } else {
        await api.post(`/admin/courses/${selectedCourseId}/lessons`, payload);
      }
      await loadLessons(selectedCourseId);
      await load();
      setMessage({ type: "success", text: t("academy.saveSuccess") });
      closeLessonModal();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    } finally {
      setSaving(false);
    }
  };

  const removeLesson = async (l: Lesson) => {
    if (!(await confirm(t("common.confirmDelete")))) return;
    try {
      await api.delete(`/admin/courses/lessons/${l.id}`);
      if (selectedCourseId != null) await loadLessons(selectedCourseId);
      await load();
      setMessage({ type: "success", text: t("academy.deleteSuccess") });
    } catch { setMessage({ type: "error", text: t("error.serverError") }); }
  };

  const updateEnrollmentStatus = async (e: Enrollment, status: string) => {
    if (e.status === status) return;
    try {
      await api.put(`/admin/course-enrollments/${e.id}/status`, { status });
      await loadEnrollments();
      setMessage({ type: "success", text: t("academy.updateStatusSuccess") });
    } catch { setMessage({ type: "error", text: t("error.serverError") }); }
  };

  const removeEnrollment = async (e: Enrollment) => {
    if (!(await confirm(t("common.confirmDelete")))) return;
    try {
      await api.delete(`/admin/course-enrollments/${e.id}`);
      await loadEnrollments();
      setMessage({ type: "success", text: t("academy.deleteSuccess") });
    } catch { setMessage({ type: "error", text: t("error.serverError") }); }
  };

  if (!ready) return <LoadingState />;
  if (!authorized) return null;

  const sorted = [...courses].sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id);
  const categoryLabel = (key: string) => {
    const v = t(`academy.cat_${key}`);
    return v === `academy.cat_${key}` ? key : v;
  };
  const statusLabel = (s: string) => {
    const v = t(`academy.status${s}`);
    return v === `academy.status${s}` ? s : v;
  };
  const statusStyle = (s: string) => {
    const map: Record<string, { color: string; backgroundColor: string }> = {
      New: { color: "var(--blue)", backgroundColor: "var(--blue-50)" },
      Reviewed: { color: "#b45309", backgroundColor: "#fef3c7" },
      Accepted: { color: "var(--green)", backgroundColor: "#f0fdf4" },
      Rejected: { color: "#dc2626", backgroundColor: "#fef2f2" },
    };
    return map[s] || { color: "var(--sub)", backgroundColor: "#f3f4f6" };
  };

  return (
    <div>
      <PageHeader icon="star" title={t("admin.academy")} />
      <p className="mb-5 text-[13px]" style={{ color: "var(--sub)" }}>{t("academy.pageIntro")}</p>
      {message && <Toast message={message.text} type={message.type} fixed />}

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button className={`btn ${tab === "courses" ? "btn-primary" : "btn-outline"}`} onClick={() => setTab("courses")}>{t("academy.courses")} ({courses.length})</button>
        <button className={`btn ${tab === "lessons" ? "btn-primary" : "btn-outline"}`} onClick={() => setTab("lessons")}>{t("academy.lessons")}</button>
        <button className={`btn ${tab === "enrollments" ? "btn-primary" : "btn-outline"}`} onClick={() => setTab("enrollments")}>{t("academy.enrollments")} ({enrollments.length})</button>
        <button className={`btn ${tab === "page" ? "btn-primary" : "btn-outline"}`} onClick={() => setTab("page")}>{t("academy.pageSettings")}</button>
        {tab === "courses" && (
          <button className="btn btn-primary ms-auto" onClick={openCreate}>+ {t("academy.addCourse")}</button>
        )}
        {tab === "lessons" && selectedCourseId != null && (
          <button className="btn btn-primary ms-auto" onClick={openLessonCreate}>+ {t("academy.addLesson")}</button>
        )}
      </div>

      {loading ? <LoadingState /> : tab === "courses" ? (
        sorted.length === 0 ? (
          <div className="card p-10 text-center"><p className="text-[13.5px]" style={{ color: "var(--sub)" }}>{t("common.noData")}</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sorted.map(c => (
              <div key={c.id} className="card p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-bold truncate" style={{ color: "var(--ink)" }}>{i18nText(c.titleAr, c.titleEn)}</p>
                    <p className="text-[11.5px] text-[var(--sub)] truncate">{categoryLabel(c.category)} · {c.level} · {c.duration} · {c.lessonsCount || 0} {t("academy.lessonCount")}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${c.isActive ? "bg-green-50" : "bg-gray-100"}`} style={{ color: c.isActive ? "var(--green)" : "var(--sub)" }}>
                    {c.isActive ? t("academy.active") : t("academy.inactive")}
                  </span>
                  <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => { setSelectedCourseId(c.id); setTab("lessons"); }}>{t("academy.manageLessons")}</button>
                  <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => openEdit(c)}>{t("common.edit")}</button>
                  <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => toggle(c)}>{c.isActive ? t("academy.deactivate") : t("academy.activate")}</button>
                  <button className="btn btn-outline !px-2 !py-1 !text-[11px] !text-red-600" onClick={() => remove(c)}>{t("common.delete")}</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === "lessons" ? (
        <div>
          <div className="mb-4">
            <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.selectCourse")}</label>
            <select className="w-full max-w-sm border rounded-lg px-3 py-2 text-[13px]" value={selectedCourseId ?? ""} onChange={e => { const v = e.target.value; setSelectedCourseId(v ? Number(v) : null); }}>
              <option value="">{t("academy.noCourse")}</option>
              {sorted.map(c => <option key={c.id} value={c.id}>{i18nText(c.titleAr, c.titleEn)}</option>)}
            </select>
          </div>
          {selectedCourseId == null ? (
            <div className="card p-10 text-center"><p className="text-[13.5px]" style={{ color: "var(--sub)" }}>{t("academy.noCourse")}</p></div>
          ) : lessons.length === 0 ? (
            <div className="card p-10 text-center"><p className="text-[13.5px]" style={{ color: "var(--sub)" }}>{t("common.noData")}</p></div>
          ) : (
            <div className="space-y-2">
              {[...lessons].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id).map(l => (
                <div key={l.id} className="card p-3 flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0" style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}>{l.sortOrder}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold truncate" style={{ color: "var(--ink)" }}>{i18nText(l.titleAr, l.titleEn)}</p>
                    {l.videoUrl && <p className="text-[11px] text-[var(--sub)] truncate" dir="ltr">{l.videoUrl}</p>}
                  </div>
                  <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => openLessonEdit(l)}>{t("common.edit")}</button>
                  <button className="btn btn-outline !px-2 !py-1 !text-[11px] !text-red-600" onClick={() => removeLesson(l)}>{t("common.delete")}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : tab === "enrollments" && enrollments.length === 0 ? (
        <div className="card p-10 text-center"><p className="text-[13.5px]" style={{ color: "var(--sub)" }}>{t("common.noData")}</p></div>
      ) : tab === "page" ? (
        <div className="card p-6">
          <h3 className="text-[15px] font-bold mb-4" style={{ color: "var(--blue-deep)" }}>{t("academy.pageSettingsTitle")}</h3>
          <p className="text-[12.5px] mb-5" style={{ color: "var(--sub)" }}>{t("academy.pageSettingsDesc")}</p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.titleAr")}</label>
                <div className="field-shell"><input type="text" value={pageIntro.titleAr} onChange={e => setPageIntro({ ...pageIntro, titleAr: e.target.value })} /></div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.titleEn")}</label>
                <div className="field-shell"><input type="text" dir="ltr" value={pageIntro.titleEn} onChange={e => setPageIntro({ ...pageIntro, titleEn: e.target.value })} /></div>
              </div>
            </div>
            <div>
              <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.descriptionAr")}</label>
              <div className="field-shell"><textarea rows={3} value={pageIntro.descriptionAr} onChange={e => setPageIntro({ ...pageIntro, descriptionAr: e.target.value })} /></div>
            </div>
            <div>
              <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.descriptionEn")}</label>
              <div className="field-shell"><textarea rows={3} dir="ltr" value={pageIntro.descriptionEn} onChange={e => setPageIntro({ ...pageIntro, descriptionEn: e.target.value })} /></div>
            </div>
            <div>
              <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.pageImage")}</label>
              <div className="flex items-center gap-3">
                <div className="w-36 h-24 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                  {pageIntro.imageUrl ? <img src={pageIntro.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-[10.5px] text-[var(--sub)]">{t("academy.noImage")}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <input ref={introFileRef} type="file" accept="image/*" className="hidden" onChange={uploadIntroImage} />
                  <button type="button" onClick={() => introFileRef.current?.click()} disabled={introUploading} className="btn btn-outline btn-sm">
                    {introUploading ? t("common.loading") : pageIntro.imageUrl ? t("academy.changeImage") : t("academy.uploadImage")}
                  </button>
                  <p className="text-[11px] text-[var(--sub)] mt-1">{t("academy.imageUploadHint")}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button className="btn btn-primary" onClick={savePageIntro} disabled={introSaving}>
                {introSaving ? t("common.loading") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {enrollments.map(e => (
            <div key={e.id} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13.5px] font-bold" style={{ color: "var(--ink)" }}>{e.applicantName}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold shrink-0" style={{ ...statusStyle(e.status) }}>{statusLabel(e.status)}</span>
                  </div>
                  <p className="text-[12px] text-[var(--sub)]">{e.email} · {e.phone || ""}</p>
                  <p className="text-[11.5px] text-[var(--sub)]">{i18nText(e.courseTitleAr, e.courseTitleEn)} · {new Date(e.createdAt).toLocaleString()}</p>
                  {e.message && <p className="text-[12.5px] mt-2 p-3 rounded-lg bg-[var(--bg)]" style={{ color: "var(--ink)" }}>{e.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {["New", "Reviewed", "Accepted", "Rejected"].map(s => (
                    <button key={s} className={`btn !px-2 !py-1 !text-[10.5px] ${e.status === s ? "btn-primary" : "btn-outline"}`} onClick={() => updateEnrollmentStatus(e, s)}>{statusLabel(s)}</button>
                  ))}
                  <button className="btn btn-outline !px-2 !py-1 !text-[10.5px] !text-red-600" onClick={() => removeEnrollment(e)}>{t("common.delete")}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-bold" style={{ color: "var(--blue-deep)" }}>
                {editingId ? t("academy.editCourse") : t("academy.addCourse")}
              </h3>
              <button type="button" onClick={closeModal} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.titleAr")}</label>
                  <div className="field-shell"><input type="text" value={form.titleAr} onChange={e => setForm({ ...form, titleAr: e.target.value })} /></div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.titleEn")}</label>
                  <div className="field-shell"><input type="text" dir="ltr" value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} /></div>
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.descriptionAr")}</label>
                <div className="field-shell"><textarea rows={3} value={form.descriptionAr} onChange={e => setForm({ ...form, descriptionAr: e.target.value })} /></div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.descriptionEn")}</label>
                <div className="field-shell"><textarea rows={3} dir="ltr" value={form.descriptionEn} onChange={e => setForm({ ...form, descriptionEn: e.target.value })} /></div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.imageUrl")}</label>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    {form.imageUrl ? <img src={form.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-[10.5px] text-[var(--sub)]">{t("academy.noImage")}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <input ref={courseFileRef} type="file" accept="image/*" className="hidden" onChange={uploadCourseImage} />
                    <button type="button" onClick={() => courseFileRef.current?.click()} disabled={courseUploading} className="btn btn-outline btn-sm">
                      {courseUploading ? t("common.loading") : form.imageUrl ? t("academy.changeImage") : t("academy.uploadImage")}
                    </button>
                    <p className="text-[11px] text-[var(--sub)] mt-1">{t("academy.imageUploadHint")}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.category")}</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-[13px]" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(ca => <option key={ca} value={ca}>{categoryLabel(ca)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.level")}</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-[13px]" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                    {LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.duration")}</label>
                  <div className="field-shell"><input type="text" dir="ltr" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="10 hrs" /></div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.sortOrder")}</label>
                  <div className="field-shell"><input type="number" min={0} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value === "" ? 0 : Number(e.target.value) })} /></div>
                </div>
                <label className="flex items-center gap-2 text-[13px] font-bold cursor-pointer pt-6">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                  {form.isActive ? t("academy.active") : t("academy.inactive")}
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button disabled={saving} className="btn btn-primary flex-1 disabled:opacity-60" onClick={submit}>
                {saving ? t("common.loading") : t("common.save")}
              </button>
              <button className="btn btn-outline" onClick={closeModal}>{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      {lessonModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-bold" style={{ color: "var(--blue-deep)" }}>
                {editingLessonId ? t("academy.editLesson") : t("academy.addLesson")}
              </h3>
              <button type="button" onClick={closeLessonModal} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.lessonTitleAr")}</label>
                  <div className="field-shell"><input type="text" value={lessonForm.titleAr} onChange={e => setLessonForm({ ...lessonForm, titleAr: e.target.value })} /></div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.lessonTitleEn")}</label>
                  <div className="field-shell"><input type="text" dir="ltr" value={lessonForm.titleEn} onChange={e => setLessonForm({ ...lessonForm, titleEn: e.target.value })} /></div>
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.lessonDescAr")}</label>
                <div className="field-shell"><textarea rows={2} value={lessonForm.descriptionAr} onChange={e => setLessonForm({ ...lessonForm, descriptionAr: e.target.value })} /></div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.lessonDescEn")}</label>
                <div className="field-shell"><textarea rows={2} dir="ltr" value={lessonForm.descriptionEn} onChange={e => setLessonForm({ ...lessonForm, descriptionEn: e.target.value })} /></div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.videoUrl")}</label>
                <div className="field-shell"><input type="text" dir="ltr" value={lessonForm.videoUrl} onChange={e => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("academy.sortOrder")}</label>
                  <div className="field-shell"><input type="number" min={0} value={lessonForm.sortOrder} onChange={e => setLessonForm({ ...lessonForm, sortOrder: e.target.value === "" ? 0 : Number(e.target.value) })} /></div>
                </div>
                <label className="flex items-center gap-2 text-[13px] font-bold cursor-pointer pt-6">
                  <input type="checkbox" checked={lessonForm.isActive} onChange={e => setLessonForm({ ...lessonForm, isActive: e.target.checked })} />
                  {lessonForm.isActive ? t("academy.active") : t("academy.inactive")}
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button disabled={saving} className="btn btn-primary flex-1 disabled:opacity-60" onClick={submitLesson}>
                {saving ? t("common.loading") : t("common.save")}
              </button>
              <button className="btn btn-outline" onClick={closeLessonModal}>{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function i18nText(ar: string, en: string) {
    return i18n.language === "ar" ? (ar || en) : (en || ar);
  }
}
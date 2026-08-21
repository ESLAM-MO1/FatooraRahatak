"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import { openProtectedFile } from "@/lib/protectedFile";
import KycAlert from "@/components/KycAlert";

interface MerchantDocument {
  id: number;
  documentType: string;
  fileName: string;
  filePath: string;
  url: string;
  createdAt: string;
}

interface Verification {
  id: number;
  storeId: number;
  status: string;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  documents: MerchantDocument[];
}

const DOC_TYPES = ["CommercialRegister", "IdCard", "License", "VatCertificate", "Other"] as const;

export default function MerchantVerificationPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedType, setSelectedType] = useState<string>("CommercialRegister");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [replacing, setReplacing] = useState<number | null>(null);

  const addInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<MerchantDocument | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/owner/verification");
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("verification.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const docTypeLabel = (type: string) =>
    type === "CommercialRegister" ? t("verification.typeCommercialRegister")
      : type === "IdCard" ? t("verification.typeIdCard")
      : type === "License" ? t("verification.typeLicense")
      : type === "VatCertificate" ? t("verification.typeVatCertificate")
      : t("verification.typeOther");

  const statusBadge = (status: string) =>
    status === "Approved" ? "badge--green" : status === "Rejected" ? "badge--red" : status === "Pending" ? "badge--yellow" : "badge--blue";

  const statusLabel = (status: string) =>
    status === "Approved" ? t("verification.statusApproved")
      : status === "Rejected" ? t("verification.statusRejected")
      : status === "Pending" ? t("verification.statusPending")
      : t("verification.statusNotSubmitted");

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", selectedType);
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/owner/verification/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setSuccess(t("verification.uploadSuccess"));
      setFile(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("verification.actionError"));
    } finally {
      setSubmitting(false);
    }
  };

  // "إضافة مستند آخر" — يفتح مُنتقي ملفات مباشرة بنفس النوع المختار
  const handleAddAnotherClick = () => {
    setError("");
    setSuccess("");
    addInputRef.current?.click();
  };

  const handleAddAnotherFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const formData = new FormData();
    formData.append("file", f);
    formData.append("documentType", selectedType);
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/owner/verification/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setSuccess(t("verification.uploadSuccess"));
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("verification.actionError"));
    } finally {
      setSubmitting(false);
    }
  };

  // "استبدال المستند" — يرفع نسخة جديدة بنفس النوع ثم يحذف النسخة القديمة
  const handleReplaceClick = (doc: MerchantDocument) => {
    setError("");
    setSuccess("");
    replaceTargetRef.current = doc;
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    const target = replaceTargetRef.current;
    e.target.value = "";
    if (!f || !target) return;
    setReplacing(target.id);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", f);
      formData.append("documentType", target.documentType);
      await api.post("/owner/verification/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
      await api.delete(`/owner/verification/documents/${target.id}`);
      setSuccess(t("verification.replaceSuccess"));
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("verification.actionError"));
    } finally {
      setReplacing(null);
      replaceTargetRef.current = null;
    }
  };

  const handleRemove = async (docId: number) => {
    setError("");
    setSuccess("");
    try {
      await api.delete(`/owner/verification/documents/${docId}`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("verification.actionError"));
    }
  };

  const handleSubmit = async () => {
    setSubmittingReview(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/owner/verification/submit");
      setSuccess(t("verification.submitSuccess"));
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("verification.actionError"));
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleViewDocument = async (doc: MerchantDocument) => {
    setError("");
    setSuccess("");
    setViewingId(doc.id);
    const res = await openProtectedFile(doc.url, doc.fileName);
    if (!res.ok && res.message) setError(res.message || t("verification.downloadError"));
    setViewingId(null);
  };

  if (loading) return <LoadingState />;

  const canEdit = data && (data.status === "NotSubmitted" || data.status === "Rejected");

  return (
    <div className="space-y-6">
      <PageHeader icon="clipboard" title={t("verification.title")} />

      {error && <div className="alert alert--danger">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      {data && data.status !== "Approved" && (
        <KycAlert
          message={t("verification.needAccountBanner")}
          links={[{ label: t("merchantAccount.title"), href: "/dashboard/merchant-account" }]}
        />
      )}

      {data && (
        <>
          <div className="card p-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-[12px] font-bold text-[var(--sub)] mb-1">{t("adminVerifications.status")}</p>
              <span className={`badge ${statusBadge(data.status)}`}>{statusLabel(data.status)}</span>
              {data.status === "Rejected" && data.rejectionReason && (
                <p className="text-[12px] text-[var(--danger)] mt-2">
                  {t("verification.rejectionReason")}: {data.rejectionReason}
                </p>
              )}
            </div>
            {canEdit && data.documents.length > 0 && (
              <button type="button" onClick={handleSubmit} disabled={submittingReview} className="btn btn-primary">
                {submittingReview ? t("common.loading") : t("verification.submitForReview")}
              </button>
            )}
          </div>

          <div className="card p-6">
            <p className="text-[13px] font-bold text-[var(--ink)] mb-4">{t("verification.documents")}</p>

            {canEdit && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <p className="text-[12px] font-bold text-[var(--sub)] mb-1.5">{t("verification.documentType")}</p>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="border border-gray-200 rounded-xl px-3 py-2.5 w-full text-[13px] bg-white focus:outline-none focus:border-[var(--blue)]"
                    >
                      {DOC_TYPES.map((dt) => (
                        <option key={dt} value={dt}>{docTypeLabel(dt)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-[var(--sub)] mb-1.5">{t("verification.uploadDocument")}</p>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="block w-full text-[12px] text-[var(--sub)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--blue-50)] file:text-[var(--blue)] file:font-bold file:py-2 file:px-3 file:text-[12px]"
                    />
                  </div>
                  <button type="button" onClick={handleUpload} disabled={submitting || !file} className="btn btn-outline">
                    {submitting ? t("common.loading") : t("verification.uploadDocument")}
                  </button>
                </div>
                <p className="text-[11.5px] text-[var(--sub)] mt-3">{t("verification.addDocHint")}</p>

                {/* مُنتقيات ملفات مخفية لزرّي "إضافة مستند آخر" و"استبدال المستند" */}
                <input
                  ref={addInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleAddAnotherFile}
                  className="hidden"
                />
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleReplaceFile}
                  className="hidden"
                />

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <button type="button" onClick={handleAddAnotherClick} disabled={submitting} className="btn btn-outline btn-sm">
                    {t("verification.addAnotherDocument")}
                  </button>
                </div>
              </div>
            )}

            {data.documents.length === 0 ? (
              <p className="text-[12.5px] text-[var(--sub)]">{t("verification.emptyDocuments")}</p>
            ) : (
              <div className="space-y-2">
                {data.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-[var(--ink)]">{docTypeLabel(doc.documentType)}</p>
                      <button
                        type="button"
                        onClick={() => handleViewDocument(doc)}
                        disabled={viewingId === doc.id}
                        className="text-[11.5px] text-[var(--blue)] hover:underline truncate block max-w-[260px] text-left"
                        dir="ltr"
                      >
                        {viewingId === doc.id ? t("common.loading") : doc.fileName}
                      </button>
                      <p className="text-[11px] text-[var(--sub)]">{new Date(doc.createdAt).toLocaleDateString()}</p>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleReplaceClick(doc)}
                          disabled={replacing === doc.id}
                          className="btn btn-outline btn-sm"
                        >
                          {replacing === doc.id ? t("common.loading") : t("verification.replaceDocument")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(doc.id)}
                          className="text-[12px] text-[var(--danger)] hover:underline font-medium"
                        >
                          {t("verification.removeDoc")}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
"use client";

import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { useConfirm } from "@/components/ConfirmDialog";
import { openProtectedFile } from "@/lib/protectedFile";

interface MerchantDocument {
  id: number;
  documentType: string;
  fileName: string;
  filePath: string;
  url: string;
  status: string;
  rejectReason: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface AdminVerification {
  id: number;
  storeId: number;
  storeName: string;
  storeSlug: string;
  ownerName: string;
  ownerEmail: string;
  status: string;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  documents: MerchantDocument[];
}

type Filter = "all" | "NotSubmitted" | "Pending" | "Approved" | "Rejected";

export default function AdminVerificationsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<AdminVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState<{ id: number; note: string } | null>(null);
  const [docRejectNote, setDocRejectNote] = useState<{ verificationId: number; documentId: number; note: string } | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const load = async (f: Filter = filter) => {
    setLoading(true);
    setError("");
    try {
      const params = f === "all" ? "" : `?status=${f}`;
      const res = await api.get(`/admin/merchant-verifications${params}`);
      setRows(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("adminVerifications.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const docTypeLabel = (type: string) =>
    type === "CommercialRegister" ? t("verification.typeCommercialRegister")
      : type === "IdCard" ? t("verification.typeIdCard")
      : type === "License" ? t("verification.typeLicense")
      : type === "VatCertificate" ? t("verification.typeVatCertificate")
      : t("verification.typeOther");

  const docStatusLabel = (status: string) =>
    status === "Approved" ? t("adminVerifications.docApproved")
      : status === "Rejected" ? t("adminVerifications.docRejected")
      : t("adminVerifications.docPending");

  const handleDocReview = async (v: AdminVerification, doc: MerchantDocument, approve: boolean) => {
    let rejectReason: string | undefined;
    if (!approve) {
      if (docRejectNote?.documentId !== doc.id) {
        setDocRejectNote({ verificationId: v.id, documentId: doc.id, note: "" });
        return;
      }
      rejectReason = docRejectNote.note.trim() || undefined;
    }
    const ok = await confirm({
      title: approve ? t("adminVerifications.docApprove") : t("adminVerifications.docReject"),
      message: docTypeLabel(doc.documentType),
      confirmLabel: t("common.confirm"),
      danger: !approve,
    });
    if (!ok) return;
    setProcessingId(doc.id);
    setError("");
    setSuccess("");
    try {
      await api.put(`/admin/merchant-verifications/${v.id}/documents/${doc.id}/review`, { approve, rejectReason });
      setSuccess(approve ? t("adminVerifications.docApproved") : t("adminVerifications.docRejected"));
      setDocRejectNote(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("adminVerifications.actionError"));
    } finally {
      setProcessingId(null);
    }
  };

  const statusBadge = (status: string) =>
    status === "Approved" ? "badge--green" : status === "Rejected" ? "badge--red" : status === "Pending" ? "badge--yellow" : "badge--blue";

  const statusLabel = (status: string) =>
    status === "Approved" ? t("adminVerifications.statusApproved")
      : status === "Rejected" ? t("adminVerifications.statusRejected")
      : status === "Pending" ? t("adminVerifications.statusPending")
      : t("adminVerifications.statusNotSubmitted");

  const handleReview = async (v: AdminVerification, approve: boolean) => {
    let rejectionReason: string | undefined;
    if (!approve) {
      if (rejectNote?.id !== v.id) {
        setRejectNote({ id: v.id, note: "" });
        return;
      }
      rejectionReason = rejectNote.note.trim() || undefined;
    }
    const ok = await confirm({
      title: approve ? t("adminVerifications.approve") : t("adminVerifications.reject"),
      message: `${v.storeName} — ${v.ownerName}`,
      confirmLabel: t("common.confirm"),
      danger: !approve,
    });
    if (!ok) return;
    setProcessingId(v.id);
    setError("");
    setSuccess("");
    try {
      await api.put(`/admin/merchant-verifications/${v.id}/review`, { approve, rejectionReason });
      setSuccess(approve ? t("adminVerifications.approved") : t("adminVerifications.rejected"));
      setRejectNote(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("adminVerifications.actionError"));
    } finally {
      setProcessingId(null);
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

  if (loading && rows.length === 0) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader icon="clipboard" title={t("adminVerifications.title")} />

      {error && <div className="alert alert--danger">{error}</div>}
      <SuccessToast message={success} fixed className="mb-4" />

      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "Pending", "Approved", "Rejected", "NotSubmitted"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`text-[11.5px] font-bold px-3 py-1.5 rounded-lg transition-colors ${filter === f ? "bg-[var(--blue)] text-white" : "bg-gray-100 text-[var(--sub)] hover:bg-gray-200"}`}
          >
            {f === "all" ? t("adminReferrals.filterAll") : t(`adminVerifications.filter${f}`)}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card p-6">
          <p className="text-[13px] text-[var(--sub)]">{t("adminVerifications.empty")}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] hidden md:table">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-right p-3 text-[var(--sub)]">{t("adminVerifications.store")}</th>
                  <th className="text-right p-3 text-[var(--sub)]">{t("adminVerifications.owner")}</th>
                  <th className="text-right p-3 text-[var(--sub)]">{t("adminVerifications.status")}</th>
                  <th className="text-right p-3 text-[var(--sub)]">{t("adminVerifications.date")}</th>
                  <th className="text-right p-3 text-[var(--sub)]">{t("adminVerifications.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <Fragment key={v.id}>
                    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-[var(--ink)]">{v.storeName}</p>
                        <p className="text-[11px] text-[var(--sub)]" dir="ltr">/{v.storeSlug}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-[var(--ink)]">{v.ownerName}</p>
                        <p className="text-[11px] text-[var(--sub)]" dir="ltr">{v.ownerEmail}</p>
                      </td>
                      <td className="p-3">
                        <span className={`badge ${statusBadge(v.status)}`}>{statusLabel(v.status)}</span>
                      </td>
                      <td className="p-3 text-[var(--sub)]">
                        {v.submittedAt ? new Date(v.submittedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                            className="btn btn-outline btn-sm"
                          >
                            {t("adminVerifications.view")}
                          </button>
                          {v.status === "Pending" && (
                            <>
                              {rejectNote?.id === v.id && (
                                <input
                                  type="text"
                                  value={rejectNote.note}
                                  onChange={(e) => setRejectNote({ id: v.id, note: e.target.value })}
                                  placeholder={t("adminVerifications.reasonPlaceholder")}
                                  className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] w-36"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => handleReview(v, true)}
                                disabled={processingId === v.id}
                                className="btn btn-outline btn-sm"
                              >
                                {t("adminVerifications.approve")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReview(v, false)}
                                disabled={processingId === v.id}
                                className="btn btn-outline btn-sm"
                              >
                                {t("adminVerifications.reject")}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === v.id && (
                      <tr className="border-b border-gray-50 bg-[var(--blue-50)]/30">
                        <td colSpan={5} className="p-4">
                          <p className="text-[12px] font-bold text-[var(--sub)] mb-3">{t("verification.documents")}</p>
                          {v.rejectionReason && (
                            <p className="text-[12px] text-[var(--danger)] mb-3">
                              {t("verification.rejectionReason")}: {v.rejectionReason}
                            </p>
                          )}
                          {v.documents.length === 0 ? (
                            <p className="text-[12px] text-[var(--sub)]">{t("verification.emptyDocuments")}</p>
                          ) : (
                            <div className="space-y-2">
                              {v.documents.map((doc) => (
                                <div key={doc.id} className="flex items-center gap-2 flex-wrap bg-white border border-gray-200 rounded-lg px-3 py-2">
                                  <button
                                    type="button"
                                    onClick={() => handleViewDocument(doc)}
                                    disabled={viewingId === doc.id}
                                    className="text-[12px] font-medium text-[var(--blue)] hover:underline"
                                  >
                                    {viewingId === doc.id ? t("common.loading") : docTypeLabel(doc.documentType)}
                                  </button>
                                  <span className={`badge ${doc.status === "Approved" ? "badge--green" : doc.status === "Rejected" ? "badge--red" : "badge--yellow"}`}>
                                    {docStatusLabel(doc.status)}
                                  </span>
                                  {doc.status === "Rejected" && doc.rejectReason && (
                                    <span className="text-[11px] text-[var(--danger)]">{t("adminVerifications.docRejectReason")}: {doc.rejectReason}</span>
                                  )}
                                  {doc.reviewedByName && (
                                    <span className="text-[11px] text-[var(--sub)]">
                                      {doc.reviewedByName}{doc.reviewedAt ? ` • ${new Date(doc.reviewedAt).toLocaleDateString()}` : ""}
                                    </span>
                                  )}
                                  {v.status === "Pending" && doc.status === "Pending" && (
                                    <>
                                      {docRejectNote?.documentId === doc.id && (
                                        <input
                                          type="text"
                                          value={docRejectNote.note}
                                          onChange={(e) => setDocRejectNote({ verificationId: v.id, documentId: doc.id, note: e.target.value })}
                                          placeholder={t("adminVerifications.reasonPlaceholder")}
                                          className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] w-40"
                                        />
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleDocReview(v, doc, true)}
                                        disabled={processingId === doc.id}
                                        className="btn btn-outline btn-sm"
                                      >
                                        {t("adminVerifications.docApprove")}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDocReview(v, doc, false)}
                                        disabled={processingId === doc.id}
                                        className="btn btn-outline btn-sm text-red-500"
                                      >
                                        {t("adminVerifications.docReject")}
                                      </button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {v.status === "Pending" && (
                            <div className="mt-3 flex items-center gap-2 w-full">
                              {rejectNote?.id === v.id && (
                                <input
                                  type="text"
                                  value={rejectNote.note}
                                  onChange={(e) => setRejectNote({ id: v.id, note: e.target.value })}
                                  placeholder={t("adminVerifications.reasonPlaceholder")}
                                  className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] flex-1"
                                />
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {rows.map((v) => (
              <div key={v.id} className="card p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("adminVerifications.store")}</p>
                    <p className="font-bold text-[var(--ink)]">{v.storeName}</p>
                    <p className="text-[11px] text-[var(--sub)]" dir="ltr">/{v.storeSlug}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("adminVerifications.owner")}</p>
                    <p className="font-bold text-[var(--ink)]">{v.ownerName}</p>
                    <p className="text-[11px] text-[var(--sub)]" dir="ltr">{v.ownerEmail}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("adminVerifications.status")}</p>
                    <span className={`badge ${statusBadge(v.status)}`}>{statusLabel(v.status)}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("adminVerifications.date")}</p>
                    <p className="text-[var(--sub)]">
                      {v.submittedAt ? new Date(v.submittedAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                    className="btn btn-outline btn-sm"
                  >
                    {t("adminVerifications.view")}
                  </button>
                  {v.status === "Pending" && (
                    <>
                      {rejectNote?.id === v.id && (
                        <input
                          type="text"
                          value={rejectNote.note}
                          onChange={(e) => setRejectNote({ id: v.id, note: e.target.value })}
                          placeholder={t("adminVerifications.reasonPlaceholder")}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] w-full sm:w-40"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleReview(v, true)}
                        disabled={processingId === v.id}
                        className="btn btn-outline btn-sm"
                      >
                        {t("adminVerifications.approve")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(v, false)}
                        disabled={processingId === v.id}
                        className="btn btn-outline btn-sm"
                      >
                        {t("adminVerifications.reject")}
                      </button>
                    </>
                  )}
                </div>
                {expandedId === v.id && (
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <p className="text-[12px] font-bold text-[var(--sub)]">{t("verification.documents")}</p>
                    {v.rejectionReason && (
                      <p className="text-[12px] text-[var(--danger)]">
                        {t("verification.rejectionReason")}: {v.rejectionReason}
                      </p>
                    )}
                    {v.documents.length === 0 ? (
                      <p className="text-[12px] text-[var(--sub)]">{t("verification.emptyDocuments")}</p>
                    ) : (
                      <div className="space-y-2">
                        {v.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-2 flex-wrap bg-white border border-gray-200 rounded-lg px-3 py-2">
                            <button
                              type="button"
                              onClick={() => handleViewDocument(doc)}
                              disabled={viewingId === doc.id}
                              className="text-[12px] font-medium text-[var(--blue)] hover:underline"
                            >
                              {viewingId === doc.id ? t("common.loading") : docTypeLabel(doc.documentType)}
                            </button>
                            <span className={`badge ${doc.status === "Approved" ? "badge--green" : doc.status === "Rejected" ? "badge--red" : "badge--yellow"}`}>
                              {docStatusLabel(doc.status)}
                            </span>
                            {doc.status === "Rejected" && doc.rejectReason && (
                              <span className="text-[11px] text-[var(--danger)]">{t("adminVerifications.docRejectReason")}: {doc.rejectReason}</span>
                            )}
                            {doc.reviewedByName && (
                              <span className="text-[11px] text-[var(--sub)]">
                                {doc.reviewedByName}{doc.reviewedAt ? ` • ${new Date(doc.reviewedAt).toLocaleDateString()}` : ""}
                              </span>
                            )}
                            {v.status === "Pending" && doc.status === "Pending" && (
                              <>
                                {docRejectNote?.documentId === doc.id && (
                                  <input
                                    type="text"
                                    value={docRejectNote.note}
                                    onChange={(e) => setDocRejectNote({ verificationId: v.id, documentId: doc.id, note: e.target.value })}
                                    placeholder={t("adminVerifications.reasonPlaceholder")}
                                    className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] w-full sm:w-40"
                                  />
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDocReview(v, doc, true)}
                                  disabled={processingId === doc.id}
                                  className="btn btn-outline btn-sm"
                                >
                                  {t("adminVerifications.docApprove")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDocReview(v, doc, false)}
                                  disabled={processingId === doc.id}
                                  className="btn btn-outline btn-sm text-red-500"
                                >
                                  {t("adminVerifications.docReject")}
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {v.status === "Pending" && (
                      <div className="flex items-center gap-2 w-full">
                        {rejectNote?.id === v.id && (
                          <input
                            type="text"
                            value={rejectNote.note}
                            onChange={(e) => setRejectNote({ id: v.id, note: e.target.value })}
                            placeholder={t("adminVerifications.reasonPlaceholder")}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] flex-1"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
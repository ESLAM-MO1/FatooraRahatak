"use client";

import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { useConfirm } from "@/components/ConfirmDialog";

interface AdminMerchantAccount {
  id: number;
  storeId: number;
  storeName: string;
  storeSlug: string;
  ownerName: string;
  ownerEmail: string;
  brandName: string;
  websiteUrl: string;
  logoPath: string | null;
  legalName: string;
  licenseType: string;
  licenseNumber: string;
  ownerFirstName: string;
  ownerMiddleName: string | null;
  ownerLastName: string;
  ownerCountryCode: string;
  ownerPhone: string;
  addressCountry: string;
  addressCity: string;
  birthDate: string | null;
  nationalIdNumber: string | null;
  status: string;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
}

type Filter = "all" | "NotSubmitted" | "Pending" | "Approved" | "Rejected";

export default function AdminMerchantAccountsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<AdminMerchantAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState<{ id: number; note: string } | null>(null);

  const load = async (f: Filter = filter) => {
    setLoading(true);
    setError("");
    try {
      const params = f === "all" ? "" : `?status=${f}`;
      const res = await api.get(`/admin/merchant-accounts${params}`);
      setRows(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("adminMerchantAccounts.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusBadge = (status: string) =>
    status === "Approved" ? "badge--green" : status === "Rejected" ? "badge--red" : status === "Pending" ? "badge--yellow" : "badge--blue";

  const statusLabel = (status: string) =>
    status === "Approved" ? t("adminMerchantAccounts.statusApproved")
      : status === "Rejected" ? t("adminMerchantAccounts.statusRejected")
      : status === "Pending" ? t("adminMerchantAccounts.statusPending")
      : t("adminMerchantAccounts.statusNotSubmitted");

  const handleReview = async (v: AdminMerchantAccount, approve: boolean) => {
    let rejectionReason: string | undefined;
    if (!approve) {
      if (rejectNote?.id !== v.id) {
        setRejectNote({ id: v.id, note: "" });
        return;
      }
      rejectionReason = rejectNote.note.trim() || undefined;
    }
    const ok = await confirm({
      title: approve ? t("adminMerchantAccounts.approve") : t("adminMerchantAccounts.reject"),
      message: `${v.storeName} — ${v.ownerName}`,
      confirmLabel: t("common.confirm"),
      danger: !approve,
    });
    if (!ok) return;
    setProcessingId(v.id);
    setError("");
    setSuccess("");
    try {
      await api.put(`/admin/merchant-accounts/${v.id}/review`, { approve, rejectionReason });
      setSuccess(approve ? t("adminMerchantAccounts.approved") : t("adminMerchantAccounts.rejected"));
      setRejectNote(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("adminMerchantAccounts.actionError"));
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && rows.length === 0) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader icon="store" title={t("adminMerchantAccounts.title")}>
        <p className="text-[12px] text-[var(--sub)]">{t("adminMerchantAccounts.subtitle")}</p>
      </PageHeader>

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
            {f === "all" ? t("adminMerchantAccounts.filterAll") : t(`adminMerchantAccounts.filter${f}`)}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card p-6">
          <p className="text-[13px] text-[var(--sub)]">{t("adminMerchantAccounts.empty")}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-right p-3 text-[var(--sub)]">{t("adminMerchantAccounts.store")}</th>
                  <th className="text-right p-3 text-[var(--sub)]">{t("adminMerchantAccounts.owner")}</th>
                  <th className="text-right p-3 text-[var(--sub)]">{t("adminMerchantAccounts.status")}</th>
                  <th className="text-right p-3 text-[var(--sub)]">{t("adminMerchantAccounts.date")}</th>
                  <th className="text-right p-3 text-[var(--sub)]">{t("adminMerchantAccounts.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <Fragment key={v.id}>
                    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-[var(--ink)]">{v.brandName || v.storeName}</p>
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
                            {t("adminMerchantAccounts.view")}
                          </button>
                          {v.status === "Pending" && (
                            <>
                              {rejectNote?.id === v.id && (
                                <input
                                  type="text"
                                  value={rejectNote.note}
                                  onChange={(e) => setRejectNote({ id: v.id, note: e.target.value })}
                                  placeholder={t("adminMerchantAccounts.reasonPlaceholder")}
                                  className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] w-36"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => handleReview(v, true)}
                                disabled={processingId === v.id}
                                className="btn btn-outline btn-sm"
                              >
                                {t("adminMerchantAccounts.approve")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReview(v, false)}
                                disabled={processingId === v.id}
                                className="btn btn-outline btn-sm"
                              >
                                {t("adminMerchantAccounts.reject")}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === v.id && (
                      <tr className="border-b border-gray-50 bg-[var(--blue-50)]/30">
                        <td colSpan={5} className="p-4">
                          {v.rejectionReason && (
                            <p className="text-[12px] text-[var(--danger)] mb-3">
                              {t("adminMerchantAccounts.rejectionReason")}: {v.rejectionReason}
                            </p>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
                            <div className="space-y-2">
                              <p className="font-bold text-[var(--sub)]">{t("adminMerchantAccounts.sectionBrand")}</p>
                              {v.logoPath && (
                                <img
                                  src={v.logoPath}
                                  alt={v.brandName}
                                  className="w-16 h-16 object-contain border border-gray-200 rounded-lg bg-white p-1"
                                />
                              )}
                              <p className="text-[var(--ink)]">{v.brandName}</p>
                              <p className="text-[var(--sub)] break-all" dir="ltr">{v.websiteUrl || "—"}</p>
                              <p className="text-[var(--ink)]">{v.legalName}</p>
                              <p className="text-[var(--sub)]">{v.licenseType} — {v.licenseNumber}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="font-bold text-[var(--sub)]">{t("adminMerchantAccounts.sectionOwner")}</p>
                              <p className="text-[var(--ink)]">{v.ownerFirstName} {v.ownerMiddleName || ""} {v.ownerLastName}</p>
                              <p className="text-[var(--sub)]" dir="ltr">+{v.ownerCountryCode} {v.ownerPhone}</p>
                              {v.birthDate && <p className="text-[var(--sub)]">{new Date(v.birthDate).toLocaleDateString()}</p>}
                              {v.nationalIdNumber && <p className="text-[var(--sub)]" dir="ltr">{v.nationalIdNumber}</p>}
                            </div>
                            <div className="space-y-2">
                              <p className="font-bold text-[var(--sub)]">{t("adminMerchantAccounts.sectionAddress")}</p>
                              <p className="text-[var(--ink)]">{v.addressCountry} — {v.addressCity}</p>
                              {v.reviewedAt && (
                                <p className="text-[var(--sub)]">
                                  {t("adminMerchantAccounts.reviewedAt")}: {new Date(v.reviewedAt).toLocaleDateString()}
                                  {v.reviewedByName ? ` (${v.reviewedByName})` : ""}
                                </p>
                              )}
                            </div>
                          </div>
                          {v.status === "Pending" && (
                            <div className="mt-3 flex items-center gap-2 w-full">
                              {rejectNote?.id === v.id && (
                                <input
                                  type="text"
                                  value={rejectNote.note}
                                  onChange={(e) => setRejectNote({ id: v.id, note: e.target.value })}
                                  placeholder={t("adminMerchantAccounts.reasonPlaceholder")}
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
        </div>
      )}
    </div>
  );
}

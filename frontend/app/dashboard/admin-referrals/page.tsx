"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { useConfirm } from "@/components/ConfirmDialog";

interface AdminReferral {
  id: number;
  referrerName: string;
  referrerEmail: string;
  referredName: string;
  referredEmail: string;
  referredAt: string;
  hasConverted: boolean;
  convertedAt: string | null;
  status: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  adminNote: string | null;
}

interface AdminCommission {
  id: number;
  referrerName: string;
  referrerEmail: string;
  amount: number;
  currency: string;
  rate: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

export default function AdminReferralsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [tab, setTab] = useState<"referrals" | "commissions">("referrals");
  const [refFilter, setRefFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [commFilter, setCommFilter] = useState<"all" | "paid" | "pending" | "rejected">("all");
  const [referrals, setReferrals] = useState<AdminReferral[]>([]);
  const [commissions, setCommissions] = useState<AdminCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [refNote, setRefNote] = useState<{ id: number; note: string; approve: boolean } | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [rateEdits, setRateEdits] = useState<Record<number, string>>({});
  const [rateSavingId, setRateSavingId] = useState<number | null>(null);
  const [globalRate, setGlobalRate] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const buildParams = (filter: string, extra = "") => {
    const p = new URLSearchParams();
    if (filter !== "all") p.set("status", filter);
    if (fromDate) p.set("from", `${fromDate}T00:00:00`);
    if (toDate) p.set("to", `${toDate}T23:59:59`);
    if (search.trim()) p.set("search", search.trim());
    const q = p.toString();
    return q ? `?${q}${extra}` : extra;
  };

  const loadReferrals = async (filter: string) => {
    try {
      const res = await api.get(`/admin/referrals${buildParams(filter)}`);
      setReferrals(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("adminReferrals.loadError"));
    }
  };

  const loadCommissions = async (filter: string) => {
    try {
      const params = filter === "all" ? "" : `?status=${filter}`;
      const res = await api.get(`/admin/referrals/commissions${params}`);
      setCommissions(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("adminReferrals.loadError"));
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.get("/admin/referrals/settings");
      setGlobalRate(String(res.data.data?.defaultCommissionRate ?? ""));
    } catch {}
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    setSuccess("");
    Promise.all([loadReferrals(refFilter), loadCommissions(commFilter), loadSettings()]).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadReferrals(refFilter); }, [refFilter, fromDate, toDate, search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadCommissions(commFilter); }, [commFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReviewReferral = async (r: AdminReferral, approve: boolean) => {
    if (r.status === "Approved" || r.status === "Rejected") return;
    let note: string | undefined;
    if (!approve) {
      if (refNote?.id !== r.id || refNote.approve !== false) {
        setRefNote({ id: r.id, note: "", approve: false });
        return;
      }
      note = refNote.note.trim() || undefined;
    }
    const ok = await confirm({
      title: approve ? t("adminReferrals.approveReferral") : t("adminReferrals.rejectReferral"),
      message: `${r.referrerName} ← ${r.referredName}`,
      confirmLabel: t("common.confirm"),
      danger: !approve,
    });
    if (!ok) return;
    setProcessingId(r.id);
    setError("");
    setSuccess("");
    try {
      await api.put(`/admin/referrals/${r.id}/review`, { approve, note });
      setSuccess(approve ? t("adminReferrals.referralApproved") : t("adminReferrals.referralRejected"));
      setRefNote(null);
      await loadReferrals(refFilter);
    } catch (err: any) {
      setError(err.response?.data?.message || t("adminReferrals.actionError"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateRate = async (c: AdminCommission) => {
    const val = parseFloat(rateEdits[c.id]);
    if (isNaN(val)) return;
    setRateSavingId(c.id);
    setError("");
    try {
      await api.put(`/admin/referrals/commissions/${c.id}/rate`, { rate: val });
      setSuccess(t("adminReferrals.rateUpdated"));
      await loadCommissions(commFilter);
    } catch (err: any) {
      setError(err.response?.data?.message || t("adminReferrals.actionError"));
    } finally {
      setRateSavingId(null);
    }
  };

  const handleSaveSettings = async () => {
    const val = parseFloat(globalRate);
    if (isNaN(val) || val < 0 || val > 100) {
      setError(t("adminReferrals.rateInvalid"));
      return;
    }
    setSavingSettings(true);
    setError("");
    try {
      await api.put("/admin/referrals/settings", { defaultCommissionRate: val });
      setSuccess(t("adminReferrals.settingsSaved"));
    } catch (err: any) {
      setError(err.response?.data?.message || t("adminReferrals.actionError"));
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) return <LoadingState />;

  const referralBadge = (status: string) => {
    if (status === "Approved") return <span className="badge badge--green">{t("adminReferrals.statusApproved")}</span>;
    if (status === "Rejected") return <span className="badge badge--red">{t("adminReferrals.statusRejected")}</span>;
    return <span className="badge badge--yellow">{t("adminReferrals.statusPendingBadge")}</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader icon="share" title={t("adminReferrals.title")} />

      {error && <div className="alert alert--danger">{error}</div>}
      <SuccessToast message={success} fixed className="mb-4" />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("referrals")}
          className={`btn btn-sm ${tab === "referrals" ? "btn-primary" : "btn-outline"}`}
        >
          {t("adminReferrals.tabReferrals")}
        </button>
        <button
          type="button"
          onClick={() => setTab("commissions")}
          className={`btn btn-sm ${tab === "commissions" ? "btn-primary" : "btn-outline"}`}
        >
          {t("adminReferrals.tabCommissions")}
        </button>
      </div>

      <div className="card p-5 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label>{t("adminReferrals.defaultRateLabel")}</label>
          <div className="field-shell">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={globalRate}
              onChange={(e) => setGlobalRate(e.target.value)}
              placeholder="%"
            />
          </div>
        </div>
        <button type="button" onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary btn-sm">
          {savingSettings ? t("common.loading") : t("adminReferrals.saveSettings")}
        </button>
      </div>

      {tab === "referrals" ? (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {(["all", "pending", "approved", "rejected"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setRefFilter(f)}
                className={`text-[11.5px] font-bold px-3 py-1.5 rounded-lg transition-colors ${refFilter === f ? "bg-[var(--blue)] text-white" : "bg-gray-100 text-[var(--sub)] hover:bg-gray-200"}`}
              >
                {t(`adminReferrals.filter${f.charAt(0).toUpperCase()}${f.slice(1)}`)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label>{t("adminReferrals.filterSearch")}</label>
              <div className="field-shell">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("adminReferrals.searchPlaceholder")}
                />
              </div>
            </div>
            <div>
              <label>{t("adminReferrals.filterFrom")}</label>
              <div className="field-shell">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label>{t("adminReferrals.filterTo")}</label>
              <div className="field-shell">
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
          </div>

          {referrals.length === 0 ? (
            <p className="text-[13px] text-[var(--sub)]">{t("adminReferrals.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full text-[13px] hidden md:table">
                <thead>
                  <tr>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.referrer")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.referred")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.date")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.status")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.adminNote")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]"></th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => {
                    const editable = r.status === "Pending";
                    return (
                      <tr key={r.id} className="border-b border-gray-50">
                        <td className="p-3">
                          <p className="font-bold text-[var(--ink)]">{r.referrerName}</p>
                          <p className="text-[11px] text-[var(--sub)]" dir="ltr">{r.referrerEmail}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-[var(--ink)]">{r.referredName}</p>
                          <p className="text-[11px] text-[var(--sub)]" dir="ltr">{r.referredEmail}</p>
                        </td>
                        <td className="p-3 text-[var(--sub)]">{new Date(r.referredAt).toLocaleDateString()}</td>
                        <td className="p-3">
                          {referralBadge(r.status)}
                          {r.status === "Approved" && r.hasConverted && (
                            <span className="block text-[10.5px] text-[var(--sub)] mt-1">{t("adminReferrals.convertedTag")}</span>
                          )}
                          {r.reviewedByName && (
                            <span className="block text-[10.5px] text-[var(--sub)] mt-1">
                              {t("adminReferrals.reviewedBy")}: {r.reviewedByName}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-[var(--sub)] text-[12px]">{r.adminNote || "—"}</td>
                        <td className="p-3">
                          {editable && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {refNote?.id === r.id && !refNote.approve && (
                                <input
                                  type="text"
                                  value={refNote.note}
                                  onChange={(e) => setRefNote({ id: r.id, note: e.target.value, approve: false })}
                                  placeholder={t("adminReferrals.noteLabel")}
                                  className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] w-40"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => handleReviewReferral(r, true)}
                                disabled={processingId === r.id}
                                className="btn btn-outline btn-sm"
                              >
                                {t("adminReferrals.approveReferral")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewReferral(r, false)}
                                disabled={processingId === r.id}
                                className="btn btn-outline btn-sm"
                              >
                                {t("adminReferrals.rejectReferral")}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="md:hidden space-y-3">
                {referrals.map((r) => {
                  const editable = r.status === "Pending";
                  return (
                    <div key={r.id} className="card p-4 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-[12px]">
                        <div>
                          <p className="text-[11px] font-bold text-[var(--sub)]">{t("adminReferrals.referrer")}</p>
                          <p className="font-bold text-[var(--ink)]">{r.referrerName}</p>
                          <p className="text-[11px] text-[var(--sub)]" dir="ltr">{r.referrerEmail}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[var(--sub)]">{t("adminReferrals.referred")}</p>
                          <p className="font-bold text-[var(--ink)]">{r.referredName}</p>
                          <p className="text-[11px] text-[var(--sub)]" dir="ltr">{r.referredEmail}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[var(--sub)]">{t("adminReferrals.date")}</p>
                          <p className="text-[var(--sub)]">{new Date(r.referredAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[var(--sub)]">{t("adminReferrals.status")}</p>
                          {referralBadge(r.status)}
                          {r.status === "Approved" && r.hasConverted && (
                            <span className="block text-[10.5px] text-[var(--sub)] mt-1">{t("adminReferrals.convertedTag")}</span>
                          )}
                          {r.reviewedByName && (
                            <span className="block text-[10.5px] text-[var(--sub)] mt-1">
                              {t("adminReferrals.reviewedBy")}: {r.reviewedByName}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[var(--sub)]">{t("adminReferrals.adminNote")}</p>
                          <p className="text-[var(--sub)] text-[12px]">{r.adminNote || "—"}</p>
                        </div>
                      </div>
                      {editable && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                          {refNote?.id === r.id && !refNote.approve && (
                            <input
                              type="text"
                              value={refNote.note}
                              onChange={(e) => setRefNote({ id: r.id, note: e.target.value, approve: false })}
                              placeholder={t("adminReferrals.noteLabel")}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] w-full sm:w-40"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleReviewReferral(r, true)}
                            disabled={processingId === r.id}
                            className="btn btn-outline btn-sm"
                          >
                            {t("adminReferrals.approveReferral")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewReferral(r, false)}
                            disabled={processingId === r.id}
                            className="btn btn-outline btn-sm"
                          >
                            {t("adminReferrals.rejectReferral")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : tab === "commissions" ? (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            {(["all", "paid", "pending", "rejected"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setCommFilter(f)}
                className={`text-[11.5px] font-bold px-3 py-1.5 rounded-lg transition-colors ${commFilter === f ? "bg-[var(--blue)] text-white" : "bg-gray-100 text-[var(--sub)] hover:bg-gray-200"}`}
              >
                {t(`adminReferrals.filter${f.charAt(0).toUpperCase()}${f.slice(1)}`)}
              </button>
            ))}
          </div>

          {commissions.length === 0 ? (
            <p className="text-[13px] text-[var(--sub)]">{t("adminReferrals.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full text-[13px] hidden md:table">
                <thead>
                  <tr>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.referrer")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.commissionAmount")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.commissionRate")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.date")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.commissionStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="p-3">
                        <p className="font-bold text-[var(--ink)]">{c.referrerName}</p>
                        <p className="text-[11px] text-[var(--sub)]" dir="ltr">{c.referrerEmail}</p>
                      </td>
                      <td className="p-3 font-bold text-[var(--ink)]">{c.amount.toFixed(2)} {c.currency}</td>
                      <td className="p-3 text-[var(--sub)]">
                        {c.status === "Pending" ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={rateEdits[c.id] ?? String(c.rate)}
                              onChange={(e) => setRateEdits({ ...rateEdits, [c.id]: e.target.value })}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] w-20"
                              dir="ltr"
                            />
                            <span>%</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateRate(c)}
                              disabled={rateSavingId === c.id}
                              className="btn btn-outline btn-sm"
                            >
                              {t("adminReferrals.saveRate")}
                            </button>
                          </div>
                        ) : (
                          `${c.rate}%`
                        )}
                      </td>
                      <td className="p-3 text-[var(--sub)]">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        {c.status === "Paid" ? (
                          <span className="badge badge--green">{t("referrals.commissionPaid")}</span>
                        ) : c.status === "Rejected" ? (
                          <span className="badge badge--red">{t("referrals.commissionRejected")}</span>
                        ) : (
                          <span className="badge badge--yellow">{t("referrals.commissionPending")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="md:hidden space-y-3">
                {commissions.map((c) => (
                  <div key={c.id} className="card p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div>
                        <p className="text-[11px] font-bold text-[var(--sub)]">{t("adminReferrals.referrer")}</p>
                        <p className="font-bold text-[var(--ink)]">{c.referrerName}</p>
                        <p className="text-[11px] text-[var(--sub)]" dir="ltr">{c.referrerEmail}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[var(--sub)]">{t("adminReferrals.commissionAmount")}</p>
                        <p className="font-bold text-[var(--ink)]">{c.amount.toFixed(2)} {c.currency}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[var(--sub)]">{t("adminReferrals.commissionRate")}</p>
                        {c.status === "Pending" ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={rateEdits[c.id] ?? String(c.rate)}
                              onChange={(e) => setRateEdits({ ...rateEdits, [c.id]: e.target.value })}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] w-20"
                              dir="ltr"
                            />
                            <span>%</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateRate(c)}
                              disabled={rateSavingId === c.id}
                              className="btn btn-outline btn-sm"
                            >
                              {t("adminReferrals.saveRate")}
                            </button>
                          </div>
                        ) : (
                          <p className="text-[var(--sub)]">{`${c.rate}%`}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[var(--sub)]">{t("adminReferrals.date")}</p>
                        <p className="text-[var(--sub)]">{new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[var(--sub)]">{t("adminReferrals.commissionStatus")}</p>
                        {c.status === "Paid" ? (
                          <span className="badge badge--green">{t("referrals.commissionPaid")}</span>
                        ) : c.status === "Rejected" ? (
                          <span className="badge badge--red">{t("referrals.commissionRejected")}</span>
                        ) : (
                          <span className="badge badge--yellow">{t("referrals.commissionPending")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
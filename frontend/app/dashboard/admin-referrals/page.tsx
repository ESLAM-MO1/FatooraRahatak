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
  const [refFilter, setRefFilter] = useState<"all" | "converted" | "registered">("all");
  const [commFilter, setCommFilter] = useState<"all" | "paid" | "pending">("all");
  const [referrals, setReferrals] = useState<AdminReferral[]>([]);
  const [commissions, setCommissions] = useState<AdminCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [markingId, setMarkingId] = useState<number | null>(null);

  const loadReferrals = async (filter: "all" | "converted" | "registered") => {
    try {
      const params = filter === "all" ? "" : `?status=${filter}`;
      const res = await api.get(`/admin/referrals${params}`);
      setReferrals(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("adminReferrals.loadError"));
    }
  };

  const loadCommissions = async (filter: "all" | "paid" | "pending") => {
    try {
      const params = filter === "all" ? "" : `?status=${filter}`;
      const res = await api.get(`/admin/referrals/commissions${params}`);
      setCommissions(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("adminReferrals.loadError"));
    }
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    setSuccess("");
    Promise.all([loadReferrals(refFilter), loadCommissions(commFilter)]).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadReferrals(refFilter); }, [refFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadCommissions(commFilter); }, [commFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkPaid = async (commission: AdminCommission) => {
    const ok = await confirm({
      title: t("adminReferrals.markPaid"),
      message: `${commission.referrerName} - ${commission.amount.toFixed(2)} ${commission.currency}`,
      confirmLabel: t("common.confirm"),
    });
    if (!ok) return;
    setMarkingId(commission.id);
    setError("");
    setSuccess("");
    try {
      await api.put(`/admin/referrals/commissions/${commission.id}/paid`);
      setSuccess(t("adminReferrals.markedPaid"));
      await loadCommissions(commFilter);
    } catch (err: any) {
      setError(err.response?.data?.message || t("adminReferrals.actionError"));
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) return <LoadingState />;

  const badgeFor = (val: boolean | string, good: string, bad: string, goodCls: string, badCls: string) => {
    const isGood = typeof val === "string" ? val === good : val;
    return <span className={`badge ${isGood ? goodCls : badCls}`}>{isGood ? good : bad}</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader icon="share" title={t("adminReferrals.title")}>
        <p className="text-[12px] text-[var(--sub)]">{t("adminReferrals.subtitle")}</p>
      </PageHeader>

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

      {tab === "referrals" ? (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            {(["all", "converted", "registered"] as const).map((f) => (
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

          {referrals.length === 0 ? (
            <p className="text-[13px] text-[var(--sub)]">{t("adminReferrals.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full text-[13px]">
                <thead>
                  <tr>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.referrer")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.referred")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.date")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
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
                        {badgeFor(r.hasConverted, t("referrals.statusConverted"), t("referrals.statusRegistered"), "badge--green", "badge--blue")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            {(["all", "paid", "pending"] as const).map((f) => (
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
              <table className="data-table w-full text-[13px]">
                <thead>
                  <tr>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.referrer")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.commissionAmount")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.commissionRate")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.date")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]">{t("adminReferrals.commissionStatus")}</th>
                    <th className="text-right p-3 border-b border-gray-100 text-[var(--sub)]"></th>
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
                      <td className="p-3 text-[var(--sub)]">{c.rate}%</td>
                      <td className="p-3 text-[var(--sub)]">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        {badgeFor(c.status, "Paid", "Pending", "badge--green", "badge--yellow")}
                      </td>
                      <td className="p-3">
                        {c.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(c)}
                            disabled={markingId === c.id}
                            className="btn btn-outline btn-sm"
                          >
                            {t("adminReferrals.markPaid")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

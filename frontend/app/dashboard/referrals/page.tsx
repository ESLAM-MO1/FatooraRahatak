"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { usePackageFeature } from "@/lib/usePackageFeatures";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import RestrictedFeatureState from "@/components/RestrictedFeatureState";
import Icon from "@/components/Icon";

interface MyReferral {
  id: number;
  referredUserName: string;
  referredAt: string;
  status: string;
}

interface MyCommission {
  id: number;
  amount: number;
  currency: string;
  rate: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

interface MyWithdrawal {
  id: number;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
  adminNote: string | null;
}

interface Overview {
  code: string;
  balance: number;
  totalReferrals: number;
  convertedReferrals: number;
  totalCommissions: number;
  pendingCommissions: number;
  referrals: MyReferral[];
  commissions: MyCommission[];
}

const REGISTER_BASE_URL = process.env.NEXT_PUBLIC_REGISTER_URL || "http://localhost:3000";

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: string; accent: string }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div style={{ width: 42, height: 42, borderRadius: 12, background: accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
        <Icon name={icon as any} size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] text-[var(--sub)] font-bold">{label}</p>
        <p className="text-[20px] font-extrabold text-[var(--ink)]">{value}</p>
      </div>
    </div>
  );
}

const withdrawalBadge = (status: string) =>
  status === "Paid" ? "badge--green" : status === "Rejected" ? "badge--red" : "badge--yellow";

export default function ReferralsPage() {
  const { t } = useTranslation();
  const gate = usePackageFeature("hasAffiliateMarketing");
  const [data, setData] = useState<Overview | null>(null);
  const [withdrawals, setWithdrawals] = useState<MyWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/referrals/my");
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("referrals.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const res = await api.get("/referrals/withdrawals");
      setWithdrawals(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || t("referrals.loadError"));
    }
  };

  useEffect(() => {
    if (!gate.ready || !gate.allowed) return;
    loadData();
    loadWithdrawals();
  }, [gate.ready, gate.allowed]); // eslint-disable-line react-hooks/exhaustive-deps

  const referralLink = data ? `${REGISTER_BASE_URL}/register?ref=${data.code}` : "";

  const copyText = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {
      setError(t("referrals.loadError"));
    }
  };

  const submitWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || (data && amount > data.balance)) {
      setError(t("referrals.invalidAmount"));
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/referrals/withdrawals", { amount });
      setWithdrawOpen(false);
      setWithdrawAmount("");
      setSuccess(t("referrals.withdrawSuccess"));
      await Promise.all([loadData(), loadWithdrawals()]);
    } catch (err: any) {
      setError(err.response?.data?.message || t("referrals.actionError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!gate.ready) return <LoadingState />;

  if (!gate.allowed) return <RestrictedFeatureState />;

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader icon="share" title={t("referrals.title")}>
        <p className="text-[12px] text-[var(--sub)]">{t("referrals.subtitle")}</p>
      </PageHeader>

      {error && <div className="alert alert--danger">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      {data && (
        <>
          <div className="card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[12px] font-bold text-[var(--sub)] mb-2">{t("referrals.myCode")}</p>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-100 rounded-xl px-4 py-2.5 text-[16px] font-extrabold tracking-widest text-[var(--blue-deep)] border border-gray-200" dir="ltr">
                    {data.code}
                  </div>
                  <button type="button" onClick={() => copyText(data.code, setCopied)} className="btn btn-outline btn-sm">
                    {copied ? t("referrals.copied") : t("referrals.copy")}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[12px] font-bold text-[var(--sub)] mb-2">{t("referrals.shareLink")}</p>
                <div className="flex items-center gap-2">
                  <div className="field-shell flex-1">
                    <input type="text" value={referralLink} readOnly dir="ltr" className="text-left text-[12px]" />
                  </div>
                  <button type="button" onClick={() => copyText(referralLink, setCopiedLink)} className="btn btn-outline btn-sm shrink-0">
                    {copiedLink ? t("referrals.copied") : t("referrals.copy")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <p className="text-[13px] font-bold text-[var(--ink)] mb-3">{t("referrals.howItWorks")}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="w-7 h-7 rounded-full bg-[var(--blue)] text-white flex items-center justify-center text-[13px] font-bold shrink-0">{step}</div>
                  <p className="text-[12.5px] text-[var(--ink)] font-medium">{t(`referrals.howStep${step}`)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <p className="text-[13px] font-bold text-[var(--ink)]">{t("referrals.stats")}</p>
              {data.balance > 0 && (
                <button type="button" onClick={() => setWithdrawOpen(true)} className="btn btn-primary btn-sm">
                  {t("referrals.withdraw")}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="wallet" label={t("referrals.balance")} value={`${data.balance.toFixed(2)}`} accent="#12A8DB" />
              <StatCard icon="users" label={t("referrals.totalReferrals")} value={String(data.totalReferrals)} accent="#1FB983" />
              <StatCard icon="crown" label={t("referrals.convertedReferrals")} value={String(data.convertedReferrals)} accent="#C9A227" />
              <StatCard icon="clock" label={t("referrals.pendingCommissions")} value={`${data.pendingCommissions.toFixed(2)}`} accent="#F97316" />
            </div>
            <p className="text-[11.5px] text-[var(--sub)] mt-3">{t("referrals.withdrawHint")}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <p className="text-[14px] font-bold text-[var(--ink)] mb-4">{t("referrals.myReferrals")}</p>
              {data.referrals.length === 0 ? (
                <p className="text-[12.5px] text-[var(--sub)]">{t("referrals.emptyReferrals")}</p>
              ) : (
                <div className="space-y-2">
                  {data.referrals.map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                      <div>
                        <p className="text-[13px] font-bold text-[var(--ink)]">{r.referredUserName}</p>
                        <p className="text-[11px] text-[var(--sub)]">{new Date(r.referredAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`badge ${r.status === "Converted" ? "badge--green" : "badge--blue"}`}>
                        {r.status === "Converted" ? t("referrals.statusConverted") : t("referrals.statusRegistered")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-6">
              <p className="text-[14px] font-bold text-[var(--ink)] mb-4">{t("referrals.myCommissions")}</p>
              {data.commissions.length === 0 ? (
                <p className="text-[12.5px] text-[var(--sub)]">{t("referrals.emptyCommissions")}</p>
              ) : (
                <div className="space-y-2">
                  {data.commissions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                      <div>
                        <p className="text-[13px] font-bold text-[var(--ink)]">
                          {c.amount.toFixed(2)} {c.currency}
                        </p>
                        <p className="text-[11px] text-[var(--sub)]">{new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`badge ${c.status === "Paid" ? "badge--green" : "badge--yellow"}`}>
                        {c.status === "Paid" ? t("referrals.commissionPaid") : t("referrals.commissionPending")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <p className="text-[14px] font-bold text-[var(--ink)] mb-4">{t("referrals.myWithdrawals")}</p>
            {withdrawals.length === 0 ? (
              <p className="text-[12.5px] text-[var(--sub)]">{t("referrals.emptyWithdrawals")}</p>
            ) : (
              <div className="space-y-2">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <div>
                      <p className="text-[13px] font-bold text-[var(--ink)]">
                        {w.amount.toFixed(2)} {w.currency}
                      </p>
                      <p className="text-[11px] text-[var(--sub)]">
                        {new Date(w.createdAt).toLocaleDateString()}
                        {w.adminNote ? ` — ${w.adminNote}` : ""}
                      </p>
                    </div>
                    <span className={`badge ${withdrawalBadge(w.status)}`}>
                      {w.status === "Paid" ? t("referrals.withdrawalPaid") : w.status === "Rejected" ? t("referrals.withdrawalRejected") : t("referrals.withdrawalPending")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {withdrawOpen && (
        <div
          className="fixed inset-0 bg-[var(--blue-deep)]/50 flex items-center justify-center z-[100] p-4"
          onClick={() => !submitting && setWithdrawOpen(false)}
        >
          <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()} dir="rtl">
            <h3 className="text-[16px] font-bold text-[var(--blue-deep)] mb-2">{t("referrals.withdrawTitle")}</h3>
            <p className="text-[12.5px] text-[var(--ink)] leading-relaxed mb-4">{t("referrals.withdrawHint")}</p>

            <div className="mb-4">
              <p className="text-[12px] font-bold text-[var(--sub)] mb-1.5">{t("referrals.withdrawAmount")}</p>
              <div className="field-shell">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="text-left"
                  dir="ltr"
                />
                <span className="text-[11px] text-[var(--sub)]">{t("common.sar")}</span>
              </div>
              <p className="text-[11px] text-[var(--sub)] mt-1.5">{t("referrals.balance")}: {data?.balance.toFixed(2)} {t("common.sar")}</p>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setWithdrawOpen(false)} disabled={submitting} className="btn flex-1" style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}>
                {t("common.cancel")}
              </button>
              <button type="button" onClick={submitWithdrawal} disabled={submitting} className="btn btn-primary flex-1">
                {submitting ? t("common.loading") : t("referrals.submitWithdraw")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
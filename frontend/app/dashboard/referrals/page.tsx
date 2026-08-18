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

export default function ReferralsPage() {
  const { t } = useTranslation();
  const gate = usePackageFeature("hasAffiliateMarketing");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  useEffect(() => {
    if (!gate.ready || !gate.allowed) return;
    loadData();
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

  if (!gate.ready) return <LoadingState />;

  if (!gate.allowed) return <RestrictedFeatureState />;

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader icon="share" title={t("referrals.title")}>
        <p className="text-[12px] text-[var(--sub)]">{t("referrals.subtitle")}</p>
      </PageHeader>

      {error && <div className="alert alert--danger">{error}</div>}

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
            <p className="text-[13px] font-bold text-[var(--ink)] mb-3">{t("referrals.stats")}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="wallet" label={t("referrals.balance")} value={`${data.balance.toFixed(2)}`} accent="#12A8DB" />
              <StatCard icon="users" label={t("referrals.totalReferrals")} value={String(data.totalReferrals)} accent="#1FB983" />
              <StatCard icon="crown" label={t("referrals.convertedReferrals")} value={String(data.convertedReferrals)} accent="#C9A227" />
              <StatCard icon="clock" label={t("referrals.pendingCommissions")} value={`${data.pendingCommissions.toFixed(2)}`} accent="#F97316" />
            </div>
            <p className="text-[11.5px] text-[var(--sub)] mt-3">{t("referrals.balanceHint")}</p>
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
        </>
      )}
    </div>
  );
}

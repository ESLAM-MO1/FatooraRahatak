"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import Toast from "@/components/Toast";

interface BankDetails {
  id: number;
  storeId: number;
  bankName: string;
  accountHolderName: string;
  iban: string;
  isActive: boolean;
}

interface Batch {
  id: number;
  batchNumber: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  grossAmount: number;
  commissionAmount: number;
  shippingDeductedAmount: number;
  netAmount: number;
  ordersCount: number;
  completedAt: string | null;
  linesCount: number;
}

interface SettlementSummary {
  pendingNetAmount: number;
  settledNetAmount: number;
  hasBankDetails: boolean;
  bankDetails: BankDetails | null;
  batches: Batch[];
  merchantAccountStatus: string;
  verificationStatus: string;
  isKycApproved: boolean;
}

const SETTLEMENT_STATUS_BADGE: Record<string, string> = {
  Pending: "badge--yellow",
  Processing: "badge--blue",
  Completed: "badge--green",
  Paid: "badge--green",
  Cancelled: "badge--gray",
  Failed: "badge--red",
};

export default function SettlementsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<SettlementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({ bankName: "", accountHolderName: "", iban: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/owner/settlements");
      setData(res.data.data);
      if (res.data.data?.bankDetails) {
        const b = res.data.data.bankDetails;
        setForm({ bankName: b.bankName, accountHolderName: b.accountHolderName, iban: b.iban });
      }
    } catch (e: any) {
      setToast({ type: "error", text: e?.response?.data?.message || t("common.error") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveBank = async () => {
    setSaving(true);
    try {
      const res = await api.put("/owner/settlements/bank-details", form);
      setToast({ type: "success", text: res.data.message || t("common.saved") });
      load();
    } catch (e: any) {
      setToast({ type: "error", text: e?.response?.data?.message || t("common.error") });
    } finally {
      setSaving(false);
    }
  };

  const status = data?.hasBankDetails ? "configured" : "notConfigured";

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader icon="wallet" title={t("nav.settlements")} />
      {toast && <Toast message={toast.text} type={toast.type} onClose={() => setToast(null)} />}

      {data && !data.isKycApproved && (
        <div className="alert alert--warning flex items-center justify-between flex-wrap gap-2">
          <span>{t("settlements.kycRequired")}</span>
          <span className="flex items-center gap-2 flex-wrap">
            <Link href="/dashboard/merchant-account" className="btn btn-outline btn-sm shrink-0">
              {t("settlements.kycLinkAccount")}
            </Link>
            <span className="text-[12px] text-[var(--sub)]">{t("settlements.and")}</span>
            <Link href="/dashboard/merchant-verification" className="btn btn-outline btn-sm shrink-0">
              {t("settlements.kycLinkVerification")}
            </Link>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-[12px] text-[var(--sub)] font-bold">{t("settlements.pending")}</p>
          <p className="text-2xl font-bold text-[var(--ink)] mt-1">{(data?.pendingNetAmount ?? 0).toFixed(2)} ر.س</p>
        </div>
        <div className="card p-5">
          <p className="text-[12px] text-[var(--sub)] font-bold">{t("settlements.settled")}</p>
          <p className="text-2xl font-bold text-[var(--blue)] mt-1">{(data?.settledNetAmount ?? 0).toFixed(2)} ر.س</p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-[var(--ink)]">{t("settlements.bankDetails")}</h2>
          <span className={`badge ${status === "configured" ? "badge--green" : "badge--gray"}`}>
            {t(status === "configured" ? "settlements.bankConfigured" : "settlements.bankNotConfigured")}
          </span>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-[12.5px] text-[var(--sub)]">
          {t("settlements.bankDetailsHint")}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[12px] font-bold text-[var(--sub)]">{t("settlements.bankName")}</label>
            <input
              className="field-input mt-1"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              placeholder={t("settlements.bankNamePlaceholder")}
            />
          </div>
          <div>
            <label className="text-[12px] font-bold text-[var(--sub)]">{t("settlements.accountHolder")}</label>
            <input
              className="field-input mt-1"
              value={form.accountHolderName}
              onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[12px] font-bold text-[var(--sub)]">IBAN</label>
            <input
              className="field-input mt-1"
              dir="ltr"
              value={form.iban}
              onChange={(e) => setForm({ ...form, iban: e.target.value })}
              placeholder="SA0000000000000000000000"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={saveBank} disabled={saving} className="btn-primary">
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-[14px] font-bold text-[var(--ink)]">{t("settlements.history")}</h2>
        </div>
        {(!data?.batches || data.batches.length === 0) ? (
          <div className="px-5 pb-6 text-[12.5px] text-[var(--sub)]">
            <p>{t("settlements.empty")}</p>
            <p className="mt-1">{t("settlements.emptyHint")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-gray-50 text-[var(--sub)]">
                <tr>
                  <th className="text-right p-3 font-bold">{t("settlements.batchNumber")}</th>
                  <th className="text-right p-3 font-bold">{t("settlements.period")}</th>
                  <th className="text-right p-3 font-bold">{t("settlements.gross")}</th>
                  <th className="text-right p-3 font-bold">{t("settlements.commission")}</th>
                  <th className="text-right p-3 font-bold">{t("settlements.net")}</th>
                  <th className="text-right p-3 font-bold">{t("settlements.status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.batches.map((b) => (
                  <tr key={b.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="p-3 text-[var(--ink)] font-medium">{b.batchNumber}</td>
                    <td className="p-3 text-[var(--sub)]" dir="ltr">
                      {new Date(b.periodStart).toLocaleDateString()} — {new Date(b.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-[var(--ink)]">{b.grossAmount.toFixed(2)}</td>
                    <td className="p-3 text-[var(--sub)]">{b.commissionAmount.toFixed(2)}</td>
                    <td className="p-3 font-bold text-[var(--ink)]">{b.netAmount.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`badge ${SETTLEMENT_STATUS_BADGE[b.status] || "badge--gray"}`}>
                        {t(`settlements.status.${b.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
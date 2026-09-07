"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { usePackageFeature } from "@/lib/usePackageFeatures";
import Icon from "@/components/Icon";
import LoadingState from "@/components/LoadingState";
import RestrictedFeatureState from "@/components/RestrictedFeatureState";

interface VoucherDetail {
  id: number;
  voucherType: string;
  voucherNumber: string;
  voucherDate: string;
  amount: number;
  paymentMethod: string;
  counterpartAccountId: number;
  counterpartAccountNameAr: string;
  partyName: string | null;
  customerId: number | null;
  description: string | null;
  journalEntryId: number | null;
  journalEntryNumber: string | null;
}

const paymentLabels: Record<string, string> = {
  Cash: "voucher.paymentCash",
  Bank: "voucher.paymentBank",
  Transfer: "voucher.paymentTransfer",
  Cheque: "voucher.paymentCheque",
  Other: "voucher.paymentOther",
};

export default function VoucherDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id as string;
  const gate = usePackageFeature("hasAccountingFull");

  const [voucher, setVoucher] = useState<VoucherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!gate.ready || !gate.allowed) return;
    let active = true;
    api
      .get(`/vouchers/${id}`)
      .then((res) => {
        if (!active) return;
        setVoucher(res.data.data);
        setError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        const e = err as { response?: { data?: { message?: string } } };
        setError(e.response?.data?.message || t("voucher.loadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, t, gate.ready, gate.allowed]);

  if (!gate.ready) {
    return <LoadingState />;
  }

  if (!gate.allowed) {
    return <RestrictedFeatureState />;
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!voucher) {
    return (
      <div>
        <Link href="/dashboard/accounting/vouchers" className="text-[var(--blue)] hover:underline text-sm">
          {t("voucher.backToList")}
        </Link>
        {error && <div className="alert alert--danger mt-4">{error}</div>}
      </div>
    );
  }

  const isReceipt = voucher.voucherType === "Receipt";

  return (
    <div>
      <div className="mb-4">
        <Link href="/dashboard/accounting/vouchers" className="text-[var(--blue)] hover:underline text-sm">
          {t("voucher.backToList")}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold text-[var(--blue-deep)]" dir="ltr">
            {voucher.voucherNumber}
          </h1>
          <span className={`badge ${isReceipt ? "badge--green" : "badge--red"}`}>
            {isReceipt ? t("voucher.receipt") : t("voucher.payment")}
          </span>
        </div>
        {voucher.journalEntryId && (
          <Link
            href={`/dashboard/accounting/journal-entries/${voucher.journalEntryId}`}
            className="btn btn-outline btn-sm"
          >
            <Icon name="journal" /> {t("voucher.viewJournalEntry")}
          </Link>
        )}
      </div>

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <div className="card p-5 max-w-lg">
        <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-4">{t("voucher.details")}</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <span className="text-[var(--sub)]">{t("voucher.date")}</span>
            <span className="text-[var(--ink)] font-medium" dir="ltr">{voucher.voucherDate}</span>
          </div>
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <span className="text-[var(--sub)]">{t("voucher.paymentMethod")}</span>
            <span className="text-[var(--ink)] font-medium">
              {t(paymentLabels[voucher.paymentMethod] ?? "common.noData")}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <span className="text-[var(--sub)]">{t("voucher.counterpartAccount")}</span>
            <span className="text-[var(--ink)] font-medium">{voucher.counterpartAccountNameAr}</span>
          </div>
          {voucher.partyName && (
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <span className="text-[var(--sub)]">{t("voucher.party")}</span>
              <span className="text-[var(--ink)] font-medium">{voucher.partyName}</span>
            </div>
          )}
          {voucher.description && (
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <span className="text-[var(--sub)]">{t("voucher.description")}</span>
              <span className="text-[var(--ink)] font-medium">{voucher.description}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1.5">
            <span className="text-[var(--sub)]">{t("voucher.amount")}</span>
            <span className="text-[var(--blue-deep)] font-bold text-[18px]" dir="ltr">
              {voucher.amount.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
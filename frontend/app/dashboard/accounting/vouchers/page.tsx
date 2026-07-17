"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

interface Voucher {
  id: number;
  voucherType: string;
  voucherNumber: string;
  voucherDate: string;
  amount: number;
  paymentMethod: string;
  counterpartAccountNameAr: string;
  partyName: string | null;
  description: string | null;
  journalEntryId: number | null;
  journalEntryNumber: string | null;
}

export default function VouchersPage() {
  const { t } = useTranslation();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState<"" | "Receipt" | "Payment">("");

  const fetchData = useCallback(async (type: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/vouchers", { params: type ? { voucherType: type } : {} });
      setVouchers(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("voucher.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData(filterType);
  }, [fetchData, filterType]);

  return (
    <div>
      <PageHeader icon="wallet" title={t("voucher.title")}>
        <Link href="/dashboard/accounting/vouchers/new" className="btn btn-primary">
          <Icon name="plus" />
          {t("voucher.newVoucher")}
        </Link>
      </PageHeader>

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <div className="flex gap-2 mb-4">
        {[
          { value: "", label: t("voucher.all") },
          { value: "Receipt", label: t("voucher.receiptVouchers") },
          { value: "Payment", label: t("voucher.paymentVouchers") },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterType(f.value as any)}
            className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-bold transition-colors ${
              filterType === f.value ? "bg-[var(--blue)] text-white" : "bg-[#F1F2F4] text-[var(--sub)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : vouchers.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("voucher.noVouchers")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("voucher.number")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("voucher.type")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("voucher.date")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("voucher.counterpartAccount")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("voucher.party")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("voucher.amount")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("voucher.relatedEntry")}</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr key={v.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium" dir="ltr">{v.voucherNumber}</td>
                    <td className="p-4">
                      <span className={`badge ${v.voucherType === "Receipt" ? "badge--green" : "badge--red"}`}>
                        {v.voucherType === "Receipt" ? t("voucher.receipt") : t("voucher.payment")}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">{v.voucherDate}</td>
                    <td className="p-4 text-[var(--ink)]">{v.counterpartAccountNameAr}</td>
                    <td className="p-4 text-[var(--sub)]">{v.partyName || "—"}</td>
                    <td className="p-4 text-[var(--ink)] font-medium" dir="ltr">
                      {v.amount.toLocaleString("ar-SA")} ر.س
                    </td>
                    <td className="p-4">
                      {v.journalEntryId ? (
                        <Link
                          href={`/dashboard/accounting/journal-entries/${v.journalEntryId}`}
                          className="text-[var(--blue)] hover:underline text-[12.5px]"
                        >
                          {v.journalEntryNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
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

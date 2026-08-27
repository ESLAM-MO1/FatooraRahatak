"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { usePackageFeature } from "@/lib/usePackageFeatures";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import RestrictedFeatureState from "@/components/RestrictedFeatureState";

interface Account {
  id: number;
  code: string;
  nameAr: string;
  isActive: boolean;
  children: Account[];
}

function flattenLeafAccounts(accounts: Account[], depth = 0): { account: Account; depth: number }[] {
  return accounts.flatMap((a) => {
    const hasChildren = a.children && a.children.length > 0;
    if (hasChildren) return flattenLeafAccounts(a.children, depth + 1);
    return a.isActive ? [{ account: a, depth }] : [];
  });
}

export default function NewVoucherPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const gate = usePackageFeature("hasAccountingFull");
  const [voucherType, setVoucherType] = useState<"receipt" | "payment">("receipt");
  const [accounts, setAccounts] = useState<{ account: Account; depth: number }[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [counterpartAccountId, setCounterpartAccountId] = useState("");
  const [partyName, setPartyName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!gate.ready || !gate.allowed) return;
    api
      .get("/accounts")
      .then((res) => setAccounts(flattenLeafAccounts(res.data.data)))
      .catch(() => setError(t("voucher.loadAccountsError")))
      .finally(() => setLoadingAccounts(false));
  }, [t, gate.ready, gate.allowed]);

  if (!gate.ready) {
    return <LoadingState />;
  }

  if (!gate.allowed) {
    return <RestrictedFeatureState />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!counterpartAccountId) {
      setError(t("voucher.selectCounterpart"));
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError(t("voucher.enterAmount"));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        voucherDate,
        amount: parseFloat(amount),
        paymentMethod,
        counterpartAccountId: Number(counterpartAccountId),
        partyName: partyName || null,
        customerId: null,
        description: description || null,
      };
      const endpoint = voucherType === "receipt" ? "/vouchers/receipt" : "/vouchers/payment";
      const res = await api.post(endpoint, payload);
      router.push(`/dashboard/accounting/vouchers?highlight=${res.data.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || t("voucher.saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader icon="wallet" title={t("voucher.newVoucherTitle")}>
        <Link href="/dashboard/accounting/vouchers" className="btn btn-secondary">
          {t("voucher.cancelAndReturn")}
        </Link>
      </PageHeader>

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setVoucherType("receipt")}
          className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-colors ${
            voucherType === "receipt"
              ? "bg-[var(--green)] text-white"
              : "bg-[#F1F2F4] text-[var(--sub)]"
          }`}
        >
          {t("voucher.receiptVoucher")}
        </button>
        <button
          type="button"
          onClick={() => setVoucherType("payment")}
          className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-colors ${
            voucherType === "payment"
              ? "bg-[var(--danger)] text-white"
              : "bg-[#F1F2F4] text-[var(--sub)]"
          }`}
        >
          {t("voucher.paymentVoucher")}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("voucher.date")}</label>
            <div className="field-shell">
              <input type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("voucher.paymentMethod")}</label>
            <div className="field-shell">
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="Cash">{t("voucher.cash")}</option>
                <option value="Bank">{t("voucher.bank")}</option>
                <option value="Transfer">{t("voucher.transfer")}</option>
                <option value="Cheque">{t("voucher.cheque")}</option>
                <option value="Other">{t("voucher.other")}</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("voucher.amount")}</label>
          <div className="field-shell">
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              dir="ltr"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
            {voucherType === "receipt" ? t("voucher.counterpartReceiptHint") : t("voucher.counterpartPaymentHint")}
          </label>
          <div className="field-shell">
            <select
              value={counterpartAccountId}
              onChange={(e) => setCounterpartAccountId(e.target.value)}
              disabled={loadingAccounts}
              required
            >
              <option value="">{t("voucher.selectAccount")}</option>
              {accounts.map(({ account, depth }) => (
                <option key={account.id} value={account.id}>
                  {"— ".repeat(depth)}
                  {account.code} - {account.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("voucher.partyName")}</label>
          <div className="field-shell">
            <input
              type="text"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder={t("voucher.partyNamePlaceholder")}
            />
          </div>
        </div>

        <div>
          <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("voucher.description")}</label>
          <div className="field-shell items-start">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn btn-primary disabled:opacity-50">
            {submitting ? t("common.saving") : voucherType === "receipt" ? t("voucher.saveReceipt") : t("voucher.savePayment")}
          </button>
          <Link href="/dashboard/accounting/vouchers" className="btn btn-secondary">
            {t("common.cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
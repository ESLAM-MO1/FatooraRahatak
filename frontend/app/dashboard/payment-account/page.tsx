"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";

interface PaymentAccount {
  status: string;
  storeName?: string;
  bankName?: string;
  accountHolder?: string;
  iban?: string;
  recipientId?: string;
  rejectionReason?: string;
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  NotSubmitted: "paymentAccount.statusNotSubmitted",
  Pending: "paymentAccount.statusPending",
  Approved: "paymentAccount.statusApproved",
  Rejected: "paymentAccount.statusRejected",
};

const STATUS_BADGE: Record<string, string> = {
  Approved: "badge badge--green",
  Pending: "badge badge--yellow",
  Rejected: "badge badge--red",
  NotSubmitted: "badge",
};

export default function PaymentAccountPage() {
  const { t } = useTranslation();
  const [account, setAccount] = useState<PaymentAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [iban, setIban] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/owner/payments/account");
      setAccount(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("paymentAccount.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    if (!bankName.trim() || !accountHolder.trim() || !iban.trim()) {
      setError(t("paymentAccount.requiredFields"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/owner/payments/account", {
        bankName: bankName.trim(),
        accountHolder: accountHolder.trim(),
        iban: iban.trim(),
      });
      setAccount(res.data.data);
      setSuccess(t("paymentAccount.submitted"));
    } catch (err: any) {
      setError(err.response?.data?.message || t("paymentAccount.requiredFields"));
    } finally {
      setSubmitting(false);
    }
  };

  const status = account?.status || "NotSubmitted";

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader icon="wallet" title={t("paymentAccount.title")}>
        <p className="text-[12px] text-[var(--sub)]">{t("paymentAccount.subtitle")}</p>
      </PageHeader>

      {error && <div className="alert alert--danger">{error}</div>}
      <SuccessToast message={success} fixed />

      <div className="card p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[12px] text-[var(--sub)] font-bold">{t("paymentAccount.status")}</p>
          <span className={`badge ${STATUS_BADGE[status] || "badge"} mt-1 inline-block`}>
            {t(STATUS_LABEL_KEYS[status] || "paymentAccount.statusNotSubmitted")}
          </span>
        </div>
        {status === "Approved" && (
          <p className="text-[12.5px] text-[var(--green)] font-medium text-left max-w-sm">
            {t("paymentAccount.approvedHint")}
          </p>
        )}
        {status === "Pending" && (
          <p className="text-[12.5px] text-[var(--sub)] font-medium text-left max-w-sm">
            {t("paymentAccount.pendingHint")}
          </p>
        )}
      </div>

      {(status === "NotSubmitted" || status === "Rejected") && (
        <div className="card p-5 space-y-4">
          {status === "Rejected" && account?.rejectionReason && (
            <div className="alert alert--danger">
              {t("paymentAccount.rejectionReason")}: {account.rejectionReason}
            </div>
          )}

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-[12.5px] text-[var(--sub)]">
            {t("paymentAccount.formHint")}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-bold text-[var(--sub)]">{t("paymentAccount.bankName")}</label>
              <input
                className="field-input mt-1"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="الراجحي"
              />
            </div>
            <div>
              <label className="text-[12px] font-bold text-[var(--sub)]">{t("paymentAccount.accountHolder")}</label>
              <input
                className="field-input mt-1"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-bold text-[var(--sub)]">{t("paymentAccount.iban")}</label>
            <input
              className="field-input mt-1"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="SA0000000000000000000000"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
              {submitting
                ? t("paymentAccount.statusPending")
                : status === "Rejected"
                ? t("paymentAccount.resubmit")
                : t("paymentAccount.submit")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

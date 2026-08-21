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

interface Line {
  accountId: string;
  debit: string;
  credit: string;
  lineDescription: string;
}

const emptyLine: Line = { accountId: "", debit: "", credit: "", lineDescription: "" };

function flattenLeafAccounts(accounts: Account[], depth = 0): { account: Account; depth: number }[] {
  return accounts.flatMap((a) => {
    const hasChildren = a.children && a.children.length > 0;
    if (hasChildren) {
      return flattenLeafAccounts(a.children, depth + 1);
    }
    return a.isActive ? [{ account: a, depth }] : [];
  });
}

export default function NewJournalEntryPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const gate = usePackageFeature("hasAccountingFull");
  const [accounts, setAccounts] = useState<{ account: Account; depth: number }[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }, { ...emptyLine }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!gate.ready || !gate.allowed) return;
    api
      .get("/accounts")
      .then((res) => setAccounts(flattenLeafAccounts(res.data.data)))
      .catch(() => setError(t("journalEntry.loadAccountsError")))
      .finally(() => setLoadingAccounts(false));
  }, [t, gate.ready, gate.allowed]);

  if (!gate.ready) {
    return <LoadingState />;
  }

  if (!gate.allowed) {
    return <RestrictedFeatureState />;
  }

  const totals = useMemo(() => {
    const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
    return { totalDebit, totalCredit, diff: Math.round((totalDebit - totalCredit) * 100) / 100 };
  }, [lines]);

  const isBalanced = totals.diff === 0 && totals.totalDebit > 0;

  const updateLine = (index: number, field: keyof Line, value: string) => {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[index], [field]: value };
      if (field === "debit" && value) line.credit = "";
      if (field === "credit" && value) line.debit = "";
      next[index] = line;
      return next;
    });
  };

  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (index: number) =>
    setLines((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validLines = lines.filter((l) => l.accountId && (l.debit || l.credit));
    if (validLines.length < 2) {
      setError(t("journalEntry.minLinesError"));
      return;
    }
    if (!isBalanced) {
      setError(t("journalEntry.unbalancedError"));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        entryDate,
        description: description || null,
        lines: validLines.map((l) => ({
          accountId: Number(l.accountId),
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          lineDescription: l.lineDescription || null,
        })),
      };
      const res = await api.post("/journal-entries", payload);
      router.push(`/dashboard/accounting/journal-entries/${res.data.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || t("journalEntry.saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader icon="journal" title={t("journalEntry.newEntryTitle")}>
        <Link href="/dashboard/accounting/journal-entries" className="btn btn-secondary">
          {t("journalEntry.cancelAndReturn")}
        </Link>
      </PageHeader>

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card p-5 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("journalEntry.date")}</label>
              <div className="field-shell">
                <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("journalEntry.descriptionOptional")}</label>
              <div className="field-shell">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("journalEntry.descriptionPlaceholder")}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm hidden md:table">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px] w-2/5">{t("journalEntry.account")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("journalEntry.debit")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("journalEntry.credit")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("journalEntry.lineDescription")}</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    <td className="p-2">
                      <div className="field-shell">
                        <select
                          value={line.accountId}
                          onChange={(e) => updateLine(i, "accountId", e.target.value)}
                          disabled={loadingAccounts}
                        >
                          <option value="">{t("journalEntry.selectAccount")}</option>
                          {accounts.map(({ account, depth }) => (
                            <option key={account.id} value={account.id}>
                              {"— ".repeat(depth)}
                              {account.code} - {account.nameAr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="p-2 w-32">
                      <div className="field-shell">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.debit}
                          onChange={(e) => updateLine(i, "debit", e.target.value)}
                          dir="ltr"
                        />
                      </div>
                    </td>
                    <td className="p-2 w-32">
                      <div className="field-shell">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.credit}
                          onChange={(e) => updateLine(i, "credit", e.target.value)}
                          dir="ltr"
                        />
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="field-shell">
                        <input
                          type="text"
                          value={line.lineDescription}
                          onChange={(e) => updateLine(i, "lineDescription", e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        disabled={lines.length <= 2}
                        className="text-[var(--danger)] hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Icon name="trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#FAFBFC] font-bold">
                  <td className="p-3 text-[var(--ink)] text-[13px]">{t("journalEntry.total")}</td>
                  <td className="p-3 text-[var(--ink)]" dir="ltr">
                    {totals.totalDebit.toLocaleString("ar-SA-u-nu-latn")}
                  </td>
                  <td className="p-3 text-[var(--ink)]" dir="ltr">
                    {totals.totalCredit.toLocaleString("ar-SA-u-nu-latn")}
                  </td>
                  <td colSpan={2} className="p-3">
                    {totals.totalDebit > 0 || totals.totalCredit > 0 ? (
                      isBalanced ? (
                        <span className="text-[var(--green)] text-[12px] font-bold">✓ {t("journalEntry.balanced")}</span>
                      ) : (
                        <span className="text-[var(--danger)] text-[12px] font-bold">
                          {t("journalEntry.unbalancedWithDiff", { diff: Math.abs(totals.diff).toLocaleString("ar-SA-u-nu-latn") })}
                        </span>
                      )
                    ) : null}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="md:hidden p-4 space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="card p-4 space-y-2">
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("journalEntry.account")}</label>
                  <div className="field-shell">
                    <select
                      value={line.accountId}
                      onChange={(e) => updateLine(i, "accountId", e.target.value)}
                      disabled={loadingAccounts}
                    >
                      <option value="">{t("journalEntry.selectAccount")}</option>
                      {accounts.map(({ account, depth }) => (
                        <option key={account.id} value={account.id}>
                          {"— ".repeat(depth)}
                          {account.code} - {account.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("journalEntry.debit")}</label>
                    <div className="field-shell">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.debit}
                        onChange={(e) => updateLine(i, "debit", e.target.value)}
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("journalEntry.credit")}</label>
                    <div className="field-shell">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.credit}
                        onChange={(e) => updateLine(i, "credit", e.target.value)}
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("journalEntry.lineDescription")}</label>
                  <div className="field-shell">
                    <input
                      type="text"
                      value={line.lineDescription}
                      onChange={(e) => updateLine(i, "lineDescription", e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={lines.length <= 2}
                    className="text-[var(--danger)] hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Icon name="trash" /> {t("common.delete")}
                  </button>
                </div>
              </div>
            ))}
            <div className="card p-4 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--ink)] font-bold">{t("journalEntry.total")}</span>
                <span className="text-[var(--ink)]" dir="ltr">{totals.totalDebit.toLocaleString("ar-SA-u-nu-latn")} / {totals.totalCredit.toLocaleString("ar-SA-u-nu-latn")}</span>
              </div>
              {totals.totalDebit > 0 || totals.totalCredit > 0 ? (
                isBalanced ? (
                  <span className="text-[var(--green)] text-[12px] font-bold">✓ {t("journalEntry.balanced")}</span>
                ) : (
                  <span className="text-[var(--danger)] text-[12px] font-bold">
                    {t("journalEntry.unbalancedWithDiff", { diff: Math.abs(totals.diff).toLocaleString("ar-SA-u-nu-latn") })}
                  </span>
                )
              ) : null}
            </div>
          </div>
          <div className="p-3 border-t border-[var(--border)]">
            <button type="button" onClick={addLine} className="text-[13px] text-[var(--blue)] font-bold flex items-center gap-1.5 hover:underline">
              <Icon name="plus" />
              {t("journalEntry.addLine")}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !isBalanced}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t("common.saving") : t("journalEntry.saveEntry")}
          </button>
          <Link href="/dashboard/accounting/journal-entries" className="btn btn-secondary">
            {t("common.cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}

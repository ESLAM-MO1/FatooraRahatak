"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";

interface Account {
  id: number;
  code: string;
  nameAr: string;
  accountType: string;
  parentAccountId: number | null;
  isActive: boolean;
  isSystem: boolean;
  balance: number;
  children: Account[];
}

interface LedgerMovement {
  journalEntryId: number;
  entryNumber: string;
  entryDate: string;
  description: string | null;
  lineDescription: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
  sourceType: string | null;
}

interface LedgerResponse {
  accountId: number;
  accountCode: string;
  accountNameAr: string;
  accountType: string;
  from: string | null;
  to: string | null;
  openingBalance: number;
  closingBalance: number;
  movements: LedgerMovement[];
}

function flattenAccounts(accounts: Account[], depth = 0): { account: Account; depth: number }[] {
  return accounts.flatMap((a) => [
    { account: a, depth },
    ...flattenAccounts(a.children || [], depth + 1),
  ]);
}

function formatMoney(n: number) {
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function exportToExcel(tableHtml: string, filename: string) {
  const style = `<style>td,th{border:1px solid #ccc;padding:6px 10px;text-align:right;font-size:12px}th{background:#f0e6d2;font-weight:bold}table{border-collapse:collapse;width:100%;font-family:Tahoma,Arial}</style>`;
  const html = `<html><meta charset="utf-8">${style}<body>${tableHtml}</body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function printHtml(title: string, tableHtml: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  const style = `<style>body{font-family:Tahoma,Arial;padding:30px;direction:rtl}table{width:100%;border-collapse:collapse;margin-bottom:20px}td,th{border:1px solid #ccc;padding:6px 10px;text-align:right;font-size:12px}th{background:#f0e6d2;font-weight:bold}h2{text-align:center;margin-bottom:20px}</style>`;
  w.document.write(`<html><meta charset="utf-8">${style}<body><h2>${title}</h2>${tableHtml}<script>window.onload=function(){window.print();window.close()}<\/script></body></html>`);
  w.document.close();
}

function buildLedgerTable(ledger: LedgerResponse, from: string, to: string, t: (k: string) => string): string {
  const movRows = ledger.movements.map(m => `<tr><td>${m.entryDate}</td><td>${m.entryNumber}</td><td>${m.lineDescription || m.description || "—"}</td><td>${m.debit > 0 ? formatMoney(m.debit) : "—"}</td><td>${m.credit > 0 ? formatMoney(m.credit) : "—"}</td><td>${formatMoney(m.runningBalance)}</td></tr>`).join("");
  return `<table><tr><th colspan="5">${t("ledger.account")}: ${ledger.accountCode} - ${ledger.accountNameAr}</th><th>${t("ledger.openingBalance")}: ${formatMoney(ledger.openingBalance)}</th></tr><thead><tr><th>${t("ledger.date")}</th><th>${t("ledger.entryNumber")}</th><th>${t("ledger.description")}</th><th>${t("ledger.debit")}</th><th>${t("ledger.credit")}</th><th>${t("ledger.runningBalance")}</th></tr></thead><tbody><tr><td colspan="5"><em>${t("ledger.openingLabel")}</em></td><td>${formatMoney(ledger.openingBalance)}</td></tr>${movRows}</tbody></table>`;
}

export default function LedgerPage() {
  const { t } = useTranslation();
  const [accountsFlat, setAccountsFlat] = useState<{ account: Account; depth: number }[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState("");

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [ledger, setLedger] = useState<LedgerResponse | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState("");

  useEffect(() => {
    api
      .get("/accounts")
      .then((res) => {
        setAccountsFlat(flattenAccounts(res.data.data));
      })
      .catch((err) => {
        setAccountsError(err.response?.data?.message || t("ledger.loadAccountsError"));
      })
      .finally(() => setAccountsLoading(false));
  }, [t]);

  const fetchLedger = useCallback(async () => {
    if (!selectedAccountId) {
      setLedger(null);
      return;
    }
    setLedgerLoading(true);
    setLedgerError("");
    try {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.get(`/accounts/${selectedAccountId}/ledger`, { params });
      setLedger(res.data.data);
    } catch (err: any) {
      setLedger(null);
      setLedgerError(err.response?.data?.message || t("ledger.loadError"));
    } finally {
      setLedgerLoading(false);
    }
  }, [selectedAccountId, from, to, t]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  return (
    <div>
      <PageHeader icon="book" title={t("ledger.title")} />

      {accountsError && <div className="alert alert--danger mb-4">{accountsError}</div>}

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="min-w-[260px]">
          <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("ledger.account")}</label>
          <div className="field-shell">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              disabled={accountsLoading}
            >
              <option value="">
                {accountsLoading ? t("ledger.loadingAccounts") : t("ledger.selectAccount")}
              </option>
              {accountsFlat.map((f) => (
                <option key={f.account.id} value={f.account.id}>
                  {"— ".repeat(f.depth)}
                  {f.account.code} - {f.account.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("ledger.fromDate")}</label>
          <div className="field-shell">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("ledger.toDate")}</label>
          <div className="field-shell">
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {(from || to) && (
          <button
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="text-[12.5px] text-[var(--blue)] hover:underline mb-2"
          >
            {t("ledger.clearPeriod")}
          </button>
        )}
      </div>

      {ledgerError && <div className="alert alert--danger mb-4">{ledgerError}</div>}

      {!selectedAccountId ? (
        <div className="card p-6 text-[var(--sub)] text-sm">{t("ledger.selectAccountHint")}</div>
      ) : ledgerLoading ? (
        <p className="text-[var(--sub)] text-sm py-8 text-center">{t("common.loading")}</p>
      ) : ledger ? (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => exportToExcel(buildLedgerTable(ledger, from, to, t), `ledger-${ledger.accountCode}-${from || "all"}-${to || "all"}`)} className="btn btn-outline btn-sm"><Icon name="download" /> Excel</button>
            <button onClick={() => printHtml(`${t("ledger.title")} — ${ledger.accountCode} ${ledger.accountNameAr}`, buildLedgerTable(ledger, from, to, t))} className="btn btn-outline btn-sm"><Icon name="printer" /> PDF</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="card p-4">
              <p className="text-[12px] text-[var(--sub)] mb-1">{t("ledger.account")}</p>
              <p className="text-[14px] font-bold text-[var(--ink)]">
                <span dir="ltr">{ledger.accountCode}</span> - {ledger.accountNameAr}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-[12px] text-[var(--sub)] mb-1">{t("ledger.openingBalance")}</p>
              <p className="text-[16px] font-bold text-[var(--ink)]" dir="ltr">
                {formatMoney(ledger.openingBalance)} ر.س
              </p>
            </div>
            <div className="card p-4">
              <p className="text-[12px] text-[var(--sub)] mb-1">{t("ledger.closingBalance")}</p>
              <p className="text-[16px] font-bold text-[var(--blue-deep)]" dir="ltr">
                {formatMoney(ledger.closingBalance)} ر.س
              </p>
            </div>
          </div>

          <div className="card overflow-hidden">
            {ledger.movements.length === 0 ? (
              <p className="p-6 text-[var(--sub)] text-sm">{t("ledger.noMovements")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                    <tr>
                      <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("ledger.date")}</th>
                      <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("ledger.entryNumber")}</th>
                      <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("ledger.description")}</th>
                      <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("ledger.debit")}</th>
                      <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("ledger.credit")}</th>
                      <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("ledger.runningBalance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--border)] bg-[#F8F9FA]">
                      <td className="p-4 text-[var(--sub)]" colSpan={5}>
                        {t("ledger.openingLabel")}
                      </td>
                      <td className="p-4 font-bold text-[var(--ink)]" dir="ltr">
                        {formatMoney(ledger.openingBalance)}
                      </td>
                    </tr>
                    {ledger.movements.map((m, idx) => (
                      <tr
                        key={`${m.journalEntryId}-${idx}`}
                        className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors"
                      >
                        <td className="p-4 text-[var(--ink)]">{m.entryDate}</td>
                        <td className="p-4 text-[var(--blue)] font-bold" dir="ltr">
                          {m.entryNumber}
                        </td>
                        <td className="p-4 text-[var(--sub)] max-w-xs truncate">
                          {m.lineDescription || m.description || "—"}
                        </td>
                        <td className="p-4 text-[var(--ink)]" dir="ltr">
                          {m.debit > 0 ? formatMoney(m.debit) : "—"}
                        </td>
                        <td className="p-4 text-[var(--ink)]" dir="ltr">
                          {m.credit > 0 ? formatMoney(m.credit) : "—"}
                        </td>
                        <td className="p-4 font-bold text-[var(--ink)]" dir="ltr">
                          {formatMoney(m.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";

interface TrialBalanceLine {
  accountId: number;
  accountCode: string;
  accountNameAr: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
}

interface TrialBalanceResponse {
  from: string | null;
  to: string | null;
  lines: TrialBalanceLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

interface IncomeStatementLine {
  accountId: number;
  accountCode: string;
  accountNameAr: string;
  amount: number;
}

interface IncomeStatementResponse {
  from: string | null;
  to: string | null;
  revenueLines: IncomeStatementLine[];
  expenseLines: IncomeStatementLine[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

interface BalanceSheetLine {
  accountId: number;
  accountCode: string;
  accountNameAr: string;
  amount: number;
}

interface BalanceSheetResponse {
  asOf: string;
  assetLines: BalanceSheetLine[];
  liabilityLines: BalanceSheetLine[];
  equityLines: BalanceSheetLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
}

interface CashFlowLine {
  sourceType: string;
  netAmount: number;
}

interface CashFlowResponse {
  from: string | null;
  to: string | null;
  openingCashBalance: number;
  closingCashBalance: number;
  netChangeInCash: number;
  movementsBySource: CashFlowLine[];
}

type ReportKey = "trial-balance" | "income-statement" | "balance-sheet" | "cash-flow";

const sourceTypeLabels: Record<string, string> = {
  SalesInvoice: "accountingReport.salesInvoices",
  PurchaseInvoice: "accountingReport.purchaseInvoices",
  POS: "accountingReport.pos",
  Voucher: "accountingReport.vouchers",
  Payroll: "accountingReport.payroll",
  Depreciation: "accountingReport.depreciation",
  Manual: "accountingReport.manualEntries",
};

function formatMoney(n: number) {
  return n.toLocaleString("ar-SA-u-nu-latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function FinancialReportsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ReportKey>("trial-balance");

  const tabs: { key: ReportKey; label: string }[] = [
    { key: "trial-balance", label: t("accountingReport.trialBalance") },
    { key: "income-statement", label: t("accountingReport.incomeStatement") },
    { key: "balance-sheet", label: t("accountingReport.balanceSheet") },
    { key: "cash-flow", label: t("accountingReport.cashFlow") },
  ];

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [asOf, setAsOf] = useState(todayStr());
  const [accountType, setAccountType] = useState("");
  const [sourceType, setSourceType] = useState("");

  const accountTypeOptions: { key: string; label: string }[] = [
    { key: "Asset", label: t("accountingReport.filterAsset") },
    { key: "Liability", label: t("accountingReport.filterLiability") },
    { key: "Equity", label: t("accountingReport.filterEquity") },
    { key: "Revenue", label: t("accountingReport.filterRevenue") },
    { key: "Expense", label: t("accountingReport.filterExpense") },
  ];

  const sourceTypeOptions: { key: string; label: string }[] = [
    { key: "SalesInvoice", label: t("accountingReport.salesInvoices") },
    { key: "PurchaseInvoice", label: t("accountingReport.purchaseInvoices") },
    { key: "POS", label: t("accountingReport.pos") },
    { key: "Voucher", label: t("accountingReport.vouchers") },
    { key: "Payroll", label: t("accountingReport.payroll") },
    { key: "Depreciation", label: t("accountingReport.depreciation") },
    { key: "Manual", label: t("accountingReport.manualEntries") },
  ];

  const [trialBalance, setTrialBalance] = useState<TrialBalanceResponse | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementResponse | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetResponse | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "trial-balance") {
        const params: Record<string, string> = {};
        if (from) params.from = from;
        if (to) params.to = to;
        if (accountType) params.accountType = accountType;
        if (sourceType) params.sourceType = sourceType;
        const res = await api.get("/accounting/reports/trial-balance", { params });
        setTrialBalance(res.data.data);
      } else if (activeTab === "income-statement") {
        const params: Record<string, string> = {};
        if (from) params.from = from;
        if (to) params.to = to;
        if (accountType) params.accountType = accountType;
        if (sourceType) params.sourceType = sourceType;
        const res = await api.get("/accounting/reports/income-statement", { params });
        setIncomeStatement(res.data.data);
      } else if (activeTab === "balance-sheet") {
        const params: Record<string, string> = {};
        if (asOf) params.asOf = asOf;
        const res = await api.get("/accounting/reports/balance-sheet", { params });
        setBalanceSheet(res.data.data);
      } else if (activeTab === "cash-flow") {
        const params: Record<string, string> = {};
        if (from) params.from = from;
        if (to) params.to = to;
        const res = await api.get("/accounting/reports/cash-flow", { params });
        setCashFlow(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t("accountingReport.loadError"));
    } finally {
      setLoading(false);
    }
  }, [activeTab, from, to, asOf, accountType, sourceType, t]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleClearPeriod = () => {
    setFrom("");
    setTo("");
  };

  const handleClearFilters = () => {
    setAccountType("");
    setSourceType("");
  };

  return (
    <div>
      <PageHeader icon="chart" title={t("accountingReport.title")} />

      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-colors ${
              activeTab === t.key
                ? "bg-[var(--blue-deep)] text-white"
                : "bg-[#F3F5F7] text-[var(--sub)] hover:bg-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-5">
        {activeTab === "balance-sheet" ? (
          <div>
            <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("accountingReport.asOf")}</label>
            <div className="field-shell">
              <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("accountingReport.fromDate")}</label>
              <div className="field-shell">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("accountingReport.toDate")}</label>
              <div className="field-shell">
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            {(from || to) && (
              <button onClick={handleClearPeriod} className="text-[12.5px] text-[var(--blue)] hover:underline mb-2">
                {t("accountingReport.clearPeriod")}
              </button>
            )}
          </>
        )}
      </div>

      {activeTab !== "balance-sheet" && activeTab !== "cash-flow" && (
        <div className="card p-4 mb-5">
          <p className="text-[12px] font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <Icon name="filter" size={14} className="text-[var(--blue)]" />
            {t("accountingReport.advancedFilters")}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px]">
              <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("accountingReport.filterAccountType")}</label>
              <div className="field-shell">
                <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                  <option value="">{t("accountingReport.allAccountTypes")}</option>
                  {accountTypeOptions.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="min-w-[200px]">
              <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("accountingReport.filterSourceType")}</label>
              <div className="field-shell">
                <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                  <option value="">{t("accountingReport.allSources")}</option>
                  {sourceTypeOptions.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(accountType || sourceType) && (
              <button onClick={handleClearFilters} className="text-[12.5px] text-[var(--blue)] hover:underline mb-2">
                {t("accountingReport.clearFilters")}
              </button>
            )}
          </div>
        </div>
      )}

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      {loading ? (
        <div className="card p-6 flex items-center gap-3 text-[var(--sub)]">
          <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
          {t("accountingReport.loading")}
        </div>
      ) : error ? (
        <div className="alert alert--danger mb-4">{error}</div>
      ) : (
        <>
          {activeTab === "trial-balance" && trialBalance && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => exportToExcel(buildTrialBalanceTable(trialBalance, t), `trial-balance-${from || "all"}-${to || "all"}`)} className="btn btn-outline btn-sm"><Icon name="download" /> Excel</button>
                <button onClick={() => printHtml(t("accountingReport.trialBalance"), buildTrialBalanceTable(trialBalance, t))} className="btn btn-outline btn-sm"><Icon name="printer" /> PDF</button>
              </div>
              <TrialBalanceView data={trialBalance} t={t} />
            </>
          )}
          {activeTab === "income-statement" && incomeStatement && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => exportToExcel(buildIncomeStatementTable(incomeStatement, t), `income-statement-${from || "all"}-${to || "all"}`)} className="btn btn-outline btn-sm"><Icon name="download" /> Excel</button>
                <button onClick={() => printHtml(t("accountingReport.incomeStatement"), buildIncomeStatementTable(incomeStatement, t))} className="btn btn-outline btn-sm"><Icon name="printer" /> PDF</button>
              </div>
              <IncomeStatementView data={incomeStatement} t={t} />
            </>
          )}
          {activeTab === "balance-sheet" && balanceSheet && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => exportToExcel(buildBalanceSheetTable(balanceSheet, t), `balance-sheet-${asOf}`)} className="btn btn-outline btn-sm"><Icon name="download" /> Excel</button>
                <button onClick={() => printHtml(t("accountingReport.balanceSheet"), buildBalanceSheetTable(balanceSheet, t))} className="btn btn-outline btn-sm"><Icon name="printer" /> PDF</button>
              </div>
              <BalanceSheetView data={balanceSheet} t={t} />
            </>
          )}
          {activeTab === "cash-flow" && cashFlow && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => exportToExcel(buildCashFlowTable(cashFlow, t), `cash-flow-${from || "all"}-${to || "all"}`)} className="btn btn-outline btn-sm"><Icon name="download" /> Excel</button>
                <button onClick={() => printHtml(t("accountingReport.cashFlow"), buildCashFlowTable(cashFlow, t))} className="btn btn-outline btn-sm"><Icon name="printer" /> PDF</button>
              </div>
              <CashFlowView data={cashFlow} t={t} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function buildTrialBalanceTable(data: TrialBalanceResponse, t: (k: string) => string): string {
  const rows = data.lines.map(l => `<tr><td>${l.accountCode}</td><td>${l.accountNameAr}</td><td>${l.accountType}</td><td>${l.debitBalance > 0 ? formatMoney(l.debitBalance) : "—"}</td><td>${l.creditBalance > 0 ? formatMoney(l.creditBalance) : "—"}</td></tr>`).join("");
  return `<table><thead><tr><th>${t("accountingReport.code")}</th><th>${t("accountingReport.account")}</th><th>${t("accountingReport.type")}</th><th>${t("accountingReport.debit")}</th><th>${t("accountingReport.credit")}</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th colspan="3">${t("accountingReport.total")}</th><th>${formatMoney(data.totalDebit)}</th><th>${formatMoney(data.totalCredit)}</th></tr></tfoot></table>`;
}

function buildIncomeStatementTable(data: IncomeStatementResponse, t: (k: string) => string): string {
  const revRows = data.revenueLines.map(l => `<tr><td>${l.accountCode}</td><td>${l.accountNameAr}</td><td>${formatMoney(l.amount)}</td></tr>`).join("");
  const expRows = data.expenseLines.map(l => `<tr><td>${l.accountCode}</td><td>${l.accountNameAr}</td><td>${formatMoney(l.amount)}</td></tr>`).join("");
  return `<table><caption style="font-weight:bold;margin:8px 0">${t("accountingReport.revenues")}</caption><thead><tr><th>${t("accountingReport.code")}</th><th>${t("accountingReport.account")}</th><th>${t("accountingReport.total")}</th></tr></thead><tbody>${revRows || `<tr><td colspan="3">${t("accountingReport.noRevenues")}</td></tr>`}</tbody><caption style="font-weight:bold;margin:8px 0">${t("accountingReport.expenses")}</caption><thead><tr><th>${t("accountingReport.code")}</th><th>${t("accountingReport.account")}</th><th>${t("accountingReport.total")}</th></tr></thead><tbody>${expRows || `<tr><td colspan="3">${t("accountingReport.noExpenses")}</td></tr>`}</tbody><table style="margin-top:12px"><tr><th>${t("accountingReport.totalRevenue")}</th><td>${formatMoney(data.totalRevenue)}</td></tr><tr><th>${t("accountingReport.totalExpenses")}</th><td>${formatMoney(data.totalExpenses)}</td></tr><tr><th>${t("accountingReport.netProfitLoss")}</th><td>${formatMoney(data.netProfit)}</td></tr></table>`;
}

function buildBalanceSheetTable(data: BalanceSheetResponse, t: (k: string) => string): string {
  const section = (title: string, lines: BalanceSheetLine[], total: number) =>
    `<caption style="font-weight:bold;margin:8px 0">${title} — ${formatMoney(total)}</caption><thead><tr><th>${t("accountingReport.code")}</th><th>${t("accountingReport.account")}</th><th>${t("accountingReport.total")}</th></tr></thead><tbody>${lines.map(l => `<tr><td>${l.accountCode}</td><td>${l.accountNameAr}</td><td>${formatMoney(l.amount)}</td></tr>`).join("")}</tbody>`;
  return `<table>${section(t("accountingReport.assets"), data.assetLines, data.totalAssets)}${section(t("accountingReport.liabilities"), data.liabilityLines, data.totalLiabilities)}${section(t("accountingReport.equity"), data.equityLines, data.totalEquity)}</table>`;
}

function buildCashFlowTable(data: CashFlowResponse, t: (k: string) => string): string {
  const rows = data.movementsBySource.map(m => `<tr><td>${t(sourceTypeLabels[m.sourceType] || m.sourceType)}</td><td>${formatMoney(m.netAmount)}</td></tr>`).join("");
  return `<table><thead><tr><th>${t("accountingReport.source")}</th><th>${t("accountingReport.netMovement")}</th></tr></thead><tbody>${rows || `<tr><td colspan="2">${t("accountingReport.noCashMovements")}</td></tr>`}</tbody></table><table style="margin-top:12px"><tr><th>${t("accountingReport.openingCashBalance")}</th><td>${formatMoney(data.openingCashBalance)}</td></tr><tr><th>${t("accountingReport.netCashChange")}</th><td>${formatMoney(data.netChangeInCash)}</td></tr><tr><th>${t("accountingReport.closingCashBalance")}</th><td>${formatMoney(data.closingCashBalance)}</td></tr></table>`;
}

function BalancedBadge({ isBalanced, t }: { isBalanced: boolean; t: (key: string) => string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-bold ${
        isBalanced ? "bg-[var(--green-soft)] text-[var(--green)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"
      }`}
    >
      {isBalanced && <Icon name="check" className="shrink-0" />}
      {isBalanced ? t("accountingReport.balanced") : t("accountingReport.unbalanced")}
    </span>
  );
}

function TrialBalanceView({ data, t }: { data: TrialBalanceResponse; t: (key: string) => string }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="card p-4 flex-1 min-w-[160px]">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.totalDebit")}</p>
          <p className="text-[16px] font-bold text-[var(--ink)]" dir="ltr">
            {formatMoney(data.totalDebit)} {t("common.sar")}
          </p>
        </div>
        <div className="card p-4 flex-1 min-w-[160px]">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.totalCredit")}</p>
          <p className="text-[16px] font-bold text-[var(--ink)]" dir="ltr">
            {formatMoney(data.totalCredit)} {t("common.sar")}
          </p>
        </div>
        <div className="card p-4 flex-1 min-w-[160px] flex flex-col justify-center">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.balanceStatus")}</p>
          <BalancedBadge isBalanced={data.isBalanced} t={t} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {data.lines.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("accountingReport.noMovements")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("accountingReport.code")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("accountingReport.account")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("accountingReport.type")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("accountingReport.debit")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("accountingReport.credit")}</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((l) => (
                  <tr key={l.accountId} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--blue)] font-bold" dir="ltr">
                      {l.accountCode}
                    </td>
                    <td className="p-4 text-[var(--ink)]">{l.accountNameAr}</td>
                    <td className="p-4 text-[var(--sub)]">{l.accountType}</td>
                    <td className="p-4 text-[var(--ink)]" dir="ltr">
                      {l.debitBalance > 0 ? formatMoney(l.debitBalance) : "—"}
                    </td>
                    <td className="p-4 text-[var(--ink)]" dir="ltr">
                      {l.creditBalance > 0 ? formatMoney(l.creditBalance) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F8F9FA] font-bold">
                  <td className="p-4 text-[var(--ink)]" colSpan={3}>
                    {t("accountingReport.total")}
                  </td>
                  <td className="p-4 text-[var(--ink)]" dir="ltr">
                    {formatMoney(data.totalDebit)}
                  </td>
                  <td className="p-4 text-[var(--ink)]" dir="ltr">
                    {formatMoney(data.totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function IncomeStatementView({ data, t }: { data: IncomeStatementResponse; t: (key: string) => string }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="card p-4">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.totalRevenue")}</p>
          <p className="text-[16px] font-bold text-[var(--ink)]" dir="ltr">
            {formatMoney(data.totalRevenue)} {t("common.sar")}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.totalExpenses")}</p>
          <p className="text-[16px] font-bold text-[var(--ink)]" dir="ltr">
            {formatMoney(data.totalExpenses)} {t("common.sar")}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.netProfitLoss")}</p>
          <p
            className={`text-[16px] font-bold ${data.netProfit >= 0 ? "text-[var(--green)]" : "text-[var(--danger)]"}`}
            dir="ltr"
          >
            {formatMoney(data.netProfit)} {t("common.sar")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--gold-soft)]/40">
            <p className="text-[13px] font-bold text-[var(--gold-deep)]">{t("accountingReport.revenues")}</p>
          </div>
          {data.revenueLines.length === 0 ? (
            <p className="p-6 text-[var(--sub)] text-sm">{t("accountingReport.noRevenues")}</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {data.revenueLines.map((l) => (
                  <tr key={l.accountId} className="border-b border-[var(--border)]">
                    <td className="p-3.5 text-[var(--ink)]">
                      <span className="text-[var(--blue)] font-bold ml-2" dir="ltr">
                        {l.accountCode}
                      </span>
                      {l.accountNameAr}
                    </td>
                    <td className="p-3.5 text-[var(--ink)] font-bold text-left" dir="ltr">
                      {formatMoney(l.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--gold-soft)]/40">
            <p className="text-[13px] font-bold text-[var(--gold-deep)]">{t("accountingReport.expenses")}</p>
          </div>
          {data.expenseLines.length === 0 ? (
            <p className="p-6 text-[var(--sub)] text-sm">{t("accountingReport.noExpenses")}</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {data.expenseLines.map((l) => (
                  <tr key={l.accountId} className="border-b border-[var(--border)]">
                    <td className="p-3.5 text-[var(--ink)]">
                      <span className="text-[var(--blue)] font-bold ml-2" dir="ltr">
                        {l.accountCode}
                      </span>
                      {l.accountNameAr}
                    </td>
                    <td className="p-3.5 text-[var(--ink)] font-bold text-left" dir="ltr">
                      {formatMoney(l.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function BalanceSheetView({ data, t }: { data: BalanceSheetResponse; t: (key: string) => string }) {
  const sections: { title: string; lines: BalanceSheetLine[]; total: number }[] = [
    { title: t("accountingReport.assets"), lines: data.assetLines, total: data.totalAssets },
    { title: t("accountingReport.liabilities"), lines: data.liabilityLines, total: data.totalLiabilities },
    { title: t("accountingReport.equity"), lines: data.equityLines, total: data.totalEquity },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="card p-4 flex-1 min-w-[160px]">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.totalAssets")}</p>
          <p className="text-[16px] font-bold text-[var(--ink)]" dir="ltr">
            {formatMoney(data.totalAssets)} {t("common.sar")}
          </p>
        </div>
        <div className="card p-4 flex-1 min-w-[160px]">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.totalLiabilitiesEquity")}</p>
          <p className="text-[16px] font-bold text-[var(--ink)]" dir="ltr">
            {formatMoney(data.totalLiabilities + data.totalEquity)} {t("common.sar")}
          </p>
        </div>
        <div className="card p-4 flex-1 min-w-[160px] flex flex-col justify-center">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.budgetStatus")}</p>
          <BalancedBadge isBalanced={data.isBalanced} t={t} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <div key={s.title} className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--gold-soft)]/40 flex items-center justify-between">
              <p className="text-[13px] font-bold text-[var(--gold-deep)]">{s.title}</p>
              <p className="text-[12.5px] font-bold text-[var(--ink)]" dir="ltr">
                {formatMoney(s.total)}
              </p>
            </div>
            {s.lines.length === 0 ? (
              <p className="p-6 text-[var(--sub)] text-sm">{t("accountingReport.noData")}</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {s.lines.map((l) => (
                    <tr key={`${s.title}-${l.accountId}`} className="border-b border-[var(--border)]">
                      <td className="p-3.5 text-[var(--ink)]">
                        <span className="text-[var(--blue)] font-bold ml-2" dir="ltr">
                          {l.accountCode}
                        </span>
                        {l.accountNameAr}
                      </td>
                      <td className="p-3.5 text-[var(--ink)] font-bold text-left" dir="ltr">
                        {formatMoney(l.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function CashFlowView({ data, t }: { data: CashFlowResponse; t: (key: string) => string }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="card p-4">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.openingCashBalance")}</p>
          <p className="text-[16px] font-bold text-[var(--ink)]" dir="ltr">
            {formatMoney(data.openingCashBalance)} {t("common.sar")}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.netCashChange")}</p>
          <p
            className={`text-[16px] font-bold ${data.netChangeInCash >= 0 ? "text-[var(--green)]" : "text-[var(--danger)]"}`}
            dir="ltr"
          >
            {formatMoney(data.netChangeInCash)} {t("common.sar")}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.closingCashBalance")}</p>
          <p className="text-[16px] font-bold text-[var(--blue-deep)]" dir="ltr">
            {formatMoney(data.closingCashBalance)} {t("common.sar")}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {data.movementsBySource.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("accountingReport.noCashMovements")}</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
              <tr>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("accountingReport.source")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("accountingReport.netMovement")}</th>
              </tr>
            </thead>
            <tbody>
              {data.movementsBySource.map((m) => (
                <tr key={m.sourceType} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                  <td className="p-4 text-[var(--ink)]">{t(sourceTypeLabels[m.sourceType] || m.sourceType)}</td>
                  <td
                    className={`p-4 font-bold ${m.netAmount >= 0 ? "text-[var(--green)]" : "text-[var(--danger)]"}`}
                    dir="ltr"
                  >
                    {formatMoney(m.netAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  );
}

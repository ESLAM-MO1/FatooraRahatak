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
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        const res = await api.get("/accounting/reports/trial-balance", { params });
        setTrialBalance(res.data.data);
      } else if (activeTab === "income-statement") {
        const params: Record<string, string> = {};
        if (from) params.from = from;
        if (to) params.to = to;
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
  }, [activeTab, from, to, asOf, t]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleClearPeriod = () => {
    setFrom("");
    setTo("");
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

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      {loading ? (
        <div className="card p-6 flex items-center gap-3 text-[var(--sub)]">
          <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
          {t("accountingReport.loading")}
        </div>
      ) : (
        <>
          {activeTab === "trial-balance" && trialBalance && (
            <TrialBalanceView data={trialBalance} t={t} />
          )}
          {activeTab === "income-statement" && incomeStatement && (
            <IncomeStatementView data={incomeStatement} t={t} />
          )}
          {activeTab === "balance-sheet" && balanceSheet && (
            <BalanceSheetView data={balanceSheet} t={t} />
          )}
          {activeTab === "cash-flow" && cashFlow && (
            <CashFlowView data={cashFlow} t={t} />
          )}
        </>
      )}
    </div>
  );
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
            {formatMoney(data.totalDebit)} ر.س
          </p>
        </div>
        <div className="card p-4 flex-1 min-w-[160px]">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.totalCredit")}</p>
          <p className="text-[16px] font-bold text-[var(--ink)]" dir="ltr">
            {formatMoney(data.totalCredit)} ر.س
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
            {formatMoney(data.totalRevenue)} ر.س
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.totalExpenses")}</p>
          <p className="text-[16px] font-bold text-[var(--ink)]" dir="ltr">
            {formatMoney(data.totalExpenses)} ر.س
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.netProfitLoss")}</p>
          <p
            className={`text-[16px] font-bold ${data.netProfit >= 0 ? "text-[var(--green)]" : "text-[var(--danger)]"}`}
            dir="ltr"
          >
            {formatMoney(data.netProfit)} ر.س
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
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--gold-soft)]/40">
            <p className="text-[13px] font-bold text-[var(--gold-deep)]">{t("accountingReport.expenses")}</p>
          </div>
          {data.expenseLines.length === 0 ? (
            <p className="p-6 text-[var(--sub)] text-sm">{t("accountingReport.noExpenses")}</p>
          ) : (
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
            {formatMoney(data.totalAssets)} ر.س
          </p>
        </div>
        <div className="card p-4 flex-1 min-w-[160px]">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.totalLiabilitiesEquity")}</p>
          <p className="text-[16px] font-bold text-[var(--ink)]" dir="ltr">
            {formatMoney(data.totalLiabilities + data.totalEquity)} ر.س
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
            {formatMoney(data.openingCashBalance)} ر.س
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.netCashChange")}</p>
          <p
            className={`text-[16px] font-bold ${data.netChangeInCash >= 0 ? "text-[var(--green)]" : "text-[var(--danger)]"}`}
            dir="ltr"
          >
            {formatMoney(data.netChangeInCash)} ر.س
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] text-[var(--sub)] mb-1">{t("accountingReport.closingCashBalance")}</p>
          <p className="text-[16px] font-bold text-[var(--blue-deep)]" dir="ltr">
            {formatMoney(data.closingCashBalance)} ر.س
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {data.movementsBySource.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("accountingReport.noCashMovements")}</p>
        ) : (
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
        )}
      </div>
    </>
  );
}

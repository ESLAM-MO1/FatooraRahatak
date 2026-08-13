"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";

function formatMoney(n: number) {
  return Number(n || 0).toLocaleString("ar-SA-u-nu-latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString("ar-SA-u-nu-latn");
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthAgoStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

type ReportKey =
  | "sales"
  | "discounts"
  | "tax"
  | "low-stock"
  | "movements"
  | "valuation"
  | "statement"
  | "ar-aging";

export default function BusinessReportsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ReportKey>("sales");
  const [from, setFrom] = useState(monthAgoStr());
  const [to, setTo] = useState(todayStr());
  const [threshold, setThreshold] = useState("10");
  const [customerId, setCustomerId] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [sales, setSales] = useState<any>(null);
  const [discounts, setDiscounts] = useState<any>(null);
  const [tax, setTax] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any>(null);
  const [movements, setMovements] = useState<any>(null);
  const [valuation, setValuation] = useState<any>(null);
  const [statement, setStatement] = useState<any>(null);
  const [arAging, setArAging] = useState<any>(null);

  const tabs: { key: ReportKey; label: string }[] = [
    { key: "sales", label: t("report.titleSales") },
    { key: "discounts", label: t("report.titleDiscounts") },
    { key: "tax", label: t("report.titleTax") },
    { key: "low-stock", label: t("report.titleLowStock") },
    { key: "movements", label: t("report.titleMovements") },
    { key: "valuation", label: t("report.titleValuation") },
    { key: "statement", label: t("report.titleStatement") },
    { key: "ar-aging", label: t("report.titleArAging") },
  ];

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "sales") {
        const res = await api.get("/reports/sales", { params: { from, to } });
        setSales(res.data.data);
      } else if (activeTab === "discounts") {
        const res = await api.get("/reports/discounts", { params: { from, to } });
        setDiscounts(res.data.data);
      } else if (activeTab === "tax") {
        const res = await api.get("/reports/tax", { params: { from, to } });
        setTax(res.data.data);
      } else if (activeTab === "low-stock") {
        const res = await api.get("/reports/inventory/low-stock", { params: { threshold: threshold || undefined } });
        setLowStock(res.data.data);
      } else if (activeTab === "movements") {
        const res = await api.get("/reports/inventory/movements", { params: { from, to } });
        setMovements(res.data.data);
      } else if (activeTab === "valuation") {
        const res = await api.get("/reports/inventory/valuation");
        setValuation(res.data.data);
      } else if (activeTab === "statement") {
        const res = await api.get("/reports/customers/statement", {
          params: { customerId: customerId || undefined, phone: customerPhone || undefined, from, to },
        });
        setStatement(res.data.data);
      } else if (activeTab === "ar-aging") {
        const res = await api.get("/reports/ar-aging");
        setArAging(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t("report.loadError"));
    } finally {
      setLoading(false);
    }
  }, [activeTab, from, to, threshold, customerId, customerPhone, t]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const exportCsv = async (path: string) => {
    try {
      const res = await api.get(path, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      const match = path.split("/");
      a.download = `${match[match.length - 2] || "report"}-${todayStr()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError(t("report.exportError"));
    }
  };

  const exportPath: Record<ReportKey, string> = {
    sales: "/reports/sales/export",
    discounts: "/reports/discounts/export",
    tax: "/reports/tax/export",
    "low-stock": "/reports/inventory/low-stock/export",
    movements: "/reports/inventory/movements/export",
    valuation: "/reports/inventory/valuation/export",
    statement: "/reports/customers/statement/export",
    "ar-aging": "/reports/ar-aging/export",
  };

  const needsDateRange = ["sales", "discounts", "tax", "movements", "statement"].includes(activeTab);
  const needsThreshold = activeTab === "low-stock";
  const needsCustomer = activeTab === "statement";

  return (
    <div>
      <PageHeader icon="chart" title={t("report.title")} />

      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setActiveTab(tb.key)}
            className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-colors ${
              activeTab === tb.key
                ? "bg-[var(--blue-deep)] text-white"
                : "bg-[#F3F5F7] text-[var(--sub)] hover:bg-gray-200"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          {needsDateRange && (
            <>
              <div>
                <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("report.fromDate")}</label>
                <div className="field-shell">
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("report.toDate")}</label>
                <div className="field-shell">
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
            </>
          )}
          {needsThreshold && (
            <div>
              <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("report.threshold")}</label>
              <div className="field-shell">
                <input type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
              </div>
            </div>
          )}
          {needsCustomer && (
            <>
              <div>
                <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("report.customerId")}</label>
                <div className="field-shell">
                  <input type="number" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder={t("report.customerIdPlaceholder")} />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">{t("report.customerPhone")}</label>
                <div className="field-shell">
                  <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder={t("report.customerPhonePlaceholder")} />
                </div>
              </div>
            </>
          )}
          <button onClick={fetchReport} className="btn-primary px-5">{t("report.run")}</button>
          <button onClick={() => exportCsv(exportPath[activeTab])} className="btn btn-outline px-4">
            <Icon name="download" /> {t("report.exportCsv")}
          </button>
        </div>
      </div>

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      {loading ? (
        <div className="card p-6 flex items-center gap-3 text-[var(--sub)]">
          <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
          {t("report.loading")}
        </div>
      ) : error ? (
        <div className="alert alert--danger mb-4">{error}</div>
      ) : (
        <>
          {activeTab === "sales" && sales && <SalesView data={sales} t={t} />}
          {activeTab === "discounts" && discounts && <DiscountsView data={discounts} t={t} />}
          {activeTab === "tax" && tax && <TaxView data={tax} t={t} />}
          {activeTab === "low-stock" && lowStock && <LowStockView data={lowStock} t={t} />}
          {activeTab === "movements" && movements && <MovementsView data={movements} t={t} />}
          {activeTab === "valuation" && valuation && <ValuationView data={valuation} t={t} />}
          {activeTab === "statement" && statement && <StatementView data={statement} t={t} />}
          {activeTab === "ar-aging" && arAging && <ArAgingView data={arAging} t={t} />}
        </>
      )}
    </div>
  );
}

function SummaryCards({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {items.map((it) => (
        <div key={it.label} className="card p-4">
          <p className="text-[12px] text-[var(--sub)] mb-1">{it.label}</p>
          <p className={`text-[16px] font-bold ${it.color || "text-[var(--ink)]"}`} dir="ltr">
            {it.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ t }: { t: (k: string) => string }) {
  return <p className="p-6 text-[var(--sub)] text-sm">{t("report.noData")}</p>;
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
            <tr>
              {head.map((h) => (
                <th key={h} className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="p-4 text-[var(--ink)]" dir={typeof cell === "string" && /^[\d.,-]+$/.test(cell) ? "ltr" : undefined}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalesView({ data, t }: { data: any; t: (k: string) => string }) {
  return (
    <>
      <SummaryCards
        items={[
          { label: t("report.ordersCount"), value: String(data.ordersCount) },
          { label: t("report.itemsSold"), value: String(data.itemsSold) },
          { label: t("report.grossSales"), value: formatMoney(data.grossSales) },
          { label: t("report.discounts"), value: formatMoney(data.discounts) },
          { label: t("report.shippingFees"), value: formatMoney(data.shippingFees) },
          { label: t("report.taxAmount"), value: formatMoney(data.taxAmount) },
          { label: t("report.netSales"), value: formatMoney(data.netSales) },
          { label: t("report.totalRevenue"), value: formatMoney(data.totalRevenue), color: "text-[var(--blue-deep)]" },
        ]}
      />
      <h3 className="text-[13px] font-bold text-[var(--ink)] mb-3">{t("report.dailySales")}</h3>
      <div className="mb-5">
        <Table
          head={[t("report.date"), t("report.ordersCount"), t("report.revenue")]}
          rows={data.dailyRows.map((r: any) => [formatDate(r.date), r.ordersCount, formatMoney(r.revenue)])}
        />
      </div>
      <h3 className="text-[13px] font-bold text-[var(--ink)] mb-3">{t("report.topProducts")}</h3>
      <Table
        head={[t("report.product"), t("report.unitsSold"), t("report.revenue")]}
        rows={data.topProducts.map((r: any) => [r.productName, r.unitsSold, formatMoney(r.revenue)])}
      />
    </>
  );
}

function DiscountsView({ data, t }: { data: any; t: (k: string) => string }) {
  return (
    <>
      <SummaryCards
        items={[
          { label: t("report.totalDiscount"), value: formatMoney(data.totalDiscountGiven), color: "text-[var(--blue-deep)]" },
          { label: t("report.couponsUsed"), value: String(data.couponsUsed) },
        ]}
      />
      <Table
        head={[t("report.couponCode"), t("report.timesUsed"), t("report.totalDiscount")]}
        rows={data.rows.map((r: any) => [r.couponCode, r.timesUsed, formatMoney(r.totalDiscount)])}
      />
    </>
  );
}

function TaxView({ data, t }: { data: any; t: (k: string) => string }) {
  return (
    <>
      <SummaryCards
        items={[
          { label: t("report.vatCollected"), value: formatMoney(data.vatCollected), color: "text-[var(--blue-deep)]" },
          { label: t("report.invoicesCount"), value: String(data.invoicesCount) },
        ]}
      />
      <Table
        head={[t("report.invoiceNumber"), t("report.invoiceDate"), t("report.subTotal"), t("report.taxAmount"), t("report.totalAmount")]}
        rows={data.rows.map((r: any) => [r.invoiceNumber, formatDate(r.invoiceDate), formatMoney(r.subTotal), formatMoney(r.taxAmount), formatMoney(r.totalAmount)])}
      />
    </>
  );
}

function LowStockView({ data, t }: { data: any; t: (k: string) => string }) {
  return (
    <Table
      head={[t("report.product"), t("report.sku"), t("report.available"), t("report.threshold")]}
      rows={data.map((r: any) => [r.productName, r.sku, r.available, r.threshold])}
    />
  );
}

function MovementsView({ data, t }: { data: any; t: (k: string) => string }) {
  return (
    <Table
      head={[t("report.date"), t("report.product"), t("report.variant"), t("report.warehouse"), t("report.type"), t("report.quantity"), t("report.reference")]}
      rows={data.map((r: any) => [
        formatDate(r.date),
        r.productName,
        r.variantName || "—",
        r.warehouseName,
        r.type,
        r.quantity,
        r.referenceType || "—",
      ])}
    />
  );
}

function ValuationView({ data, t }: { data: any; t: (k: string) => string }) {
  return (
    <>
      <SummaryCards
        items={[
          { label: t("report.itemsCount"), value: String(data.itemsCount) },
          { label: t("report.totalUnits"), value: String(data.totalUnits) },
          { label: t("report.totalCostValue"), value: formatMoney(data.totalCostValue) },
          { label: t("report.totalRetailValue"), value: formatMoney(data.totalRetailValue), color: "text-[var(--blue-deep)]" },
        ]}
      />
      <Table
        head={[t("report.product"), t("report.sku"), t("report.available"), t("report.costPrice"), t("report.retailPrice"), t("report.costValue"), t("report.retailValue")]}
        rows={data.rows.map((r: any) => [r.productName, r.sku, r.available, formatMoney(r.costPrice), formatMoney(r.retailPrice), formatMoney(r.costValue), formatMoney(r.retailValue)])}
      />
    </>
  );
}

function StatementView({ data, t }: { data: any; t: (k: string) => string }) {
  return (
    <>
      <SummaryCards
        items={[
          { label: t("report.customer"), value: data.customerName || data.phone || "—" },
          { label: t("report.totalSales"), value: formatMoney(data.totalSales) },
          { label: t("report.totalPaid"), value: formatMoney(data.totalPaid) },
          { label: t("report.balance"), value: formatMoney(data.balance), color: "text-[var(--blue-deep)]" },
        ]}
      />
      <Table
        head={[t("report.date"), t("report.reference"), t("report.type"), t("report.debit"), t("report.credit")]}
        rows={data.lines.map((r: any) => [formatDate(r.date), r.reference, r.type, r.debit ? formatMoney(r.debit) : "—", r.credit ? formatMoney(r.credit) : "—"])}
      />
    </>
  );
}

function ArAgingView({ data, t }: { data: any; t: (k: string) => string }) {
  return (
    <>
      <SummaryCards
        items={[{ label: t("report.totalOverdue"), value: formatMoney(data.totalOverdue), color: "text-[var(--danger)]" }]}
      />
      {data.buckets.map((b: any) => (
        <div key={b.name} className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-bold text-[var(--ink)]">{b.name}</h3>
            <span className="text-[12.5px] font-bold text-[var(--blue-deep)]" dir="ltr">
              {formatMoney(b.total)} · {b.invoicesCount}
            </span>
          </div>
          <Table
            head={[t("report.invoiceNumber"), t("report.invoiceDate"), t("report.partyName"), t("report.totalAmount"), t("report.daysOverdue")]}
            rows={b.invoices.map((r: any) => [r.invoiceNumber, formatDate(r.invoiceDate), r.partyName, formatMoney(r.totalAmount), r.daysOverdue])}
          />
        </div>
      ))}
    </>
  );
}

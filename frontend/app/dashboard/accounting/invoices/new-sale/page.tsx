"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";

interface Product {
  id: number;
  nameAr: string;
  sku: string;
  basePrice: number;
  costPrice: number;
  availableQuantity: number;
}

interface Line {
  productId: string;
  quantity: string;
  unitPrice: string;
}

const emptyLine: Line = { productId: "", quantity: "1", unitPrice: "" };
const VAT_RATE = 0.15;

export default function NewSalesInvoicePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState(false);

  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [customerMode, setCustomerMode] = useState<"guest" | "registered">("guest");
  const [guestName, setGuestName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [registeredCustomers, setRegisteredCustomers] = useState<{ customerId: number; name: string; phone: string }[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isVatRegistered, setIsVatRegistered] = useState(false);


  useEffect(() => {
    api
      .get("/products")
      .then((res) => setProducts(res.data.data))
      .catch(() => setProductsError(true))
      .finally(() => setLoadingProducts(false));
  }, []);
  useEffect(() => {
  api
    .get("/stores/my-store")
    .then((res) => setIsVatRegistered(res.data.data.isVatRegistered))
    .catch(() => {});
}, []);
useEffect(() => {
  api
    .get("/owner/customers")
    .then((res) =>
      setRegisteredCustomers(
        res.data.data
          .filter((c: any) => !c.isGuest && c.customerId != null)
          .map((c: any) => ({ customerId: c.customerId, name: c.name, phone: c.phone }))
      )
    )
    .catch(() => {})
    .finally(() => setLoadingCustomers(false));
}, []);
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(String(p.id), p));
    return map;
  }, [products]);

  const updateLine = (index: number, field: keyof Line, value: string) => {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[index], [field]: value };
      if (field === "productId") {
        const product = productMap.get(value);
        if (product) line.unitPrice = String(product.basePrice);
      }
      next[index] = line;
      return next;
    });
  };

  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (index: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const totals = useMemo(() => {
  const subTotal = lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    return sum + qty * price;
  }, 0);
  const estimatedTax = isVatRegistered ? Math.round(subTotal * VAT_RATE * 100) / 100 : 0;
  return { subTotal, estimatedTax, estimatedTotal: subTotal + estimatedTax };
}, [lines, isVatRegistered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validLines = lines.filter((l) => l.productId && parseFloat(l.quantity) > 0 && l.unitPrice !== "");
    if (validLines.length === 0) {
      setError(t("invoice.addLineError"));
      return;
    }
    if (customerMode === "registered" && !customerId) {
      setError(t("invoice.customerRequired"));
      return;
    }

    const overStock = validLines.find((l) => {
      const product = productMap.get(l.productId);
      return product && parseFloat(l.quantity) > product.availableQuantity;
    });
    if (overStock) {
      const product = productMap.get(overStock.productId)!;
      setError(
        t("invoice.overStockError", { product: product.nameAr, quantity: product.availableQuantity })
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        invoiceDate,
        customerId: customerMode === "registered" ? Number(customerId) : null,
        guestName: customerMode === "guest" ? guestName || null : null,
        paymentMethod,
        items: validLines.map((l) => ({
          productId: Number(l.productId),
          variantId: null,
          quantity: Number(l.quantity),
          unitPrice: parseFloat(l.unitPrice),
        })),
      };
      const res = await api.post("/invoices/sales", payload);
      router.push(`/dashboard/accounting/invoices/${res.data.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || t("invoice.saveSaleError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader icon="receipt" title={t("invoice.newSaleTitle")}>
        <Link href="/dashboard/accounting/invoices" className="btn btn-secondary">
          {t("invoice.cancelAndReturn")}
        </Link>
      </PageHeader>

      {error && <div className="alert alert--danger mb-4">{error}</div>}
      {productsError && (
        <div className="alert alert--warning mb-4">
          {t("invoice.productsLoadError")}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card p-5 mb-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("invoice.date")}</label>
              <div className="field-shell">
                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("invoice.paymentMethod")}</label>
              <div className="field-shell">
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="Cash">{t("invoice.paymentCash")}</option>
                  <option value="Credit">{t("invoice.paymentCredit")}</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("invoice.customer")}</label>
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-1.5 text-[13px] text-[var(--ink)] cursor-pointer">
                <input
                  type="radio"
                  checked={customerMode === "guest"}
                  onChange={() => setCustomerMode("guest")}
                />
                {t("invoice.guestCustomer")}
              </label>
              <label className="flex items-center gap-1.5 text-[13px] text-[var(--ink)] cursor-pointer">
                <input
                  type="radio"
                  checked={customerMode === "registered"}
                  onChange={() => setCustomerMode("registered")}
                />
                {t("invoice.registeredCustomer")}
              </label>
            </div>
            {customerMode === "guest" ? (
              <div className="field-shell">
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={t("invoice.guestNamePlaceholder")}
                />
              </div>
            ) : (
  <div className="field-shell">
    <select
      value={customerId}
      onChange={(e) => setCustomerId(e.target.value)}
      disabled={loadingCustomers}
    >
      <option value="">{t("invoice.selectRegistered")}</option>
      {registeredCustomers.map((c) => (
        <option key={c.customerId} value={c.customerId}>
          {c.name} — {c.phone}
        </option>
      ))}
    </select>
  </div>
)}

          </div>
        </div>

        <div className="card overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px] w-2/5">{t("invoice.product")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.quantity")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.unitPrice")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.lineTotal")}</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const product = productMap.get(line.productId);
                  const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
                  return (
                    <tr key={i} className="border-b border-[var(--border)]">
                      <td className="p-2">
                        <div className="field-shell">
                          <select
                            value={line.productId}
                            onChange={(e) => updateLine(i, "productId", e.target.value)}
                            disabled={loadingProducts}
                          >
                            <option value="">{t("invoice.selectProduct")}</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nameAr} ({p.sku}) — {t("invoice.available")}: {p.availableQuantity}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="p-2 w-28">
                        <div className="field-shell">
                          <input
                            type="number"
                            min={1}
                            step="1"
                            value={line.quantity}
                            onChange={(e) => updateLine(i, "quantity", e.target.value)}
                            dir="ltr"
                          />
                        </div>
                        {product && parseFloat(line.quantity) > product.availableQuantity && (
                          <p className="text-[10.5px] text-[var(--danger)] mt-1">{t("invoice.overStock")}</p>
                        )}
                      </td>
                      <td className="p-2 w-32">
                        <div className="field-shell">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
                            dir="ltr"
                          />
                        </div>
                      </td>
                      <td className="p-2 text-[var(--ink)] font-medium" dir="ltr">
                        {lineTotal.toLocaleString("ar-SA")}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          disabled={lines.length <= 1}
                          className="text-[var(--danger)] hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Icon name="trash" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#FAFBFC]">
                  <td colSpan={3} className="p-3 text-[var(--sub)] text-[12.5px]">
                    {t("invoice.subTotal")}
                  </td>
                  <td colSpan={2} className="p-3 text-[var(--ink)] font-medium" dir="ltr">
                    {totals.subTotal.toLocaleString("ar-SA")} ر.س
                  </td>
                </tr>
                <tr className="bg-[#FAFBFC]">
                  <td colSpan={3} className="p-3 text-[var(--sub)] text-[12.5px]">
                    {isVatRegistered ? t("invoice.taxEstimated") : t("invoice.taxNotRegistered")}
                  </td>
                  <td colSpan={2} className="p-3 text-[var(--ink)] font-medium" dir="ltr">
                    {totals.estimatedTax.toLocaleString("ar-SA")} ر.س
                  </td>
                </tr>
                <tr className="bg-[#FAFBFC] font-bold">
                  <td colSpan={3} className="p-3 text-[var(--ink)] text-[13px]">
                    {t("invoice.totalEstimated")}
                  </td>
                  <td colSpan={2} className="p-3 text-[var(--blue-deep)] text-[15px]" dir="ltr">
                    {totals.estimatedTotal.toLocaleString("ar-SA")} ر.س
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={addLine}
              className="text-[13px] text-[var(--blue)] font-bold flex items-center gap-1.5 hover:underline"
            >
              <Icon name="plus" />
              {t("invoice.addLine")}
            </button>
          </div>
        </div>

        <p className="text-[11.5px] text-[var(--sub)] mb-4">
          {t("invoice.disclaimer")}
        </p>

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? t("common.saving") : t("invoice.saveSale")}
          </button>
          <Link href="/dashboard/accounting/invoices" className="btn btn-secondary">
            {t("common.cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}

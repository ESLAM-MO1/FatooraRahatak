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
  discount: string;
}

const emptyLine: Line = { productId: "", quantity: "1", unitPrice: "", discount: "" };
const VAT_RATE = 0.15;

export default function NewPurchaseInvoicePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const gate = usePackageFeature("hasAccountingFull");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState(false);

  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierCity, setSupplierCity] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isVatRegistered, setIsVatRegistered] = useState(false);

  useEffect(() => {
    if (!gate.ready || !gate.allowed) return;
    api
      .get("/products")
      .then((res) => setProducts(res.data.data))
      .catch(() => setProductsError(true))
      .finally(() => setLoadingProducts(false));
  }, [gate.ready, gate.allowed]);
  useEffect(() => {
  if (!gate.ready || !gate.allowed) return;
  api
    .get("/stores/my-store")
    .then((res) => setIsVatRegistered(res.data.data.isVatRegistered))
    .catch(() => {});
  }, [gate.ready, gate.allowed]);

  if (!gate.ready) {
    return <LoadingState />;
  }

  if (!gate.allowed) {
    return <RestrictedFeatureState />;
  }

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
        if (product) line.unitPrice = String(product.costPrice);
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
  const totalDiscount = lines.reduce((sum, l) => sum + (parseFloat(l.discount) || 0), 0);
  const net = subTotal - totalDiscount;
  const estimatedTax = isVatRegistered ? Math.round(net * VAT_RATE * 100) / 100 : 0;
  return { subTotal, totalDiscount, net, estimatedTax, estimatedTotal: net + estimatedTax };
}, [lines, isVatRegistered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!supplierName.trim()) {
      setError(t("invoice.enterSupplierName"));
      return;
    }
    const validLines = lines.filter((l) => l.productId && parseFloat(l.quantity) > 0 && l.unitPrice !== "");
    if (validLines.length === 0) {
      setError(t("invoice.addLineError"));
      return;
    }

    const invalidDiscount = validLines.find((l) => {
      const qty = parseFloat(l.quantity) || 0;
      const price = parseFloat(l.unitPrice) || 0;
      const disc = parseFloat(l.discount) || 0;
      return disc < 0 || disc > qty * price;
    });
    if (invalidDiscount) {
      setError(t("invoice.invalidDiscount"));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        invoiceDate,
        supplierName: supplierName.trim(),
        supplierPhone: supplierPhone || null,
        supplierCity: supplierCity || null,
        notes: notes || null,
        paymentMethod,
        items: validLines.map((l) => ({
          productId: Number(l.productId),
          variantId: null,
          quantity: Number(l.quantity),
          unitPrice: parseFloat(l.unitPrice),
          discountAmount: parseFloat(l.discount) || 0,
        })),
      };
      const res = await api.post("/invoices/purchase", payload);
      router.push(`/dashboard/accounting/invoices/${res.data.data.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t("invoice.savePurchaseError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader icon="receipt" title={t("invoice.newPurchaseTitle")}>
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
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("invoice.supplierName")}</label>
            <div className="field-shell">
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder={t("invoice.supplierNamePlaceholder")}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("invoice.supplierPhone")}</label>
              <div className="field-shell">
                <input
                  type="text"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="+9665XXXXXXXX"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("invoice.supplierCity")}</label>
              <div className="field-shell">
                <input
                  type="text"
                  value={supplierCity}
                  onChange={(e) => setSupplierCity(e.target.value)}
                  placeholder={t("invoice.guestCityPlaceholder")}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px] w-2/5">{t("invoice.product")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.quantity")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.purchaseUnitPrice")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.discount")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.lineTotal")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("invoice.lineAfterDiscount")}</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
                  const lineDiscount = parseFloat(line.discount) || 0;
                  const lineAfterDiscount = lineTotal - lineDiscount;
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
                                {p.nameAr} ({p.sku}) — {t("invoice.currentCost")}: {p.costPrice}
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
                      <td className="p-2 w-28">
                        <div className="field-shell">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.discount}
                            onChange={(e) => updateLine(i, "discount", e.target.value)}
                            dir="ltr"
                          />
                        </div>
                      </td>
                      <td className="p-2 text-[var(--ink)] font-medium" dir="ltr">
                        {lineTotal.toLocaleString("ar-SA-u-nu-latn")}
                      </td>
                      <td className="p-2 text-[var(--blue-deep)] font-bold" dir="ltr">
                        {lineAfterDiscount.toLocaleString("ar-SA-u-nu-latn")}
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
                  <td colSpan={5} className="p-3 text-[var(--sub)] text-[12.5px]">
                    {t("invoice.subTotal")}
                  </td>
                  <td colSpan={2} className="p-3 text-[var(--ink)] font-medium" dir="ltr">
                    {totals.subTotal.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
                  </td>
                </tr>
                <tr className="bg-[#FAFBFC]">
                  <td colSpan={5} className="p-3 text-[var(--sub)] text-[12.5px]">
                    {t("invoice.totalDiscount")}
                  </td>
                  <td colSpan={2} className="p-3 text-[var(--ink)] font-medium" dir="ltr">
                    {totals.totalDiscount.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
                  </td>
                </tr>
                <tr className="bg-[#FAFBFC]">
                  <td colSpan={5} className="p-3 text-[var(--sub)] text-[12.5px]">
                    {t("invoice.net")}
                  </td>
                  <td colSpan={2} className="p-3 text-[var(--ink)] font-medium" dir="ltr">
                    {totals.net.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
                  </td>
                </tr>
                <tr className="bg-[#FAFBFC]">
                  <td colSpan={5} className="p-3 text-[var(--sub)] text-[12.5px]">
                    {isVatRegistered ? t("invoice.taxEstimated") : t("invoice.taxNotRegistered")}
                  </td>
                  <td colSpan={2} className="p-3 text-[var(--ink)] font-medium" dir="ltr">
                    {totals.estimatedTax.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
                  </td>
                </tr>
                <tr className="bg-[#FAFBFC] font-bold">
                  <td colSpan={5} className="p-3 text-[var(--ink)] text-[13px]">
                    {t("invoice.totalEstimated")}
                  </td>
                  <td colSpan={2} className="p-3 text-[var(--blue-deep)] text-[15px]" dir="ltr">
                    {totals.estimatedTotal.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
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

        <div className="card p-5 mb-4">
          <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("invoice.notes")}</label>
          <div className="field-shell">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("invoice.notesPlaceholder")}
              rows={3}
            />
          </div>
        </div>

        <p className="text-[11.5px] text-[var(--sub)] mb-4">
          {t("invoice.purchaseDisclaimer")}
        </p>

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? t("common.saving") : t("invoice.savePurchase")}
          </button>
          <Link href="/dashboard/accounting/invoices" className="btn btn-secondary">
            {t("common.cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}

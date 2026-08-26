"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import Can from "@/components/Can";
import PaymentMethodLogo from "@/components/PaymentMethodLogo";
import { InvoiceDetail, printInvoice } from "@/lib/invoicePrint";

interface Product {
  id: number; categoryId: number | null; nameAr: string; sku: string; barcode: string | null;
  basePrice: number; discountPrice: number | null; availableQuantity: number;
}
interface CartLine {
  productId: number; nameAr: string; unitPrice: number;
  quantity: number; availableQuantity: number;
}
interface PosShift {
  id: number; openedByName: string; openedAt: string;
  startingCash: number; totalSales: number; isOpen: boolean;
}

const VAT_RATE = 0.15;

const PAYMENT_METHODS = [
  { value: "Cash", label: "pos.cash" },
  { value: "Mada", label: "pos.mada" },
  { value: "BankTransfer", label: "pos.bankTransfer" },
  { value: "Tabby", label: "pos.tabby" },
  { value: "Tamara", label: "pos.tamara" },
];

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export default function CashierPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [guestName, setGuestName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [vatRegistered, setVatRegistered] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [lastInvoice, setLastInvoice] = useState<InvoiceDetail | null>(null);
  const [changeDue, setChangeDue] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [showPaymentLink, setShowPaymentLink] = useState(false);

  const [shift, setShift] = useState<PosShift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [startingCash, setStartingCash] = useState("0");
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [endingCash, setEndingCash] = useState("0");

  const fetchShift = async () => {
    try { const r = await api.get("/pos/shifts/current"); setShift(r.data.data); }
    catch { }
    finally { setShiftLoading(false); }
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/products", { params: { page: 1, pageSize: 500 } });
      setProducts((res.data.data.items || res.data.data || []).filter((p: Product) => p.availableQuantity > 0));
      try {
        const s = await api.get("/stores/info");
        setVatRegistered(s.data.data?.isVatRegistered === true);
      } catch { /* store info غير متاح */ }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setLoadError(e.response?.data?.message || t("pos.loadError"));
    } finally { setLoading(false); }
  }, [t]);

  useEffect(() => { fetchProducts(); fetchShift(); }, [fetchProducts]); // eslint-disable-line react-hooks/set-state-in-effect

  const filtered = products.filter(p =>
    p.nameAr.includes(search) || p.sku.includes(search)
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.productId === product.id);
      if (existing) {
        if (existing.quantity >= existing.availableQuantity) return prev;
        return prev.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        productId: product.id, nameAr: product.nameAr,
        unitPrice: product.discountPrice || product.basePrice,
        quantity: 1, availableQuantity: product.availableQuantity
      }];
    });
  };

  const changeQty = (productId: number, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.productId !== productId) return c;
      const q = c.quantity + delta;
      if (q <= 0) return null;
      if (q > c.availableQuantity) return c;
      return { ...c, quantity: q };
    }).filter(Boolean) as CartLine[]);
  };

  const removeLine = (productId: number) => {
    setCart(prev => prev.filter(c => c.productId !== productId));
  };

  const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const tax = vatRegistered ? Math.round(subtotal * VAT_RATE * 100) / 100 : 0;
  const total = subtotal + tax;
  const received = parseFloat(receivedAmount) || 0;
  const change = received > 0 && received >= total ? received - total : 0;
  const cashShort = paymentMethod === "Cash" && received > 0 && received < total;

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift) return;
    const q = scanInput.trim().toLowerCase();
    if (!q) return;
    const p = products.find(
      (pr) =>
        (pr.sku && pr.sku.toLowerCase() === q) ||
        (pr.barcode && pr.barcode.toLowerCase() === q)
    );
    if (p) {
      addToCart(p);
      setScanInput("");
      setError("");
    } else {
      setError(t("pos.productNotFound"));
    }
  };

  const handleSale = async () => {
    if (cart.length === 0) return;
    if (cashShort) { setError(t("pos.insufficientAmount")); return; }
    setError(""); setSuccessMessage(""); setSubmitting(true);
    try {
      const res = await api.post("/pos/sale", {
        guestName: guestName.trim() || undefined,
        paymentMethod,
        items: cart.map(c => ({ productId: c.productId, quantity: c.quantity })),
      });

      // ✅ طريقة إلكترونية (شبكة/بطاقة/تابي/تمارا): البيع معلق — نفتح بوابة الدفع
      if (res.data?.data?.pending && res.data?.data?.paymentLinkUrl) {
        setPaymentLink(res.data.data.paymentLinkUrl);
        setShowPaymentLink(true);
        setSuccessMessage(res.data.message || t("pos.paymentLinkCreated"));
        return;
      }

      setLastInvoice(res.data.data);
      setChangeDue(change);
      setShowReceipt(true);
      setSuccessMessage(res.data.message);
      setCart([]); setGuestName(""); setReceivedAmount("");
      await fetchShift();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t("pos.error"));
    } finally { setSubmitting(false); }
  };

  const handleOpenShift = async () => {
    try {
      const r = await api.post("/pos/shifts/open", { startingCash: parseFloat(startingCash) || 0 });
      setShift(r.data.data); setShowOpenShift(false); setError(""); setSuccessMessage(r.data.message);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t("pos.error"));
    }
  };

  const handleCloseShift = async () => {
    if (!shift) return;
    try {
      const r = await api.post(`/pos/shifts/${shift.id}/close`, { endingCash: parseFloat(endingCash) || 0 });
      setShift(null); setShowCloseShift(false); setError(""); setSuccessMessage(r.data.message);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t("pos.error"));
    }
  };

  if (loading || shiftLoading) return <LoadingState />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--blue-50)] flex items-center justify-center"><Icon name="cashier" className="text-[var(--blue)]" size={18} /></div>
          <h1 className="text-[24px] font-bold text-[var(--blue-deep)]">{t("pos.title")}</h1>
        </div>

        {shift ? (
          <div className="flex items-center gap-3">
            <span className="badge badge--green">{t("pos.shiftOpen")}</span>
            <span className="text-[12px] text-[var(--sub)]">{t("pos.sales")}: {shift.totalSales} {t("common.sar")}</span>
            <Can code="POS.Add">
              <button onClick={() => { setShowCloseShift(true); setEndingCash(String(shift.totalSales)); }} className="btn btn-outline btn-sm">{t("pos.closeShift")}</button>
            </Can>
          </div>
        ) : (
          <Can code="POS.Add">
            <button onClick={() => setShowOpenShift(true)} className="btn btn-primary btn-sm"><Icon name="plus" size={14} /> {t("pos.openShift")}</button>
          </Can>
        )}
      </div>

      {loadError && <div className="alert alert--danger mb-4">{loadError}</div>}
      {error && <div className="alert alert--danger mb-4">{error}</div>}
      <SuccessToast message={successMessage} fixed className="mb-4" />

      {!shift && (
        <div className="rounded-2xl border border-dashed border-[var(--blue)]/40 bg-gradient-to-b from-[var(--blue-50)] to-white px-6 py-8 text-center mb-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white border border-[var(--blue)]/30 shadow-sm flex items-center justify-center mb-4">
            <Icon name="cashier" className="text-[var(--blue)]" size={26} />
          </div>
          <h3 className="text-[16px] font-bold text-[var(--ink)] mb-1.5">{t("pos.noShiftTitle")}</h3>
          <p className="text-[13px] text-[var(--sub)] mb-5 max-w-md mx-auto leading-relaxed">{t("pos.noShiftDesc")}</p>
          <Can code="POS.Add">
            <button onClick={() => setShowOpenShift(true)} className="btn btn-primary btn-sm">
              <Icon name="plus" size={14} /> {t("pos.openShift")}
            </button>
          </Can>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleScan} className="field-shell mb-3">
            <Icon name="tag" size={16} className="text-[var(--sub)]" />
            <input type="text" value={scanInput} onChange={e => setScanInput(e.target.value)} placeholder={t("pos.scanBarcode")} disabled={!shift} />
          </form>

          <div className="field-shell mb-4">
            <Icon name="search" size={16} className="text-[var(--sub)]" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t("pos.searchProduct")} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="col-span-full text-center text-[var(--sub)] py-8">{t("pos.noProducts")}</p>
            ) : filtered.map(product => (
              <button key={product.id} onClick={() => shift && addToCart(product)} disabled={!shift}
                className={`text-right p-3 rounded-xl border transition ${!shift ? "opacity-40 cursor-not-allowed" : "hover:border-[var(--blue)] border-gray-200 bg-white"}`}>
                <p className="text-[13px] font-bold text-[var(--ink)] truncate">{product.nameAr}</p>
                <p className="text-[12px] text-[var(--blue)] font-bold mt-1">{product.discountPrice || product.basePrice} {t("common.sar")}</p>
                <p className="text-[10px] text-[var(--sub)]">{t("pos.remaining")}: {product.availableQuantity}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4 h-fit">
          <h2 className="text-[15px] font-bold text-[var(--ink)] mb-3">{t("pos.invoice")}</h2>

          <div className="field-shell mb-3">
            <span className="text-[var(--sub)] text-[12px]">{t("pos.customer")}</span>
            <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder={t("pos.cashCustomer")} disabled={!shift} />
          </div>

          <div className="max-h-[40vh] overflow-y-auto space-y-2 mb-4">
            {cart.length === 0 ? (
              <p className="text-[12px] text-[var(--sub)] text-center py-4">{t("pos.emptyInvoice")}</p>
            ) : cart.map(line => (
              <div key={line.productId} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium truncate">{line.nameAr}</p>
                  <p className="text-[11px] text-[var(--sub)]">{line.unitPrice} {t("common.sar")}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => changeQty(line.productId, -1)} className="w-6 h-6 rounded bg-white border text-[13px]">−</button>
                  <span className="w-5 text-center text-[13px]">{line.quantity}</span>
                  <button onClick={() => changeQty(line.productId, 1)} className="w-6 h-6 rounded bg-white border text-[13px]">+</button>
                </div>
                <span className="text-[12px] font-bold w-16 text-left">{(line.unitPrice * line.quantity).toFixed(2)}</span>
                <button onClick={() => removeLine(line.productId)} className="text-[var(--danger)] text-[12px] mr-1">✕</button>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-1.5 mb-4">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[var(--sub)]">{t("pos.subtotal")}</span>
              <span className="text-[var(--ink)]" dir="ltr">{subtotal.toFixed(2)} {t("common.sar")}</span>
            </div>
            {vatRegistered && (
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[var(--sub)]">{t("pos.tax")} (15%)</span>
                <span className="text-[var(--ink)]" dir="ltr">{tax.toFixed(2)} {t("common.sar")}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1.5">
              <span className="text-[15px] font-bold text-[var(--ink)]">{t("pos.total")}</span>
              <span className="text-[20px] font-bold text-[var(--blue)]" dir="ltr">{total.toFixed(2)} {t("common.sar")}</span>
            </div>

            {paymentMethod === "Cash" && total > 0 && (
              <>
                <div className="field-shell mt-2">
                  <span className="text-[var(--sub)] text-[12px]">{t("pos.receivedAmount")}</span>
                  <input type="number" min="0" step="0.01" value={receivedAmount}
                    onChange={e => setReceivedAmount(e.target.value)}
                    placeholder={String(total.toFixed(2))} disabled={!shift} />
                </div>
                {received > 0 && received >= total && (
                  <div className="flex items-center justify-between text-[14px] font-bold">
                    <span className="text-[var(--blue-deep)]">{t("pos.change")}</span>
                    <span className="text-[var(--green)]" dir="ltr">{change.toFixed(2)} {t("common.sar")}</span>
                  </div>
                )}
                {cashShort && (
                  <p className="text-[12px] text-[var(--danger)]">{t("pos.insufficientAmount")}</p>
                )}
              </>
            )}
          </div>

          <div className="mb-4">
            <span className="text-[var(--sub)] text-[12px] block mb-2">{t("pos.paymentMethod")}</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PAYMENT_METHODS.map(pm => {
                const isSelected = paymentMethod === pm.value;
                return (
                  <button
                    key={pm.value}
                    type="button"
                    onClick={() => setPaymentMethod(pm.value)}
                    disabled={!shift}
                    aria-pressed={isSelected}
                    title={t(pm.label)}
                    className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 text-[11.5px] font-bold transition-all ${isSelected ? "border-[var(--blue)] bg-[var(--blue-50)] text-[var(--blue-deep)] shadow-sm" : "border-gray-200 bg-white text-[var(--sub)] hover:border-gray-300 hover:bg-gray-50"} ${!shift ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--blue)] flex items-center justify-center ring-2 ring-white">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                    <PaymentMethodLogo method={pm.value} size={34} />
                    <span className="leading-tight text-center w-full">{t(pm.label)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Can code="POS.Add">
            <button onClick={handleSale} disabled={cart.length === 0 || submitting || !shift || cashShort}
              className="btn btn-primary w-full disabled:opacity-40">
              {submitting ? t("common.loading") : t("pos.checkout")}
            </button>
          </Can>
        </div>
      </div>

      {showOpenShift && <div className="modal-overlay" onClick={() => setShowOpenShift(false)}>
        <div className="modal-card max-w-sm" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4"><h2 className="text-[18px] font-bold">{t("pos.openShiftTitle")}</h2><button onClick={() => setShowOpenShift(false)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button></div>
          <div className="mb-4">
            <label>{t("pos.startingCash")}</label>
            <div className="field-shell mt-1"><input type="number" value={startingCash} onChange={e => setStartingCash(e.target.value)} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowOpenShift(false)} className="btn btn-outline flex-1">{t("common.cancel")}</button>
            <button onClick={handleOpenShift} className="btn btn-primary flex-1">{t("pos.openShift")}</button>
          </div>
        </div>
      </div>}

      {showCloseShift && <div className="modal-overlay" onClick={() => setShowCloseShift(false)}>
        <div className="modal-card max-w-sm" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4"><h2 className="text-[18px] font-bold">{t("pos.closeShiftTitle")}</h2><button onClick={() => setShowCloseShift(false)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button></div>
          <div className="mb-2 text-[13px]"><span className="text-[var(--sub)]">{t("pos.sales")}: </span>{shift?.totalSales} {t("common.sar")}</div>
          <div className="mb-4">
            <label>{t("pos.actualCash")}</label>
            <div className="field-shell mt-1"><input type="number" value={endingCash} onChange={e => setEndingCash(e.target.value)} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCloseShift(false)} className="btn btn-outline flex-1">{t("common.cancel")}</button>
            <button onClick={handleCloseShift} className="btn btn-primary flex-1">{t("pos.close")}</button>
          </div>
        </div>
      </div>}

      {showReceipt && lastInvoice && (
        <div className="modal-overlay" onClick={() => setShowReceipt(false)}>
          <div className="modal-card max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[18px] font-bold">{t("pos.saleSuccess")}</h2>
              <button onClick={() => setShowReceipt(false)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
            </div>
            <p className="text-[13px] text-[var(--sub)] mb-4">
              {t("pos.invoiceNumber")}: <b className="text-[var(--ink)]">{lastInvoice.invoiceNumber}</b>
            </p>
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1 mb-4">
              <div className="flex justify-between"><span className="text-[var(--sub)]">{t("pos.totalDue")}</span><span className="font-bold" dir="ltr">{lastInvoice.totalAmount.toFixed(2)} {t("common.sar")}</span></div>
              {changeDue > 0 && (
                <div className="flex justify-between"><span className="text-[var(--blue-deep)]">{t("pos.change")}</span><span className="font-bold text-[var(--green)]" dir="ltr">{changeDue.toFixed(2)} {t("common.sar")}</span></div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowReceipt(false); }} className="btn btn-outline flex-1">{t("pos.done")}</button>
              <button onClick={() => printInvoice(lastInvoice, t)} className="btn btn-primary flex-1"><Icon name="printer" size={14} /> {t("pos.printReceipt")}</button>
            </div>
          </div>
        </div>
      )}

      {showPaymentLink && paymentLink && (
        <div className="modal-overlay" onClick={() => setShowPaymentLink(false)}>
          <div className="modal-card max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[18px] font-bold">{t("pos.paymentGatewayTitle")}</h2>
              <button onClick={() => setShowPaymentLink(false)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
            </div>
            <p className="text-[13px] text-[var(--sub)] mb-4">{t("pos.paymentGatewayDesc")}</p>
            <div className="bg-gray-50 rounded-lg p-3 text-sm mb-4 flex items-center justify-center gap-2">
              <PaymentMethodLogo method={paymentMethod} size={36} />
              <span className="font-bold text-[var(--ink)]">{t(`pos.${paymentMethod.toLowerCase()}`)}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPaymentLink(false)} className="btn btn-outline flex-1">{t("pos.later")}</button>
              <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary flex-1 justify-center">
                <Icon name="link" size={14} /> {t("pos.openGateway")}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
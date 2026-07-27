"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import LoadingState from "@/components/LoadingState";

interface Product {
  id: number; categoryId: number | null; nameAr: string; sku: string;
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

const PAYMENT_METHODS = [
  { value: "Cash", label: "pos.cash" },
  { value: "Credit", label: "pos.card" },
];

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
      const res = await api.get("/products");
      setProducts(res.data.data.filter((p: any) => p.availableQuantity > 0));
    } catch (err: any) {
      setLoadError(err.response?.data?.message || t("pos.loadError"));
    } finally { setLoading(false); }
  }, [t]);

  useEffect(() => { fetchProducts(); fetchShift(); }, [fetchProducts]);

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

  const total = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);

  const handleSale = async () => {
    if (cart.length === 0) return;
    setError(""); setSuccessMessage(""); setSubmitting(true);
    try {
      const res = await api.post("/pos/sale", {
        guestName: guestName.trim() || undefined,
        paymentMethod,
        items: cart.map(c => ({ productId: c.productId, quantity: c.quantity })),
      });
      setSuccessMessage(`${res.data.message} — ${t("pos.invoiceNumber")}: ${res.data.data.invoiceNumber}`);
      setCart([]); setGuestName("");
      await fetchShift();
    } catch (err: any) {
      setError(err.response?.data?.message || t("pos.error"));
    } finally { setSubmitting(false); }
  };

  const handleOpenShift = async () => {
    try {
      const r = await api.post("/pos/shifts/open", { startingCash: parseFloat(startingCash) || 0 });
      setShift(r.data.data); setShowOpenShift(false); setError(""); setSuccessMessage(r.data.message);
    } catch (err: any) { setError(err.response?.data?.message || t("pos.error")); }
  };

  const handleCloseShift = async () => {
    if (!shift) return;
    try {
      const r = await api.post(`/pos/shifts/${shift.id}/close`, { endingCash: parseFloat(endingCash) || 0 });
      setShift(null); setShowCloseShift(false); setError(""); setSuccessMessage(r.data.message);
    } catch (err: any) { setError(err.response?.data?.message || t("pos.error")); }
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
            <span className="text-[12px] text-[var(--sub)]">{t("pos.sales")}: {shift.totalSales} ر.س</span>
            <button onClick={() => { setShowCloseShift(true); setEndingCash(String(shift.totalSales)); }} className="btn btn-outline btn-sm">{t("pos.closeShift")}</button>
          </div>
        ) : (
          <button onClick={() => setShowOpenShift(true)} className="btn btn-primary btn-sm"><Icon name="plus" size={14} /> {t("pos.openShift")}</button>
        )}
      </div>

      {loadError && <div className="alert alert--danger mb-4">{loadError}</div>}
      {error && <div className="alert alert--danger mb-4">{error}</div>}
      {successMessage && <div className="alert alert--success mb-4">{successMessage}</div>}

      {!shift && (
        <div className="alert alert--warning mb-4">
          <Icon name="alert" size={16} />
          <span>{t("pos.needOpenShift")}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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
                <p className="text-[12px] text-[var(--blue)] font-bold mt-1">{product.discountPrice || product.basePrice} ر.س</p>
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

          <div className="field-shell mb-3">
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} disabled={!shift}>
              {PAYMENT_METHODS.map(pm => <option key={pm.value} value={pm.value}>{t(pm.label)}</option>)}
            </select>
          </div>

          <div className="max-h-[40vh] overflow-y-auto space-y-2 mb-4">
            {cart.length === 0 ? (
              <p className="text-[12px] text-[var(--sub)] text-center py-4">{t("pos.emptyInvoice")}</p>
            ) : cart.map(line => (
              <div key={line.productId} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium truncate">{line.nameAr}</p>
                  <p className="text-[11px] text-[var(--sub)]">{line.unitPrice} ر.س</p>
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

          <div className="flex items-center justify-between border-t pt-3 mb-4">
            <span className="text-[15px] font-bold text-[var(--ink)]">{t("pos.total")}</span>
            <span className="text-[20px] font-bold text-[var(--blue)]">{total.toFixed(2)} ر.س</span>
          </div>

          <button onClick={handleSale} disabled={cart.length === 0 || submitting || !shift}
            className="btn btn-primary w-full disabled:opacity-40">
            {submitting ? t("common.loading") : t("pos.checkout")}
          </button>
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
          <div className="mb-2 text-[13px]"><span className="text-[var(--sub)]">{t("pos.sales")}: </span>{shift?.totalSales} ر.س</div>
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
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";

type Img = { id: string; file: File; url: string };
type Cat = { id: number; nameAr: string; nameEn?: string };

const L = {
  ar: {
    title: "منتج ملموس جديد", back: "رجوع للمنتجات",
    images: "صور المنتج", drop: "اسحب الصور وأفلتها هنا", browse: "أو اختر من جهازك",
    imgHint: "JPG أو PNG أو WebP أو GIF، حتى 5 ميجا للصورة و10 صور.",
    primary: "الأساسية", makePrimary: "اجعلها أساسية", remove: "حذف",
    basics: "المعلومات الأساسية", nameAr: "اسم المنتج (عربي)", nameEn: "اسم المنتج (إنجليزي)",
    price: "السعر", discount: "السعر المخفض", cost: "سعر التكلفة", margin: "هامش الربح",
    category: "التصنيف", noCategory: "بدون تصنيف",
    descAr: "الوصف (عربي)", descEn: "الوصف (إنجليزي)",
    adv: "معلومات متقدمة", sku: "رمز المنتج (SKU)", skuAuto: "يُنشأ تلقائيًا إن تُرك فارغًا",
    barcode: "الباركود", weight: "الوزن",
    stock: "الكميات", qty: "الكمية المتوفرة",
    warranty: "الضمان", hasWarranty: "المنتج عليه ضمان", months: "مدة الضمان بالأشهر",
    create: "إنشاء المنتج", creating: "جارٍ الإنشاء...", cancel: "إلغاء",
    preview: "معاينة في المتجر", previewEmpty: "أضف الصورة والاسم والسعر لتظهر المعاينة هنا.",
    namePh: "اسم المنتج", addToCart: "أضف للسلة",
    errName: "اسم المنتج بالعربي مطلوب.", errPrice: "أدخل سعرًا صحيحًا.",
    errDisc: "السعر المخفض يجب أن يكون أقل من السعر.",
    saveErr: "تعذر حفظ المنتج. حاول مرة أخرى.",
    partial: (n: number) => `تم إنشاء المنتج، لكن تعذر رفع ${n} صورة. اضغط "إنشاء المنتج" لإعادة المحاولة أو أضفها لاحقًا من صفحة المنتج.`,
    openProduct: "فتح صفحة المنتج", upgrade: "ترقية الباقة", badFile: "تم تجاهل ملفات غير مدعومة أو أكبر من 5 ميجا.",
  },
  en: {
    title: "New physical product", back: "Back to products",
    images: "Product images", drop: "Drag images here", browse: "or choose from your device",
    imgHint: "JPG, PNG, WebP or GIF, up to 5 MB each and 10 images.",
    primary: "Primary", makePrimary: "Make primary", remove: "Remove",
    basics: "Basic information", nameAr: "Product name (Arabic)", nameEn: "Product name (English)",
    price: "Price", discount: "Discounted price", cost: "Cost price", margin: "Profit margin",
    category: "Category", noCategory: "No category",
    descAr: "Description (Arabic)", descEn: "Description (English)",
    adv: "Advanced information", sku: "SKU", skuAuto: "Generated automatically if left empty",
    barcode: "Barcode", weight: "Weight",
    stock: "Stock", qty: "Available quantity",
    warranty: "Warranty", hasWarranty: "This product has a warranty", months: "Warranty (months)",
    create: "Create product", creating: "Creating...", cancel: "Cancel",
    preview: "Storefront preview", previewEmpty: "Add an image, name and price to see the preview here.",
    namePh: "Product name", addToCart: "Add to cart",
    errName: "Arabic product name is required.", errPrice: "Enter a valid price.",
    errDisc: "Discounted price must be lower than the price.",
    saveErr: "Could not save the product. Please try again.",
    partial: (n: number) => `Product created, but ${n} image(s) failed to upload. Press "Create product" to retry or add them later from the product page.`,
    openProduct: "Open product page", upgrade: "Upgrade plan", badFile: "Unsupported or oversized files were skipped.",
  },
};

const OK_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
const label = "block text-[12.5px] font-bold text-[var(--ink)] mb-1.5";
const fmt = (n: number) => n.toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 2 });

export default function NewProductPage() {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const en = !!i18n.language?.startsWith("en");
  const s = en ? L.en : L.ar;

  const [f, setF] = useState({
    nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "", categoryId: "",
    basePrice: "", discountPrice: "", costPrice: "", sku: "", barcode: "", weight: "",
    initialQuantity: "0", warrantyMonths: "",
  });
  const [warranty, setWarranty] = useState(false);
  const [imgs, setImgs] = useState<Img[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const createdId = useRef<number | null>(null);
  const uploaded = useRef(0);
  const done = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgsRef = useRef<Img[]>([]);
  imgsRef.current = imgs;

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    api.get("/categories").then((r) => setCats(r.data.data || [])).catch(() => {});
    return () => imgsRef.current.forEach((i) => URL.revokeObjectURL(i.url));
  }, []);

  const dirty = !!(f.nameAr || f.nameEn || f.basePrice || imgs.length);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty && !done.current) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    let skipped = false;
    const next: Img[] = [];
    Array.from(list).forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!OK_EXT.includes(ext) || file.size > 5 * 1024 * 1024) { skipped = true; return; }
      next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, url: URL.createObjectURL(file) });
    });
    setNote(skipped ? s.badFile : "");
    setImgs((p) => [...p, ...next].slice(0, 10));
  };
  const removeImg = (id: string) => setImgs((p) => p.filter((i) => i.id !== id));
  const makePrimary = (idx: number) => setImgs((p) => [p[idx], ...p.filter((_, i) => i !== idx)]);

  const price = parseFloat(f.basePrice);
  const disc = parseFloat(f.discountPrice);
  const cost = parseFloat(f.costPrice);
  const errors = {
    name: !f.nameAr.trim(),
    price: isNaN(price) || price < 0,
    disc: f.discountPrice !== "" && (isNaN(disc) || disc < 0 || (!isNaN(price) && disc >= price)),
  };
  const hasDisc = !isNaN(disc) && !isNaN(price) && disc > 0 && disc < price;
  const shown = en ? f.nameEn.trim() || f.nameAr.trim() : f.nameAr.trim() || f.nameEn.trim();
  const eff = hasDisc ? disc : price;
  const pct = hasDisc ? Math.round((1 - disc / price) * 100) : 0;
  const margin = !isNaN(cost) && cost > 0 && !isNaN(eff) && eff > 0
    ? Math.round(((eff - cost) / eff) * 100) : null;

  const submit = async () => {
    setTouched(true); setErr("");
    if (errors.name || errors.price || errors.disc) return;
    setBusy(true);
    try {
      if (!createdId.current) {
        const payload: Record<string, unknown> = {
          nameAr: f.nameAr.trim(),
          nameEn: f.nameEn.trim() || f.nameAr.trim(),
          basePrice: price,
          costPrice: isNaN(cost) ? 0 : cost,
          initialQuantity: parseInt(f.initialQuantity) || 0,
          hasWarranty: warranty,
        };
        if (f.categoryId) payload.categoryId = Number(f.categoryId);
        if (f.descriptionAr) payload.descriptionAr = f.descriptionAr;
        if (f.descriptionEn) payload.descriptionEn = f.descriptionEn;
        if (f.sku.trim()) payload.sku = f.sku.trim();
        if (f.barcode.trim()) payload.barcode = f.barcode.trim();
        if (f.weight) payload.weight = parseFloat(f.weight);
        if (f.discountPrice) payload.discountPrice = disc;
        if (warranty && f.warrantyMonths) payload.warrantyMonths = parseInt(f.warrantyMonths);
        const res = await api.post("/products", payload);
        createdId.current = res.data.data.id;
      }
      const id = createdId.current!;
      const failed: Img[] = [];
      for (const im of imgs) {
        try {
          const fd = new FormData();
          fd.append("file", im.file);
          const up = await api.post("/products/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
          await api.post(`/products/${id}/images`, {
            imageUrl: up.data.data.url, isPrimary: uploaded.current === 0, sortOrder: uploaded.current,
          });
          uploaded.current += 1;
        } catch { failed.push(im); }
      }
      if (failed.length) { setImgs(failed); setErr(s.partial(failed.length)); setBusy(false); return; }
      done.current = true;
      router.push("/dashboard/products");
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setErr(m || s.saveErr);
      setBusy(false);
    }
  };

  const limitErr = /limit|upgrade/i.test(err);
  const inv = (bad: boolean) => (touched && bad ? " !border-[var(--danger)]" : "");

  return (
    <div>
      <PageHeader icon="box" title={s.title}>
        <Link href="/dashboard/products" className="btn btn-secondary">{s.back}</Link>
      </PageHeader>

      {err && (
        <div className="alert alert--danger mb-4">
          {err}
          {limitErr && <div className="mt-2"><Link href="/dashboard/subscription" className="font-bold hover:underline">{s.upgrade}</Link></div>}
          {createdId.current && <div className="mt-2"><Link href={`/dashboard/products/${createdId.current}`} className="font-bold hover:underline">{s.openProduct}</Link></div>}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px] items-start pb-24">
        <div className="space-y-4 order-2 lg:order-none">
          <section className="card p-5">
            <h2 className="text-[15px] font-bold text-[var(--blue-deep)] mb-3">{s.images}</h2>
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" multiple className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {imgs.map((im, i) => (
                <div key={im.id} className="relative aspect-square rounded-xl border border-[var(--border)] overflow-hidden bg-[#F4F6F8]">
                  <img src={im.url} alt="" className="w-full h-full object-cover" />
                  {i === 0
                    ? <span className="badge badge--green absolute top-1.5 start-1.5">{s.primary}</span>
                    : <button type="button" onClick={() => makePrimary(i)} className="absolute bottom-1.5 start-1.5 text-[11px] font-bold bg-white/90 rounded-md px-2 py-1 text-[var(--ink)]">{s.makePrimary}</button>}
                  <button type="button" onClick={() => removeImg(im.id)} aria-label={s.remove}
                    className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full bg-white/90 text-[var(--danger)] text-[12px] leading-none">✕</button>
                </div>
              ))}
              {imgs.length < 10 && (
                <div role="button" tabIndex={0} onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                  className={`aspect-square rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center text-center p-3 cursor-pointer hover:bg-[var(--blue-50)] transition-colors ${imgs.length === 0 ? "col-span-2 sm:col-span-4 aspect-auto min-h-[150px]" : ""}`}>
                  <span className="text-[26px]" aria-hidden>🖼️</span>
                  <span className="text-[12.5px] font-bold text-[var(--ink)] mt-1">{s.drop}</span>
                  <span className="text-[11.5px] text-[var(--blue)] underline">{s.browse}</span>
                </div>
              )}
            </div>
            <p className="text-[11.5px] text-[var(--sub)] mt-2">{s.imgHint}</p>
            {note && <p className="text-[11.5px] text-[var(--danger)] mt-1">{note}</p>}
          </section>

          <section className="card p-5 space-y-3">
            <h2 className="text-[15px] font-bold text-[var(--blue-deep)]">{s.basics}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={label}>{s.nameAr} *</label>
                <div className={"field-shell" + inv(errors.name)}><input type="text" value={f.nameAr} onChange={set("nameAr")} /></div>
                {touched && errors.name && <p className="text-[11.5px] text-[var(--danger)] mt-1">{s.errName}</p>}
              </div>
              <div>
                <label className={label}>{s.nameEn}</label>
                <div className="field-shell"><input type="text" dir="ltr" value={f.nameEn} onChange={set("nameEn")} /></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={label}>{s.price} *</label>
                <div className={"field-shell" + inv(errors.price)}><input type="number" min={0} step="0.01" value={f.basePrice} onChange={set("basePrice")} /></div>
                {touched && errors.price && <p className="text-[11.5px] text-[var(--danger)] mt-1">{s.errPrice}</p>}
              </div>
              <div>
                <label className={label}>{s.discount}</label>
                <div className={"field-shell" + inv(errors.disc)}><input type="number" min={0} step="0.01" value={f.discountPrice} onChange={set("discountPrice")} /></div>
                {touched && errors.disc && <p className="text-[11.5px] text-[var(--danger)] mt-1">{s.errDisc}</p>}
              </div>
              <div>
                <label className={label}>{s.cost}</label>
                <div className="field-shell"><input type="number" min={0} step="0.01" value={f.costPrice} onChange={set("costPrice")} /></div>
                {margin !== null && <p className="text-[11.5px] text-[var(--sub)] mt-1">{s.margin}: {margin}%</p>}
              </div>
            </div>
            <div>
              <label className={label}>{s.category}</label>
              <div className="field-shell">
                <select value={f.categoryId} onChange={set("categoryId")}>
                  <option value="">{s.noCategory}</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{en ? c.nameEn || c.nameAr : c.nameAr}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={label}>{s.descAr}</label>
              <div className="field-shell items-start"><textarea rows={4} value={f.descriptionAr} onChange={set("descriptionAr")} /></div>
            </div>
            <div>
              <label className={label}>{s.descEn}</label>
              <div className="field-shell items-start"><textarea rows={3} dir="ltr" value={f.descriptionEn} onChange={set("descriptionEn")} /></div>
            </div>
          </section>

          <details className="card p-5">
            <summary className="cursor-pointer text-[15px] font-bold text-[var(--blue-deep)]">{s.adv}</summary>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className={label}>{s.sku}</label>
                <div className="field-shell"><input type="text" dir="ltr" value={f.sku} onChange={set("sku")} placeholder={s.skuAuto} /></div>
              </div>
              <div>
                <label className={label}>{s.barcode}</label>
                <div className="field-shell"><input type="text" dir="ltr" value={f.barcode} onChange={set("barcode")} /></div>
              </div>
              <div>
                <label className={label}>{s.weight}</label>
                <div className="field-shell"><input type="number" min={0} step="0.01" value={f.weight} onChange={set("weight")} /></div>
              </div>
            </div>
          </details>

          <details className="card p-5">
            <summary className="cursor-pointer text-[15px] font-bold text-[var(--blue-deep)]">{s.stock}</summary>
            <div className="mt-3 max-w-xs">
              <label className={label}>{s.qty}</label>
              <div className="field-shell"><input type="number" min={0} value={f.initialQuantity} onChange={set("initialQuantity")} /></div>
            </div>
          </details>

          <details className="card p-5">
            <summary className="cursor-pointer text-[15px] font-bold text-[var(--blue-deep)]">{s.warranty}</summary>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                <input type="checkbox" checked={warranty} onChange={(e) => setWarranty(e.target.checked)} />
                {s.hasWarranty}
              </label>
              {warranty && (
                <div className="field-shell w-48"><input type="number" min={1} value={f.warrantyMonths} onChange={set("warrantyMonths")} placeholder={s.months} /></div>
              )}
            </div>
          </details>
        </div>

        <aside className="order-1 lg:order-none lg:sticky lg:top-4">
          <div className="card p-4">
            <p className="text-[12px] font-bold text-[var(--sub)] mb-2">{s.preview}</p>
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#F4F6F8] flex items-center justify-center">
              {imgs[0]
                ? <img src={imgs[0].url} alt="" className="w-full h-full object-cover" />
                : <span className="text-[40px] opacity-30" aria-hidden>🖼️</span>}
              {hasDisc && <span className="badge badge--red absolute top-2 start-2">-{pct}%</span>}
            </div>
            <h3 className={`mt-3 text-[15px] font-bold ${shown ? "text-[var(--ink)]" : "text-[var(--sub)]"}`}>{shown || s.namePh}</h3>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[17px] font-extrabold text-[var(--blue-deep)]">{isNaN(eff) ? "—" : `${fmt(eff)} ${t("common.sar")}`}</span>
              {hasDisc && <span className="text-[12.5px] text-[var(--sub)] line-through">{fmt(price)}</span>}
            </div>
            <div className="mt-3 flex gap-2">
              <span className="btn btn-secondary flex-1 justify-center pointer-events-none opacity-80">{s.addToCart}</span>
              <span className="btn btn-secondary pointer-events-none opacity-80" aria-hidden>♡</span>
            </div>
            {!shown && isNaN(price) && imgs.length === 0 && (
              <p className="text-[12px] text-[var(--sub)] mt-3 leading-relaxed">{s.previewEmpty}</p>
            )}
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-[var(--border)] px-4 py-3 flex gap-3 justify-end">
        <Link href="/dashboard/products" className="btn btn-secondary">{s.cancel}</Link>
        <button type="button" onClick={submit} disabled={busy} className="btn btn-primary disabled:opacity-60">
          {busy ? s.creating : s.create}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";

type Img = { id: string; file: File; url: string };
type Cat = { id: number; nameAr: string; nameEn?: string };
type Kind = "Active" | "Draft";
type OptKind = "color" | "size" | "other";
type Opt = { id: string; kind: OptKind; name: string; values: string[]; input: string };
type Attr = { attributeName: string; attributeValue: string };
type Combo = { key: string; name: string; attrs: Attr[] };
type Row = { price: string; qty: string };

const MAX_OPTS = 3;
const MAX_COMBOS = 100;

const SUG = {
  ar: {
    color: ["أحمر", "أزرق", "أسود", "أبيض", "أخضر", "أصفر", "رمادي", "وردي", "بنفسجي", "برتقالي", "بني", "بيج"],
    size: ["S", "M", "L", "XL", "XXL", "XXXL"],
  },
  en: {
    color: ["Red", "Blue", "Black", "White", "Green", "Yellow", "Gray", "Pink", "Purple", "Orange", "Brown", "Beige"],
    size: ["S", "M", "L", "XL", "XXL", "XXXL"],
  },
};

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
    seo: "تحسين محركات البحث (SEO)", seoTitle: "عنوان الصفحة في جوجل", seoDesc: "الوصف في جوجل",
    seoPreview: "معاينة في نتائج البحث",
    create: "إنشاء المنتج", saveDraft: "حفظ كمسودة", creating: "جارٍ الحفظ...", cancel: "إلغاء",
    preview: "معاينة في المتجر", previewEmpty: "أضف الصورة والاسم والسعر لتظهر المعاينة هنا.",
    namePh: "اسم المنتج", addToCart: "أضف للسلة",
    errName: "اسم المنتج بالعربي مطلوب.", errPrice: "أدخل سعرًا صحيحًا.",
    errDisc: "السعر المخفض يجب أن يكون أقل من السعر.",
    saveErr: "تعذر حفظ المنتج. حاول مرة أخرى.",
    openProduct: "فتح صفحة المنتج", upgrade: "ترقية الباقة", badFile: "تم تجاهل ملفات غير مدعومة أو أكبر من 5 ميجا.",
    variants: "الخيارات والمتغيرات",
    variantsToggle: "هذا المنتج له أكثر من شكل (مثل اللون أو المقاس)",
    variantsHint: "فعّلها لو المنتج بيتباع بألوان أو مقاسات مختلفة. كل تركيبة تتحسب كمتغير له كمية خاصة.",
    example: "مثال: تيشيرت بلونين (أحمر، أزرق) ومقاسين (M، L) يتولد منه 4 متغيرات تلقائيًا.",
    addOptionTitle: "أضف خيارًا:",
    optColor: "اللون", optSize: "المقاس", optOther: "خيار آخر",
    otherName: "اسم الخيار", otherNamePh: "مثال: الخامة",
    pickCommon: "اختر من القيم الشائعة", addCustom: "أو اكتب قيمة أخرى", addBtn: "إضافة",
    chosen: "القيم المختارة", noneChosen: "لم تختر أي قيمة بعد",
    phColor: "مثال: بيج", phSize: "مثال: XXXL", phOther: "مثال: قطن",
    maxOpts: `الحد الأقصى ${MAX_OPTS} خيارات.`,
    tableTitle: "المتغيرات",
    tableHint: "حدد الكمية المتوفرة لكل متغير. وفرق السعر هو الزيادة أو النقص عن سعر المنتج، اتركه 0 لو نفس السعر.",
    variantCol: "المتغير", priceAdj: "فرق السعر", finalPrice: "السعر النهائي", qtyCol: "الكمية",
    totalQty: "إجمالي الكمية",
    qtyPerVariant: "الكمية تُحدد لكل متغير في جدول المتغيرات.",
    tooMany: `عدد المتغيرات يتجاوز ${MAX_COMBOS}. قلل القيم.`,
    errNames: "اكتب اسمًا لكل خيار بدون تكرار.",
    errNoValues: "اختر قيمة واحدة على الأقل لكل خيار، أو احذف الخيار الفارغ.",
    errRows: "فرق السعر أو الكمية في المتغيرات غير صحيح.",
    createdBut: "تم إنشاء المنتج، لكن",
    failImgs: (n: number) => `تعذر رفع ${n} صورة.`,
    failVars: (n: number) => `تعذر إنشاء ${n} متغير.`,
    retryHint: "اضغط الحفظ لإعادة المحاولة أو أكملها لاحقًا من صفحة المنتج.",
    discStart: "بداية الخصم", discEnd: "نهاية الخصم",
    errDates: "نهاية الخصم يجب أن تكون بعد البداية.",
    discHint: "اتركهما فارغين ليبقى الخصم قائمًا دائمًا.",
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
    seo: "Search engine optimization (SEO)", seoTitle: "Google page title", seoDesc: "Google description",
    seoPreview: "Search result preview",
    create: "Create product", saveDraft: "Save as draft", creating: "Saving...", cancel: "Cancel",
    preview: "Storefront preview", previewEmpty: "Add an image, name and price to see the preview here.",
    namePh: "Product name", addToCart: "Add to cart",
    errName: "Arabic product name is required.", errPrice: "Enter a valid price.",
    errDisc: "Discounted price must be lower than the price.",
    saveErr: "Could not save the product. Please try again.",
    openProduct: "Open product page", upgrade: "Upgrade plan", badFile: "Unsupported or oversized files were skipped.",
    variants: "Options and variants",
    variantsToggle: "This product comes in more than one form (such as color or size)",
    variantsHint: "Turn it on if the product is sold in different colors or sizes. Each combination becomes a variant with its own quantity.",
    example: "Example: a T-shirt in two colors (Red, Blue) and two sizes (M, L) creates 4 variants automatically.",
    addOptionTitle: "Add an option:",
    optColor: "Color", optSize: "Size", optOther: "Other option",
    otherName: "Option name", otherNamePh: "Example: Material",
    pickCommon: "Pick from common values", addCustom: "Or type another value", addBtn: "Add",
    chosen: "Selected values", noneChosen: "No value selected yet",
    phColor: "Example: Beige", phSize: "Example: XXXL", phOther: "Example: Cotton",
    maxOpts: `Maximum ${MAX_OPTS} options.`,
    tableTitle: "Variants",
    tableHint: "Set the available quantity for each variant. Price difference is the increase or decrease from the product price, leave 0 for the same price.",
    variantCol: "Variant", priceAdj: "Price difference", finalPrice: "Final price", qtyCol: "Quantity",
    totalQty: "Total quantity",
    qtyPerVariant: "Quantity is set per variant in the variants table.",
    tooMany: `Variants exceed ${MAX_COMBOS}. Reduce the values.`,
    errNames: "Enter a unique name for every option.",
    errNoValues: "Pick at least one value for every option, or remove the empty option.",
    errRows: "Price difference or quantity of a variant is invalid.",
    createdBut: "Product created, but",
    failImgs: (n: number) => `${n} image(s) failed to upload.`,
    failVars: (n: number) => `${n} variant(s) failed to create.`,
    retryHint: "Press save to retry or finish them later from the product page.",
    discStart: "Discount starts", discEnd: "Discount ends",
    errDates: "Discount end must be after its start.",
    discHint: "Leave both empty to keep the discount always on.",
  },
};

const OK_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
const label = "block text-[12.5px] font-bold text-[var(--ink)] mb-1.5";
const fmt = (n: number) => n.toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 2 });

const usableOpts = (opts: Opt[]) => opts.filter((o) => o.name.trim() && o.values.length > 0);

const countCombos = (opts: Opt[]) => {
  const u = usableOpts(opts);
  return u.length ? u.reduce((n, o) => n * o.values.length, 1) : 0;
};

const buildCombos = (opts: Opt[]): Combo[] => {
  const u = usableOpts(opts);
  if (!u.length || countCombos(opts) > MAX_COMBOS) return [];
  let acc: { label: string[]; attrs: Attr[] }[] = [{ label: [], attrs: [] }];
  for (const o of u) {
    const next: { label: string[]; attrs: Attr[] }[] = [];
    for (const a of acc) {
      for (const v of o.values) {
        next.push({
          label: [...a.label, v],
          attrs: [...a.attrs, { attributeName: o.name.trim(), attributeValue: v }],
        });
      }
    }
    acc = next;
  }
  return acc.map((a) => ({
    key: a.attrs.map((x) => `${x.attributeName}:${x.attributeValue}`).join("|"),
    name: a.label.join(" / "),
    attrs: a.attrs,
  }));
};

export default function NewProductPage() {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const en = !!i18n.language?.startsWith("en");
  const s = en ? L.en : L.ar;
  const sugs = en ? SUG.en : SUG.ar;

  const [f, setF] = useState({
    nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "", categoryId: "",
    basePrice: "", discountPrice: "", discountStartsAt: "", discountEndsAt: "",
    costPrice: "", sku: "", barcode: "", weight: "",
    initialQuantity: "0", warrantyMonths: "", seoTitle: "", seoDescription: "",
  });
  const [warranty, setWarranty] = useState(false);
  const [imgs, setImgs] = useState<Img[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [variantsOn, setVariantsOn] = useState(false);
  const [opts, setOpts] = useState<Opt[]>([]);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [busy, setBusy] = useState<Kind | null>(null);
  const [attempt, setAttempt] = useState<Kind>("Active");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const createdId = useRef<number | null>(null);
  const uploaded = useRef(0);
  const doneVariants = useRef<Set<string>>(new Set());
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

  const activeOpts = variantsOn ? opts : [];

  const dirty = !!(f.nameAr || f.nameEn || f.basePrice || imgs.length || activeOpts.length);
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

  const addOpt = (kind: OptKind) =>
    setOpts((p) => {
      if (p.length >= MAX_OPTS) return p;
      if (kind !== "other" && p.some((o) => o.kind === kind)) return p;
      const name = kind === "color" ? s.optColor : kind === "size" ? s.optSize : "";
      return [...p, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, kind, name, values: [], input: "" }];
    });
  const updOpt = (id: string, patch: Partial<Opt>) =>
    setOpts((p) => p.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const delOpt = (id: string) => setOpts((p) => p.filter((o) => o.id !== id));
  const commitValue = (id: string, raw: string) => {
    const parts = raw.split(/[,،]/).map((x) => x.trim()).filter(Boolean);
    if (!parts.length) return;
    setOpts((p) =>
      p.map((o) => {
        if (o.id !== id) return o;
        const next = [...o.values];
        parts.forEach((v) => {
          if (!next.some((x) => x.toLowerCase() === v.toLowerCase())) next.push(v);
        });
        return { ...o, values: next, input: "" };
      })
    );
  };
  const toggleValue = (id: string, v: string) =>
    setOpts((p) =>
      p.map((o) => {
        if (o.id !== id) return o;
        const has = o.values.some((x) => x.toLowerCase() === v.toLowerCase());
        return { ...o, values: has ? o.values.filter((x) => x.toLowerCase() !== v.toLowerCase()) : [...o.values, v] };
      })
    );
  const toggleVariants = (on: boolean) => {
    setVariantsOn(on);
    if (on && opts.length === 0) addOpt("color");
  };

  const combos = useMemo(() => buildCombos(activeOpts), [activeOpts]);
  const comboCount = countCombos(activeOpts);
  const tooMany = comboCount > MAX_COMBOS;
  const hasVariants = combos.length > 0;
  const namesList = activeOpts.map((o) => o.name.trim().toLowerCase());
  const namesBad = activeOpts.some((o) => !o.name.trim()) || new Set(namesList).size !== namesList.length;
  const emptyOpt = activeOpts.some((o) => o.values.length === 0);

  const rowOf = (k: string): Row => rows[k] ?? { price: "0", qty: "0" };
  const setRow = (k: string, patch: Partial<Row>) =>
    setRows((p) => ({ ...p, [k]: { ...(p[k] ?? { price: "0", qty: "0" }), ...patch } }));
  const rowsBad = combos.some((c) => {
    const r = rowOf(c.key);
    const q = Number(r.qty);
    return isNaN(parseFloat(r.price)) || r.qty.trim() === "" || !Number.isInteger(q) || q < 0;
  });
  const totalQty = combos.reduce((n, c) => n + (parseInt(rowOf(c.key).qty) || 0), 0);

  const price = parseFloat(f.basePrice);
  const disc = parseFloat(f.discountPrice);
  const cost = parseFloat(f.costPrice);
  const errors = {
    name: !f.nameAr.trim(),
    price: isNaN(price) || price < 0,
    disc: f.discountPrice !== "" && (isNaN(disc) || disc < 0 || isNaN(price) || disc >= price),
    dates:
      f.discountPrice !== "" &&
      !!f.discountStartsAt &&
      !!f.discountEndsAt &&
      new Date(f.discountEndsAt) <= new Date(f.discountStartsAt),
  };
  const hasDisc = !isNaN(disc) && !isNaN(price) && disc > 0 && disc < price;
  const shown = en ? f.nameEn.trim() || f.nameAr.trim() : f.nameAr.trim() || f.nameEn.trim();
  const eff = hasDisc ? disc : price;
  const pct = hasDisc ? Math.round((1 - disc / price) * 100) : 0;
  const margin = !isNaN(cost) && cost > 0 && !isNaN(eff) && eff > 0
    ? Math.round(((eff - cost) / eff) * 100) : null;

  const finalOf = (c: Combo) => {
    const a = parseFloat(rowOf(c.key).price);
    if (isNaN(eff) || isNaN(a)) return "—";
    return `${fmt(eff + a)} ${t("common.sar")}`;
  };

  const submit = async (kind: Kind) => {
    setTouched(true); setAttempt(kind); setErr("");
    const draft = kind === "Draft";
    if (errors.name || (!draft && errors.price) || errors.disc || errors.dates || namesBad || emptyOpt || tooMany || rowsBad) return;
    setBusy(kind);
    try {
      if (!createdId.current) {
        const payload: Record<string, unknown> = {
          nameAr: f.nameAr.trim(),
          nameEn: f.nameEn.trim() || f.nameAr.trim(),
          basePrice: isNaN(price) ? 0 : price,
          costPrice: isNaN(cost) ? 0 : cost,
          initialQuantity: hasVariants ? 0 : parseInt(f.initialQuantity) || 0,
          hasWarranty: warranty,
          status: kind,
        };
        if (f.categoryId) payload.categoryId = Number(f.categoryId);
        if (f.descriptionAr) payload.descriptionAr = f.descriptionAr;
        if (f.descriptionEn) payload.descriptionEn = f.descriptionEn;
        if (f.sku.trim()) payload.sku = f.sku.trim();
        if (f.barcode.trim()) payload.barcode = f.barcode.trim();
        if (f.weight) payload.weight = parseFloat(f.weight);
        if (f.discountPrice) {
          payload.discountPrice = disc;
          if (f.discountStartsAt) payload.discountStartsAt = new Date(f.discountStartsAt).toISOString();
          if (f.discountEndsAt) payload.discountEndsAt = new Date(f.discountEndsAt).toISOString();
        }
        if (warranty && f.warrantyMonths) payload.warrantyMonths = parseInt(f.warrantyMonths);
        if (f.seoTitle.trim()) payload.seoTitle = f.seoTitle.trim();
        if (f.seoDescription.trim()) payload.seoDescription = f.seoDescription.trim();
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
      let failedVars = 0;
      for (const c of combos) {
        if (doneVariants.current.has(c.key)) continue;
        const r = rowOf(c.key);
        try {
          await api.post(`/products/${id}/variants`, {
            variantName: c.name,
            priceAdjustment: parseFloat(r.price) || 0,
            initialQuantity: parseInt(r.qty) || 0,
            attributes: c.attrs,
          });
          doneVariants.current.add(c.key);
        } catch { failedVars += 1; }
      }
      const msgs: string[] = [];
      if (failed.length) { setImgs(failed); msgs.push(s.failImgs(failed.length)); }
      if (failedVars) msgs.push(s.failVars(failedVars));
      if (msgs.length) {
        setErr(`${s.createdBut} ${msgs.join(" ")} ${s.retryHint}`);
        setBusy(null);
        return;
      }
      done.current = true;
      router.push("/dashboard/products");
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setErr(m || s.saveErr);
      setBusy(null);
    }
  };

  const limitErr = /limit|upgrade/i.test(err);
  const inv = (bad: boolean) => (touched && bad ? " !border-[var(--danger)]" : "");
  const priceBad = errors.price && attempt === "Active";
  const working = busy !== null;
  const canAddColor = opts.length < MAX_OPTS && !opts.some((o) => o.kind === "color");
  const canAddSize = opts.length < MAX_OPTS && !opts.some((o) => o.kind === "size");
  const canAddOther = opts.length < MAX_OPTS;

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
                <div className={"field-shell" + inv(priceBad)}><input type="number" min={0} step="0.01" value={f.basePrice} onChange={set("basePrice")} /></div>
                {touched && priceBad && <p className="text-[11.5px] text-[var(--danger)] mt-1">{s.errPrice}</p>}
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
            {f.discountPrice !== "" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={label}>{s.discStart}</label>
                  <div className="field-shell"><input type="datetime-local" value={f.discountStartsAt} onChange={set("discountStartsAt")} /></div>
                </div>
                <div>
                  <label className={label}>{s.discEnd}</label>
                  <div className={"field-shell" + inv(errors.dates)}><input type="datetime-local" value={f.discountEndsAt} onChange={set("discountEndsAt")} /></div>
                  {touched && errors.dates && <p className="text-[11.5px] text-[var(--danger)] mt-1">{s.errDates}</p>}
                </div>
                <p className="sm:col-span-2 text-[11.5px] text-[var(--sub)]">{s.discHint}</p>
              </div>
            )}
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

          <section className="card p-5 space-y-4">
            <div>
              <h2 className="text-[15px] font-bold text-[var(--blue-deep)]">{s.variants}</h2>
              <label className="mt-3 flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={variantsOn} onChange={(e) => toggleVariants(e.target.checked)} />
                <span>
                  <span className="block text-[13.5px] font-bold text-[var(--ink)]">{s.variantsToggle}</span>
                  <span className="block text-[12px] text-[var(--sub)] mt-0.5">{s.variantsHint}</span>
                </span>
              </label>
            </div>

            {variantsOn && (
              <>
                <p className="text-[12px] text-[var(--sub)] rounded-lg bg-[var(--blue-50)] p-3">{s.example}</p>

                {activeOpts.map((o) => {
                  const list = o.kind === "other" ? [] : sugs[o.kind];
                  const ph = o.kind === "color" ? s.phColor : o.kind === "size" ? s.phSize : s.phOther;
                  return (
                    <div key={o.id} className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                      <div className="flex items-end justify-between gap-3">
                        {o.kind === "other" ? (
                          <div className="flex-1">
                            <label className={label}>{s.otherName}</label>
                            <div className="field-shell">
                              <input type="text" value={o.name} placeholder={s.otherNamePh} onChange={(e) => updOpt(o.id, { name: e.target.value })} />
                            </div>
                          </div>
                        ) : (
                          <h3 className="text-[14px] font-bold text-[var(--ink)]">{o.name}</h3>
                        )}
                        <button type="button" onClick={() => delOpt(o.id)} aria-label={s.remove}
                          className="w-9 h-9 rounded-lg border border-[var(--border)] text-[var(--danger)] text-[13px] shrink-0">✕</button>
                      </div>

                      {list.length > 0 && (
                        <div>
                          <p className="text-[12px] font-bold text-[var(--sub)] mb-2">{s.pickCommon}</p>
                          <div className="flex flex-wrap gap-2">
                            {list.map((v) => {
                              const on = o.values.some((x) => x.toLowerCase() === v.toLowerCase());
                              return (
                                <button key={v} type="button" onClick={() => toggleValue(o.id, v)}
                                  className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold border transition-colors ${on ? "bg-[var(--blue-deep)] text-white border-transparent" : "bg-white text-[var(--ink)] border-[var(--border)] hover:bg-[var(--blue-50)]"}`}>
                                  {on ? "✓ " : "+ "}{v}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-[12px] font-bold text-[var(--sub)] mb-2">{o.kind === "other" ? s.chosen : s.addCustom}</p>
                        <div className="flex gap-2">
                          <div className="field-shell flex-1">
                            <input
                              type="text"
                              value={o.input}
                              placeholder={ph}
                              onChange={(e) => updOpt(o.id, { input: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "," || e.key === "،") {
                                  e.preventDefault();
                                  commitValue(o.id, o.input);
                                }
                              }}
                            />
                          </div>
                          <button type="button" className="btn btn-secondary" onClick={() => commitValue(o.id, o.input)}>{s.addBtn}</button>
                        </div>
                      </div>

                      <div>
                        <p className="text-[12px] font-bold text-[var(--sub)] mb-2">{s.chosen}</p>
                        {o.values.length === 0 ? (
                          <p className="text-[12px] text-[var(--sub)]">{s.noneChosen}</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {o.values.map((v) => (
                              <span key={v} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--blue-50)] text-[12.5px] text-[var(--ink)]">
                                {v}
                                <button type="button" onClick={() => toggleValue(o.id, v)} aria-label={s.remove} className="text-[var(--sub)] text-[11px] leading-none">✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {opts.length < MAX_OPTS ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] font-bold text-[var(--sub)]">{s.addOptionTitle}</span>
                    {canAddColor && <button type="button" className="btn btn-secondary" onClick={() => addOpt("color")}>+ {s.optColor}</button>}
                    {canAddSize && <button type="button" className="btn btn-secondary" onClick={() => addOpt("size")}>+ {s.optSize}</button>}
                    {canAddOther && <button type="button" className="btn btn-secondary" onClick={() => addOpt("other")}>+ {s.optOther}</button>}
                  </div>
                ) : (
                  <p className="text-[12px] text-[var(--sub)]">{s.maxOpts}</p>
                )}

                {tooMany && <p className="text-[12px] text-[var(--danger)]">{s.tooMany}</p>}
                {touched && namesBad && <p className="text-[12px] text-[var(--danger)]">{s.errNames}</p>}
                {touched && emptyOpt && <p className="text-[12px] text-[var(--danger)]">{s.errNoValues}</p>}
                {touched && rowsBad && <p className="text-[12px] text-[var(--danger)]">{s.errRows}</p>}

                {combos.length > 0 && (
                  <div>
                    <p className="text-[13.5px] font-bold text-[var(--ink)]">{s.tableTitle} ({combos.length})</p>
                    <p className="text-[11.5px] text-[var(--sub)] mb-2">{s.tableHint}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-start p-2 text-[12px] font-bold text-[var(--sub)]">{s.variantCol}</th>
                            <th className="text-start p-2 text-[12px] font-bold text-[var(--sub)]">{s.priceAdj}</th>
                            <th className="text-start p-2 text-[12px] font-bold text-[var(--sub)]">{s.finalPrice}</th>
                            <th className="text-start p-2 text-[12px] font-bold text-[var(--sub)]">{s.qtyCol}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {combos.map((c) => {
                            const r = rowOf(c.key);
                            return (
                              <tr key={c.key} className="border-t border-[var(--border)]">
                                <td className="p-2 font-medium text-[var(--ink)]">{c.name}</td>
                                <td className="p-2">
                                  <div className="field-shell w-28">
                                    <input type="number" step="0.01" value={r.price} onChange={(e) => setRow(c.key, { price: e.target.value })} />
                                  </div>
                                </td>
                                <td className="p-2 text-[var(--sub)] whitespace-nowrap">{finalOf(c)}</td>
                                <td className="p-2">
                                  <div className="field-shell w-24">
                                    <input type="number" min={0} step={1} value={r.qty} onChange={(e) => setRow(c.key, { qty: e.target.value })} />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[12px] text-[var(--sub)] mt-2">{s.totalQty}: {totalQty}</p>
                  </div>
                )}
              </>
            )}
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
              {hasVariants ? (
                <p className="text-[12.5px] text-[var(--sub)]">{s.qtyPerVariant}</p>
              ) : (
                <>
                  <label className={label}>{s.qty}</label>
                  <div className="field-shell"><input type="number" min={0} value={f.initialQuantity} onChange={set("initialQuantity")} /></div>
                </>
              )}
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

          <details className="card p-5">
            <summary className="cursor-pointer text-[15px] font-bold text-[var(--blue-deep)]">{s.seo}</summary>
            <div className="mt-3 space-y-3">
              <div>
                <label className={label}>{s.seoTitle}</label>
                <div className="field-shell"><input type="text" maxLength={70} value={f.seoTitle} onChange={set("seoTitle")} /></div>
                <p className="text-[11.5px] text-[var(--sub)] mt-1">{f.seoTitle.length}/70</p>
              </div>
              <div>
                <label className={label}>{s.seoDesc}</label>
                <div className="field-shell items-start"><textarea rows={3} maxLength={160} value={f.seoDescription} onChange={set("seoDescription")} /></div>
                <p className="text-[11.5px] text-[var(--sub)] mt-1">{f.seoDescription.length}/160</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3 bg-[#FAFBFC]">
                <p className="text-[11px] text-[var(--sub)] mb-1">{s.seoPreview}</p>
                <p className="text-[15px] text-[#1a0dab] truncate">{f.seoTitle || shown || s.namePh}</p>
                <p className="text-[12.5px] text-[var(--sub)] line-clamp-2">{f.seoDescription || f.descriptionAr}</p>
              </div>
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
            {hasVariants && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {usableOpts(activeOpts).flatMap((o) => o.values).slice(0, 8).map((v) => (
                  <span key={v} className="px-2 py-0.5 rounded-md border border-[var(--border)] text-[11.5px] text-[var(--sub)]">{v}</span>
                ))}
              </div>
            )}
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
        <button type="button" onClick={() => submit("Draft")} disabled={working} className="btn btn-secondary disabled:opacity-60">
          {busy === "Draft" ? s.creating : s.saveDraft}
        </button>
        <button type="button" onClick={() => submit("Active")} disabled={working} className="btn btn-primary disabled:opacity-60">
          {busy === "Active" ? s.creating : s.create}
        </button>
      </div>
    </div>
  );
}

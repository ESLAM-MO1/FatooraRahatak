"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { useConfirm } from "@/components/ConfirmDialog";

type Img = { id: string; file: File; url: string };
type Cat = { id: number; nameAr: string; nameEn?: string };
type OptKind = "color" | "size" | "other";
type Opt = { id: string; kind: OptKind; name: string; values: string[]; input: string };
type Attr = { attributeName: string; attributeValue: string };
type Combo = { key: string; name: string; attrs: Attr[] };
type Row = { price: string; qty: string };

interface Product {
  id: number;
  categoryId: number | null;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  sku: string;
  barcode: string | null;
  basePrice: number;
  discountPrice: number | null;
  costPrice: number;
  weight: number | null;
  status: string;
  availableQuantity: number;
  primaryImageUrl: string | null;
  hasWarranty: boolean;
  warrantyMonths: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
}

interface Variant {
  id: number;
  variantName: string;
  sku: string;
  priceAdjustment: number;
  availableQuantity: number;
  isActive: boolean;
  attributes: Attr[];
}

interface ProductImage {
  id: number;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

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
    title: "تعديل المنتج", back: "رجوع للمنتجات",
    images: "صور المنتج", drop: "اسحب الصور وأفلتها هنا", browse: "أو اختر من جهازك",
    imgHint: "JPG أو PNG أو WebP أو GIF، حتى 5 ميجا للصورة و10 صور.",
    primary: "الأساسية", makePrimary: "اجعلها أساسية", remove: "حذف",
    curImages: "الصور الحالية", delImgConfirm: "حذف هذه الصورة نهائيًا؟", imgErr: "تعذر حذف الصورة.",
    basics: "المعلومات الأساسية", nameAr: "اسم المنتج (عربي)", nameEn: "اسم المنتج (إنجليزي)",
    price: "السعر", discount: "السعر المخفض", cost: "سعر التكلفة", margin: "هامش الربح",
    category: "التصنيف", noCategory: "بدون تصنيف",
    descAr: "الوصف (عربي)", descEn: "الوصف (إنجليزي)",
    adv: "معلومات متقدمة", sku: "رمز المنتج (SKU)", skuRO: "لا يمكن تغيير الرمز بعد إنشاء المنتج.",
    barcode: "الباركود", weight: "الوزن",
    qty: "الكمية المتوفرة", qtyPerVariant: "الكمية تُحدد لكل متغير في جدول المتغيرات.",
    warranty: "الضمان", hasWarranty: "المنتج عليه ضمان", months: "مدة الضمان بالأشهر",
    seo: "تحسين محركات البحث (SEO)", seoTitle: "عنوان الصفحة في جوجل", seoDesc: "الوصف في جوجل",
    seoPreview: "معاينة في نتائج البحث",
    save: "حفظ التعديلات", saving: "جارٍ الحفظ...", saved: "تم حفظ التعديلات.", cancel: "إلغاء",
    preview: "معاينة في المتجر", namePh: "اسم المنتج", addToCart: "أضف للسلة",
    errName: "اسم المنتج بالعربي مطلوب.", errPrice: "أدخل سعرًا صحيحًا.",
    errDisc: "السعر المخفض يجب أن يكون أقل من السعر.",
    saveErr: "تعذر حفظ التعديلات. حاول مرة أخرى.",
    badFile: "تم تجاهل ملفات غير مدعومة أو أكبر من 5 ميجا.",
    failImgs: (n: number) => `تعذر رفع ${n} صورة.`,
    failVars: (n: number) => `تعذر إنشاء ${n} متغير.`,
    retryHint: "اضغط الحفظ لإعادة المحاولة أو أكملها لاحقًا من هنا.",
    variants: "المتغيرات الحالية", noVariants: "لا توجد متغيرات بعد.",
    hide: "إخفاء", delVarConfirm: "حذف هذا المتغير؟", hideVarConfirm: "إخفاء هذا المتغير عن المتجر؟",
    varErr: "تعذر تنفيذ العملية على المتغير.",
    addVariants: "إضافة متغيرات جديدة",
    variantsHint: "فعّلها لو عايز تضيف ألوان أو مقاسات جديدة. التركيبة الجديدة بتتضاف للمتغيرات الموجودة بدون ما تمسح القديمة.",
    example: "مثال: تيشيرت بلونين (أحمر، أزرق) ومقاسين (M، L) يتولد منه 4 متغيرات تلقائيًا.",
    addOptionTitle: "أضف خيارًا:",
    optColor: "اللون", optSize: "المقاس", optOther: "خيار آخر",
    otherName: "اسم الخيار", otherNamePh: "مثال: الخامة",
    pickCommon: "اختر من القيم الشائعة", addCustom: "أو اكتب قيمة أخرى", addBtn: "إضافة",
    chosen: "القيم المختارة", noneChosen: "لم تختر أي قيمة بعد",
    phColor: "مثال: بيج", phSize: "مثال: XXXL", phOther: "مثال: قطن",
    maxOpts: `الحد الأقصى ${MAX_OPTS} خيارات.`,
    tableTitle: "متغيرات جديدة", tableHint: "حدد الكمية وفرق السعر لكل تركيبة جديدة.",
    variantCol: "المتغير", priceAdj: "فرق السعر", finalPrice: "السعر النهائي", qtyCol: "الكمية",
    totalQty: "إجمالي الكمية",
    tooMany: `عدد المتغيرات يتجاوز ${MAX_COMBOS}. قلل القيم.`,
    errNames: "اكتب اسمًا لكل خيار بدون تكرار.",
    errNoValues: "اختر قيمة واحدة على الأقل لكل خيار، أو احذف الخيار الفارغ.",
    errRows: "فرق السعر أو الكمية في المتغيرات غير صحيح.",
    newOnly: "الجديد فقط",
    discStart: "بداية الخصم", discEnd: "نهاية الخصم",
    errDates: "نهاية الخصم يجب أن تكون بعد البداية.",
    discHint: "اتركهما فارغين ليبقى الخصم قائمًا دائمًا.",
    stActive: "منشور", stDraft: "مسودة", stArchived: "مؤرشف",
    publish: "نشر المنتج", toDraft: "تحويل لمسودة",
    confirmPublish: "نشر هذا المنتج في المتجر؟", confirmDraft: "تحويل هذا المنتج لمسودة وإخفاؤه عن المتجر؟",
    statusErr: "تعذر تغيير الحالة.", published: "تم نشر المنتج.", drafted: "تم تحويل المنتج لمسودة.",
    loadError: "تعذر تحميل بيانات المنتج.", notFound: "المنتج غير موجود.",
  },
  en: {
    title: "Edit product", back: "Back to products",
    images: "Product images", drop: "Drag images here", browse: "or choose from your device",
    imgHint: "JPG, PNG, WebP or GIF, up to 5 MB each and 10 images.",
    primary: "Primary", makePrimary: "Make primary", remove: "Remove",
    curImages: "Current images", delImgConfirm: "Delete this image permanently?", imgErr: "Could not delete the image.",
    basics: "Basic information", nameAr: "Product name (Arabic)", nameEn: "Product name (English)",
    price: "Price", discount: "Discounted price", cost: "Cost price", margin: "Profit margin",
    category: "Category", noCategory: "No category",
    descAr: "Description (Arabic)", descEn: "Description (English)",
    adv: "Advanced information", sku: "SKU", skuRO: "The SKU cannot be changed after creation.",
    barcode: "Barcode", weight: "Weight",
    qty: "Available quantity", qtyPerVariant: "Quantity is set per variant in the variants table.",
    warranty: "Warranty", hasWarranty: "This product has a warranty", months: "Warranty (months)",
    seo: "Search engine optimization (SEO)", seoTitle: "Google page title", seoDesc: "Google description",
    seoPreview: "Search result preview",
    save: "Save changes", saving: "Saving...", saved: "Changes saved.", cancel: "Cancel",
    preview: "Storefront preview", namePh: "Product name", addToCart: "Add to cart",
    errName: "Arabic product name is required.", errPrice: "Enter a valid price.",
    errDisc: "Discounted price must be lower than the price.",
    saveErr: "Could not save the changes. Please try again.",
    badFile: "Unsupported or oversized files were skipped.",
    failImgs: (n: number) => `${n} image(s) failed to upload.`,
    failVars: (n: number) => `${n} variant(s) failed to create.`,
    retryHint: "Press save to retry or finish them later from this page.",
    variants: "Current variants", noVariants: "No variants yet.",
    hide: "Hide", delVarConfirm: "Delete this variant?", hideVarConfirm: "Hide this variant from the store?",
    varErr: "Could not complete the variant action.",
    addVariants: "Add new variants",
    variantsHint: "Turn it on to add new colors or sizes. New combinations are added alongside the existing variants.",
    example: "Example: a T-shirt in two colors (Red, Blue) and two sizes (M, L) creates 4 variants automatically.",
    addOptionTitle: "Add an option:",
    optColor: "Color", optSize: "Size", optOther: "Other option",
    otherName: "Option name", otherNamePh: "Example: Material",
    pickCommon: "Pick from common values", addCustom: "Or type another value", addBtn: "Add",
    chosen: "Selected values", noneChosen: "No value selected yet",
    phColor: "Example: Beige", phSize: "Example: XXXL", phOther: "Example: Cotton",
    maxOpts: `Maximum ${MAX_OPTS} options.`,
    tableTitle: "New variants", tableHint: "Set the quantity and price difference for each new combination.",
    variantCol: "Variant", priceAdj: "Price difference", finalPrice: "Final price", qtyCol: "Quantity",
    totalQty: "Total quantity",
    tooMany: `Variants exceed ${MAX_COMBOS}. Reduce the values.`,
    errNames: "Enter a unique name for every option.",
    errNoValues: "Pick at least one value for every option, or remove the empty option.",
    errRows: "Price difference or quantity of a variant is invalid.",
    newOnly: "New only",
    discStart: "Discount starts", discEnd: "Discount ends",
    errDates: "Discount end must be after its start.",
    discHint: "Leave both empty to keep the discount always on.",
    stActive: "Active", stDraft: "Draft", stArchived: "Archived",
    publish: "Publish product", toDraft: "Move to draft",
    confirmPublish: "Publish this product to the store?", confirmDraft: "Move this product to draft and hide it from the store?",
    statusErr: "Could not change the status.", published: "Product published.", drafted: "Product moved to draft.",
    loadError: "Could not load the product.", notFound: "Product not found.",
  },
};

const OK_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
const label = "block text-[12.5px] font-bold text-[var(--ink)] mb-1.5";
const fmt = (n: number) => n.toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 2 });

const msgOf = (e: unknown, fb: string) =>
  (e as { response?: { data?: { message?: string } } }).response?.data?.message || fb;

const toLocal = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toIso = (v: string) => (v ? new Date(v).toISOString() : null);

const keyOfAttrs = (attrs: Attr[]) =>
  attrs
    .map((a) => `${a.attributeName.trim().toLowerCase()}:${a.attributeValue.trim().toLowerCase()}`)
    .sort()
    .join("|");

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

export default function EditProductPage() {
  const params = useParams();
  const productId = params.id as string;
  const { i18n, t } = useTranslation();
  const en = !!i18n.language?.startsWith("en");
  const s = en ? L.en : L.ar;
  const sugs = en ? SUG.en : SUG.ar;
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [exImgs, setExImgs] = useState<ProductImage[]>([]);
  const [exVars, setExVars] = useState<Variant[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);

  const [f, setF] = useState({
    nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "", categoryId: "",
    basePrice: "", discountPrice: "", discountStartsAt: "", discountEndsAt: "",
    costPrice: "", barcode: "", weight: "", warrantyMonths: "", seoTitle: "", seoDescription: "",
  });
  const [warranty, setWarranty] = useState(false);
  const [qty, setQty] = useState("0");
  const [imgs, setImgs] = useState<Img[]>([]);
  const [variantsOn, setVariantsOn] = useState(false);
  const [opts, setOpts] = useState<Opt[]>([]);
  const [rows, setRows] = useState<Record<string, Row>>({});

  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [touched, setTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const doneSaving = useRef(false);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty && !doneSaving.current) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  useEffect(() => {
    if (!productId) return;
    let alive = true;
    Promise.all([
      api.get(`/products/${productId}`),
      api.get(`/products/${productId}/variants`),
      api.get(`/products/${productId}/images`),
      api.get("/categories"),
    ])
      .then(([pr, vr, ir, cr]) => {
        if (!alive) return;
        const p: Product = pr.data.data;
        const vars: Variant[] = vr.data.data || [];
        const ims: ProductImage[] = ir.data.data || [];
        setProduct(p);
        setExVars(vars);
        setExImgs(ims);
        setCats(cr.data.data || []);
        setF({
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          descriptionAr: p.descriptionAr ?? "",
          descriptionEn: p.descriptionEn ?? "",
          categoryId: p.categoryId?.toString() ?? "",
          basePrice: String(p.basePrice),
          discountPrice: p.discountPrice != null ? String(p.discountPrice) : "",
          discountStartsAt: toLocal(p.discountStartsAt),
          discountEndsAt: toLocal(p.discountEndsAt),
          costPrice: String(p.costPrice),
          barcode: p.barcode ?? "",
          weight: p.weight != null ? String(p.weight) : "",
          warrantyMonths: p.warrantyMonths != null ? String(p.warrantyMonths) : "",
          seoTitle: p.seoTitle ?? "",
          seoDescription: p.seoDescription ?? "",
        });
        setWarranty(p.hasWarranty);
        setQty(String(p.availableQuantity));
        setVariantsOn(vars.length > 0);
      })
      .catch((e: unknown) => { if (alive) setLoadErr(msgOf(e, "").trim()); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [productId]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setDirty(true);
    setF((p) => ({ ...p, [k]: e.target.value }));
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    let skipped = false;
    const next: Img[] = [];
    Array.from(list).forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!OK_EXT.includes(ext) || file.size > 5 * 1024 * 1024) { skipped = true; return; }
      next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, url: URL.createObjectURL(file) });
    });
    if (skipped) setErr(s.badFile);
    setDirty(true);
    setImgs((p) => [...p, ...next].slice(0, Math.max(0, 10 - exImgs.length)));
  };
  const removeImg = (id: string) => { setDirty(true); setImgs((p) => p.filter((i) => i.id !== id)); };
  const makePrimary = (idx: number) => {
    setDirty(true);
    setImgs((p) => [p[idx], ...p.filter((_, i) => i !== idx)]);
  };

  const delExImg = async (id: number) => {
    if (!(await confirm(s.delImgConfirm))) return;
    try {
      await api.delete(`/products/${productId}/images/${id}`);
      setExImgs((p) => p.filter((i) => i.id !== id));
    } catch (e: unknown) {
      setErr(msgOf(e, s.imgErr));
    }
  };

  const delVar = async (id: number) => {
    if (!(await confirm(s.delVarConfirm))) return;
    try {
      await api.delete(`/products/${productId}/variants/${id}`);
      setExVars((p) => p.filter((v) => v.id !== id));
    } catch (e: unknown) {
      setErr(msgOf(e, s.varErr));
    }
  };

  const hideVar = async (id: number) => {
    if (!(await confirm(s.hideVarConfirm))) return;
    try {
      await api.put(`/products/${productId}/variants/${id}/deactivate`);
      setExVars((p) => p.filter((v) => v.id !== id));
    } catch (e: unknown) {
      setErr(msgOf(e, s.varErr));
    }
  };

  const activeOpts = variantsOn ? opts : [];

  const addOpt = (kind: OptKind) => {
    setDirty(true);
    setOpts((p) => {
      if (p.length >= MAX_OPTS) return p;
      if (kind !== "other" && p.some((o) => o.kind === kind)) return p;
      const name = kind === "color" ? s.optColor : kind === "size" ? s.optSize : "";
      return [...p, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, kind, name, values: [], input: "" }];
    });
  };
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
    setDirty(true);
    setVariantsOn(on);
    if (on && opts.length === 0) addOpt("color");
  };

  const exKeys = useMemo(() => new Set(exVars.map((v) => keyOfAttrs(v.attributes))), [exVars]);
  const combos = useMemo(() => buildCombos(activeOpts), [activeOpts]);
  const newCombos = useMemo(() => combos.filter((c) => !exKeys.has(keyOfAttrs(c.attrs))), [combos, exKeys]);
  const comboCount = countCombos(activeOpts);
  const tooMany = comboCount > MAX_COMBOS;
  const hasVariants = exVars.length > 0 || newCombos.length > 0;
  const namesList = activeOpts.map((o) => o.name.trim().toLowerCase());
  const namesBad = activeOpts.some((o) => !o.name.trim()) || new Set(namesList).size !== namesList.length;
  const emptyOpt = activeOpts.some((o) => o.values.length === 0);

  const rowOf = (k: string): Row => rows[k] ?? { price: "0", qty: "0" };
  const setRow = (k: string, patch: Partial<Row>) => {
    setDirty(true);
    setRows((p) => ({ ...p, [k]: { ...(p[k] ?? { price: "0", qty: "0" }), ...patch } }));
  };
  const rowsBad = newCombos.some((c) => {
    const r = rowOf(c.key);
    const q = Number(r.qty);
    return isNaN(parseFloat(r.price)) || r.qty.trim() === "" || !Number.isInteger(q) || q < 0;
  });
  const totalQty = newCombos.reduce((n, c) => n + (parseInt(rowOf(c.key).qty) || 0), 0);

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

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      nameAr: f.nameAr.trim(),
      nameEn: f.nameEn.trim() || f.nameAr.trim(),
      basePrice: isNaN(price) ? 0 : price,
      costPrice: isNaN(cost) ? 0 : cost,
      hasWarranty: warranty,
      categoryId: f.categoryId ? Number(f.categoryId) : null,
      descriptionAr: f.descriptionAr || null,
      descriptionEn: f.descriptionEn || null,
      barcode: f.barcode || null,
      weight: f.weight ? parseFloat(f.weight) : null,
      seoTitle: f.seoTitle.trim(),
      seoDescription: f.seoDescription.trim(),
    };
    if (f.discountPrice) {
      payload.discountPrice = disc;
      payload.discountStartsAt = toIso(f.discountStartsAt);
      payload.discountEndsAt = toIso(f.discountEndsAt);
    } else {
      payload.discountPrice = null;
      payload.discountStartsAt = null;
      payload.discountEndsAt = null;
    }
    payload.warrantyMonths = warranty && f.warrantyMonths ? parseInt(f.warrantyMonths) : null;
    return payload;
  };

  const submit = async () => {
    setTouched(true);
    setErr("");
    if (errors.name || errors.price || errors.disc || errors.dates || namesBad || emptyOpt || tooMany || rowsBad) return;
    setBusy(true);
    try {
      await api.put(`/products/${productId}`, buildPayload());

      const failedImgs: Img[] = [];
      let sortOrder = exImgs.reduce((m, i) => Math.max(m, i.sortOrder), -1) + 1;
      const hasPrimary = exImgs.some((i) => i.isPrimary);
      let madePrimary = hasPrimary;
      for (const im of imgs) {
        try {
          const fd = new FormData();
          fd.append("file", im.file);
          const up = await api.post("/products/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
          const isPrimary = !madePrimary;
          await api.post(`/products/${productId}/images`, {
            imageUrl: up.data.data.url, isPrimary, sortOrder,
          });
          if (isPrimary) madePrimary = true;
          sortOrder += 1;
        } catch { failedImgs.push(im); }
      }

      let failedVars = 0;
      for (const c of newCombos) {
        const r = rowOf(c.key);
        try {
          await api.post(`/products/${productId}/variants`, {
            variantName: c.name,
            priceAdjustment: parseFloat(r.price) || 0,
            initialQuantity: parseInt(r.qty) || 0,
            attributes: c.attrs,
          });
        } catch { failedVars += 1; }
      }

      if (!hasVariants && qty.trim() !== "" && Number(qty) !== product?.availableQuantity) {
        await api.put(`/products/${productId}/stock`, { quantity: parseInt(qty) || 0 });
      }

      const msgs: string[] = [];
      if (failedImgs.length) msgs.push(s.failImgs(failedImgs.length));
      if (failedVars) msgs.push(s.failVars(failedVars));

      const [pr, vr, ir] = await Promise.all([
        api.get(`/products/${productId}`),
        api.get(`/products/${productId}/variants`),
        api.get(`/products/${productId}/images`),
      ]);
      setProduct(pr.data.data);
      setExVars(vr.data.data || []);
      setExImgs(ir.data.data || []);

      if (msgs.length) {
        setImgs(failedImgs);
        setErr(`${msgs.join(" ")} ${s.retryHint}`);
        return;
      }

      setImgs([]);
      setOpts([]);
      setRows({});
      setDirty(false);
      doneSaving.current = true;
      setToast(s.saved);
      window.setTimeout(() => { doneSaving.current = false; }, 500);
    } catch (e: unknown) {
      setErr(msgOf(e, s.saveErr));
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async () => {
    if (!product) return;
    const next = product.status === "Active" ? "Draft" : "Active";
    if (!(await confirm(next === "Active" ? s.confirmPublish : s.confirmDraft))) return;
    setToggling(true);
    setErr("");
    try {
      await api.put(`/products/${productId}`, {
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        descriptionAr: product.descriptionAr,
        descriptionEn: product.descriptionEn,
        barcode: product.barcode,
        basePrice: product.basePrice,
        discountPrice: product.discountPrice,
        costPrice: product.costPrice,
        weight: product.weight,
        categoryId: product.categoryId,
        hasWarranty: product.hasWarranty,
        warrantyMonths: product.warrantyMonths,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        discountStartsAt: product.discountStartsAt,
        discountEndsAt: product.discountEndsAt,
        status: next,
      });
      setProduct({ ...product, status: next });
      setToast(next === "Active" ? s.published : s.drafted);
    } catch (e: unknown) {
      setErr(msgOf(e, s.statusErr));
    } finally {
      setToggling(false);
    }
  };

  const inv = (bad: boolean) => (touched && bad ? " !border-[var(--danger)]" : "");
  const working = busy || toggling;
  const canAddColor = opts.length < MAX_OPTS && !opts.some((o) => o.kind === "color");
  const canAddSize = opts.length < MAX_OPTS && !opts.some((o) => o.kind === "size");
  const canAddOther = opts.length < MAX_OPTS;
  const previewImg = imgs[0]?.url || exImgs.find((i) => i.isPrimary)?.imageUrl || exImgs[0]?.imageUrl || null;
  const statusLabel = product?.status === "Active" ? s.stActive : product?.status === "Draft" ? s.stDraft : s.stArchived;
  const statusBadge = product?.status === "Active" ? "badge badge--green" : product?.status === "Draft" ? "badge badge--yellow" : "badge badge--gray";

  if (loading) return <LoadingState />;

  if (loadErr || !product) {
    return (
      <div>
        <Link href="/dashboard/products" className="btn btn-secondary inline-flex mb-4">{s.back}</Link>
        <div className="alert alert--danger">{loadErr || s.notFound}</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader icon="box" title={`${s.title}: ${product.nameAr}`}>
        <span className={statusBadge}>{statusLabel}</span>
        {(product.status === "Active" || product.status === "Draft") && (
          <button type="button" onClick={toggleStatus} disabled={working} className="btn btn-secondary disabled:opacity-60">
            {toggling ? s.saving : product.status === "Active" ? s.toDraft : s.publish}
          </button>
        )}
        <Link href="/dashboard/products" className="btn btn-secondary">{s.back}</Link>
      </PageHeader>

      <SuccessToast message={toast} fixed className="mb-4" />

      {err && <div className="alert alert--danger mb-4">{err}</div>}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px] items-start pb-24">
        <div className="space-y-4 order-2 lg:order-none">
          <section className="card p-5">
            <h2 className="text-[15px] font-bold text-[var(--blue-deep)] mb-3">{s.images}</h2>
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" multiple className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {exImgs.map((im) => (
                <div key={`ex-${im.id}`} className="relative aspect-square rounded-xl border border-[var(--border)] overflow-hidden bg-[#F4F6F8]">
                  <img src={im.imageUrl} alt="" className="w-full h-full object-cover" />
                  {im.isPrimary && <span className="badge badge--green absolute top-1.5 start-1.5">{s.primary}</span>}
                  <button type="button" onClick={() => delExImg(im.id)} aria-label={s.remove}
                    className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full bg-white/90 text-[var(--danger)] text-[12px] leading-none">✕</button>
                </div>
              ))}
              {imgs.map((im, i) => (
                <div key={im.id} className="relative aspect-square rounded-xl border border-[var(--border)] overflow-hidden bg-[#F4F6F8]">
                  <img src={im.url} alt="" className="w-full h-full object-cover" />
                  {i === 0 && exImgs.length === 0 && !exImgs.some((x) => x.isPrimary)
                    ? <span className="badge badge--green absolute top-1.5 start-1.5">{s.primary}</span>
                    : i !== 0 && <button type="button" onClick={() => makePrimary(i)} className="absolute bottom-1.5 start-1.5 text-[11px] font-bold bg-white/90 rounded-md px-2 py-1 text-[var(--ink)]">{s.makePrimary}</button>}
                  <button type="button" onClick={() => removeImg(im.id)} aria-label={s.remove}
                    className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full bg-white/90 text-[var(--danger)] text-[12px] leading-none">✕</button>
                </div>
              ))}
              {exImgs.length + imgs.length < 10 && (
                <div role="button" tabIndex={0} onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                  className={`aspect-square rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center text-center p-3 cursor-pointer hover:bg-[var(--blue-50)] transition-colors ${exImgs.length + imgs.length === 0 ? "col-span-2 sm:col-span-4 aspect-auto min-h-[150px]" : ""}`}>
                  <span className="text-[26px]" aria-hidden>🖼️</span>
                  <span className="text-[12.5px] font-bold text-[var(--ink)] mt-1">{s.drop}</span>
                  <span className="text-[11.5px] text-[var(--blue)] underline">{s.browse}</span>
                </div>
              )}
            </div>
            <p className="text-[11.5px] text-[var(--sub)] mt-2">{s.imgHint}</p>
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
                <div className={"field-shell" + inv(errors.price && touched)}><input type="number" min={0} step="0.01" value={f.basePrice} onChange={set("basePrice")} /></div>
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
            <h2 className="text-[15px] font-bold text-[var(--blue-deep)]">{s.variants}</h2>
            {exVars.length === 0 ? (
              <p className="text-[12.5px] text-[var(--sub)]">{s.noVariants}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-start p-2 text-[12px] font-bold text-[var(--sub)]">{s.variantCol}</th>
                      <th className="text-start p-2 text-[12px] font-bold text-[var(--sub)]">SKU</th>
                      <th className="text-start p-2 text-[12px] font-bold text-[var(--sub)]">{s.priceAdj}</th>
                      <th className="text-start p-2 text-[12px] font-bold text-[var(--sub)]">{s.qtyCol}</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {exVars.map((v) => (
                      <tr key={v.id} className="border-t border-[var(--border)]">
                        <td className="p-2 font-medium text-[var(--ink)]">{v.variantName}</td>
                        <td className="p-2 text-[var(--sub)]" dir="ltr">{v.sku}</td>
                        <td className="p-2 text-[var(--sub)] whitespace-nowrap">
                          {v.priceAdjustment >= 0 ? "+" : ""}{fmt(v.priceAdjustment)} {t("common.sar")}
                        </td>
                        <td className="p-2 text-[var(--sub)]">{v.availableQuantity}</td>
                        <td className="p-2 whitespace-nowrap text-end">
                          <button type="button" onClick={() => hideVar(v.id)} className="text-[var(--blue)] hover:opacity-80 font-medium text-[12.5px] ms-3">{s.hide}</button>
                          <button type="button" onClick={() => delVar(v.id)} className="text-[var(--danger)] hover:opacity-80 font-medium text-[12.5px] ms-3">{s.remove}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-[var(--border)] pt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={variantsOn} onChange={(e) => toggleVariants(e.target.checked)} />
                <span>
                  <span className="block text-[13.5px] font-bold text-[var(--ink)]">{s.addVariants}</span>
                  <span className="block text-[12px] text-[var(--sub)] mt-0.5">{s.variantsHint}</span>
                </span>
              </label>

              {variantsOn && (
                <>
                  <p className="text-[12px] text-[var(--sub)] rounded-lg bg-[var(--blue-50)] p-3 mt-3">{s.example}</p>

                  {activeOpts.map((o) => {
                    const list = o.kind === "other" ? [] : sugs[o.kind];
                    const ph = o.kind === "color" ? s.phColor : o.kind === "size" ? s.phSize : s.phOther;
                    return (
                      <div key={o.id} className="rounded-xl border border-[var(--border)] p-4 space-y-3 mt-3">
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
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className="text-[12.5px] font-bold text-[var(--sub)]">{s.addOptionTitle}</span>
                      {canAddColor && <button type="button" className="btn btn-secondary" onClick={() => addOpt("color")}>+ {s.optColor}</button>}
                      {canAddSize && <button type="button" className="btn btn-secondary" onClick={() => addOpt("size")}>+ {s.optSize}</button>}
                      {canAddOther && <button type="button" className="btn btn-secondary" onClick={() => addOpt("other")}>+ {s.optOther}</button>}
                    </div>
                  ) : (
                    <p className="text-[12px] text-[var(--sub)] mt-3">{s.maxOpts}</p>
                  )}

                  {tooMany && <p className="text-[12px] text-[var(--danger)]">{s.tooMany}</p>}
                  {touched && namesBad && <p className="text-[12px] text-[var(--danger)]">{s.errNames}</p>}
                  {touched && emptyOpt && <p className="text-[12px] text-[var(--danger)]">{s.errNoValues}</p>}
                  {touched && rowsBad && <p className="text-[12px] text-[var(--danger)]">{s.errRows}</p>}

                  {newCombos.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[13.5px] font-bold text-[var(--ink)]">{s.tableTitle} ({newCombos.length}) <span className="text-[11px] text-[var(--sub)] font-normal">({s.newOnly})</span></p>
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
                            {newCombos.map((c) => {
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
            </div>
          </section>

          <details className="card p-5" open>
            <summary className="cursor-pointer text-[15px] font-bold text-[var(--blue-deep)]">{s.adv}</summary>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className={label}>{s.sku}</label>
                <div className="field-shell opacity-60"><input type="text" dir="ltr" value={product.sku} readOnly /></div>
                <p className="text-[11.5px] text-[var(--sub)] mt-1">{s.skuRO}</p>
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

          <details className="card p-5" open>
            <summary className="cursor-pointer text-[15px] font-bold text-[var(--blue-deep)]">{s.qty}</summary>
            <div className="mt-3 max-w-xs">
              {hasVariants ? (
                <p className="text-[12.5px] text-[var(--sub)]">{s.qtyPerVariant}</p>
              ) : (
                <div className="field-shell"><input type="number" min={0} value={qty} onChange={(e) => { setDirty(true); setQty(e.target.value); }} /></div>
              )}
            </div>
          </details>

          <details className="card p-5">
            <summary className="cursor-pointer text-[15px] font-bold text-[var(--blue-deep)]">{s.warranty}</summary>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                <input type="checkbox" checked={warranty} onChange={(e) => { setDirty(true); setWarranty(e.target.checked); }} />
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
              {previewImg
                ? <img src={previewImg} alt="" className="w-full h-full object-cover" />
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
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-[var(--border)] px-4 py-3 flex gap-3 justify-end">
        <Link href="/dashboard/products" className="btn btn-secondary">{s.cancel}</Link>
        <button type="button" onClick={submit} disabled={working} className="btn btn-primary disabled:opacity-60">
          {busy ? s.saving : s.save}
        </button>
      </div>
    </div>
  );
}

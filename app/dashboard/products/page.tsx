"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { useConfirm } from "@/components/ConfirmDialog";
import Can from "@/components/Can";
import Pagination from "@/components/Pagination";
import ProductImport from "@/components/ProductImport";
import ProductTypeMenu from "@/components/products/ProductTypeMenu";

interface Category {
  id: number;
  nameAr: string;
}

interface OwnerReview {
  id: number;
  productId: number;
  productName: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

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
  hasWarranty: boolean;
  warrantyMonths: number | null;
  primaryImageUrl?: string | null;
}

interface ProductForm {
  categoryId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  sku: string;
  barcode: string;
  basePrice: string;
  discountPrice: string;
  costPrice: string;
  weight: string;
  hasWarranty: boolean;
  warrantyMonths: string;
}

const emptyForm: ProductForm = {
  categoryId: "",
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  sku: "",
  barcode: "",
  basePrice: "",
  discountPrice: "",
  costPrice: "0",
  weight: "",
  hasWarranty: false,
  warrantyMonths: "",
};

const statusStyles: Record<string, string> = {
  Active: "badge badge--green",
  Draft: "badge badge--yellow",
  Archived: "badge badge--gray",
  OutOfStock: "badge badge--red",
};

const LOW_STOCK = 5;
const COLS_KEY = "products.hiddenCols";

const L = {
  ar: {
    allCats: "كل التصنيفات", noCat: "بدون تصنيف", uncategorized: "بدون تصنيف",
    chipAll: "الكل", chipActive: "نشط", chipDraft: "مسودة", chipOut: "نفد المخزون", chipLow: "مخزون منخفض",
    sortNew: "الأحدث", sortName: "الاسم", sortPriceAsc: "السعر: الأقل أولًا",
    sortPriceDesc: "السعر: الأعلى أولًا", sortQty: "الكمية: الأقل أولًا",
    clear: "مسح التصفية", perPage: "في الصفحة",
    selected: (n: number) => `تم تحديد ${n}`, selectAll: "تحديد الكل",
    bulkArchive: "أرشفة المحدد", bulkRestore: "استرجاع المحدد", bulkDelete: "حذف نهائي للمحدد",
    cancelSel: "إلغاء التحديد",
    askArchive: (n: number) => `أرشفة ${n} منتج؟`,
    askRestore: (n: number) => `استرجاع ${n} منتج؟`,
    askDelete: (n: number) => `حذف ${n} منتج نهائيًا؟ لا يمكن التراجع عن ذلك.`,
    doneArchive: (n: number) => `تمت أرشفة ${n} منتج`,
    doneRestore: (n: number) => `تم استرجاع ${n} منتج`,
    doneDelete: (n: number) => `تم حذف ${n} منتج نهائيًا`,
    partialFail: (n: number) => `تعذر تنفيذ العملية على ${n} منتج`,
    clickEdit: "اضغط للتعديل", errNum: "قيمة غير صحيحة",
    errDisc: "السعر المخفض يجب أن يكون أقل من السعر", errQty: "الكمية يجب أن تكون عددًا صحيحًا موجبًا",
    saved: "تم الحفظ",
    showing: (a: number, b: number) => `عرض ${a} من ${b}`,
    price: "السعر", discount: "المخفض", qty: "الكمية",
    dup: "نسخ",
    askDuplicate: (n: string) => `إنشاء نسخة من "${n}"؟ سيتم نسخ البيانات والصورة الأساسية بكمية صفر.`,
    doneDuplicate: "تم إنشاء النسخة", copyAr: "(نسخة)", copyEn: "(copy)",
    exportCsv: "تصدير", columns: "الأعمدة",
    bulkCategory: "تغيير التصنيف", chooseCat: "اختر التصنيف", applyCat: "تطبيق",
    askCat: (n: number) => `تغيير تصنيف ${n} منتج؟`,
    doneCat: (n: number) => `تم تغيير تصنيف ${n} منتج`,
    bulkPrice: "تعديل الأسعار", priceTitle: "تعديل أسعار المحدد",
    modeInc: "زيادة بنسبة %", modeDec: "تخفيض بنسبة %", modeSet: "سعر موحد",
    value: "القيمة", apply: "تطبيق", cancel: "إلغاء",
    priceHint: "الزيادة والتخفيض يُطبَّقان على السعر والسعر المخفض. في السعر الموحد يُحذف السعر المخفض إن لم يكن أقل من السعر الجديد.",
    errValue: "أدخل قيمة صحيحة",
    donePrice: (n: number) => `تم تعديل أسعار ${n} منتج`,
    csvHead: ["رمز المنتج", "الاسم (عربي)", "الاسم (إنجليزي)", "التصنيف", "السعر", "السعر المخفض", "سعر التكلفة", "الكمية", "الحالة", "الباركود"],
  },
  en: {
    allCats: "All categories", noCat: "No category", uncategorized: "Uncategorized",
    chipAll: "All", chipActive: "Active", chipDraft: "Draft", chipOut: "Out of stock", chipLow: "Low stock",
    sortNew: "Newest", sortName: "Name", sortPriceAsc: "Price: low to high",
    sortPriceDesc: "Price: high to low", sortQty: "Quantity: low to high",
    clear: "Clear filters", perPage: "per page",
    selected: (n: number) => `${n} selected`, selectAll: "Select all",
    bulkArchive: "Archive selected", bulkRestore: "Restore selected", bulkDelete: "Delete selected permanently",
    cancelSel: "Clear selection",
    askArchive: (n: number) => `Archive ${n} product(s)?`,
    askRestore: (n: number) => `Restore ${n} product(s)?`,
    askDelete: (n: number) => `Permanently delete ${n} product(s)? This cannot be undone.`,
    doneArchive: (n: number) => `${n} product(s) archived`,
    doneRestore: (n: number) => `${n} product(s) restored`,
    doneDelete: (n: number) => `${n} product(s) deleted permanently`,
    partialFail: (n: number) => `The action failed for ${n} product(s)`,
    clickEdit: "Click to edit", errNum: "Invalid value",
    errDisc: "Discounted price must be lower than the price", errQty: "Quantity must be a positive whole number",
    saved: "Saved",
    showing: (a: number, b: number) => `Showing ${a} of ${b}`,
    price: "Price", discount: "Discounted", qty: "Quantity",
    dup: "Duplicate",
    askDuplicate: (n: string) => `Create a copy of "${n}"? Data and the primary image are copied with zero quantity.`,
    doneDuplicate: "Copy created", copyAr: "(نسخة)", copyEn: "(copy)",
    exportCsv: "Export", columns: "Columns",
    bulkCategory: "Change category", chooseCat: "Choose category", applyCat: "Apply",
    askCat: (n: number) => `Change the category of ${n} product(s)?`,
    doneCat: (n: number) => `Category changed for ${n} product(s)`,
    bulkPrice: "Edit prices", priceTitle: "Edit prices of selected",
    modeInc: "Increase by %", modeDec: "Decrease by %", modeSet: "Set one price",
    value: "Value", apply: "Apply", cancel: "Cancel",
    priceHint: "Increase and decrease apply to both price and discounted price. With one price, the discounted price is cleared unless it stays lower than the new price.",
    errValue: "Enter a valid value",
    donePrice: (n: number) => `Prices updated for ${n} product(s)`,
    csvHead: ["SKU", "Name (Arabic)", "Name (English)", "Category", "Price", "Discounted price", "Cost price", "Quantity", "Status", "Barcode"],
  },
};

const errMsg = (e: unknown, fb: string) =>
  (e as { response?: { data?: { message?: string } } }).response?.data?.message || fb;

const money = (n: number) => n.toLocaleString("ar-SA-u-nu-latn");
const r2 = (n: number) => Math.round(n * 100) / 100;

const isOut = (p: Product) => p.status === "OutOfStock" || p.availableQuantity <= 0;
const isLow = (p: Product) => !isOut(p) && p.availableQuantity <= LOW_STOCK;

const lbl = "block text-[12.5px] font-bold text-[var(--ink)] mb-1.5";

function Thumb({ url, size }: { url?: string | null; size: number }) {
  return (
    <div
      className="relative shrink-0 rounded-lg overflow-hidden bg-[#F4F6F8] border border-[var(--border)] flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <span className="opacity-40" aria-hidden>📦</span>
      {url && (
        <img
          src={url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </div>
  );
}

function InlineNum({
  value,
  display,
  title,
  int,
  onSave,
}: {
  value: number | null;
  display: string;
  title: string;
  int?: boolean;
  onSave: (n: number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const skip = useRef(false);

  const start = () => {
    skip.current = false;
    setV(value === null ? "" : String(value));
    setEditing(true);
  };

  const commit = async () => {
    if (skip.current || busy) {
      setEditing(false);
      return;
    }
    const raw = v.trim();
    const n = raw === "" ? null : Number(raw);
    if (n !== null && isNaN(n)) {
      setEditing(false);
      return;
    }
    if (n === value) {
      setEditing(false);
      return;
    }
    setBusy(true);
    await onSave(n);
    setBusy(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min={0}
        step={int ? 1 : "0.01"}
        value={v}
        disabled={busy}
        dir="ltr"
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            skip.current = true;
            setEditing(false);
          }
        }}
        className="w-24 px-2 py-1 rounded-md border border-[var(--blue)] text-[13px] outline-none bg-white"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      title={title}
      className="px-2 py-1 rounded-md border border-transparent hover:border-[var(--border)] hover:bg-white text-[13px] text-[var(--ink)] cursor-text"
    >
      {display}
    </button>
  );
}

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const en = !!i18n.language?.startsWith("en");
  const s = en ? L.en : L.ar;
  const confirm = useConfirm();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("new");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [hidden, setHidden] = useState<string[]>([]);
  const [bulkCat, setBulkCat] = useState("");
  const [showPrice, setShowPrice] = useState(false);
  const [priceMode, setPriceMode] = useState<"inc" | "dec" | "set">("inc");
  const [priceVal, setPriceVal] = useState("");
  const [priceErr, setPriceErr] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "archive" | "reviews">("products");
  const [reviews, setReviews] = useState<OwnerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [qtyInput, setQtyInput] = useState("");
  const [savingQty, setSavingQty] = useState(false);
  const [qtyMsg, setQtyMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const editHandled = useRef(false);

  const statusLabels: Record<string, string> = {
    Active: t("product.statusActive"),
    Draft: t("product.statusDraft"),
    Archived: t("product.statusArchived"),
    OutOfStock: t("product.statusOutOfStock"),
  };

  const show = (k: string) => !hidden.includes(k);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setHidden(parsed.filter((x) => typeof x === "string"));
    } catch {}
  }, []);

  const toggleCol = (k: string) =>
    setHidden((prev) => {
      const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
      try {
        localStorage.setItem(COLS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const [firstRes, categoriesRes] = await Promise.all([
          api.get("/products", { params: { page: 1, pageSize: 100 } }),
          api.get("/categories"),
        ]);
        const d = firstRes.data.data;
        let items: Product[] = d.items || [];
        const totalPagesAll = Math.min(d.totalPages || 1, 30);
        if (totalPagesAll > 1) {
          const rest = await Promise.all(
            Array.from({ length: totalPagesAll - 1 }, (_, i) =>
              api.get("/products", { params: { page: i + 2, pageSize: 100 } })
            )
          );
          rest.forEach((r) => {
            items = items.concat(r.data.data.items || []);
          });
        }
        setProducts(items);
        setCategories(categoriesRes.data.data);
      } catch (err: unknown) {
        setError(errMsg(err, t("product.loadError")));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError("");
    try {
      const res = await api.get("/owner/orders/reviews");
      setReviews(res.data.data);
    } catch (err: unknown) {
      setReviewsError(errMsg(err, t("reviews.loadError")));
    } finally {
      setReviewsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (activeTab === "reviews") {
      fetchReviews();
    }
  }, [activeTab, fetchReviews]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, catFilter, statusFilter, sort, activeTab, pageSize]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c.nameAr])), [categories]);
  const catName = (id: number | null) => (id != null ? catMap.get(id) ?? s.uncategorized : s.uncategorized);

  const tabBase = useMemo(
    () =>
      products.filter((p) => (activeTab === "archive" ? p.status === "Archived" : p.status !== "Archived")),
    [products, activeTab]
  );

  const counts = useMemo(
    () => ({
      all: tabBase.length,
      Active: tabBase.filter((p) => p.status === "Active").length,
      Draft: tabBase.filter((p) => p.status === "Draft").length,
      out: tabBase.filter(isOut).length,
      low: tabBase.filter(isLow).length,
    }),
    [tabBase]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = tabBase.filter((p) => {
      if (
        q &&
        !(
          p.nameAr.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q)
        )
      )
        return false;
      if (catFilter === "none" && p.categoryId != null) return false;
      if (catFilter !== "all" && catFilter !== "none" && String(p.categoryId) !== catFilter) return false;
      if (activeTab === "products") {
        if (statusFilter === "Active" && p.status !== "Active") return false;
        if (statusFilter === "Draft" && p.status !== "Draft") return false;
        if (statusFilter === "out" && !isOut(p)) return false;
        if (statusFilter === "low" && !isLow(p)) return false;
      }
      return true;
    });
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"));
    if (sort === "priceAsc") sorted.sort((a, b) => a.basePrice - b.basePrice);
    if (sort === "priceDesc") sorted.sort((a, b) => b.basePrice - a.basePrice);
    if (sort === "qty") sorted.sort((a, b) => a.availableQuantity - b.availableQuantity);
    return sorted;
  }, [tabBase, search, catFilter, statusFilter, sort, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const curPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((curPage - 1) * pageSize, curPage * pageSize);
  const hasFilters = search.trim() !== "" || catFilter !== "all" || statusFilter !== "all" || sort !== "new";
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));

  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllOnPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageItems.forEach((p) => next.delete(p.id));
      else pageItems.forEach((p) => next.add(p.id));
      return next;
    });

  const clearFilters = () => {
    setSearch("");
    setCatFilter("all");
    setStatusFilter("all");
    setSort("new");
  };

  const updateLocal = (id: number, patch: Partial<Product>) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const basePayload = (p: Product, over: Record<string, unknown>) => ({
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    descriptionAr: p.descriptionAr,
    descriptionEn: p.descriptionEn,
    barcode: p.barcode,
    basePrice: p.basePrice,
    discountPrice: p.discountPrice,
    costPrice: p.costPrice,
    weight: p.weight,
    categoryId: p.categoryId,
    hasWarranty: p.hasWarranty,
    warrantyMonths: p.hasWarranty ? p.warrantyMonths : null,
    ...over,
  });

  const savePriceField = async (p: Product, field: "basePrice" | "discountPrice", val: number | null) => {
    setActionError("");
    if (field === "basePrice" && val === null) {
      setActionError(s.errNum);
      return;
    }
    const base = field === "basePrice" ? val : p.basePrice;
    let disc = field === "discountPrice" ? val : p.discountPrice;
    if (disc === 0) disc = null;
    if (base === null || base < 0 || (disc !== null && (disc < 0 || disc >= base))) {
      setActionError(s.errDisc);
      return;
    }
    try {
      await api.put(`/products/${p.id}`, basePayload(p, { basePrice: base, discountPrice: disc }));
      updateLocal(p.id, { basePrice: base, discountPrice: disc });
      setSuccessMessage(s.saved);
    } catch (err: unknown) {
      setActionError(errMsg(err, t("product.saveError")));
    }
  };

  const saveQtyInline = async (p: Product, q: number | null) => {
    setActionError("");
    if (q === null || !Number.isInteger(q) || q < 0) {
      setActionError(s.errQty);
      return;
    }
    try {
      await api.put(`/products/${p.id}/stock`, { quantity: q });
      updateLocal(p.id, { availableQuantity: q });
      setSuccessMessage(s.saved);
    } catch (err: unknown) {
      setActionError(errMsg(err, t("productDetail.qtySaveError")));
    }
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setQtyInput(String(product.availableQuantity));
    setQtyMsg(null);
    setForm({
      categoryId: product.categoryId?.toString() ?? "",
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      descriptionAr: product.descriptionAr ?? "",
      descriptionEn: product.descriptionEn ?? "",
      sku: product.sku,
      barcode: product.barcode ?? "",
      basePrice: product.basePrice.toString(),
      discountPrice: product.discountPrice?.toString() ?? "",
      costPrice: product.costPrice.toString(),
      weight: product.weight?.toString() ?? "",
      hasWarranty: product.hasWarranty ?? false,
      warrantyMonths: product.warrantyMonths?.toString() ?? "",
    });
    setActionError("");
    setShowModal(true);
  };

  useEffect(() => {
    if (editHandled.current || products.length === 0) return;
    editHandled.current = true;
    const id = Number(new URLSearchParams(window.location.search).get("edit"));
    if (!id) return;
    const target = products.find((p) => p.id === id);
    if (target) openEditModal(target);
  }, [products]);

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setActionError("");
  };

  const setF = (k: keyof ProductForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSaveQty = async () => {
    if (!editingId) return;
    setQtyMsg(null);
    const q = parseInt(qtyInput, 10);
    if (isNaN(q) || q < 0) {
      setQtyMsg({ type: "error", text: t("productDetail.qtyInvalid") });
      return;
    }
    setSavingQty(true);
    try {
      await api.put(`/products/${editingId}/stock`, { quantity: q });
      setQtyMsg({ type: "success", text: t("productDetail.qtySaved") });
      updateLocal(editingId, { availableQuantity: q });
    } catch (err: unknown) {
      setQtyMsg({ type: "error", text: errMsg(err, t("productDetail.qtySaveError")) });
    } finally {
      setSavingQty(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setActionError("");
    setSubmitting(true);
    try {
      await api.put(`/products/${editingId}`, {
        nameAr: form.nameAr,
        nameEn: form.nameEn,
        descriptionAr: form.descriptionAr || null,
        descriptionEn: form.descriptionEn || null,
        barcode: form.barcode || null,
        basePrice: parseFloat(form.basePrice) || 0,
        discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : null,
        costPrice: parseFloat(form.costPrice) || 0,
        weight: form.weight ? parseFloat(form.weight) : null,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        hasWarranty: form.hasWarranty,
        warrantyMonths: form.hasWarranty && form.warrantyMonths ? parseInt(form.warrantyMonths) : null,
      });
      setSuccessMessage(t("product.updateSuccess"));
      closeModal();
      await fetchData(true);
    } catch (err: unknown) {
      setActionError(errMsg(err, t("product.saveError")));
    } finally {
      setSubmitting(false);
    }
  };

  const act = async (ask: string, call: () => Promise<unknown>, ok: string, fb: string) => {
    if (!(await confirm(ask))) return;
    setActionError("");
    setSuccessMessage("");
    try {
      await call();
      setSuccessMessage(ok);
      await fetchData(true);
    } catch (err: unknown) {
      setActionError(errMsg(err, fb));
    }
  };

  const handleArchive = (p: Product) =>
    act(
      `${t("product.archiveConfirm")} "${p.nameAr}"؟`,
      () => api.delete(`/products/${p.id}`),
      t("product.archiveSuccess"),
      t("product.archiveError")
    );

  const handleRestore = (p: Product) =>
    act(
      `${t("product.restoreConfirm")} "${p.nameAr}"؟`,
      () => api.post(`/products/${p.id}/restore`),
      t("product.restoreSuccess"),
      t("product.restoreError")
    );

  const handlePermanentDelete = (p: Product) =>
    act(
      `${t("product.deletePermanentConfirm")} "${p.nameAr}"؟`,
      () => api.delete(`/products/${p.id}/permanent`),
      t("product.deletePermanentSuccess"),
      t("product.deletePermanentError")
    );

  const handleDuplicate = async (p: Product) => {
    if (!(await confirm(s.askDuplicate(p.nameAr)))) return;
    setActionError("");
    setSuccessMessage("");
    try {
      const res = await api.post("/products", {
        nameAr: `${p.nameAr} ${s.copyAr}`,
        nameEn: `${p.nameEn} ${s.copyEn}`,
        descriptionAr: p.descriptionAr,
        descriptionEn: p.descriptionEn,
        barcode: null,
        basePrice: p.basePrice,
        discountPrice: p.discountPrice,
        costPrice: p.costPrice,
        weight: p.weight,
        categoryId: p.categoryId,
        hasWarranty: p.hasWarranty,
        warrantyMonths: p.hasWarranty ? p.warrantyMonths : null,
        initialQuantity: 0,
      });
      const newId = res.data?.data?.id;
      if (newId && p.primaryImageUrl) {
        try {
          await api.post(`/products/${newId}/images`, { imageUrl: p.primaryImageUrl, isPrimary: true, sortOrder: 0 });
        } catch {}
      }
      setSuccessMessage(s.doneDuplicate);
      await fetchData(true);
    } catch (err: unknown) {
      setActionError(errMsg(err, t("product.saveError")));
    }
  };

  const runBulk = async (
    ask: ((n: number) => string) | null,
    done: (n: number) => string,
    call: (p: Product) => Promise<unknown>
  ) => {
    const list = products.filter((p) => selected.has(p.id));
    if (list.length === 0) return;
    if (ask && !(await confirm(ask(list.length)))) return;
    setActionError("");
    setSuccessMessage("");
    let ok = 0;
    let fail = 0;
    for (const p of list) {
      try {
        await call(p);
        ok++;
      } catch {
        fail++;
      }
    }
    setSelected(new Set());
    await fetchData(true);
    if (ok) setSuccessMessage(done(ok));
    if (fail) setActionError(s.partialFail(fail));
  };

  const applyBulkCat = async () => {
    if (bulkCat === "") return;
    const target = bulkCat === "none" ? null : Number(bulkCat);
    await runBulk(s.askCat, s.doneCat, (p) => api.put(`/products/${p.id}`, basePayload(p, { categoryId: target })));
    setBulkCat("");
  };

  const applyBulkPrice = async () => {
    const v = parseFloat(priceVal);
    if (isNaN(v) || v <= 0 || (priceMode === "dec" && v >= 100)) {
      setPriceErr(s.errValue);
      return;
    }
    setShowPrice(false);
    await runBulk(null, s.donePrice, (p) => {
      let base: number;
      let disc: number | null = p.discountPrice || null;
      if (priceMode === "set") {
        base = r2(v);
        if (disc !== null && disc >= base) disc = null;
      } else {
        const f = priceMode === "inc" ? 1 + v / 100 : 1 - v / 100;
        base = r2(p.basePrice * f);
        disc = disc !== null ? r2(disc * f) : null;
        if (disc !== null && disc >= base) disc = null;
      }
      return api.put(`/products/${p.id}`, basePayload(p, { basePrice: base, discountPrice: disc }));
    });
    setPriceVal("");
  };

  const exportCsv = () => {
    const list = selected.size > 0 ? products.filter((p) => selected.has(p.id)) : filtered;
    const esc = (v: unknown) => {
      let x = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(x)) x = "'" + x;
      return `"${x.replace(/"/g, '""')}"`;
    };
    const rows = list.map((p) => [
      p.sku,
      p.nameAr,
      p.nameEn,
      p.categoryId != null ? catMap.get(p.categoryId) ?? "" : "",
      p.basePrice,
      p.discountPrice ?? "",
      p.costPrice,
      p.availableQuantity,
      statusLabels[p.status] ?? p.status,
      p.barcode ?? "",
    ]);
    const csv = "\uFEFF" + [s.csvHead, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderActions = (p: Product, size: string) =>
    activeTab === "archive" ? (
      <div className="flex flex-wrap gap-3">
        <Can code="Products.Edit">
          <button onClick={() => handleRestore(p)} className={`text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium ${size}`}>
            {t("product.restore")}
          </button>
        </Can>
        <Can code="Products.Delete">
          <button onClick={() => handlePermanentDelete(p)} className={`text-[var(--danger)] hover:opacity-80 font-medium ${size}`}>
            {t("product.deletePermanent")}
          </button>
        </Can>
      </div>
    ) : (
      <div className="flex flex-wrap gap-3">
        <Can code="Products.Edit">
          <button onClick={() => openEditModal(p)} className={`text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium ${size}`}>
            {t("product.edit")}
          </button>
        </Can>
        <Link href={`/dashboard/products/${p.id}`} className={`text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium ${size}`}>
          {t("product.variants")}
        </Link>
        <Can code="Products.Add">
          <button onClick={() => handleDuplicate(p)} className={`text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium ${size}`}>
            {s.dup}
          </button>
        </Can>
        <Can code="Products.Delete">
          <button onClick={() => handleArchive(p)} className={`text-[var(--danger)] hover:opacity-80 font-medium ${size}`}>
            {t("product.archive")}
          </button>
        </Can>
      </div>
    );

  const priceCell = (p: Product) => (
    <InlineNum
      value={p.basePrice}
      display={`${money(p.basePrice)} ${t("common.sar")}`}
      title={s.clickEdit}
      onSave={(n) => savePriceField(p, "basePrice", n)}
    />
  );

  const discCell = (p: Product) => (
    <InlineNum
      value={p.discountPrice}
      display={p.discountPrice != null ? `${money(p.discountPrice)} ${t("common.sar")}` : "—"}
      title={s.clickEdit}
      onSave={(n) => savePriceField(p, "discountPrice", n)}
    />
  );

  const qtyCell = (p: Product) => (
    <InlineNum
      value={p.availableQuantity}
      display={String(p.availableQuantity)}
      title={s.clickEdit}
      int
      onSave={(n) => saveQtyInline(p, n)}
    />
  );

  const qtyColor = (p: Product) => (isOut(p) ? "text-[var(--danger)]" : isLow(p) ? "text-[#B7791F]" : "");

  if (loading) {
    return <LoadingState />;
  }

  const chips = [
    { key: "all", label: s.chipAll, count: counts.all },
    { key: "Active", label: s.chipActive, count: counts.Active },
    { key: "Draft", label: s.chipDraft, count: counts.Draft },
    { key: "low", label: s.chipLow, count: counts.low },
    { key: "out", label: s.chipOut, count: counts.out },
  ];

  const colOptions = [
    { key: "sku", label: t("product.skuLabel") },
    { key: "discount", label: t("product.discountPrice") },
    { key: "qty", label: t("product.availableQuantity") },
    { key: "status", label: t("product.status") },
  ];

  const th = "text-start p-3 font-bold text-[var(--gold-deep)] text-[12.5px]";

  const tabBtn = (key: "products" | "archive" | "reviews", text: string) => (
    <button
      onClick={() => setActiveTab(key)}
      className={`px-4 sm:px-5 py-2 rounded-lg text-[12.5px] sm:text-[13px] font-bold transition-colors whitespace-nowrap ${activeTab === key ? "bg-white shadow text-[var(--ink)]" : "text-[var(--sub)] hover:text-[var(--ink)]"}`}
    >
      {text}
    </button>
  );

  return (
    <div>
      <PageHeader icon="box" title={t("product.title")}>
        <Can code="Products.Add">
          <ProductImport basePath="/products" t={(k: string) => t(k)} onImported={() => fetchData(true)} />
        </Can>
        <Can code="Products.Add">
          <ProductTypeMenu />
        </Can>
      </PageHeader>

      <div className="mb-5 inline-flex rounded-xl bg-gray-100 p-1 gap-1 max-w-full overflow-x-auto">
        {tabBtn("products", t("product.title"))}
        {tabBtn("archive", t("product.tabArchive"))}
        {tabBtn("reviews", `★ ${t("reviews.title")}`)}
      </div>

      {error && <div className="alert alert--danger">{error}</div>}

      <SuccessToast message={successMessage} fixed className="mb-4" />

      {activeTab === "reviews" ? (
        reviewsLoading && reviews.length === 0 ? (
          <LoadingState />
        ) : (
          <div className="space-y-3">
            {reviewsError && <div className="alert alert--danger">{reviewsError}</div>}
            {reviews.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-[40px] mb-3">⭐</p>
                <p className="text-[15px] font-bold text-[var(--ink)] mb-1">{t("reviews.emptyTitle")}</p>
                <p className="text-[13px] text-[var(--sub)]">{t("reviews.emptyDesc")}</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-bold"
                        style={{ background: "var(--blue-50)", color: "var(--blue)" }}
                      >
                        {review.customerName.charAt(0) || "؟"}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[var(--ink)]">{review.customerName}</p>
                        <div className="flex items-center gap-2">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} style={{ color: i < review.rating ? "#F59E0B" : "#D1D5DB", fontSize: 14 }}>★</span>
                          ))}
                          <span className="text-[11px] text-[var(--sub)]">
                            {new Date(review.createdAt).toLocaleDateString("ar-SA")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/dashboard/products/${review.productId}`} className="text-[12px] font-medium text-[var(--blue)] hover:underline">
                      {review.productName}
                    </Link>
                  </div>
                  {review.comment && <p className="text-[13px] text-[var(--sub)] leading-relaxed">{review.comment}</p>}
                </div>
              ))
            )}
          </div>
        )
      ) : (
        <>
          {actionError && !showModal && <div className="alert alert--danger">{actionError}</div>}

          <div className="card p-3 mb-3 flex flex-wrap items-center gap-3">
            <div className="field-shell flex-1 min-w-[220px]">
              <Icon name="search" className="text-[var(--sub)] shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("product.searchPlaceholder")}
              />
            </div>
            <div className="field-shell w-full sm:w-44">
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="all">{s.allCats}</option>
                <option value="none">{s.noCat}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.nameAr}</option>
                ))}
              </select>
            </div>
            <div className="field-shell w-full sm:w-48">
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="new">{s.sortNew}</option>
                <option value="name">{s.sortName}</option>
                <option value="priceAsc">{s.sortPriceAsc}</option>
                <option value="priceDesc">{s.sortPriceDesc}</option>
                <option value="qty">{s.sortQty}</option>
              </select>
            </div>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="btn btn-secondary">
                {s.clear}
              </button>
            )}
            <button type="button" onClick={exportCsv} className="btn btn-secondary">
              {s.exportCsv}
            </button>
            <details className="relative hidden lg:block">
              <summary className="btn btn-secondary cursor-pointer list-none">{s.columns}</summary>
              <div className="card absolute end-0 mt-2 w-52 p-3 z-20 shadow-lg space-y-2">
                {colOptions.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 text-[13px] text-[var(--ink)] cursor-pointer">
                    <input type="checkbox" checked={show(c.key)} onChange={() => toggleCol(c.key)} />
                    {c.label}
                  </label>
                ))}
              </div>
            </details>
          </div>

          {activeTab === "products" && (
            <div className="flex flex-wrap gap-2 mb-3">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setStatusFilter(c.key)}
                  className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold border transition-colors ${statusFilter === c.key ? "bg-[var(--blue-deep)] text-white border-transparent" : "bg-white text-[var(--sub)] border-[var(--border)] hover:text-[var(--ink)]"}`}
                >
                  {c.label} <span className="opacity-70">{c.count}</span>
                </button>
              ))}
            </div>
          )}

          {selected.size > 0 && (
            <div className="card p-3 mb-3 flex flex-wrap items-center gap-3 sticky top-2 z-10">
              <span className="text-[13px] font-bold text-[var(--ink)]">{s.selected(selected.size)}</span>
              {activeTab === "archive" ? (
                <>
                  <Can code="Products.Edit">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => runBulk(s.askRestore, s.doneRestore, (p) => api.post(`/products/${p.id}/restore`))}
                    >
                      {s.bulkRestore}
                    </button>
                  </Can>
                  <Can code="Products.Delete">
                    <button
                      type="button"
                      className="btn btn-secondary text-[var(--danger)]"
                      onClick={() => runBulk(s.askDelete, s.doneDelete, (p) => api.delete(`/products/${p.id}/permanent`))}
                    >
                      {s.bulkDelete}
                    </button>
                  </Can>
                </>
              ) : (
                <>
                  <Can code="Products.Edit">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="field-shell w-44">
                        <select value={bulkCat} onChange={(e) => setBulkCat(e.target.value)}>
                          <option value="">{s.chooseCat}</option>
                          <option value="none">{s.noCat}</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.nameAr}</option>
                          ))}
                        </select>
                      </div>
                      <button type="button" className="btn btn-secondary disabled:opacity-60" disabled={bulkCat === ""} onClick={applyBulkCat}>
                        {s.applyCat}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setPriceErr("");
                          setShowPrice(true);
                        }}
                      >
                        {s.bulkPrice}
                      </button>
                    </div>
                  </Can>
                  <Can code="Products.Delete">
                    <button
                      type="button"
                      className="btn btn-secondary text-[var(--danger)]"
                      onClick={() => runBulk(s.askArchive, s.doneArchive, (p) => api.delete(`/products/${p.id}`))}
                    >
                      {s.bulkArchive}
                    </button>
                  </Can>
                </>
              )}
              <button type="button" className="text-[12.5px] text-[var(--sub)] hover:text-[var(--ink)]" onClick={() => setSelected(new Set())}>
                {s.cancelSel}
              </button>
            </div>
          )}

          <div className="card overflow-hidden">
            {activeTab === "archive" && tabBase.length > 0 && (
              <div className="px-4 pt-4 text-[12.5px] text-[var(--sub)] flex items-center gap-2">
                <Icon name="alert" className="shrink-0" />
                <span>{t("product.archivedHint")}</span>
              </div>
            )}

            {pageItems.length === 0 ? (
              <p className="p-6 text-[var(--sub)] text-sm">
                {hasFilters
                  ? t("product.noResults")
                  : activeTab === "archive"
                    ? t("product.noArchived")
                    : t("product.noProducts")}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm hidden lg:table">
                    <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                      <tr>
                        <th className="p-3 w-10">
                          <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} aria-label={s.selectAll} />
                        </th>
                        <th className={th}>{t("product.name")}</th>
                        {show("sku") && <th className={th}>{t("product.skuLabel")}</th>}
                        <th className={th}>{t("product.basePrice")}</th>
                        {show("discount") && <th className={th}>{t("product.discountPrice")}</th>}
                        {show("qty") && <th className={th}>{t("product.availableQuantity")}</th>}
                        {show("status") && <th className={th}>{t("product.status")}</th>}
                        <th className={th}>{t("product.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((p) => (
                        <tr
                          key={p.id}
                          className={`border-b border-[var(--border)] transition-colors ${selected.has(p.id) ? "bg-[var(--blue-50)]" : "hover:bg-[var(--blue-50)]/40"}`}
                        >
                          <td className="p-3 w-10">
                            <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <Thumb url={p.primaryImageUrl} size={48} />
                              <div className="min-w-0">
                                <p className="font-semibold text-[var(--ink)] truncate max-w-[260px]">{p.nameAr}</p>
                                <p className="text-[11.5px] text-[var(--sub)] truncate max-w-[260px]">{catName(p.categoryId)}</p>
                              </div>
                            </div>
                          </td>
                          {show("sku") && <td className="p-3 text-[var(--sub)]" dir="ltr">{p.sku}</td>}
                          <td className="p-2">{priceCell(p)}</td>
                          {show("discount") && <td className="p-2">{discCell(p)}</td>}
                          {show("qty") && (
                            <td className="p-2">
                              <span className={qtyColor(p)}>{qtyCell(p)}</span>
                            </td>
                          )}
                          {show("status") && (
                            <td className="p-3">
                              <span className={statusStyles[p.status] ?? "badge badge--gray"}>
                                {statusLabels[p.status] ?? p.status}
                              </span>
                            </td>
                          )}
                          <td className="p-3">{renderActions(p, "text-[13px]")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="lg:hidden p-3 space-y-3">
                  {pageItems.map((p) => (
                    <div
                      key={p.id}
                      className={`rounded-xl border p-3 space-y-3 ${selected.has(p.id) ? "border-[var(--blue)] bg-[var(--blue-50)]" : "border-[var(--border)] bg-white"}`}
                    >
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} />
                        <Thumb url={p.primaryImageUrl} size={64} />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[var(--ink)] truncate">{p.nameAr}</p>
                          <p className="text-[11.5px] text-[var(--sub)] truncate">{catName(p.categoryId)}</p>
                          <p className="text-[11.5px] text-[var(--sub)] truncate" dir="ltr">{p.sku}</p>
                        </div>
                        <span className={`${statusStyles[p.status] ?? "badge badge--gray"} shrink-0`}>
                          {statusLabels[p.status] ?? p.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-[11px] font-bold text-[var(--sub)]">{s.price}</p>
                          {priceCell(p)}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[var(--sub)]">{s.discount}</p>
                          {discCell(p)}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[var(--sub)]">{s.qty}</p>
                          <span className={qtyColor(p)}>{qtyCell(p)}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-100">{renderActions(p, "text-[12px]")}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border)]">
              <span className="text-[12.5px] text-[var(--sub)]">{s.showing(pageItems.length, filtered.length)}</span>
              <div className="field-shell w-40">
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                  {[20, 50, 100].map((n) => (
                    <option key={n} value={n}>{n} {s.perPage}</option>
                  ))}
                </select>
              </div>
            </div>
            <Pagination
              page={curPage}
              totalPages={totalPages}
              totalCount={filtered.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {showPrice && (
        <div className="modal-overlay" onClick={() => setShowPrice(false)}>
          <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-bold text-[var(--blue-deep)]">{s.priceTitle}</h2>
              <button onClick={() => setShowPrice(false)} className="text-[var(--sub)] hover:text-[var(--ink)]" aria-label={t("common.close")}>
                ✕
              </button>
            </div>
            <p className="text-[12.5px] text-[var(--sub)] mb-3">{s.selected(selected.size)}</p>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["inc", s.modeInc],
                  ["dec", s.modeDec],
                  ["set", s.modeSet],
                ] as const).map(([k, text]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPriceMode(k)}
                    className={`px-2 py-2 rounded-lg text-[12px] font-bold border transition-colors ${priceMode === k ? "bg-[var(--blue-deep)] text-white border-transparent" : "bg-white text-[var(--sub)] border-[var(--border)]"}`}
                  >
                    {text}
                  </button>
                ))}
              </div>
              <div>
                <label className={lbl}>{s.value}</label>
                <div className="field-shell">
                  <input type="number" min={0} step="0.01" value={priceVal} onChange={(e) => setPriceVal(e.target.value)} />
                </div>
                {priceErr && <p className="text-[11.5px] text-[var(--danger)] mt-1">{priceErr}</p>}
              </div>
              <p className="text-[11.5px] text-[var(--sub)] leading-relaxed">{s.priceHint}</p>
              <div className="flex gap-3 pt-1">
                <button type="button" className="btn btn-primary flex-1" onClick={applyBulkPrice}>
                  {s.apply}
                </button>
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowPrice(false)}>
                  {s.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && activeTab === "products" && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-[var(--blue-deep)]">{t("product.edit")}</h2>
              <button onClick={closeModal} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>
                ✕
              </button>
            </div>

            {actionError && <div className="alert alert--danger">{actionError}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={lbl}>{t("product.category")}</label>
                <div className="field-shell">
                  <select value={form.categoryId} onChange={(e) => setF("categoryId", e.target.value)}>
                    <option value="">{t("product.noCategory")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>{t("product.nameAr")}</label>
                  <div className="field-shell">
                    <input type="text" value={form.nameAr} onChange={(e) => setF("nameAr", e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className={lbl}>{t("product.nameEn")}</label>
                  <div className="field-shell">
                    <input type="text" value={form.nameEn} onChange={(e) => setF("nameEn", e.target.value)} required dir="ltr" />
                  </div>
                </div>
              </div>

              <div>
                <label className={lbl}>{t("product.descriptionAr")}</label>
                <div className="field-shell items-start">
                  <textarea value={form.descriptionAr} onChange={(e) => setF("descriptionAr", e.target.value)} rows={2} />
                </div>
              </div>

              <div>
                <label className={lbl}>{t("product.descriptionEn")}</label>
                <div className="field-shell items-start">
                  <textarea value={form.descriptionEn} onChange={(e) => setF("descriptionEn", e.target.value)} rows={2} dir="ltr" />
                </div>
              </div>

              <div>
                <label className={lbl}>{t("product.skuLabel")}</label>
                <div className="field-shell bg-[#F7F8F9]">
                  <input type="text" value={form.sku} disabled dir="ltr" className="text-[var(--sub)]" />
                </div>
              </div>

              <div>
                <label className={lbl}>{t("product.barcode")}</label>
                <div className="field-shell">
                  <input type="text" value={form.barcode} onChange={(e) => setF("barcode", e.target.value)} dir="ltr" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={lbl}>{t("product.basePrice")}</label>
                  <div className="field-shell">
                    <input type="number" value={form.basePrice} onChange={(e) => setF("basePrice", e.target.value)} required min={0} step="0.01" />
                  </div>
                </div>
                <div>
                  <label className={lbl}>{t("product.discountPrice")}</label>
                  <div className="field-shell">
                    <input type="number" value={form.discountPrice} onChange={(e) => setF("discountPrice", e.target.value)} min={0} step="0.01" />
                  </div>
                </div>
                <div>
                  <label className={lbl}>{t("product.costPrice")}</label>
                  <div className="field-shell">
                    <input type="number" value={form.costPrice} onChange={(e) => setF("costPrice", e.target.value)} min={0} step="0.01" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>{t("product.weight")}</label>
                  <div className="field-shell">
                    <input type="number" value={form.weight} onChange={(e) => setF("weight", e.target.value)} min={0} step="0.01" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={form.hasWarranty}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        hasWarranty: e.target.checked,
                        warrantyMonths: e.target.checked ? f.warrantyMonths : "",
                      }))
                    }
                  />
                  {t("product.hasWarranty")}
                </label>
                {form.hasWarranty && (
                  <div className="field-shell flex-1">
                    <input
                      type="number"
                      min={1}
                      value={form.warrantyMonths}
                      onChange={(e) => setF("warrantyMonths", e.target.value)}
                      placeholder={t("product.warrantyMonths")}
                    />
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
                <label className="block text-[12.5px] font-bold text-[var(--ink)]">{t("productDetail.stockLabel")}</label>
                <p className="text-[12px] text-[var(--sub)]">{t("productDetail.stockHint")}</p>
                {qtyMsg && (
                  <p className="text-[12.5px] font-bold" style={{ color: qtyMsg.type === "success" ? "#2F855A" : "#9B2C2C" }}>
                    {qtyMsg.text}
                  </p>
                )}
                <div className="flex gap-3">
                  <div className="field-shell flex-1">
                    <input type="number" min={0} value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} />
                  </div>
                  <button type="button" onClick={handleSaveQty} disabled={savingQty} className="btn btn-secondary disabled:opacity-60">
                    {savingQty ? t("product.saving") : t("productDetail.stockSave")}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1 disabled:opacity-60">
                  {submitting ? t("product.saving") : t("common.save")}
                </button>
                <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

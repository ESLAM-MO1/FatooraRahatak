"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { useStore } from "@/components/StoreContext";
import { useStorefront, ProductItem, CategoryItem } from "@/lib/hooks/useStorefront";
import ProductRating from "@/components/store-templates/ProductRating";
import Toast from "@/components/Toast";
import { PackageIcon, HeartIcon, HeartFilledIcon } from "@/components/store-templates/icons";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

function ProductCard({ product, slug, currencySymbol, isWishlist, onWishlist, onAddToCart, t }: {
  product: ProductItem;
  slug: string;
  currencySymbol: string;
  isWishlist: (id: number) => boolean;
  onWishlist: (id: number) => void;
  onAddToCart: (id: number) => void;
  t: (k: string) => string;
}) {
  const hasDiscount = product.discountPrice !== null && product.discountPrice < product.basePrice;
  const discount = hasDiscount ? Math.round((1 - (product.discountPrice as number) / product.basePrice) * 100) : 0;
  const accent = "var(--blue, #2563eb)";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <div className="relative" style={{ aspectRatio: "4/3", background: "#F3F4F6" }}>
        <a href={`/store/${slug}/products/${product.id}`} className="block w-full h-full">
          {product.primaryImageUrl ? (
            <img src={product.primaryImageUrl} alt={product.nameAr} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ color: "#D1D5DB" }}>
              <PackageIcon size={44} />
            </div>
          )}
        </a>
        {hasDiscount && (
          <span className="absolute rounded-md px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: "#DC2626", top: 10, insetInlineStart: 10 }}>
            -{discount}%
          </span>
        )}
        <button
          type="button"
          onClick={() => onWishlist(product.id)}
          aria-label={t("storefront.wishlist")}
          className="absolute rounded-full flex items-center justify-center hover:scale-110 transition-transform"
          style={{ width: 36, height: 36, background: "rgba(255,255,255,0.94)", top: 10, insetInlineEnd: 10, color: "#DC2626" }}
        >
          {isWishlist(product.id) ? <HeartFilledIcon size={16} /> : <HeartIcon size={16} />}
        </button>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <a href={`/store/${slug}/products/${product.id}`} className="block">
          <h3 className="font-extrabold text-[15px] truncate" style={{ color: "#111827" }}>{product.nameAr}</h3>
        </a>
        {(product.ratingCount ?? 0) > 0 && (
          <div className="mt-1.5">
            <ProductRating rating={product.averageRating} count={product.ratingCount} size={12} />
          </div>
        )}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-extrabold text-lg" style={{ color: accent }}>
            {product.discountPrice || product.basePrice} {currencySymbol}
          </span>
          {hasDiscount && (
            <span className="text-xs line-through" style={{ color: "#9CA3AF" }}>{product.basePrice} {currencySymbol}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onAddToCart(product.id)}
          className="mt-auto pt-3 w-full py-2.5 rounded-lg font-bold text-sm text-white"
          style={{ background: accent, marginTop: "auto" }}
        >
          {t("storefront.addToCart")}
        </button>
      </div>
    </div>
  );
}

function ProductsInner({
  slug,
  storeId,
  currency,
}: {
  slug: string;
  storeId: number;
  currency: string;
}) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const dealsOnly = searchParams.get("deals") === "1";
  const sort = searchParams.get("sort") || "default";

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const { isRtl, currencySymbol, wishlist, toggleWishlist, handleAddToCart, cartMessage, cartMessageType } = useStorefront(slug, storeId, currency, true, false, { id: "default", isB2B: false, isRestaurant: false, isPharmacy: false } as any);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const url = selectedCategoryId
          ? `${API_BASE}/public/stores/${slug}/products?categoryId=${selectedCategoryId}`
          : `${API_BASE}/public/stores/${slug}/products`;
        const r = await fetch(url);
        if (!cancelled && r.ok) {
          const d = await r.json();
          setProducts(d?.data || []);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, selectedCategoryId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/public/stores/${slug}/categories`);
        if (!cancelled && r.ok) {
          const d = await r.json();
          setCategories(d?.data || []);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const displayProducts = useMemo(() => {
    let list = products.filter((p) => (dealsOnly ? p.discountPrice !== null && p.discountPrice < p.basePrice : true));
    if (sort === "best-selling") {
      list = [...list].sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0));
    } else if (sort === "newest") {
      list = [...list].sort((a, b) => b.id - a.id);
    }
    return list;
  }, [products, dealsOnly, sort]);

  const titleKey = dealsOnly ? "storefront.dealsTitle" : sort === "best-selling" ? "storefront.bestSellersTitle" : sort === "newest" ? "storefront.newArrivalsTitle" : "storefront.productsTitle";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="max-w-7xl mx-auto">
      <Toast message={cartMessage} type={cartMessageType} />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#111827" }}>{t(titleKey)}</h1>
          <p className="text-[13px] mt-1" style={{ color: "#6B7280" }}>{t("storefront.productsCount", { count: displayProducts.length })}</p>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
          <button
            type="button"
            onClick={() => setSelectedCategoryId(null)}
            className="shrink-0 px-4 py-2 rounded-full text-[13px] font-bold border transition-colors"
            style={{
              background: selectedCategoryId === null ? "var(--blue, #2563eb)" : "#fff",
              color: selectedCategoryId === null ? "#fff" : "#374151",
              borderColor: selectedCategoryId === null ? "var(--blue, #2563eb)" : "#E5E7EB",
            }}
          >
            {t("storefront.all")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)}
              className="shrink-0 px-4 py-2 rounded-full text-[13px] font-bold border transition-colors"
              style={{
                background: selectedCategoryId === cat.id ? "var(--blue, #2563eb)" : "#fff",
                color: selectedCategoryId === cat.id ? "#fff" : "#374151",
                borderColor: selectedCategoryId === cat.id ? "var(--blue, #2563eb)" : "#E5E7EB",
              }}
            >
              {cat.nameAr}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-center py-16" style={{ color: "#6B7280" }}>{t("storefront.loading")}</p>}
      {!loading && displayProducts.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16">
          <span style={{ color: "#D1D5DB" }}><PackageIcon size={48} /></span>
          <p style={{ color: "#6B7280" }}>{dealsOnly ? t("storefront.noDeals") : t("storefront.noProducts")}</p>
        </div>
      )}
      {!loading && displayProducts.length > 0 && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              slug={slug}
              currencySymbol={currencySymbol}
              isWishlist={(id) => wishlist.includes(id)}
              onWishlist={toggleWishlist}
              onAddToCart={(id) => handleAddToCart(id)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const store = useStore();

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p style={{ color: "#6B7280" }}>...</p></div>}>
      <ProductsInner slug={slug} storeId={store.id} currency={store.currency} />
    </Suspense>
  );
}
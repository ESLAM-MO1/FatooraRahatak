"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

export const CURRENCY_SYMBOLS: Record<string, string> = {
  SAR: "ر.س",
  AED: "د.إ",
  QAR: "ر.ق",
  KWD: "د.ك",
  BHD: "د.ب",
  OMR: "ر.ع",
  EGP: "ج.م",
  USD: "$",
};

const THEME_CONFIG: Record<string, { pluralPlaceholders: string[]; emoji: string; isRestaurant: boolean; isPharmacy: boolean }> = {
  restaurant: { pluralPlaceholders: ["المقبلات", "الأطباق الرئيسية", "المشروبات", "الحلويات"], emoji: "🍽️", isRestaurant: true, isPharmacy: false },
  pharmacy: { pluralPlaceholders: ["أدوية بدون وصفة", "العناية بالبشرة", "الفيتامينات", "مستلزمات الأطفال"], emoji: "💊", isRestaurant: false, isPharmacy: true },
  default: { pluralPlaceholders: ["الأكثر مبيعًا", "وصل حديثًا", "عروض خاصة", "الكل"], emoji: "📦", isRestaurant: false, isPharmacy: false },
};

export interface CategoryItem {
  id: number;
  nameAr: string;
  image: string | null;
}

export interface ProductItem {
  id: number;
  nameAr: string;
  nameEn: string;
  basePrice: number;
  discountPrice: number | null;
  availableQuantity: number;
  primaryImageUrl: string | null;
  averageRating?: number;
  ratingCount?: number;
}

export interface StoreThemeMeta {
  id: string;
  nameKey: string;
  descKey: string;
  group: "b2c" | "b2b" | "special";
  isB2B: boolean;
  isRestaurant: boolean;
  isPharmacy: boolean;
  previewPrimary: string;
  previewSecondary: string;
  previewAccent: string;
}

export interface StoreColors {
  headerColor: string;
  buttonColor: string;
  accentColor: string;
  heroFrom: string;
  heroTo: string;
  footerColor: string;
  newsletterColor: string;
}

export interface UseStorefrontResult {
  categories: CategoryItem[];
  products: ProductItem[];
  productsLoading: boolean;
  selectedCategoryId: number | null;
  setSelectedCategoryId: (id: number | null) => void;
  showAllProducts: boolean;
  setShowAllProducts: (show: boolean) => void;
  cartCount: number;
  cartMessage: string;
  wishlist: number[];
  toggleWishlist: (productId: number) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchInput: string;
  setSearchInput: (v: string) => void;
  handleSearchSubmit: (e: React.FormEvent) => void;
  clearSearch: () => void;
  isSearchActive: boolean;
  searchResults: ProductItem[];
  quickViewProduct: ProductItem | null;
  setQuickViewProduct: (p: ProductItem | null) => void;
  quoteRequested: number | null;
  handleQuoteRequest: (productId: number) => void;
  countdown: { h: number; m: number; s: number };
  currencySymbol: string;
  isRtl: boolean;
  handleAddToCart: (productId: number) => Promise<void>;
  orderType: "delivery" | "pickup";
  setOrderType: (t: "delivery" | "pickup") => void;
}

export function useCountdown(hours: number) {
  const [secs, setSecs] = useState(hours * 3600);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s > 0 ? s - 1 : hours * 3600), 1000);
    return () => clearInterval(t);
  }, [hours]);
  return { h: Math.floor(secs / 3600), m: Math.floor((secs % 3600) / 60), s: secs % 60 };
}

const getCartKey = (slug: string) => `cart_session_${slug}`;
const getWishKey = (slug: string) => `wishlist_${slug}`;

export function useStorefront(slug: string, storeId: number | null, currency: string, isSearchEnabled: boolean, showHero: boolean, themeMeta: StoreThemeMeta): UseStorefrontResult {
  const { t, i18n } = useTranslation();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [cartMessage, setCartMessage] = useState("");
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductItem | null>(null);
  const [quoteRequested, setQuoteRequested] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");

  const isRtl = i18n.language !== "en";
  const currencySymbol = CURRENCY_SYMBOLS[currency || "SAR"] || "ر.س";
  const countdown = useCountdown(6);

  const categoryConfig = THEME_CONFIG[themeMeta.isRestaurant ? "restaurant" : themeMeta.isPharmacy ? "pharmacy" : "default"];

  const refreshCart = async () => {
    if (!storeId) return;
    const sid = localStorage.getItem(getCartKey(slug));
    if (!sid) { setCartCount(0); return; }
    try {
      const r = await fetch(`${API_BASE}/stores/${storeId}/cart?sessionId=${encodeURIComponent(sid)}`);
      if (r.ok) { const d = await r.json(); setCartCount((d?.data?.items || []).length); }
      else setCartCount(0);
    } catch { setCartCount(0); }
  };

  useEffect(() => {
    if (!showHero) return;
    let c = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/public/stores/${slug}/categories`);
        if (!c && r.ok) { const d = await r.json(); setCategories(d?.data || []); }
      } catch { }
    })();
    return () => { c = true; };
  }, [showHero, slug]);

  useEffect(() => {
    if (!showHero) return;
    let c = false;
    (async () => {
      setProductsLoading(true);
      try {
        const url = selectedCategoryId ? `${API_BASE}/public/stores/${slug}/products?categoryId=${selectedCategoryId}` : `${API_BASE}/public/stores/${slug}/products`;
        const r = await fetch(url);
        if (!c && r.ok) { const d = await r.json(); setProducts(d?.data || []); }
      } catch { } finally { if (!c) setProductsLoading(false); }
    })();
    return () => { c = true; };
  }, [showHero, slug, selectedCategoryId]);

  useEffect(() => {
    refreshCart();
    try {
      const saved = localStorage.getItem(getWishKey(slug));
      if (saved) setWishlist(JSON.parse(saved));
    } catch { }
  }, [storeId, slug]);

  const handleAddToCart = async (productId: number) => {
    if (!storeId) return;
    try {
      const sid = localStorage.getItem(getCartKey(slug));
      const r = await fetch(`${API_BASE}/stores/${storeId}/cart/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid || undefined, productId, variantId: null, quantity: 1 }),
      });
      const d = await r.json();
      if (r.ok && d?.sessionId) localStorage.setItem(getCartKey(slug), d.sessionId);
      await refreshCart();
      setCartMessage(r.ok ? t("storefront.addedToCart") : (d?.message || t("storefront.cartError")));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCartMessage(""), 2500);
    } catch {
      setCartMessage(t("storefront.cartError"));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCartMessage(""), 2500);
    }
  };

  const toggleWishlist = (productId: number) => {
    setWishlist(prev => {
      const next = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId];
      try { localStorage.setItem(getWishKey(slug), JSON.stringify(next)); } catch { }
      return next;
    });
  };

  const handleQuoteRequest = (productId: number) => {
    setQuoteRequested(productId);
    setCartMessage(t("storefront.quoteSent"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCartMessage(""), 2500);
    setTimeout(() => setQuoteRequested(null), 2500);
  };

  const searchResults = products.filter(p => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (p.nameAr || "").toLowerCase().includes(q) || (p.nameEn || "").toLowerCase().includes(q);
  });

  const isSearchActive = isSearchEnabled && searchQuery.trim().length > 0;
  const displayProducts = isSearchActive ? searchResults : products.slice(0, showAllProducts ? products.length : 8);

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); setSearchQuery(searchInput.trim()); };
  const clearSearch = () => { setSearchQuery(""); setSearchInput(""); };

  return {
    categories, products, productsLoading, selectedCategoryId, setSelectedCategoryId,
    showAllProducts, setShowAllProducts, cartCount, cartMessage, wishlist, toggleWishlist,
    searchQuery, setSearchQuery, searchInput, setSearchInput, handleSearchSubmit, clearSearch,
    isSearchActive, searchResults, quickViewProduct, setQuickViewProduct, quoteRequested, handleQuoteRequest,
    countdown, currencySymbol, isRtl, handleAddToCart, orderType, setOrderType,
  };
}
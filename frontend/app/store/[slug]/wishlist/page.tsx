"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

interface WishlistProduct {
  id: number;
  nameAr: string;
  nameEn: string;
  basePrice: number;
  discountPrice: number | null;
  primaryImageUrl: string | null;
}

function getWishlistKey(slug: string) {
  return `wishlist_${slug}`;
}

export default function WishlistPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;

  const [ids, setIds] = useState<number[]>([]);
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState("ر.س");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(getWishlistKey(slug));
      setIds(saved ? JSON.parse(saved) : []);
    } catch {
      setIds([]);
    }
  }, [slug]);

  useEffect(() => {
    const init = async () => {
      try {
        const storeRes = await api.get(`/public/stores/${slug}`);
        const store = storeRes.data.data;
        setStoreId(store.id);
        const symbols: Record<string, string> = { SAR: "ر.س", AED: "د.إ", QAR: "ر.ق", KWD: "د.ك", BHD: "د.ب", OMR: "ر.ع", EGP: "ج.م", USD: "$" };
        setCurrencySymbol(symbols[store.currency] || "ر.س");
      } catch { }
    };
    init();
  }, [slug]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (ids.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }
      try {
        const res = await api.get(`/public/stores/${slug}/products`, {
          params: { ids: ids.join(",") },
        });
        setProducts(res.data.data || []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, ids]);

  const removeFromWishlist = (productId: number) => {
    const next = ids.filter(id => id !== productId);
    setIds(next);
    try { localStorage.setItem(getWishlistKey(slug), JSON.stringify(next)); } catch { }
  };

  const addToCart = async (productId: number) => {
    if (!storeId) return;
    try {
      const sid = localStorage.getItem(`cart_session_${slug}`);
      const res = await api.post(`/stores/${storeId}/cart/items`, {
        sessionId: sid || undefined,
        productId,
        variantId: null,
        quantity: 1,
      });
      const newSid = res.data?.sessionId || res.data?.data?.sessionId;
      if (newSid) localStorage.setItem(`cart_session_${slug}`, newSid);
    } catch { }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-800 mb-5">{t("storefront.wishlist")}</h1>

      {products.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-500 mb-4">{t("wishlist.empty")}</p>
          <Link
            href={`/store/${slug}`}
            className="store-btn inline-block text-sm"
          >
            {t("cart.browseProducts")}
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-100">
          {products.map((product) => (
            <div key={product.id} className="p-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto sm:flex-1">
                {product.primaryImageUrl ? (
                  <img
                    src={product.primaryImageUrl}
                    alt={product.nameAr}
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 shrink-0" />
                )}
                <div className="min-w-0">
                  <Link href={`/store/${slug}/products/${product.id}`} className="block">
                    <p className="text-gray-800 font-medium truncate">{product.nameAr}</p>
                  </Link>
                  <p className="text-sm font-bold text-gray-800 mt-1">
                    {product.discountPrice || product.basePrice} {currencySymbol}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => addToCart(product.id)}
                  className="store-btn inline-block text-sm"
                >
                  {t("storefront.addToCart")}
                </button>
                <button
                  type="button"
                  onClick={() => removeFromWishlist(product.id)}
                  className="text-red-600 hover:underline text-sm disabled:opacity-40"
                >
                  {t("cart.remove")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

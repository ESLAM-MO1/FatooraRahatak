"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

interface StoreInfo {
  id: number;
  storeName: string;
  storeSlug: string;
  logo: string | null;
  defaultLanguage: string;
}

interface CategoryInfo {
  id: number;
  nameAr: string;
  nameEn: string;
  image: string | null;
  parentCategoryId: number | null;
}

interface ProductInfo {
  id: number;
  nameAr: string;
  nameEn: string;
  basePrice: number;
  discountPrice: number | null;
  sku: string;
  availableQuantity: number;
  primaryImageUrl: string | null;
}

export default function StorePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [store, setStore] = useState<StoreInfo | null>(null);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStore = async () => {
      setLoading(true);
      setNotFound(false);
      setError("");
      try {
        const [storeRes, categoriesRes] = await Promise.all([
          api.get(`/public/stores/${slug}`),
          api.get(`/public/stores/${slug}/categories`),
        ]);
        setStore(storeRes.data.data);
        setCategories(categoriesRes.data.data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(err.response?.data?.message || "حدث خطأ أثناء تحميل المتجر");
        }
      } finally {
        setLoading(false);
      }
    };

    loadStore();
  }, [slug]);

  useEffect(() => {
    if (!store) return;

    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const url = selectedCategoryId
          ? `/public/stores/${slug}/products?categoryId=${selectedCategoryId}`
          : `/public/stores/${slug}/products`;
        const res = await api.get(url);
        setProducts(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "حدث خطأ أثناء تحميل المنتجات");
      } finally {
        setProductsLoading(false);
      }
    };

    loadProducts();
  }, [store, slug, selectedCategoryId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            هذا المتجر غير متاح حاليًا
          </h1>
          <p className="text-gray-500">
            تأكد من صحة الرابط أو حاول مرة أخرى لاحقًا
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store?.logo ? (
              <img
                src={store.logo}
                alt={store.storeName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {store?.storeName?.charAt(0)}
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-800">{store?.storeName}</h1>
          </div>

          <Link
            href={`/store/${slug}/cart`}
            className="relative p-2 rounded-full hover:bg-gray-100 transition"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Category Bar */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${
                selectedCategoryId === null
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
              }`}
            >
              الكل
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${
                  selectedCategoryId === cat.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {cat.nameAr}
              </button>
            ))}
          </div>
        )}

        {/* Product Grid */}
        {productsLoading ? (
          <p className="text-gray-500">جاري تحميل المنتجات...</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500 text-center py-12">لا توجد منتجات حاليًا</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/store/${slug}/products/${product.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition"
              >
                <div className="aspect-square bg-gray-100">
                  {product.primaryImageUrl ? (
                    <img
                      src={product.primaryImageUrl}
                      alt={product.nameAr}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                      لا توجد صورة
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm text-gray-800 font-medium truncate">
                    {product.nameAr}
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    {product.discountPrice ? (
                      <>
                        <span className="text-blue-600 font-bold">
                          {product.discountPrice} ر.س
                        </span>
                        <span className="text-gray-400 text-xs line-through">
                          {product.basePrice} ر.س
                        </span>
                      </>
                    ) : (
                      <span className="text-blue-600 font-bold">
                        {product.basePrice} ر.س
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

interface ProductImage {
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface ProductVariant {
  id: number;
  variantName: string;
  sku: string;
  priceAdjustment: number;
  image: string | null;
  availableQuantity: number;
}

interface ProductDetail {
  id: number;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  basePrice: number;
  discountPrice: number | null;
  sku: string;
  hasVariants: boolean;
  availableQuantity: number;
  images: ProductImage[];
  variants: ProductVariant[];
}

function getCartSessionKey(slug: string) {
  return `cart_session_${slug}`;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const productId = params.productId as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [addingToCart, setAddingToCart] = useState(false);
  const [addSuccess, setAddSuccess] = useState("");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      setNotFound(false);
      setError("");
      try {
        const [storeRes, productRes] = await Promise.all([
          api.get(`/public/stores/${slug}`),
          api.get(`/public/stores/${slug}/products/${productId}`),
        ]);
        setStoreId(storeRes.data.data.id);
        const data: ProductDetail = productRes.data.data;
        setProduct(data);
        if (data.variants.length > 0) {
          setSelectedVariantId(data.variants[0].id);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(err.response?.data?.message || "حدث خطأ أثناء تحميل المنتج");
        }
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [slug, productId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            هذا المنتج غير متاح حاليًا
          </h1>
          <Link href={`/store/${slug}`} className="text-blue-600 hover:underline">
            العودة للمتجر
          </Link>
        </div>
      </div>
    );
  }

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) || null;

  const displayPrice = product.discountPrice ?? product.basePrice;
  const finalPrice = displayPrice + (selectedVariant?.priceAdjustment || 0);

  const maxAvailable = selectedVariant
    ? selectedVariant.availableQuantity
    : product.availableQuantity;

  const activeImage =
    product.images.length > 0 ? product.images[activeImageIndex] : null;

  const handleAddToCart = async () => {
    if (!storeId) return;
    setAddError("");
    setAddSuccess("");
    setAddingToCart(true);

    const existingSessionId = localStorage.getItem(getCartSessionKey(slug));

    try {
      const res = await api.post(`/stores/${storeId}/cart/items`, {
        sessionId: existingSessionId || undefined,
        productId: product.id,
        variantId: selectedVariantId,
        quantity,
      });

      const returnedSessionId = res.data.sessionId;
      if (returnedSessionId) {
        localStorage.setItem(getCartSessionKey(slug), returnedSessionId);
      }

      setAddSuccess("تمت إضافة المنتج للسلة بنجاح");
    } catch (err: any) {
      setAddError(err.response?.data?.message || "حدث خطأ أثناء الإضافة للسلة");
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/store/${slug}`} className="text-blue-600 hover:underline text-sm">
          ← العودة للمتجر
        </Link>
        <Link href={`/store/${slug}/cart`} className="text-blue-600 hover:underline text-sm">
          الذهاب للسلة
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gallery */}
        <div>
          <div className="aspect-square bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-3">
            {activeImage ? (
              <img
                src={activeImage.imageUrl}
                alt={product.nameAr}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                لا توجد صورة
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-16 h-16 rounded-md overflow-hidden border-2 flex-shrink-0 ${
                    idx === activeImageIndex ? "border-blue-600" : "border-gray-200"
                  }`}
                >
                  <img
                    src={img.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{product.nameAr}</h1>
          <p className="text-sm text-gray-400 mb-4">SKU: {product.sku}</p>

          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-2xl font-bold text-blue-600">
              {finalPrice.toFixed(2)} ر.س
            </span>
            {product.discountPrice && (
              <span className="text-gray-400 line-through">
                {(product.basePrice + (selectedVariant?.priceAdjustment || 0)).toFixed(2)} ر.س
              </span>
            )}
          </div>

          {product.descriptionAr && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {product.descriptionAr}
              </p>
            </div>
          )}

          {product.hasVariants && product.variants.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اختر النوع
              </label>
              <select
                value={selectedVariantId ?? ""}
                onChange={(e) => setSelectedVariantId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.availableQuantity === 0}>
                    {v.variantName}
                    {v.availableQuantity === 0 ? " (غير متوفر)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
            <input
              type="number"
              min={1}
              max={maxAvailable > 0 ? maxAvailable : 1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              {maxAvailable > 0 ? `متاح ${maxAvailable} قطعة` : "غير متوفر حاليًا"}
            </p>
          </div>

          {addSuccess && (
            <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
              {addSuccess}
            </div>
          )}
          {addError && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
              {addError}
            </div>
          )}

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={maxAvailable === 0 || addingToCart}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
          >
            {maxAvailable === 0
              ? "غير متوفر"
              : addingToCart
              ? "جاري الإضافة..."
              : "أضف للسلة"}
          </button>
        </div>
      </div>
    </div>
  );
}
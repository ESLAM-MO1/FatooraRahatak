"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
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
  const { t } = useTranslation();
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
          setError(t("error.serverError"));
        }
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [slug, productId, t]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {t("productDetail.productNotAvailable")}
          </h1>
          <Link href={`/store/${slug}`} className="store-link">
            {t("productDetail.backToStore")}
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

      setAddSuccess(t("cart.addSuccess"));
    } catch (err: any) {
      setAddError(err.response?.data?.message || t("cart.addError"));
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
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
                {t("productDetail.noImage")}
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
                    idx === activeImageIndex ? "" : "border-gray-200"
                  }`}
                  style={idx === activeImageIndex ? { borderColor: 'var(--theme)' } : undefined}
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
            <span className="text-2xl font-bold store-price">
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
                {t("productDetail.selectVariant")}
              </label>
              <select
                value={selectedVariantId ?? ""}
                onChange={(e) => setSelectedVariantId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme)]"
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.availableQuantity === 0}>
                    {v.variantName}
                    {v.availableQuantity === 0 ? ` (${t("productDetail.outOfStock")})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("productDetail.quantity")}</label>
            <input
              type="number"
              min={1}
              max={maxAvailable > 0 ? maxAvailable : 1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--theme)]"
            />
            <p className="text-xs text-gray-400 mt-1">
              {maxAvailable > 0 ? t("productDetail.availableQuantity", { count: maxAvailable }) : t("productDetail.outOfStockCurrently")}
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
            className="store-btn w-full disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {maxAvailable === 0
              ? t("productDetail.outOfStock")
              : addingToCart
              ? t("cart.adding")
              : t("cart.addToCart")}
          </button>
        </div>
      </div>
    </div>
  );
}

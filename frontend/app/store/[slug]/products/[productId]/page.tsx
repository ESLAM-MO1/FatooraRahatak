"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import SuccessToast from "@/components/SuccessToast";
import { getQuickCustomer } from "@/lib/quickCustomer";
import { resolveThemeConfig, parseStoreColors, StoreColors } from "@/components/store-templates/configs";
import { resolveSocialUrl } from "@/components/store-templates/social";

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

interface ProductReview {
  id: number;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface PublicProduct {
  id: number;
  nameAr: string;
  nameEn: string;
  basePrice: number;
  discountPrice: number | null;
  primaryImageUrl: string | null;
  averageRating: number;
  ratingCount: number;
  availableQuantity: number;
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
  const [colors, setColors] = useState<StoreColors | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [addingToCart, setAddingToCart] = useState(false);
  const [addSuccess, setAddSuccess] = useState("");
  const [addError, setAddError] = useState("");

  const [reviewsEnabled, setReviewsEnabled] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewForm, setReviewForm] = useState({ name: "", rating: 0, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [reviewSubmitError, setReviewSubmitError] = useState("");

  const [related, setRelated] = useState<PublicProduct[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
        const storeData = storeRes.data.data;
        setStoreId(storeData.id);
        setReviewsEnabled(storeData.isReviewsEnabled ?? false);
        setWhatsappUrl(storeData.whatsappUrl || null);
        setContactPhone(storeData.contactPhone || null);

        const themeMeta = resolveThemeConfig(storeData.themeName);
        const resolvedColors = parseStoreColors(themeMeta.id, storeData.colorsJson);
        setColors(resolvedColors);

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

  useEffect(() => {
    let cancelled = false;
    const loadRelated = async () => {
      setRelatedLoading(true);
      try {
        const res = await api.get(`/public/stores/${slug}/products/${productId}/related`);
        if (!cancelled) setRelated(res.data.data || []);
      } catch {
        if (!cancelled) setRelated([]);
      } finally {
        if (!cancelled) setRelatedLoading(false);
      }
    };
    loadRelated();
    return () => {
      cancelled = true;
    };
  }, [slug, productId]);

  useEffect(() => {
    if (!reviewsEnabled) return;
    let cancelled = false;
    const loadReviews = async () => {
      setReviewsLoading(true);
      setReviewsError("");
      try {
        const res = await api.get(`/public/stores/${slug}/products/${productId}/reviews`);
        if (!cancelled) setReviews(res.data.data || []);
        const quick = getQuickCustomer(slug);
        if (!cancelled && quick?.fullName && !reviewForm.name.trim()) {
          setReviewForm((f) => ({ ...f, name: quick.fullName }));
        }
      } catch {
        if (!cancelled) setReviewsError(t("productDetail.reviewLoadError"));
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    };
    loadReviews();
    return () => {
      cancelled = true;
    };
  }, [slug, productId, reviewsEnabled, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitError("");
    setReviewSuccess("");
    if (!reviewForm.name.trim()) {
      setReviewSubmitError(t("productDetail.reviewName"));
      return;
    }
    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      setReviewSubmitError(t("productDetail.reviewRatingRequired"));
      return;
    }
    if (!reviewForm.comment.trim()) {
      setReviewSubmitError(t("productDetail.reviewCommentRequired"));
      return;
    }
    setReviewSubmitting(true);
    try {
      const quick = getQuickCustomer(slug);
      const res = await api.post(`/public/stores/${slug}/products/${productId}/reviews`, {
        customerName: reviewForm.name.trim(),
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
        phone: quick?.phone || undefined,
      });
      const newReview: ProductReview = res.data.data;
      setReviews((prev) => [newReview, ...prev]);
      setReviewForm({ name: "", rating: 0, comment: "" });
      setReviewSuccess(t("productDetail.reviewSubmitted"));
    } catch (err: unknown) {
      const err2 = err as { response?: { data?: { message?: string } } };
      setReviewSubmitError(err2.response?.data?.message || t("productDetail.reviewSubmitError"));
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (notFound || !product || !colors) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {t("productDetail.productNotAvailable")}
          </h1>
          <Link href={`/store/${slug}`} className="font-semibold" style={{ color: colors?.accentColor }}>
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

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: product.nameAr, url });
        return;
      } catch {
        /* fall through to clipboard copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("storefront.copyLink"), url);
    }
  };

  const whatsappLink = (() => {
    const resolved = resolveSocialUrl(whatsappUrl);
    if (resolved) return resolved;
    if (!contactPhone) return null;
    const digits = contactPhone.replace(/\D/g, "").replace(/^0+/, "");
    return digits ? `https://wa.me/${digits}` : null;
  })();

  const whatsappMessage = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const lines = [
      `*${product.nameAr}*`,
      `${finalPrice.toFixed(2)} ${t("common.sar")}`,
      url,
    ];
    return encodeURIComponent(lines.join("\n"));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {error && (
        <div className="alert alert--danger mb-4">{error}</div>
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
                  style={idx === activeImageIndex ? { borderColor: colors.accentColor } : undefined}
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
            <span className="text-2xl font-bold" style={{ color: colors.accentColor }}>
              {finalPrice.toFixed(2)} {t("common.sar")}
            </span>
            {product.discountPrice && (
              <span className="text-gray-400 line-through">
                {(product.basePrice + (selectedVariant?.priceAdjustment || 0)).toFixed(2)} {t("common.sar")}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {whatsappLink && (
              <a
                href={`${whatsappLink}${whatsappLink.includes("?") ? "&" : "?"}text=${whatsappMessage()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border text-[13px] font-bold transition-colors"
                style={{ color: "#16A34A", borderColor: "#16A34A55", background: "#F0FDF4" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.668-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t("storefront.orderOnWhatsapp")}
              </a>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-[13px] font-bold transition-colors"
              style={{ color: "#1F2937", borderColor: "#E5E7EB", background: "#F9FAFB" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              {copied ? t("storefront.copied") : t("storefront.shareProduct")}
            </button>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2"
                style={{ boxShadow: "none" }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.accentColor}55`)}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
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
              className="w-24 px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2"
              style={{ boxShadow: "none" }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.accentColor}55`)}
              onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
            />
            <p className="text-xs text-gray-400 mt-1">
              {maxAvailable > 0 ? t("productDetail.availableQuantity", { count: maxAvailable }) : t("productDetail.outOfStockCurrently")}
            </p>
          </div>

          <SuccessToast message={addSuccess} fixed className="mb-4" />
          {addError && (
            <div className="alert alert--danger mb-4">
              {addError}
            </div>
          )}

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={maxAvailable === 0 || addingToCart}
            className="w-full py-3 rounded-lg font-bold text-sm text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
            style={{ background: maxAvailable === 0 || addingToCart ? undefined : colors.buttonColor }}
          >
            {maxAvailable === 0
              ? t("productDetail.outOfStock")
              : addingToCart
              ? t("cart.adding")
              : t("cart.addToCart")}
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{t("storefront.relatedProducts")}</h2>
          {relatedLoading ? (
            <p className="text-sm text-gray-400 py-4 text-center">{t("common.loading")}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((p) => (
                <Link
                  key={p.id}
                  href={`/store/${slug}/products/${p.id}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden group transition-shadow hover:shadow-md"
                >
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    {p.primaryImageUrl ? (
                      <img src={p.primaryImageUrl} alt={p.nameAr} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                        {t("productDetail.noImage")}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[13px] font-medium text-gray-800 line-clamp-2 mb-1">{p.nameAr}</p>
                    {p.ratingCount > 0 && (
                      <div className="flex items-center gap-1 mb-1" dir="ltr">
                        <span style={{ color: "#F59E0B", fontSize: 12 }}>★</span>
                        <span className="text-[11px] text-gray-500">{p.averageRating.toFixed(1)}</span>
                      </div>
                    )}
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-sm" style={{ color: colors.accentColor }}>
                        {(p.discountPrice ?? p.basePrice).toFixed(2)} {t("common.sar")}
                      </span>
                      {p.discountPrice != null && p.discountPrice < p.basePrice && (
                        <span className="text-[11px] text-gray-400 line-through">{p.basePrice.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {reviewsEnabled && (
        <div className="mt-10 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">{t("productDetail.reviews")}</h2>

          <SuccessToast message={reviewSuccess} fixed className="mb-4" />

          {reviewsLoading ? (
            <p className="text-sm text-gray-400 py-6 text-center">{t("common.loading")}</p>
          ) : reviews.length === 0 && !reviewsError ? (
            <p className="text-sm text-gray-400 py-4">{t("productDetail.noReviews")}</p>
          ) : (
            <div className="space-y-4 mt-4">
              {reviews.map((r) => (
                <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm text-gray-800">{r.customerName}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mb-2" dir="ltr">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} style={{ color: star <= r.rating ? "#F59E0B" : "#D1D5DB", fontSize: 14 }}>
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          )}

          {reviewsError && <p className="text-sm text-red-500 mt-2">{reviewsError}</p>}

          <form onSubmit={handleSubmitReview} className="mt-6 border-t border-gray-100 pt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("productDetail.reviewName")}
              </label>
              <input
                type="text"
                value={reviewForm.name}
                onChange={(e) => setReviewForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("productDetail.reviewNamePlaceholder")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2"
                style={{ boxShadow: "none" }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.accentColor}55`)}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("productDetail.reviewRating")}
              </label>
              <div className="flex items-center gap-1" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}
                    className="text-2xl transition-transform hover:scale-110"
                    style={{ color: star <= reviewForm.rating ? "#F59E0B" : "#D1D5DB" }}
                    aria-label={`${star} star`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("productDetail.reviewComment")}
              </label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                placeholder={t("productDetail.reviewCommentPlaceholder")}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2"
                style={{ boxShadow: "none" }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.accentColor}55`)}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
              />
            </div>

            {reviewSubmitError && (
              <div className="alert alert--danger">{reviewSubmitError}</div>
            )}

            <button
              type="submit"
              disabled={reviewSubmitting}
              className="py-2.5 px-6 rounded-lg font-bold text-sm text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
              style={{ background: reviewSubmitting ? undefined : colors.buttonColor }}
            >
              {reviewSubmitting ? t("common.saving") : t("productDetail.submitReview")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
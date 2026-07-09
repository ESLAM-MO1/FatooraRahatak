"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import api from "@/lib/api";

interface Product {
  id: number;
  nameAr: string;
  nameEn: string;
  sku: string;
  basePrice: number;
  discountPrice: number | null;
  costPrice: number;
  status: string;
  availableQuantity: number;
  descriptionAr: string | null;
}

interface VariantAttribute {
  attributeName: string;
  attributeValue: string;
}

interface Variant {
  id: number;
  variantName: string;
  sku: string;
  priceAdjustment: number;
  availableQuantity: number;
  attributes: VariantAttribute[];
}

interface ProductImage {
  id: number;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface AttributeRow {
  attributeName: string;
  attributeValue: string;
}

const emptyVariantForm = {
  variantName: "",
  priceAdjustment: "0",
  initialQuantity: "0",
};

const emptyImageForm = {
  imageUrl: "",
  isPrimary: false,
  sortOrder: "0",
};

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="18" height="18">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const backArrowPath = "M9 5l-7 7 7 7M2 12h20";
const plusPath = "M12 5v14M5 12h14";
const alertPath = "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";

export default function ProductDetailsPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [variantError, setVariantError] = useState("");
  const [imageError, setImageError] = useState("");
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [showImageForm, setShowImageForm] = useState(false);
  const [variantForm, setVariantForm] = useState(emptyVariantForm);
  const [attributes, setAttributes] = useState<AttributeRow[]>([
    { attributeName: "", attributeValue: "" },
  ]);
  const [imageForm, setImageForm] = useState(emptyImageForm);
  const [submittingVariant, setSubmittingVariant] = useState(false);
  const [submittingImage, setSubmittingImage] = useState(false);
  const [hideOfferVariantIds, setHideOfferVariantIds] = useState<number[]>([]);
  const [deactivatingVariantId, setDeactivatingVariantId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productRes, variantsRes, imagesRes] = await Promise.all([
        api.get(`/products/${productId}`),
        api.get(`/products/${productId}/variants`),
        api.get(`/products/${productId}/images`),
      ]);
      setProduct(productRes.data.data);
      setVariants(variantsRes.data.data);
      setImages(imagesRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل بيانات المنتج");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addAttributeRow = () => {
    setAttributes([...attributes, { attributeName: "", attributeValue: "" }]);
  };

  const updateAttribute = (
    index: number,
    field: keyof AttributeRow,
    value: string
  ) => {
    const updated = [...attributes];
    updated[index][field] = value;
    setAttributes(updated);
  };

  const removeAttributeRow = (index: number) => {
    if (attributes.length <= 1) return;
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    setVariantError("");
    setSubmittingVariant(true);

    const validAttributes = attributes.filter(
      (a) => a.attributeName.trim() && a.attributeValue.trim()
    );

    try {
      await api.post(`/products/${productId}/variants`, {
        variantName: variantForm.variantName,
        priceAdjustment: parseFloat(variantForm.priceAdjustment) || 0,
        initialQuantity: parseInt(variantForm.initialQuantity) || 0,
        attributes: validAttributes,
      });
      setVariantForm(emptyVariantForm);
      setAttributes([{ attributeName: "", attributeValue: "" }]);
      setShowVariantForm(false);
      const res = await api.get(`/products/${productId}/variants`);
      setVariants(res.data.data);
    } catch (err: any) {
      setVariantError(
        err.response?.data?.message || "حدث خطأ أثناء إضافة المتغير"
      );
    } finally {
      setSubmittingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المتغير؟")) return;

    setVariantError("");
    try {
      await api.delete(`/products/${productId}/variants/${variantId}`);
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      setHideOfferVariantIds((prev) => prev.filter((id) => id !== variantId));
    } catch (err: any) {
      const message =
        err.response?.data?.message || "حدث خطأ أثناء حذف المتغير";
      setVariantError(message);
      if (message.includes("حركات مخزون مسجلة")) {
        setHideOfferVariantIds((prev) =>
          prev.includes(variantId) ? prev : [...prev, variantId]
        );
      }
    }
  };

  const handleDeactivateVariant = async (variantId: number) => {
    if (!window.confirm("هل تريد إخفاء هذا المتغير؟")) return;

    setVariantError("");
    setDeactivatingVariantId(variantId);
    try {
      await api.put(
        `/products/${productId}/variants/${variantId}/deactivate`
      );
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      setHideOfferVariantIds((prev) => prev.filter((id) => id !== variantId));
    } catch (err: any) {
      setVariantError(
        err.response?.data?.message || "حدث خطأ أثناء إخفاء المتغير"
      );
    } finally {
      setDeactivatingVariantId(null);
    }
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setImageError("");
    setSubmittingImage(true);

    try {
      await api.post(`/products/${productId}/images`, {
        imageUrl: imageForm.imageUrl,
        isPrimary: imageForm.isPrimary,
        sortOrder: parseInt(imageForm.sortOrder) || 0,
      });
      setImageForm(emptyImageForm);
      setShowImageForm(false);
      const res = await api.get(`/products/${productId}/images`);
      setImages(res.data.data);
    } catch (err: any) {
      setImageError(
        err.response?.data?.message || "حدث خطأ أثناء إضافة الصورة"
      );
    } finally {
      setSubmittingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الصورة؟")) return;

    setImageError("");
    try {
      await api.delete(`/products/${productId}/images/${imageId}`);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err: any) {
      setImageError(
        err.response?.data?.message || "حدث خطأ أثناء حذف الصورة"
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--sub)]">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
        جاري التحميل...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div dir="rtl">
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-2 text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13.5px] mb-4"
        >
          <Icon path={backArrowPath} className="rotate-180" />
          رجوع لقائمة المنتجات
        </Link>
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 text-sm flex items-start gap-2">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {error || "المنتج غير موجود"}
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <Link
        href="/dashboard/products"
        className="inline-flex items-center gap-2 text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13.5px] mb-4"
      >
        <Icon path={backArrowPath} className="rotate-180" />
        رجوع لقائمة المنتجات
      </Link>

      <h1 className="text-[22px] font-bold text-[var(--blue-deep)] mb-6">
        تفاصيل المنتج: {product.nameAr}
      </h1>

      <div className="card p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[var(--sub)] mb-1 text-[12.5px]">SKU</p>
            <p className="font-bold text-[var(--ink)]" dir="ltr">
              {product.sku}
            </p>
          </div>
          <div>
            <p className="text-[var(--sub)] mb-1 text-[12.5px]">السعر الأساسي</p>
            <p className="font-bold text-[var(--ink)]">
              {product.basePrice.toLocaleString("ar-SA")} ر.س
            </p>
          </div>
          <div>
            <p className="text-[var(--sub)] mb-1 text-[12.5px]">سعر الخصم</p>
            <p className="font-bold text-[var(--ink)]">
              {product.discountPrice != null
                ? `${product.discountPrice.toLocaleString("ar-SA")} ر.س`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[var(--sub)] mb-1 text-[12.5px]">الكمية المتاحة</p>
            <p className="font-bold text-[var(--ink)]">
              {product.availableQuantity}
            </p>
          </div>
        </div>
        {product.descriptionAr && (
          <p className="text-[var(--sub)] text-sm mt-4 leading-relaxed">{product.descriptionAr}</p>
        )}
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold text-[var(--blue-deep)]">المتغيرات</h2>
          <button
            onClick={() => {
              setShowVariantForm(!showVariantForm);
              setVariantError("");
            }}
            className={showVariantForm ? "btn-secondary" : "btn-primary"}
          >
            {!showVariantForm && <Icon path={plusPath} />}
            {showVariantForm ? "إلغاء" : "إضافة متغير"}
          </button>
        </div>

        {variantError && (
          <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
            <Icon path={alertPath} className="shrink-0 mt-0.5" />
            {variantError}
          </div>
        )}

        {showVariantForm && (
          <form
            onSubmit={handleAddVariant}
            className="border border-[var(--border)] rounded-2xl p-4 mb-4 space-y-3"
          >
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
                  اسم المتغير
                </label>
                <div className="field-shell">
                  <input
                    type="text"
                    value={variantForm.variantName}
                    onChange={(e) =>
                      setVariantForm({
                        ...variantForm,
                        variantName: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
                  فرق السعر
                </label>
                <div className="field-shell">
                  <input
                    type="number"
                    value={variantForm.priceAdjustment}
                    onChange={(e) =>
                      setVariantForm({
                        ...variantForm,
                        priceAdjustment: e.target.value,
                      })
                    }
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
                  الكمية الابتدائية
                </label>
                <div className="field-shell">
                  <input
                    type="number"
                    value={variantForm.initialQuantity}
                    onChange={(e) =>
                      setVariantForm({
                        ...variantForm,
                        initialQuantity: e.target.value,
                      })
                    }
                    min={0}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12.5px] font-bold text-[var(--ink)]">
                  الخصائص
                </label>
                <button
                  type="button"
                  onClick={addAttributeRow}
                  className="text-[var(--blue)] text-[12.5px] font-bold hover:underline"
                >
                  + خاصية
                </button>
              </div>
              {attributes.map((attr, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <div className="field-shell flex-1">
                    <input
                      type="text"
                      value={attr.attributeName}
                      onChange={(e) =>
                        updateAttribute(index, "attributeName", e.target.value)
                      }
                      placeholder="اسم الخاصية (مثل: اللون)"
                    />
                  </div>
                  <div className="field-shell flex-1">
                    <input
                      type="text"
                      value={attr.attributeValue}
                      onChange={(e) =>
                        updateAttribute(index, "attributeValue", e.target.value)
                      }
                      placeholder="قيمة الخاصية (مثل: أحمر)"
                    />
                  </div>
                  {attributes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAttributeRow(index)}
                      className="text-[var(--danger)] text-[12.5px] font-medium px-2 hover:opacity-80"
                    >
                      حذف
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={submittingVariant}
              className="btn-primary disabled:opacity-60"
            >
              {submittingVariant ? "جاري الحفظ..." : "حفظ المتغير"}
            </button>
          </form>
        )}

        {variants.length === 0 ? (
          <p className="text-[var(--sub)] text-sm">لا توجد متغيرات بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">الاسم</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">SKU</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">فرق السعر</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">الكمية</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">الخصائص</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant) => (
                  <tr key={variant.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-3 text-[var(--ink)] font-medium">{variant.variantName}</td>
                    <td className="p-3 text-[var(--sub)]" dir="ltr">{variant.sku}</td>
                    <td className="p-3 text-[var(--sub)]">
                      {variant.priceAdjustment >= 0 ? "+" : ""}
                      {variant.priceAdjustment.toLocaleString("ar-SA")} ر.س
                    </td>
                    <td className="p-3 text-[var(--sub)]">{variant.availableQuantity}</td>
                    <td className="p-3 text-[var(--sub)]">
                      {variant.attributes.length > 0
                        ? variant.attributes
                            .map((a) => `${a.attributeName}: ${a.attributeValue}`)
                            .join(" | ")
                        : "—"}
                    </td>
                    <td className="p-3">
                      {hideOfferVariantIds.includes(variant.id) ? (
                        <button
                          onClick={() => handleDeactivateVariant(variant.id)}
                          disabled={deactivatingVariantId === variant.id}
                          className="text-[var(--gold-deep)] hover:opacity-80 font-medium text-[13px] disabled:opacity-50"
                        >
                          {deactivatingVariantId === variant.id
                            ? "جاري الإخفاء..."
                            : "إخفاء المتغير"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteVariant(variant.id)}
                          className="text-[var(--danger)] hover:opacity-80 font-medium text-[13px]"
                        >
                          حذف
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold text-[var(--blue-deep)]">الصور</h2>
          <button
            onClick={() => {
              setShowImageForm(!showImageForm);
              setImageError("");
            }}
            className={showImageForm ? "btn-secondary" : "btn-primary"}
          >
            {!showImageForm && <Icon path={plusPath} />}
            {showImageForm ? "إلغاء" : "إضافة صورة"}
          </button>
        </div>

        {imageError && (
          <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
            <Icon path={alertPath} className="shrink-0 mt-0.5" />
            {imageError}
          </div>
        )}

        {showImageForm && (
          <form
            onSubmit={handleAddImage}
            className="border border-[var(--border)] rounded-2xl p-4 mb-4 space-y-3"
          >
            <div>
              <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
                رابط الصورة (URL)
              </label>
              <div className="field-shell">
                <input
                  type="url"
                  value={imageForm.imageUrl}
                  onChange={(e) =>
                    setImageForm({ ...imageForm, imageUrl: e.target.value })
                  }
                  required
                  dir="ltr"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
            <div className="flex items-center gap-5">
              <label className="flex items-center gap-2 text-[13px] text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={imageForm.isPrimary}
                  onChange={(e) =>
                    setImageForm({ ...imageForm, isPrimary: e.target.checked })
                  }
                  className="rounded accent-[var(--blue)]"
                />
                صورة رئيسية
              </label>
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
                  الترتيب
                </label>
                <div className="field-shell w-24">
                  <input
                    type="number"
                    value={imageForm.sortOrder}
                    onChange={(e) =>
                      setImageForm({ ...imageForm, sortOrder: e.target.value })
                    }
                    min={0}
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={submittingImage}
              className="btn-primary disabled:opacity-60"
            >
              {submittingImage ? "جاري الحفظ..." : "حفظ الصورة"}
            </button>
          </form>
        )}

        {images.length === 0 ? (
          <p className="text-[var(--sub)] text-sm">لا توجد صور بعد.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="border border-[var(--border)] rounded-xl overflow-hidden relative"
              >
                <img
                  src={image.imageUrl}
                  alt="صورة المنتج"
                  className="w-full h-32 object-cover bg-[#F7F8F9]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "";
                    (e.target as HTMLImageElement).alt = "تعذّر تحميل الصورة";
                  }}
                />
                {image.isPrimary && (
                  <span className="absolute top-2 right-2 bg-[var(--blue)] text-white text-[10.5px] font-bold px-2 py-0.5 rounded-full">
                    رئيسية
                  </span>
                )}
                <div className="p-2 flex justify-between items-center">
                  <span className="text-[11px] text-[var(--sub)]">
                    ترتيب: {image.sortOrder}
                  </span>
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="text-[var(--danger)] hover:opacity-80 text-[11.5px] font-medium"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
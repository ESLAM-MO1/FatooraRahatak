"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import LoadingState from "@/components/LoadingState";
import { useConfirm } from "@/components/ConfirmDialog";

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

export default function ProductDetailsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
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
      setError(err.response?.data?.message || t("productDetail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [productId, t]);

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
        err.response?.data?.message || t("productDetail.addVariantError")
      );
    } finally {
      setSubmittingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    if (!(await confirm(t("productDetail.variantDeleteConfirm")))) return;

    setVariantError("");
    try {
      await api.delete(`/products/${productId}/variants/${variantId}`);
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      setHideOfferVariantIds((prev) => prev.filter((id) => id !== variantId));
    } catch (err: any) {
      const message =
        err.response?.data?.message || t("productDetail.variantDeleteError");
      setVariantError(message);
      if (message.toLowerCase().includes("stock")) {
        setHideOfferVariantIds((prev) =>
          prev.includes(variantId) ? prev : [...prev, variantId]
        );
      }
    }
  };

  const handleDeactivateVariant = async (variantId: number) => {
    if (!(await confirm(t("productDetail.hideVariantConfirm")))) return;

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
        err.response?.data?.message || t("productDetail.hideVariantError")
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
        err.response?.data?.message || t("productDetail.addImageError")
      );
    } finally {
      setSubmittingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!(await confirm(t("productDetail.imageDeleteConfirm")))) return;

    setImageError("");
    try {
      await api.delete(`/products/${productId}/images/${imageId}`);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err: any) {
      setImageError(
        err.response?.data?.message || t("productDetail.imageDeleteError")
      );
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error || !product) {
    return (
      <div>
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-2 text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13.5px] mb-4"
        >
          <Icon name="arrowLeft" />
          {t("productDetail.backToList")}
        </Link>
        <div className="alert alert--danger">
          {error || t("productDetail.notFound")}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard/products"
        className="inline-flex items-center gap-2 text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13.5px] mb-4"
      >
        <Icon name="arrowLeft" />
        {t("productDetail.backToList")}
      </Link>

      <h1 className="text-[22px] font-bold text-[var(--blue-deep)] mb-6">
        {t("productDetail.title", { name: product.nameAr })}
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
            <p className="text-[var(--sub)] mb-1 text-[12.5px]">{t("productDetail.basePrice")}</p>
            <p className="font-bold text-[var(--ink)]">
              {product.basePrice.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
            </p>
          </div>
          <div>
            <p className="text-[var(--sub)] mb-1 text-[12.5px]">{t("productDetail.discountPrice")}</p>
            <p className="font-bold text-[var(--ink)]">
              {product.discountPrice != null
                ? `${product.discountPrice.toLocaleString("ar-SA-u-nu-latn")} ${t("common.sar")}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[var(--sub)] mb-1 text-[12.5px]">{t("productDetail.availableQty")}</p>
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
          <h2 className="text-[16px] font-bold text-[var(--blue-deep)]">{t("productDetail.variants")}</h2>
          <button
            onClick={() => {
              setShowVariantForm(!showVariantForm);
              setVariantError("");
            }}
            className={showVariantForm ? "btn btn-secondary" : "btn btn-primary"}
          >
            {!showVariantForm && <Icon name="plus" />}
            {showVariantForm ? t("common.cancel") : t("productDetail.addVariant")}
          </button>
        </div>

        {variantError && <div className="alert alert--danger mb-4">{variantError}</div>}

        {showVariantForm && (
          <form
            onSubmit={handleAddVariant}
            className="border border-[var(--border)] rounded-2xl p-4 mb-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
                  {t("productDetail.variantName")}
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
                  {t("productDetail.priceDiff")}
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
                  {t("productDetail.initialQty")}
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
                  {t("productDetail.attributes")}
                </label>
                <button
                  type="button"
                  onClick={addAttributeRow}
                  className="text-[var(--blue)] text-[12.5px] font-bold hover:underline"
                >
                  {t("productDetail.addAttribute")}
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
                      placeholder={t("productDetail.attributeNamePlaceholder")}
                    />
                  </div>
                  <div className="field-shell flex-1">
                    <input
                      type="text"
                      value={attr.attributeValue}
                      onChange={(e) =>
                        updateAttribute(index, "attributeValue", e.target.value)
                      }
                      placeholder={t("productDetail.attributeValuePlaceholder")}
                    />
                  </div>
                  {attributes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAttributeRow(index)}
                      className="text-[var(--danger)] text-[12.5px] font-medium px-2 hover:opacity-80"
                    >
                      {t("common.delete")}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={submittingVariant}
              className="btn btn-primary disabled:opacity-60"
            >
              {submittingVariant ? t("common.saving") : t("productDetail.saveVariant")}
            </button>
          </form>
        )}

        {variants.length === 0 ? (
          <p className="text-[var(--sub)] text-sm">{t("productDetail.noVariants")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("productDetail.variantNameCol")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">SKU</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("productDetail.priceDiffCol")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("productDetail.qtyCol")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("productDetail.attributesCol")}</th>
                  <th className="text-right p-3 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("productDetail.actionsCol")}</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant) => (
                  <tr key={variant.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-3 text-[var(--ink)] font-medium">{variant.variantName}</td>
                    <td className="p-3 text-[var(--sub)]" dir="ltr">{variant.sku}</td>
                    <td className="p-3 text-[var(--sub)]">
                      {variant.priceAdjustment >= 0 ? "+" : ""}
                      {variant.priceAdjustment.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
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
                            ? t("productDetail.hiding")
                            : t("productDetail.hideVariant")}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteVariant(variant.id)}
                          className="text-[var(--danger)] hover:opacity-80 font-medium text-[13px]"
                        >
                          {t("common.delete")}
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
          <h2 className="text-[16px] font-bold text-[var(--blue-deep)]">{t("productDetail.images")}</h2>
          <button
            onClick={() => {
              setShowImageForm(!showImageForm);
              setImageError("");
            }}
            className={showImageForm ? "btn btn-secondary" : "btn btn-primary"}
          >
            {!showImageForm && <Icon name="plus" />}
            {showImageForm ? t("common.cancel") : t("productDetail.addImage")}
          </button>
        </div>

        {imageError && <div className="alert alert--danger mb-4">{imageError}</div>}

        {showImageForm && (
          <form
            onSubmit={handleAddImage}
            className="border border-[var(--border)] rounded-2xl p-4 mb-4 space-y-3"
          >
            <div>
              <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
                {t("productDetail.imageField")}
              </label>
              <div className="field-shell">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("file", file);
                    const res = await api.post("/products/upload-image", formData, { headers: { "Content-Type": "multipart/form-data" } });
                    setImageForm({ ...imageForm, imageUrl: res.data.data.url });
                  }}
                />
              </div>
              {imageForm.imageUrl && (
                <img src={imageForm.imageUrl} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded-lg border border-[var(--border)]" />
              )}
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
                {t("productDetail.primaryImage")}
              </label>
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
                  {t("productDetail.sortOrder")}
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
              className="btn btn-primary disabled:opacity-60"
            >
              {submittingImage ? t("common.saving") : t("productDetail.saveImage")}
            </button>
          </form>
        )}

        {images.length === 0 ? (
          <p className="text-[var(--sub)] text-sm">{t("productDetail.noImages")}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="border border-[var(--border)] rounded-xl overflow-hidden relative"
              >
                <img
                  src={image.imageUrl}
                  alt={t("productDetail.imageAlt")}
                  className="w-full h-32 object-cover bg-[#F7F8F9]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "";
                    (e.target as HTMLImageElement).alt = t("productDetail.imageLoadError");
                  }}
                />
                {image.isPrimary && (
                  <span className="absolute top-2 right-2 bg-[var(--blue)] text-white text-[10.5px] font-bold px-2 py-0.5 rounded-full">
                    {t("productDetail.primaryBadge")}
                  </span>
                )}
                <div className="p-2 flex justify-between items-center">
                  <span className="text-[11px] text-[var(--sub)]">
                    {t("productDetail.sortOrderLabel", { order: image.sortOrder })}
                  </span>
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="text-[var(--danger)] hover:opacity-80 text-[11.5px] font-medium"
                  >
                    {t("common.delete")}
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

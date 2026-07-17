"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";

export default function NewFixedAssetPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [nameAr, setNameAr] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [usefulLifeYears, setUsefulLifeYears] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const monthlyPreview =
    purchaseCost && usefulLifeYears && parseFloat(purchaseCost) > 0 && parseInt(usefulLifeYears) > 0
      ? (parseFloat(purchaseCost) / (parseInt(usefulLifeYears) * 12)).toFixed(2)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!nameAr.trim()) {
      setError(t("fixedAsset.enterName"));
      return;
    }
    if (!purchaseCost || parseFloat(purchaseCost) <= 0) {
      setError(t("fixedAsset.enterCost"));
      return;
    }
    if (!usefulLifeYears || parseInt(usefulLifeYears) <= 0) {
      setError(t("fixedAsset.enterLife"));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nameAr: nameAr.trim(),
        purchaseCost: parseFloat(purchaseCost),
        purchaseDate,
        usefulLifeYears: parseInt(usefulLifeYears),
      };
      const res = await api.post("/fixed-assets", payload);
      router.push(`/dashboard/accounting/fixed-assets?highlight=${res.data.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || t("fixedAsset.saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader icon="fixedAsset" title={t("fixedAsset.newAssetTitle")}>
        <Link href="/dashboard/accounting/fixed-assets" className="btn btn-secondary">
          {t("fixedAsset.cancelAndReturn")}
        </Link>
      </PageHeader>

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="card p-5 space-y-4 max-w-xl">
        <div>
          <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("fixedAsset.name")}</label>
          <div className="field-shell">
            <input
              type="text"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder={t("fixedAsset.namePlaceholder")}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("fixedAsset.purchaseCost")}</label>
            <div className="field-shell">
              <input
                type="number"
                min={0}
                step="0.01"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                dir="ltr"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("fixedAsset.purchaseDate")}</label>
            <div className="field-shell">
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("fixedAsset.usefulLife")}</label>
          <div className="field-shell">
            <input
              type="number"
              min={1}
              step="1"
              value={usefulLifeYears}
              onChange={(e) => setUsefulLifeYears(e.target.value)}
              dir="ltr"
              required
            />
          </div>
        </div>

        {monthlyPreview && (
          <div className="bg-[var(--blue-50)] rounded-xl p-3 text-[12.5px] text-[var(--ink)]">
            {t("fixedAsset.monthlyPreview")}{" "}
            <span className="font-bold" dir="ltr">
              {monthlyPreview} ر.س
            </span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn btn-primary disabled:opacity-50">
            {submitting ? t("common.saving") : t("fixedAsset.saveAsset")}
          </button>
          <Link href="/dashboard/accounting/fixed-assets" className="btn btn-secondary">
            {t("common.cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}

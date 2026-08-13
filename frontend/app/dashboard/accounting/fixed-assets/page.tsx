"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import Can from "@/components/Can";

interface FixedAsset {
  id: number;
  nameAr: string;
  purchaseCost: number;
  purchaseDate: string;
  usefulLifeYears: number;
  depreciationMethod: string;
  accumulatedDepreciation: number;
  currentBookValue: number;
  isFullyDepreciated: boolean;
  isActive: boolean;
  monthlyDepreciationAmount: number;
}

interface DepreciationRunResult {
  fixedAssetId: number;
  fixedAssetNameAr: string;
  depreciationAmount: number;
  newAccumulatedDepreciation: number;
  newBookValue: number;
  isNowFullyDepreciated: boolean;
  journalEntryId: number;
  journalEntryNumber: string;
  periodMonth: string;
}

export default function FixedAssetsPage() {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningAll, setRunningAll] = useState(false);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [runResults, setRunResults] = useState<DepreciationRunResult[] | null>(null);
  const [runError, setRunError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/fixed-assets");
      setAssets(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("fixedAsset.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runDepreciation = async (assetId: number | null) => {
    setRunError("");
    setRunResults(null);
    if (assetId === null) setRunningAll(true);
    else setRunningId(assetId);
    try {
      const res = await api.post("/fixed-assets/run-depreciation", { fixedAssetId: assetId });
      setRunResults(res.data.data);
      await fetchData();
    } catch (err: any) {
      setRunError(err.response?.data?.message || t("fixedAsset.runError"));
    } finally {
      setRunningAll(false);
      setRunningId(null);
    }
  };

  return (
    <div>
      <PageHeader icon="fixedAsset" title={t("fixedAsset.title")}>
        <div className="flex gap-2">
          <Can code="FixedAssets.Edit">
            <button
              onClick={() => runDepreciation(null)}
              disabled={runningAll || assets.length === 0}
              className="btn btn-secondary disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M8 5v14l11-7-11-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {runningAll ? t("fixedAsset.runningAll") : t("fixedAsset.runAll")}
            </button>
          </Can>
          <Can code="FixedAssets.Add">
            <Link href="/dashboard/accounting/fixed-assets/new" className="btn btn-primary">
              <Icon name="plus" />
              {t("fixedAsset.newAsset")}
            </Link>
          </Can>
        </div>
      </PageHeader>

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      {runError && <div className="alert alert--danger mb-4">{runError}</div>}

      {runResults && (
        <div className="bg-[var(--green-soft)] rounded-xl p-4 mb-4 text-sm">
          <p className="font-bold text-[var(--green)] mb-2 flex items-center gap-1.5">
            <Icon name="check" />
            {t("fixedAsset.runSuccess", { count: runResults.length })}
          </p>
          <div className="space-y-1.5">
            {runResults.map((r) => (
              <div
                key={r.fixedAssetId}
                className="flex items-center justify-between text-[12.5px] text-[var(--ink)]"
              >
                <span>{r.fixedAssetNameAr}</span>
                <span dir="ltr">
                  {r.depreciationAmount.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")} —{" "}
                  <Link
                    href={`/dashboard/accounting/journal-entries/${r.journalEntryId}`}
                    className="text-[var(--blue)] hover:underline"
                  >
                    {r.journalEntryNumber}
                  </Link>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : assets.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("fixedAsset.noAssets")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("fixedAsset.name")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("fixedAsset.purchaseDate")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("fixedAsset.purchaseCost")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("fixedAsset.usefulLife")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("fixedAsset.monthlyDepreciation")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("fixedAsset.accumulatedDepreciation")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("fixedAsset.bookValue")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("fixedAsset.status")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]"></th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors"
                  >
                    <td className="p-4 text-[var(--ink)] font-medium">{a.nameAr}</td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">
                      {a.purchaseDate}
                    </td>
                    <td className="p-4 text-[var(--ink)]" dir="ltr">
                      {a.purchaseCost.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
                    </td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">
                      {t("fixedAsset.years", { count: a.usefulLifeYears })}
                    </td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">
                      {a.monthlyDepreciationAmount.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
                    </td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">
                      {a.accumulatedDepreciation.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
                    </td>
                    <td className="p-4 text-[var(--ink)] font-medium" dir="ltr">
                      {a.currentBookValue.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
                    </td>
                    <td className="p-4">
                      <span className={`badge ${a.isFullyDepreciated ? "badge--gray" : "badge--green"}`}>
                        {a.isFullyDepreciated ? t("fixedAsset.fullyDepreciated") : t("fixedAsset.active")}
                      </span>
                    </td>
                    <td className="p-4">
                      {!a.isFullyDepreciated && (
                        <button
                          onClick={() => runDepreciation(a.id)}
                          disabled={runningId === a.id || runningAll}
                          className="text-[var(--blue)] hover:underline text-[12.5px] font-bold disabled:opacity-50"
                        >
                          {runningId === a.id ? t("fixedAsset.running") : t("fixedAsset.runDepreciation")}
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
    </div>
  );
}

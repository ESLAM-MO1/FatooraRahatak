"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import LoadingState from "@/components/LoadingState";
import { useConfirm } from "@/components/ConfirmDialog";
import Can from "@/components/Can";

interface StockCountItem {
  id: number;
  productId: number;
  productNameAr: string;
  variantId: number | null;
  systemQuantity: number;
  countedQuantity: number | null;
  variance: number;
}

interface StockCount {
  id: number;
  warehouseId: number;
  status: string;
  items: StockCountItem[];
}

const statusStyles: Record<string, string> = {
  InProgress: "badge badge--blue",
  PendingApproval: "badge badge--yellow",
  Completed: "badge badge--green",
  Cancelled: "badge badge--red",
};

export default function StockCountDetailPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const params = useParams();
  const stockCountId = params.id as string;

  const [stockCount, setStockCount] = useState<StockCount | null>(null);
  const [countedInputs, setCountedInputs] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [approving, setApproving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchStockCount = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/stock-counts/${stockCountId}`);
      const data: StockCount = res.data.data;
      setStockCount(data);

      const inputs: Record<number, string> = {};
      data.items.forEach((item) => {
        inputs[item.id] = item.countedQuantity != null ? item.countedQuantity.toString() : "";
      });
      setCountedInputs(inputs);
    } catch (err: any) {
      setError(err.response?.data?.message || t("stockCount.errorLoadingDetails"));
    } finally {
      setLoading(false);
    }
  }, [stockCountId, t]);

  useEffect(() => {
    fetchStockCount();
  }, [fetchStockCount]);

  const handleSaveItem = async (itemId: number) => {
    const value = countedInputs[itemId];
    if (value === "" || value === undefined) {
      setActionError(t("stockCount.enterActualQuantity"));
      return;
    }

    setActionError("");
    setSavingItemId(itemId);
    try {
      await api.put("/stock-counts/submit-count", {
        stockCountItemId: itemId,
        countedQuantity: parseInt(value) || 0,
      });
      await fetchStockCount();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("stockCount.errorSavingQuantity"));
    } finally {
      setSavingItemId(null);
    }
  };

  const handleApprove = async () => {
    if (!(await confirm(t("stockCount.confirmApproval")))) return;

    setActionError("");
    setApproving(true);
    try {
      await api.put(`/stock-counts/${stockCountId}/approve`);
      await fetchStockCount();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("stockCount.errorApproving"));
    } finally {
      setApproving(false);
    }
  };

  const handleCancel = async () => {
    if (!(await confirm(t("stockCount.confirmCancel")))) return;

    setActionError("");
    setCancelling(true);
    try {
      await api.put(`/stock-counts/${stockCountId}/cancel`);
      await fetchStockCount();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("stockCount.errorCancel"));
    } finally {
      setCancelling(false);
    }
  };

  const isCompleted = stockCount?.status === "Completed";
  const isInProgress = stockCount?.status === "InProgress";

  if (loading) {
    return <LoadingState />;
  }

  if (error || !stockCount) {
    return (
      <div>
        <Link href="/dashboard/stock-counts" className="text-[var(--blue)] font-bold hover:underline text-[13.5px] mb-4 inline-block">
          ← {t("stockCount.backToStart")}
        </Link>
        <div className="alert alert--danger">
          {error || t("stockCount.notFound")}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/dashboard/stock-counts" className="text-[var(--blue)] font-bold hover:underline text-[13.5px] mb-4 inline-block">
        ← {t("stockCount.backToStart")}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]">{t("stockCount.details")}</h1>
        <span className={statusStyles[stockCount.status] ?? "badge badge--gray"}>
          {t(`stockCount.status${stockCount.status}` as const)}
        </span>
      </div>

      {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}

      <div className="table-wrap">
        {stockCount.items.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-[13.5px]">{t("stockCount.noProducts")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>{t("stockCount.product")}</th>
                  <th>{t("stockCount.recordedQuantity")}</th>
                  <th>{t("stockCount.actualQuantity")}</th>
                  {isCompleted && <th>{t("stockCount.variance")}</th>}
                  {isInProgress && <th>{t("stockCount.action")}</th>}
                </tr>
              </thead>
              <tbody>
                {stockCount.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.productNameAr}</td>
                    <td className="text-[var(--sub)]">{item.systemQuantity}</td>
                    <td>
                      {isInProgress ? (
                        <input
                          type="number"
                          value={countedInputs[item.id] ?? ""}
                          onChange={(e) => setCountedInputs({ ...countedInputs, [item.id]: e.target.value })}
                          min={0}
                          className="w-24 px-2.5 py-1.5 border border-[var(--border)] rounded-[8px] text-[13.5px] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-50)]"
                        />
                      ) : (
                        <span>{item.countedQuantity ?? "—"}</span>
                      )}
                    </td>
                    {isCompleted && (
                      <td>
                        <span
                          className={`font-bold ${
                            item.variance > 0
                              ? "text-[var(--green)]"
                              : item.variance < 0
                                ? "text-[var(--danger)]"
                                : "text-[var(--sub)]"
                          }`}
                        >
                          {item.variance > 0 ? "+" : ""}
                          {item.variance}
                        </span>
                      </td>
                    )}
                    {isInProgress && (
                      <td>
                        <button
                          onClick={() => handleSaveItem(item.id)}
                          disabled={savingItemId === item.id}
                          className="text-[var(--blue)] font-bold hover:underline text-[13px] disabled:opacity-50"
                        >
                          {savingItemId === item.id ? t("common.saving") : t("common.save")}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isInProgress && (
        <div className="mt-6 flex items-center gap-3">
          <Can code="StockCounts.Approve">
            {stockCount.items.length > 0 && (
              <button onClick={handleApprove} disabled={approving} className="btn btn-primary px-6">
                {approving ? t("stockCount.approving") : t("stockCount.approve")}
              </button>
            )}
            <button onClick={handleCancel} disabled={cancelling} className="btn btn-outline px-6 text-[var(--danger)] border-[var(--danger)] hover:bg-[var(--danger-soft)]">
              {cancelling ? t("common.loading") : t("stockCount.cancel")}
            </button>
          </Can>
        </div>
      )}
    </div>
  );
}

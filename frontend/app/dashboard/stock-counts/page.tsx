"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import Can from "@/components/Can";

interface Warehouse {
  id: number;
  warehouseName: string;
}

interface StockCountListItem {
  id: number;
  warehouseName: string;
  status: string;
  itemsCount: number;
  createdAt: string;
  completedAt: string | null;
}

const countStatusStyles: Record<string, string> = {
  Draft: "badge badge--yellow",
  InProgress: "badge badge--blue",
  Completed: "badge badge--green",
  Approved: "badge badge--green",
};

export default function StockCountsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [counts, setCounts] = useState<StockCountListItem[]>([]);

  const countStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      Draft: t("stockCount.statusDraft"),
      InProgress: t("stockCount.statusInProgress"),
      Completed: t("stockCount.statusCompleted"),
      Approved: t("stockCount.statusApproved"),
    };
    return map[status] ?? status;
  };

  const fetchCounts = useCallback(async () => {
    try {
      const res = await api.get("/stock-counts");
      setCounts(res.data.data || []);
    } catch {
      setCounts([]);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/warehouses");
      setWarehouses(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("stockCount.errorLoadingWarehouses"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchWarehouses();
    fetchCounts();
  }, [fetchWarehouses, fetchCounts]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setSubmitting(true);

    try {
      const res = await api.post("/stock-counts/start", {
        warehouseId: Number(warehouseId),
      });
      const stockCountId = res.data.data?.id;
      router.push(`/dashboard/stock-counts/${stockCountId}`);
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("stockCount.errorStartingCount"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader icon="clipboard" title={t("stockCount.title")} />

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <div className="card p-6 max-w-md">
        {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}

        <form onSubmit={handleStart}>
          <div className="mb-6">
            <label htmlFor="warehouseId" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
              {t("stockCount.selectWarehouse")}
            </label>
            <div className="field-shell">
              <select id="warehouseId" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
                <option value="">{t("stockCount.selectWarehouse")}</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.warehouseName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Can code="StockCounts.Add">
            <button type="submit" disabled={submitting} className="btn btn-primary w-full py-2.5">
              {submitting ? t("stockCount.starting") : t("stockCount.startNewCount")}
            </button>
          </Can>
        </form>
      </div>

      <div className="card overflow-hidden mt-6">
        <h2 className="text-[14px] font-bold text-[var(--blue-deep)] p-5 pb-0">{t("stockCount.previousCounts")}</h2>
        {counts.length === 0 ? (
          <p className="p-5 text-[var(--sub)] text-sm">{t("stockCount.noCounts")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-3">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("stockCount.warehouseCol")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("stockCount.itemsCount")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("stockCount.statusCol")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("stockCount.dateCol")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("stockCount.actionsCol")}</th>
                </tr>
              </thead>
              <tbody>
                {counts.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium">{c.warehouseName}</td>
                    <td className="p-4 text-[var(--sub)]">{c.itemsCount}</td>
                    <td className="p-4">
                      <span className={countStatusStyles[c.status] ?? "badge badge--gray"}>
                        {countStatusLabel(c.status)}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--sub)]">
                      {new Date(c.createdAt).toLocaleString("ar-SA-u-nu-latn")}
                    </td>
                    <td className="p-4">
                      <a
                        href={`/dashboard/stock-counts/${c.id}`}
                        className="text-[var(--blue)] hover:underline text-[13px] font-medium"
                      >
                        {t("stockCount.viewDetails")}
                      </a>
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

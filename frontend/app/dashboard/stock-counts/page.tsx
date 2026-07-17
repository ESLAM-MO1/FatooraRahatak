"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

interface Warehouse {
  id: number;
  warehouseName: string;
}

export default function StockCountsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
  }, [fetchWarehouses]);

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

          <button type="submit" disabled={submitting} className="btn btn-primary w-full py-2.5">
            {submitting ? t("stockCount.starting") : t("stockCount.startNewCount")}
          </button>
        </form>
      </div>
    </div>
  );
}

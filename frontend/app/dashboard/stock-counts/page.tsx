"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Warehouse {
  id: number;
  warehouseName: string;
}

export default function StockCountsPage() {
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
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل المخازن");
    } finally {
      setLoading(false);
    }
  }, []);

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
      setActionError(err.response?.data?.message || "حدث خطأ أثناء بدء الجرد");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--sub)]">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
        جارٍ التحميل...
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[22px] font-bold text-[var(--blue-deep)] mb-6">الجرد الدوري</h1>

      {error && (
        <div className="bg-[var(--danger-soft)] border border-[#efc6c6] text-[var(--danger)] px-3.5 py-2.5 rounded-[10px] text-[13.5px] mb-4">
          {error}
        </div>
      )}

      <div className="card p-6 max-w-md">
        {actionError && (
          <div className="bg-[var(--danger-soft)] border border-[#efc6c6] text-[var(--danger)] px-3.5 py-2.5 rounded-[10px] text-[13.5px] mb-4">
            {actionError}
          </div>
        )}

        <form onSubmit={handleStart}>
          <div className="mb-6">
            <label htmlFor="warehouseId" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
              اختر المخزن
            </label>
            <div className="field-shell">
              <select id="warehouseId" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
                <option value="">اختر المخزن</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.warehouseName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
            {submitting ? "جارٍ البدء..." : "بدء جرد جديد"}
          </button>
        </form>
      </div>
    </div>
  );
}
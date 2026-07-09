"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import api from "@/lib/api";

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

const statusLabels: Record<string, string> = {
  InProgress: "قيد التنفيذ",
  PendingApproval: "بانتظار الاعتماد",
  Completed: "مكتمل",
  Cancelled: "ملغي",
};

const statusStyles: Record<string, { bg: string; text: string }> = {
  InProgress: { bg: "var(--blue-50)", text: "var(--blue)" },
  PendingApproval: { bg: "var(--gold-soft)", text: "var(--gold-deep)" },
  Completed: { bg: "var(--green-soft)", text: "var(--green)" },
  Cancelled: { bg: "var(--danger-soft)", text: "var(--danger)" },
};

export default function StockCountDetailPage() {
  const params = useParams();
  const stockCountId = params.id as string;

  const [stockCount, setStockCount] = useState<StockCount | null>(null);
  const [countedInputs, setCountedInputs] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [approving, setApproving] = useState(false);

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
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل الجرد");
    } finally {
      setLoading(false);
    }
  }, [stockCountId]);

  useEffect(() => {
    fetchStockCount();
  }, [fetchStockCount]);

  const handleSaveItem = async (itemId: number) => {
    const value = countedInputs[itemId];
    if (value === "" || value === undefined) {
      setActionError("أدخل الكمية الفعلية أولاً");
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
      setActionError(err.response?.data?.message || "حدث خطأ أثناء حفظ الكمية");
    } finally {
      setSavingItemId(null);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm("هل أنت متأكد من اعتماد الجرد؟")) return;

    setActionError("");
    setApproving(true);
    try {
      await api.put(`/stock-counts/${stockCountId}/approve`);
      await fetchStockCount();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "حدث خطأ أثناء اعتماد الجرد");
    } finally {
      setApproving(false);
    }
  };

  const isCompleted = stockCount?.status === "Completed";
  const isInProgress = stockCount?.status === "InProgress";

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--sub)]">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
        جارٍ التحميل...
      </div>
    );
  }

  if (error || !stockCount) {
    return (
      <div>
        <Link href="/dashboard/stock-counts" className="text-[var(--blue)] font-bold hover:underline text-[13.5px] mb-4 inline-block">
          ← رجوع لبدء جرد جديد
        </Link>
        <div className="bg-[var(--danger-soft)] border border-[#efc6c6] text-[var(--danger)] px-3.5 py-2.5 rounded-[10px] text-[13.5px]">
          {error || "الجرد غير موجود"}
        </div>
      </div>
    );
  }

  const statusStyle = statusStyles[stockCount.status] ?? { bg: "var(--border)", text: "var(--sub)" };

  return (
    <div>
      <Link href="/dashboard/stock-counts" className="text-[var(--blue)] font-bold hover:underline text-[13.5px] mb-4 inline-block">
        ← رجوع لبدء جرد جديد
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]">تفاصيل الجرد</h1>
        <span
          className="text-[12.5px] font-bold px-3 py-1.5 rounded-full"
          style={{ background: statusStyle.bg, color: statusStyle.text }}
        >
          {statusLabels[stockCount.status] ?? stockCount.status}
        </span>
      </div>

      {actionError && (
        <div className="bg-[var(--danger-soft)] border border-[#efc6c6] text-[var(--danger)] px-3.5 py-2.5 rounded-[10px] text-[13.5px] mb-4">
          {actionError}
        </div>
      )}

      <div className="table-wrap">
        {stockCount.items.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-[13.5px]">لا توجد منتجات في هذا المخزن.</p>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الكمية المسجلة</th>
                  <th>الكمية الفعلية</th>
                  {isCompleted && <th>الفرق</th>}
                  {isInProgress && <th>إجراء</th>}
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
                          {savingItemId === item.id ? "جارٍ الحفظ..." : "حفظ"}
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

      {isInProgress && stockCount.items.length > 0 && (
        <div className="mt-6">
          <button onClick={handleApprove} disabled={approving} className="btn-primary px-6">
            {approving ? "جارٍ الاعتماد..." : "اعتماد الجرد"}
          </button>
        </div>
      )}
    </div>
  );
}
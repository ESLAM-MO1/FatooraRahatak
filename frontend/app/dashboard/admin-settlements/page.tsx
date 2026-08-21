"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import Toast from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

interface Batch {
  id: number;
  batchNumber: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  grossAmount: number;
  commissionAmount: number;
  shippingDeductedAmount: number;
  netAmount: number;
  ordersCount: number;
  completedAt: string | null;
  linesCount: number;
}

interface Line {
  id: number;
  storeId: number;
  storeName: string;
  grossAmount: number;
  commissionAmount: number;
  shippingDeductedAmount: number;
  netAmount: number;
  ordersCount: number;
  status: string;
  paymentReference: string | null;
  paidAt: string | null;
  iban: string | null;
  bankName: string | null;
  accountHolderName: string | null;
}

interface BatchDetail {
  id: number;
  batchNumber: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  grossAmount: number;
  commissionAmount: number;
  shippingDeductedAmount: number;
  netAmount: number;
  ordersCount: number;
  completedAt: string | null;
  lines: Line[];
}

export default function AdminSettlementsPage() {
  const { t } = useTranslation();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [refText, setRefText] = useState("");
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/settlements/batches");
      setBatches(res.data.data || []);
    } catch (e: any) {
      setToast({ type: "error", text: e?.response?.data?.message || t("common.error") });
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: number) => {
    const res = await api.get(`/admin/settlements/batches/${id}`);
    setDetail(res.data.data);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await api.post("/admin/settlements/batches/generate", {});
      setToast({ type: "success", text: res.data.message || t("settlements.generated") });
      load();
    } catch (e: any) {
      setToast({ type: "error", text: e?.response?.data?.message || t("common.error") });
    } finally {
      setGenerating(false);
    }
  };

  const confirmBatch = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: t("settlements.confirmTitle"),
      message: t("settlements.confirmMessage"),
      confirmLabel: t("common.confirm"),
      cancelLabel: t("common.cancel"),
    });
    if (!ok) return;
    try {
      const res = await api.post(`/admin/settlements/batches/${detail.id}/confirm`, { paymentReference: refText || null });
      setToast({ type: "success", text: res.data.message || t("settlements.confirmed") });
      setDetail(res.data.data);
      load();
    } catch (e: any) {
      setToast({ type: "error", text: e?.response?.data?.message || t("common.error") });
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="p-6">
      <PageHeader icon="wallet" title={t("nav.settlements")} />
      {toast && <Toast message={toast.text} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex justify-end mb-6">
        <button
          onClick={generate}
          disabled={generating}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {generating ? t("settlements.generating") : t("settlements.generate")}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm hidden lg:table">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500">
            <tr>
              <th className="text-right p-3">{t("settlements.batchNumber")}</th>
              <th className="text-right p-3">{t("settlements.period")}</th>
              <th className="text-right p-3">{t("settlements.gross")}</th>
              <th className="text-right p-3">{t("settlements.commission")}</th>
              <th className="text-right p-3">{t("settlements.net")}</th>
              <th className="text-right p-3">{t("settlements.orders")}</th>
              <th className="text-right p-3">{t("settlements.status")}</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3">{b.batchNumber}</td>
                <td className="p-3" dir="ltr">{new Date(b.periodStart).toLocaleDateString()} — {new Date(b.periodEnd).toLocaleDateString()}</td>
                <td className="p-3">{(b.grossAmount).toFixed(2)}</td>
                <td className="p-3">{(b.commissionAmount).toFixed(2)}</td>
                <td className="p-3 font-semibold">{(b.netAmount).toFixed(2)}</td>
                <td className="p-3">{b.ordersCount}</td>
                <td className="p-3">{t(`settlements.status.${b.status}`)}</td>
                <td className="p-3">
                  <button onClick={() => loadDetail(b.id)} className="text-blue-600 hover:underline">
                    {t("common.view")}
                  </button>
                </td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">{t("settlements.empty")}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="md:hidden space-y-3">
          {batches.map((b) => (
            <div key={b.id} className="card p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div>
                  <p className="text-[11px] font-bold text-[var(--sub)]">{t("settlements.batchNumber")}</p>
                  <p className="text-[var(--ink)]">{b.batchNumber}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[var(--sub)]">{t("settlements.period")}</p>
                  <p className="text-[var(--ink)]" dir="ltr">{new Date(b.periodStart).toLocaleDateString()} — {new Date(b.periodEnd).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[var(--sub)]">{t("settlements.gross")}</p>
                  <p className="text-[var(--ink)]">{(b.grossAmount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[var(--sub)]">{t("settlements.commission")}</p>
                  <p className="text-[var(--ink)]">{(b.commissionAmount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[var(--sub)]">{t("settlements.net")}</p>
                  <p className="font-semibold">{(b.netAmount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[var(--sub)]">{t("settlements.orders")}</p>
                  <p className="text-[var(--ink)]">{b.ordersCount}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[var(--sub)]">{t("settlements.status")}</p>
                  <p className="text-[var(--ink)]">{t(`settlements.status.${b.status}`)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => loadDetail(b.id)} className="text-blue-600 hover:underline text-[12px]">
                  {t("common.view")}
                </button>
              </div>
            </div>
          ))}
          {batches.length === 0 && (
            <p className="text-[13px] text-[var(--sub)] text-center py-4">{t("settlements.empty")}</p>
          )}
        </div>
      </div>

      {detail && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-x-auto">
          <div className="flex justify-between items-center p-6 pb-3 flex-wrap gap-3">
            <h2 className="text-lg font-semibold">{t("settlements.batchDetail")} — {detail.batchNumber}</h2>
            {detail.status !== "Completed" && (
              <div className="flex items-center gap-2">
                <input
                  className="border rounded-lg px-3 py-2 bg-transparent"
                  placeholder={t("settlements.paymentRef")}
                  value={refText}
                  onChange={(e) => setRefText(e.target.value)}
                />
                <button onClick={confirmBatch} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg">
                  {t("settlements.confirm")}
                </button>
              </div>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500">
              <tr>
                <th className="text-right p-3">{t("settlements.store")}</th>
                <th className="text-right p-3">{t("settlements.bankInfo")}</th>
                <th className="text-right p-3">{t("settlements.gross")}</th>
                <th className="text-right p-3">{t("settlements.commission")}</th>
                <th className="text-right p-3">{t("settlements.shipping")}</th>
                <th className="text-right p-3">{t("settlements.net")}</th>
                <th className="text-right p-3">{t("settlements.status")}</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-3">{l.storeName}</td>
                  <td className="p-3 text-xs">
                    <div dir="ltr">{l.iban || "—"}</div>
                    <div>{l.accountHolderName || "—"} ({l.bankName || "—"})</div>
                  </td>
                  <td className="p-3">{(l.grossAmount).toFixed(2)}</td>
                  <td className="p-3">{(l.commissionAmount).toFixed(2)}</td>
                  <td className="p-3">{(l.shippingDeductedAmount).toFixed(2)}</td>
                  <td className="p-3 font-semibold">{(l.netAmount).toFixed(2)}</td>
                  <td className="p-3">{t(`settlements.status.${l.status}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

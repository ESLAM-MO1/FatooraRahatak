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
    <div className="space-y-6">
      <PageHeader icon="wallet" title={t("nav.settlements")}>
        <button
          onClick={generate}
          disabled={generating}
          className="btn btn-primary"
        >
          {generating ? t("settlements.generating") : t("settlements.generate")}
        </button>
      </PageHeader>
      {toast && <Toast message={toast.text} type={toast.type} onClose={() => setToast(null)} />}

      {batches.length === 0 ? (
        <div className="card p-10 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--blue-50)] flex items-center justify-center mb-4">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--blue)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M2 10h20" />
              <path d="M6 15h4" />
            </svg>
          </div>
          <h3 className="text-[15px] font-bold text-[var(--ink)]">{t("settlements.empty")}</h3>
          <p className="text-[13px] text-[var(--sub)] mt-1.5 max-w-sm leading-relaxed">
            {t("settlements.emptyHint")}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm hidden lg:table">
              <thead className="bg-gray-50 text-gray-500">
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
                    <td className="p-3">
                      <span className={`badge ${b.status === "Completed" ? "badge--green" : b.status === "Paid" ? "badge--green" : b.status === "Processing" ? "badge--blue" : b.status === "Cancelled" ? "badge--gray" : "badge--yellow"}`}>
                        {t(`settlements.status.${b.status}`)}
                      </span>
                    </td>
                    <td className="p-3">
                      <button onClick={() => loadDetail(b.id)} className="btn btn-outline btn-sm">
                        {t("common.view")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="lg:hidden space-y-3 p-4">
            {batches.map((b) => (
              <div key={b.id} className="card p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-[var(--ink)]">{b.batchNumber}</p>
                  <span className={`badge ${b.status === "Completed" ? "badge--green" : b.status === "Paid" ? "badge--green" : b.status === "Processing" ? "badge--blue" : b.status === "Cancelled" ? "badge--gray" : "badge--yellow"}`}>
                    {t(`settlements.status.${b.status}`)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
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
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => loadDetail(b.id)} className="btn btn-outline btn-sm">
                    {t("common.view")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {detail && (
        <div className="card overflow-hidden">
          <div className="flex justify-between items-center p-5 sm:p-6 pb-3 flex-wrap gap-3">
            <h2 className="text-[16px] font-bold text-[var(--ink)]">
              {t("settlements.batchDetail")} — {detail.batchNumber}
            </h2>
            {detail.status !== "Completed" && (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  className="border border-gray-200 rounded-lg px-3 py-2 bg-transparent text-[13px] focus:outline-none focus:border-[var(--blue)]"
                  placeholder={t("settlements.paymentRef")}
                  value={refText}
                  onChange={(e) => setRefText(e.target.value)}
                />
                <button onClick={confirmBatch} className="btn btn-success">
                  {t("settlements.confirm")}
                </button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
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
                    <td className="p-3">
                      <span className={`badge ${l.status === "Paid" ? "badge--green" : l.status === "Pending" ? "badge--yellow" : "badge--gray"}`}>
                        {t(`settlements.status.${l.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

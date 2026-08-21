"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import Can from "@/components/Can";

interface DamagedStock {
  id: number;
  warehouseName: string;
  productNameAr: string;
  quantity: number;
  reason: string;
  isApproved: boolean;
  createdAt: string;
}

export default function DamagesPage() {
  const { t } = useTranslation();
  const [damages, setDamages] = useState<DamagedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchDamages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/inventory/damages");
      setDamages(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("damages.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDamages();
  }, [fetchDamages]);

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    setError("");
    setSuccessMessage("");
    try {
      await api.put(`/inventory/damage/${id}/approve`);
      setSuccessMessage(t("damages.approveSuccess"));
      await fetchDamages();
    } catch (err: any) {
      setError(err.response?.data?.message || t("damages.handleError"));
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && damages.length === 0) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader icon="alert" title={t("damages.title")} />

      {error && <div className="alert alert--danger">{error}</div>}
      <SuccessToast message={successMessage} fixed className="mb-4" />

      <div className="card overflow-hidden">
        {damages.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("damages.noResults")}</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm hidden md:table">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("damages.warehouse")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("damages.product")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("damages.quantity")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("damages.reason")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("damages.status")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("damages.date")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("damages.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {damages.map((d) => (
                  <tr key={d.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium">{d.warehouseName}</td>
                    <td className="p-4 text-[var(--ink)]">{d.productNameAr}</td>
                    <td className="p-4 text-[var(--sub)]">{d.quantity}</td>
                    <td className="p-4 text-[var(--sub)] max-w-[220px]">
                      <span className="block truncate" title={d.reason}>{d.reason}</span>
                    </td>
                    <td className="p-4">
                      <span className={d.isApproved ? "badge badge--green" : "badge badge--yellow"}>
                        {d.isApproved ? t("damages.statusApproved") : t("damages.statusPending")}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--sub)]">
                      {new Date(d.createdAt).toLocaleString("ar-SA-u-nu-latn")}
                    </td>
                    <td className="p-4">
                      {!d.isApproved && (
                        <Can code="DamagedStock.Approve">
                          <button
                            onClick={() => handleApprove(d.id)}
                            disabled={processingId === d.id}
                            className="btn btn-sm btn-primary disabled:opacity-60"
                          >
                            {processingId === d.id ? t("common.saving") : t("damages.approve")}
                          </button>
                        </Can>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {damages.map((d) => (
              <div key={d.id} className="card p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("damages.warehouse")}</p>
                    <p className="text-[12px] text-[var(--ink)] font-medium">{d.warehouseName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("damages.product")}</p>
                    <p className="text-[12px] text-[var(--ink)]">{d.productNameAr}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("damages.quantity")}</p>
                    <p className="text-[12px] text-[var(--sub)]">{d.quantity}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("damages.status")}</p>
                    <span className={d.isApproved ? "badge badge--green" : "badge badge--yellow"}>
                      {d.isApproved ? t("damages.statusApproved") : t("damages.statusPending")}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("damages.reason")}</p>
                    <p className="text-[12px] text-[var(--sub)]">{d.reason}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("damages.date")}</p>
                    <p className="text-[12px] text-[var(--sub)]">{new Date(d.createdAt).toLocaleString("ar-SA-u-nu-latn")}</p>
                  </div>
                </div>
                {!d.isApproved && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <Can code="DamagedStock.Approve">
                      <button
                        onClick={() => handleApprove(d.id)}
                        disabled={processingId === d.id}
                        className="btn btn-sm btn-primary disabled:opacity-60"
                      >
                        {processingId === d.id ? t("common.saving") : t("damages.approve")}
                      </button>
                    </Can>
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

interface Supplier {
  name: string;
  phone: string | null;
  city: string | null;
  invoicesCount: number;
  totalPurchases: number;
}

export default function SuppliersPage() {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/owner/customers/suppliers");
      setSuppliers(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || t("suppliers.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  if (loading) return <LoadingState />;

  const totalPurchases = suppliers.reduce((s, x) => s + x.totalPurchases, 0);

  return (
    <div>
      <PageHeader icon="truck" title={t("suppliers.title")} />

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      {suppliers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="stat-card">
            <p className="text-[12px] text-[var(--sub)]">{t("suppliers.count")}</p>
            <p className="text-[22px] font-bold text-[var(--blue-deep)] mt-1">{suppliers.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-[12px] text-[var(--sub)]">{t("suppliers.totalPurchases")}</p>
            <p className="text-[22px] font-bold text-[var(--blue-deep)] mt-1">
              {totalPurchases.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-[12px] text-[var(--sub)]">{t("suppliers.average")}</p>
            <p className="text-[22px] font-bold text-[var(--blue-deep)] mt-1">
              {(totalPurchases / suppliers.length).toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 2 })} {t("common.sar")}
            </p>
          </div>
        </div>
      )}

      <div className="table-wrap">
        {suppliers.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("suppliers.empty")}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("suppliers.name")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("suppliers.phone")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("suppliers.city")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("suppliers.invoicesCount")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("suppliers.totalPurchases")}</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, i) => (
                <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                  <td className="p-4 font-medium text-[var(--ink)]">
                    <span className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold" style={{ background: "var(--blue-50)", color: "var(--blue)" }}>
                        {s.name.trim().charAt(0) || "؟"}
                      </span>
                      {s.name}
                    </span>
                  </td>
                  <td className="p-4 text-[var(--sub)]" dir="ltr">{s.phone || "—"}</td>
                  <td className="p-4 text-[var(--sub)]">{s.city || "—"}</td>
                  <td className="p-4 text-[var(--sub)]">{s.invoicesCount}</td>
                  <td className="p-4 text-[var(--ink)] font-medium">
                    {s.totalPurchases.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

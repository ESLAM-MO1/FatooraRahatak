"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

interface CustomerListItem {
  name: string;
  phone: string;
  email: string | null;
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string;
  isGuest: boolean;
}

export default function CustomersPage() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/owner/customers");
      setCustomers(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("customer.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader icon="userGroup" title={t("customer.title")} />

      {error && <div className="alert alert--danger">{error}</div>}

      <div className="mb-4 max-w-sm">
        <div className="field-shell">
          <Icon name="search" className="text-[var(--sub)] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("customer.searchPlaceholder")}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">
            {search ? t("customer.noResults") : t("customer.noCustomers")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("customer.name")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("customer.phone")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("customer.totalOrders")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("customer.totalSpent")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("customer.lastOrder")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("customer.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.phone}
                    className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors"
                  >
                    <td className="p-4 text-[var(--ink)] font-medium">
                      {customer.name}
                      {customer.isGuest && (
                        <span className="mr-2 badge badge--yellow">{t("customer.guest")}</span>
                      )}
                    </td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">
                      {customer.phone}
                    </td>
                    <td className="p-4 text-[var(--ink)]">{customer.ordersCount}</td>
                    <td className="p-4 text-[var(--ink)]">
                      {customer.totalSpent.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
                    </td>
                    <td className="p-4 text-[var(--sub)]">
                      {new Date(customer.lastOrderDate).toLocaleDateString("ar-SA-u-nu-latn")}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/dashboard/customers/${encodeURIComponent(customer.phone)}`}
                        className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]"
                      >
                        {t("customer.viewDetails")}
                      </Link>
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

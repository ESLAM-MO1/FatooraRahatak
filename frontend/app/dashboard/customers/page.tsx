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
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

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

  const handleAdd = async () => {
    if (!form.fullName.trim() || !form.phone.trim()) {
      setError(t("customer.addError"));
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/owner/customers", form);
      setAddOpen(false);
      setForm({ fullName: "", phone: "", email: "", notes: "" });
      setSuccess(t("customer.addSuccess"));
      await fetchCustomers();
    } catch (err: any) {
      setError(err.response?.data?.message || t("customer.addError"));
    } finally {
      setSaving(false);
    }
  };

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
      <PageHeader icon="userGroup" title={t("customer.title")}>
        <button type="button" onClick={() => setAddOpen(true)} className="btn btn-primary btn-sm">
          <Icon name="plus" size={16} />
          {t("customer.add")}
        </button>
      </PageHeader>

      {error && <div className="alert alert--danger">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

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
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm hidden md:table">
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
                {filteredCustomers.map((customer, idx) => (
                  <tr
                    key={customer.phone || idx}
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
          <div className="md:hidden space-y-3">
            {filteredCustomers.map((customer, idx) => (
              <div key={customer.phone || idx} className="card p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("customer.name")}</p>
                    <p className="text-[var(--ink)] font-medium">
                      {customer.name}
                      {customer.isGuest && (
                        <span className="mr-2 badge badge--yellow">{t("customer.guest")}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("customer.phone")}</p>
                    <p className="text-[var(--sub)]" dir="ltr">{customer.phone}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("customer.totalOrders")}</p>
                    <p className="text-[var(--ink)]">{customer.ordersCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("customer.totalSpent")}</p>
                    <p className="text-[var(--ink)]">
                      {customer.totalSpent.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("customer.lastOrder")}</p>
                    <p className="text-[var(--sub)]">
                      {new Date(customer.lastOrderDate).toLocaleDateString("ar-SA-u-nu-latn")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <Link
                    href={`/dashboard/customers/${encodeURIComponent(customer.phone)}`}
                    className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[12px]"
                  >
                    {t("customer.viewDetails")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {addOpen && (
        <div
          className="fixed inset-0 bg-[var(--blue-deep)]/50 flex items-center justify-center z-[100] p-4"
          onClick={() => !saving && setAddOpen(false)}
        >
          <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()} dir="rtl">
            <h3 className="text-[16px] font-bold text-[var(--blue-deep)] mb-2">{t("customer.addTitle")}</h3>
            <p className="text-[12px] text-[var(--sub)] leading-relaxed mb-4">{t("customer.adminAddHint")}</p>

            <div className="space-y-3">
              <div>
                <p className="text-[12px] font-bold text-[var(--sub)] mb-1.5">{t("customer.fullName")} *</p>
                <div className="field-shell">
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <p className="text-[12px] font-bold text-[var(--sub)] mb-1.5">{t("customer.phone")} *</p>
                <div className="field-shell">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
              </div>
              <div>
                <p className="text-[12px] font-bold text-[var(--sub)] mb-1.5">{t("customer.email")}</p>
                <div className="field-shell">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
              </div>
              <div>
                <p className="text-[12px] font-bold text-[var(--sub)] mb-1.5">{t("customer.notes")}</p>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="border border-gray-200 rounded-xl px-3.5 py-2.5 w-full text-[13px] focus:outline-none focus:border-[var(--blue)] resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => setAddOpen(false)} disabled={saving} className="btn flex-1" style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}>
                {t("common.cancel")}
              </button>
              <button type="button" onClick={handleAdd} disabled={saving} className="btn btn-primary flex-1">
                {saving ? t("common.loading") : t("customer.add")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
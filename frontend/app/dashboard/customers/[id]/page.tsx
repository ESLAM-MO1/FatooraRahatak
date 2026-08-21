"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import LoadingState from "@/components/LoadingState";

interface CustomerOrder {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  itemsCount: number;
  createdAt: string;
}

interface CustomerDetail {
  name: string;
  phone: string;
  email: string | null;
  isGuest: boolean;
  ordersCount: number;
  totalSpent: number;
  orders: CustomerOrder[];
}

const statusStyles: Record<string, string> = {
  New: "badge badge--blue",
  Processing: "badge badge--yellow",
  Shipped: "badge badge--gray",
  Delivered: "badge badge--green",
  Returned: "badge badge--red",
};

export default function CustomerDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const identifier = params.id as string;

  const statusLabel = (status: string) => {
    switch (status) {
      case "New": return t("customerDetail.statusNew");
      case "PendingPayment": return t("customerDetail.statusPendingPayment");
      case "Processing": return t("customerDetail.statusProcessing");
      case "Shipped": return t("customerDetail.statusShipped");
      case "Delivered": return t("customerDetail.statusDelivered");
      case "Returned": return t("customerDetail.statusReturned");
      default: return status;
    }
  };

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/owner/customers/${identifier}`);
      setCustomer(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("customerDetail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [identifier, t]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  if (loading) {
    return <LoadingState />;
  }

  if (!customer) {
    return (
      <div>
        <Link href="/dashboard/customers" className="text-[var(--blue)] hover:underline text-sm">
          {t("customerDetail.backToList")}
        </Link>
        {error && <div className="alert alert--danger mt-4">{error}</div>}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/dashboard/customers" className="text-[var(--blue)] hover:underline text-sm">
          {t("customerDetail.backToList")}
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]">{customer.name}</h1>
        {customer.isGuest && (
          <span className="badge badge--yellow">{t("customerDetail.guest")}</span>
        )}
      </div>

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-[12.5px] text-[var(--sub)] mb-1">{t("customerDetail.phone")}</p>
          <p className="text-[15px] font-bold text-[var(--ink)]" dir="ltr">
            {customer.phone}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-[12.5px] text-[var(--sub)] mb-1">{t("customerDetail.orderCount")}</p>
          <p className="text-[15px] font-bold text-[var(--ink)]">{customer.ordersCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-[12.5px] text-[var(--sub)] mb-1">{t("customerDetail.totalSpent")}</p>
          <p className="text-[15px] font-bold text-[var(--blue-deep)]">
            {customer.totalSpent.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
          </p>
        </div>
      </div>

      {customer.email && (
        <div className="card p-5 mb-6">
          <p className="text-[12.5px] text-[var(--sub)] mb-1">{t("customerDetail.email")}</p>
          <p className="text-[15px] text-[var(--ink)]" dir="ltr">
            {customer.email}
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <h2 className="text-[14px] font-bold text-[var(--blue-deep)] p-5 pb-0">{t("customerDetail.purchaseHistory")}</h2>
        {customer.orders.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("customerDetail.noOrders")}</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-3 hidden md:table">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("customerDetail.orderNumberCol")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("customerDetail.itemsCountCol")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("customerDetail.totalCol")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("customerDetail.statusCol")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("customerDetail.dateCol")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("customerDetail.actionsCol")}</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((order) => (
                  <tr key={order.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium" dir="ltr">
                      {order.orderNumber}
                    </td>
                    <td className="p-4 text-[var(--sub)]">{order.itemsCount}</td>
                    <td className="p-4 text-[var(--ink)]">{order.totalAmount.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}</td>
                    <td className="p-4">
                      <span className={statusStyles[order.status] ?? "badge badge--gray"}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--sub)]">
                      {new Date(order.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]"
                      >
                        {t("customerDetail.viewDetails")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {customer.orders.map((order) => (
              <div key={order.id} className="card p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("customerDetail.orderNumberCol")}</p>
                    <p className="text-[var(--ink)] font-medium" dir="ltr">{order.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("customerDetail.itemsCountCol")}</p>
                    <p className="text-[var(--sub)]">{order.itemsCount}</p>
                  </div>
                  <div>
                    <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("customerDetail.totalCol")}</p>
                    <p className="text-[var(--ink)]">{order.totalAmount.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}</p>
                  </div>
                  <div>
                    <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("customerDetail.statusCol")}</p>
                    <span className={statusStyles[order.status] ?? "badge badge--gray"}>
                      {statusLabel(order.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("customerDetail.dateCol")}</p>
                    <p className="text-[var(--sub)]">
                      {new Date(order.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]"
                  >
                    {t("customerDetail.viewDetails")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
}

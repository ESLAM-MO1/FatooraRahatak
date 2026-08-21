"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { customerApi, CustomerApiError } from "@/lib/customerApi";
import { getQuickCustomer, setQuickCustomer, QuickLoginCustomer } from "@/lib/quickCustomer";
import CustomerLoginCard from "@/components/account/CustomerLoginCard";
import OrdersTab, { CustomerOrder } from "@/components/account/OrdersTab";
import AddressesTab, { CustomerAddress } from "@/components/account/AddressesTab";

type Tab = "orders" | "addresses" | "profile";

export default function AccountPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;

  const [customer, setCustomer] = useState<QuickLoginCustomer | null>(() => getQuickCustomer(slug));
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState("");
  const [msg, setMsg] = useState("");

  const token = customer?.sessionToken || "";

  const loadOrders = useCallback(async () => {
    try {
      const res = await customerApi<{ data: CustomerOrder[] }>(
        `/public/stores/${slug}/customer/orders`,
        token
      );
      setOrders(res.data || []);
      setOrdersError("");
    } catch (err) {
      if (err instanceof CustomerApiError && err.status === 401) {
        setCustomer(null);
        setQuickCustomer(slug, null);
        setOrdersError(t("account.sessionExpired"));
      } else {
        setOrdersError(err instanceof CustomerApiError ? err.message : t("account.loadError"));
      }
    } finally {
      setOrdersLoading(false);
    }
  }, [slug, token, t]);

  const loadAddresses = useCallback(async () => {
    try {
      const res = await customerApi<{ data: CustomerAddress[] }>(
        `/public/stores/${slug}/customer/addresses`,
        token
      );
      setAddresses(res.data || []);
      setAddressesError("");
    } catch (err) {
      if (err instanceof CustomerApiError && err.status === 401) {
        setCustomer(null);
        setQuickCustomer(slug, null);
        setAddressesError(t("account.sessionExpired"));
      } else {
        setAddressesError(err instanceof CustomerApiError ? err.message : t("account.loadError"));
      }
    } finally {
      setAddressesLoading(false);
    }
  }, [slug, token, t]);

  useEffect(() => {
    if (!customer) return;
    if (tab === "orders") loadOrders();
    if (tab === "addresses") loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, tab]);

  const handleLogout = () => {
    setQuickCustomer(slug, null);
    setCustomer(null);
    setOrders([]);
    setAddresses([]);
  };

  if (!customer) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <CustomerLoginCard slug={slug} onLoggedIn={setCustomer} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">{t("storefront.myAccount")}</h1>
        <button type="button" onClick={handleLogout} className="text-[13px] font-medium text-red-600 hover:text-red-700">
          {t("account.logout")}
        </button>
      </div>

      {msg && <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">{msg}</div>}

      <div className="flex flex-wrap gap-2 mb-5 border-b border-gray-200 pb-3">
        {(["orders", "addresses", "profile"] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t(`account.${key}`)}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <OrdersTab
          slug={slug}
          token={token}
          orders={orders}
          loading={ordersLoading}
          error={ordersError}
          onRefresh={loadOrders}
          onMessage={setMsg}
        />
      )}

      {tab === "addresses" && (
        <AddressesTab
          slug={slug}
          token={token}
          addresses={addresses}
          loading={addressesLoading}
          error={addressesError}
          defaultFullName={customer.fullName}
          onRefresh={loadAddresses}
          onMessage={setMsg}
        />
      )}

      {tab === "profile" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-blue-100 text-blue-700 text-[20px] font-bold">
              {customer.fullName.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-gray-900">{customer.fullName}</p>
              <p className="text-[13px] text-gray-500" dir="ltr">{customer.phone}</p>
            </div>
          </div>
          <div className="space-y-3 text-[13px]">
            {customer.email && (
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">{t("account.email")}</span>
                <span className="font-semibold text-gray-800 min-w-0 break-all" dir="ltr">{customer.email}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500">{t("account.phone")}</span>
              <span className="font-semibold text-gray-800 min-w-0 break-all" dir="ltr">{customer.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("storefront.quickLoginOrders")}</span>
              <span className="font-semibold text-gray-800">{customer.orderCount ?? customer.recentOrders?.length ?? 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

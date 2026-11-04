"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";

interface AppSubscription {
  id: number;
  storeId: number;
  storeName: string;
  storeSlug: string;
  packageName: string;
  status: string;
  paymentStatus: string;
  billingCycle: string;
  dueAmount: number;
  appName: string | null;
  developerAccountType: string;
  developerAccountInfo: string | null;
  merchantNotes: string | null;
  adminNote: string | null;
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default function AppSubscriptionsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<AppSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/app-subscriptions");
      setItems(res.data.data);
    } catch {
      setMessage({ ok: false, text: t("adminMobileApp.error") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const complete = async (r: AppSubscription) => {
    setBusyId(r.id);
    setMessage(null);
    try {
      await api.post(`/admin/app-subscriptions/${r.id}/complete`, {
        adminNote: (notes[r.id] || "").trim() || null,
      });
      setMessage({ ok: true, text: t("adminMobileApp.completed") });
      await load();
    } catch (err: any) {
      setMessage({ ok: false, text: err.response?.data?.message || t("adminMobileApp.error") });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (r: AppSubscription) => {
    const note = (notes[r.id] || "").trim();
    if (!note) {
      setMessage({ ok: false, text: t("adminMobileApp.reasonRequired") });
      return;
    }
    setBusyId(r.id);
    setMessage(null);
    try {
      await api.post(`/admin/app-subscriptions/${r.id}/reject`, { adminNote: note });
      setMessage({ ok: true, text: t("adminMobileApp.rejected") });
      await load();
    } catch (err: any) {
      setMessage({ ok: false, text: err.response?.data?.message || t("adminMobileApp.error") });
    } finally {
      setBusyId(null);
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "Active": return t("adminMobileApp.statusActive");
      case "Cancelled": return t("adminMobileApp.statusCancelled");
      case "Expired": return t("adminMobileApp.statusExpired");
      default: return t("adminMobileApp.statusPending");
    }
  };

  const badgeClass = (s: string) =>
    s === "Active" ? "badge badge--green" : s === "Cancelled" ? "badge badge--red" : "badge badge--yellow";

  const cycleLabel = (c: string) =>
    c === "Yearly" ? t("mobileApp.billingYearly") : c === "TwoYears" ? t("mobileApp.billingYearly") : t("mobileApp.billingMonthly");

  const formatMoney = (v: number) =>
    `${(v ?? 0).toLocaleString("ar-SA-u-nu-latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t("common.sar")}`;

  const canAct = (r: AppSubscription) => r.status === "Pending" || r.status === "GracePeriod";

  if (loading) return <div className="p-6">...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-1">{t("adminMobileApp.title")}</h1>
      <p className="text-sm text-gray-500 mb-4">{t("adminMobileApp.desc")}</p>

      {message && (
        <div className={message.ok ? "alert alert--info mb-4" : "alert alert--warning mb-4"}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 text-right">{t("adminMobileApp.colStore")}</th>
              <th className="p-3 text-right">{t("adminMobileApp.colPackage")}</th>
              <th className="p-3 text-right">{t("adminMobileApp.colStatus")}</th>
              <th className="p-3 text-right">{t("adminMobileApp.colPayment")}</th>
              <th className="p-3 text-right">{t("adminMobileApp.colAmount")}</th>
              <th className="p-3 text-right">{t("adminMobileApp.colDate")}</th>
              <th className="p-3 text-right">{t("adminMobileApp.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={7}>
                  {t("adminMobileApp.empty")}
                </td>
              </tr>
            )}
            {items.map((r) => {
              const busy = busyId === r.id;
              const note = notes[r.id] ?? "";
              return (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-3">
                    <div className="font-medium text-gray-800">{r.storeName}</div>
                    <div className="text-xs text-gray-500" dir="ltr">{r.storeSlug}</div>
                  </td>
                  <td className="p-3">{r.packageName}</td>
                  <td className="p-3">
                    <span className={badgeClass(r.status)}>{statusLabel(r.status)}</span>
                    <div className="mt-1 text-xs text-gray-500">
                      {t("adminMobileApp.billingCycle")}: {cycleLabel(r.billingCycle)}
                    </div>
                    {r.adminNote && <div className="mt-1 text-xs text-gray-500">{r.adminNote}</div>}
                  </td>
                  <td className="p-3">
                    <span className={r.paymentStatus === "Paid" ? "badge badge--green" : "badge badge--yellow"}>
                      {r.paymentStatus === "Paid" ? t("adminMobileApp.paymentPaid") : t("adminMobileApp.paymentPending")}
                    </span>
                  </td>
                  <td className="p-3 font-medium" dir="ltr">{formatMoney(r.dueAmount)}</td>
                  <td className="p-3" dir="ltr">{new Date(r.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}</td>
                  <td className="p-3">
                    <div className="min-w-[260px] space-y-2">
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {r.appName && (
                          <div>
                            <span className="text-gray-400">{t("adminMobileApp.appName")}: </span>
                            {r.appName}
                          </div>
                        )}
                        <div>
                          <span className="text-gray-400">{t("adminMobileApp.developerAccount")}: </span>
                          {r.developerAccountType === "Platform"
                            ? t("mobileApp.devAccountPlatform")
                            : t("mobileApp.devAccountCompany")}
                        </div>
                        {r.developerAccountInfo && (
                          <div className="break-all">
                            <span className="text-gray-400">{t("adminMobileApp.devAccountInfo")}: </span>
                            {r.developerAccountInfo}
                          </div>
                        )}
                        {r.merchantNotes && (
                          <div>
                            <span className="text-gray-400">{t("adminMobileApp.merchantNotes")}: </span>
                            {r.merchantNotes}
                          </div>
                        )}
                      </div>

                      {canAct(r) ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            className="border rounded px-2 py-1"
                            placeholder={t("adminMobileApp.notePlaceholder")}
                            value={note}
                            onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <button className="btn btn-primary" disabled={busy} onClick={() => complete(r)}>
                              {busy ? t("adminMobileApp.processing") : t("adminMobileApp.completeBtn")}
                            </button>
                            <button className="btn" disabled={busy} onClick={() => reject(r)}>
                              {t("adminMobileApp.rejectBtn")}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

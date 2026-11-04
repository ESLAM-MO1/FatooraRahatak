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
  publishStatus: string;
  billingCycle: string;
  dueAmount: number;
  appName: string | null;
  developerAccountType: string;
  developerAccountInfo: string | null;
  merchantNotes: string | null;
  adminNote: string | null;
  adminReviewNote: string | null;
  listingShortDescription: string | null;
  listingDescription: string | null;
  listingIconUrl: string | null;
  listingCategory: string | null;
  listingScreenshots: string[];
  submittedAt: string | null;
  appStoreUrl: string | null;
  googlePlayUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface AppBuild {
  id: number;
  storeId: number;
  storeAppSubscriptionId: number;
  storeName: string | null;
  appName: string | null;
  status: string;
  githubRunId: number | null;
  githubRunUrl: string | null;
  packageName: string | null;
  versionName: string | null;
  isApkReady: boolean;
  apkSizeBytes: number | null;
  apkSha256: string | null;
  downloadUrl: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export default function AppSubscriptionsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"subscriptions" | "publish">("subscriptions");
  const [items, setItems] = useState<AppSubscription[]>([]);
  const [pending, setPending] = useState<AppSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [urls, setUrls] = useState<Record<number, { appStoreUrl: string; googlePlayUrl: string; appVersion: string }>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [builds, setBuilds] = useState<Record<number, AppBuild | null>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [all, pend] = await Promise.all([
        api.get("/admin/app-subscriptions"),
        api.get("/admin/app-subscriptions/pending-publish"),
      ]);
      setItems(all.data.data);
      setPending(pend.data.data);
      loadBuilds([...(all.data.data as AppSubscription[]), ...(pend.data.data as AppSubscription[])]);
    } catch {
      setMessage({ ok: false, text: t("adminMobileApp.error") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const startReview = async (r: AppSubscription) => {
    setBusyId(r.id);
    setMessage(null);
    try {
      await api.post(`/admin/app-subscriptions/${r.id}/start-review`);
      setMessage({ ok: true, text: t("adminMobileApp.reviewStarted") });
      await load();
    } catch (err: any) {
      setMessage({ ok: false, text: err.response?.data?.message || t("adminMobileApp.error") });
    } finally {
      setBusyId(null);
    }
  };

  const publish = async (r: AppSubscription) => {
    const u = urls[r.id] || { appStoreUrl: "", googlePlayUrl: "", appVersion: "" };
    if (!u.appStoreUrl.trim() && !u.googlePlayUrl.trim()) {
      setMessage({ ok: false, text: t("adminMobileApp.urlRequired") });
      return;
    }
    setBusyId(r.id);
    setMessage(null);
    try {
      await api.post(`/admin/app-subscriptions/${r.id}/publish`, {
        note: (notes[r.id] || "").trim() || null,
        appStoreUrl: u.appStoreUrl.trim() || null,
        googlePlayUrl: u.googlePlayUrl.trim() || null,
        appVersion: u.appVersion.trim() || null,
      });
      setMessage({ ok: true, text: t("adminMobileApp.published") });
      await load();
    } catch (err: any) {
      setMessage({ ok: false, text: err.response?.data?.message || t("adminMobileApp.error") });
    } finally {
      setBusyId(null);
    }
  };

  const rejectPublish = async (r: AppSubscription) => {
    const note = (notes[r.id] || "").trim();
    if (!note) {
      setMessage({ ok: false, text: t("adminMobileApp.reasonRequired") });
      return;
    }
    setBusyId(r.id);
    setMessage(null);
    try {
      await api.post(`/admin/app-subscriptions/${r.id}/reject-publish`, { note });
      setMessage({ ok: true, text: t("adminMobileApp.publishRejected") });
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

  // ── بناء التطبيق (APK) ──
  const loadBuilds = async (subs: AppSubscription[]) => {
    const entries = await Promise.all(
      subs.map(async (r) => {
        try {
          const res = await api.get(`/admin/app-builds/by-subscription/${r.id}`);
          return [r.id, (res.data?.data as AppBuild) || null] as const;
        } catch {
          return [r.id, null] as const;
        }
      })
    );
    setBuilds(Object.fromEntries(entries));
  };

  const startBuild = async (r: AppSubscription) => {
    setBusyId(r.id);
    setMessage(null);
    try {
      const res = await api.post(`/admin/app-builds/subscription/${r.id}/start`);
      setBuilds((prev) => ({ ...prev, [r.id]: res.data?.data || null }));
      setMessage({ ok: true, text: t("adminMobileApp.buildStarted") });
    } catch (err: any) {
      setMessage({ ok: false, text: err.response?.data?.message || t("adminMobileApp.error") });
    } finally {
      setBusyId(null);
    }
  };

  const refreshBuild = async (r: AppSubscription, buildId: number) => {
    try {
      const res = await api.post(`/admin/app-builds/${buildId}/refresh`);
      setBuilds((prev) => ({ ...prev, [r.id]: res.data?.data || null }));
    } catch (err: any) {
      setMessage({ ok: false, text: err.response?.data?.message || t("adminMobileApp.error") });
    }
  };

  const downloadBuild = async (r: AppSubscription, buildId: number) => {
    try {
      const res = await api.get(`/admin/app-builds/${buildId}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${r.storeSlug || "store"}-app.apk`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setMessage({ ok: false, text: t("adminMobileApp.buildDownloadError") });
    }
  };

  const publishLabel = (s: string) => {
    switch (s) {
      case "Published": return t("mobileApp.pubPublished");
      case "Submitted": return t("mobileApp.pubSubmitted");
      case "InReview": return t("mobileApp.pubInReview");
      case "Rejected": return t("mobileApp.pubRejected");
      default: return t("mobileApp.pubDraft");
    }
  };

  const badgeClass = (s: string) =>
    s === "Active" ? "badge badge--green" : s === "Cancelled" ? "badge badge--red" : "badge badge--yellow";

  const publishBadgeClass = (s: string) =>
    s === "Published" ? "badge badge--green" : s === "Rejected" ? "badge badge--red" : s === "Draft" ? "badge badge--gray" : "badge badge--yellow";

  const cycleLabel = (c: string) =>
    c === "Yearly" ? t("mobileApp.billingYearly") : c === "TwoYears" ? t("mobileApp.billingYearly") : t("mobileApp.billingMonthly");

  const formatMoney = (v: number) =>
    `${(v ?? 0).toLocaleString("ar-SA-u-nu-latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t("common.sar")}`;

  // تاريخ ميلادي بصيغة YYYY/MM/DD بأرقام لاتينية (تجنّب التقويم الهجري الذي يشوّه التاريخ)
  const formatDate = (v: string | null | undefined) => {
    if (!v) return "—";
    const d = new Date(v);
    if (isNaN(d.getTime())) return "—";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}/${m}/${day}`;
  };

  const canAct = (r: AppSubscription) => r.status === "Pending" || r.status === "GracePeriod";

  const setUrl = (id: number, patch: Partial<{ appStoreUrl: string; googlePlayUrl: string; appVersion: string }>) =>
    setUrls((prev) => {
      const base = prev[id] || { appStoreUrl: "", googlePlayUrl: "", appVersion: "" };
      return { ...prev, [id]: { ...base, ...patch } };
    });

  if (loading) return <div className="p-6">...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-1">{t("adminMobileApp.title")}</h1>
      <p className="text-sm text-gray-500 mb-4">{t("adminMobileApp.desc")}</p>

      <div className="flex gap-2 mb-4">
        <button className={`btn btn-sm ${tab === "subscriptions" ? "btn-primary" : ""}`} onClick={() => setTab("subscriptions")}>
          {t("adminMobileApp.tabSubscriptions")}
        </button>
        <button className={`btn btn-sm ${tab === "publish" ? "btn-primary" : ""}`} onClick={() => setTab("publish")}>
          {t("adminMobileApp.tabPublish")} {pending.length > 0 && <span className="badge badge--yellow ms-1">{pending.length}</span>}
        </button>
      </div>

      {message && (
        <div className={message.ok ? "alert alert--info mb-4" : "alert alert--warning mb-4"}>
          <span>{message.text}</span>
        </div>
      )}

      {tab === "subscriptions" && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3 text-right">{t("adminMobileApp.colStore")}</th>
                <th className="p-3 text-right">{t("adminMobileApp.colPackage")}</th>
                <th className="p-3 text-right">{t("adminMobileApp.colAppData")}</th>
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
                  <td className="p-4 text-center text-gray-500" colSpan={8}>{t("adminMobileApp.empty")}</td>
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
                      <div className="min-w-[200px] text-xs text-gray-600 space-y-0.5">
                        <div>
                          <span className="text-gray-400">{t("adminMobileApp.appName")}: </span>
                          {r.appName || "—"}
                        </div>
                        <div>
                          <span className="text-gray-400">{t("adminMobileApp.developerAccount")}: </span>
                          {r.developerAccountType === "Platform" ? t("mobileApp.devAccountPlatform") : t("mobileApp.devAccountCompany")}
                        </div>
                        {r.developerAccountInfo && (
                          <div className="break-all">
                            <span className="text-gray-400">{t("adminMobileApp.devAccountInfo")}: </span>
                            <span dir="ltr">{r.developerAccountInfo}</span>
                          </div>
                        )}
                        {r.merchantNotes && (
                          <div>
                            <span className="text-gray-400">{t("adminMobileApp.merchantNotes")}: </span>
                            {r.merchantNotes}
                          </div>
                        )}
                        <div>
                          <span className="text-gray-400">{t("adminMobileApp.startDate")}: </span>
                          <span dir="ltr">{formatDate(r.startDate)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">{t("adminMobileApp.endDate")}: </span>
                          <span dir="ltr">{formatDate(r.endDate)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={badgeClass(r.status)}>{statusLabel(r.status)}</span>
                      <div className="mt-1"><span className={publishBadgeClass(r.publishStatus)}>{publishLabel(r.publishStatus)}</span></div>
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
                    <td className="p-3" dir="ltr">{formatDate(r.createdAt)}</td>
                    <td className="p-3">
                      <div className="min-w-[260px] space-y-2">
                        {canAct(r) && (
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
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "publish" && (
        <div className="space-y-4">
          {pending.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">{t("adminMobileApp.empty")}</div>
          ) : (
            pending.map((r) => {
              const busy = busyId === r.id;
              const u = urls[r.id] || { appStoreUrl: "", googlePlayUrl: "", appVersion: "" };
              const note = notes[r.id] ?? "";
              return (
                <div key={r.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <span className="font-bold text-gray-800">{r.storeName}</span>
                      <span className="text-xs text-gray-500 ms-2" dir="ltr">{r.storeSlug}</span>
                    </div>
                    <span className={publishBadgeClass(r.publishStatus)}>{publishLabel(r.publishStatus)}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{t("adminMobileApp.appName")}</div>
                      <div className="text-sm font-medium">{r.appName || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{t("adminMobileApp.listingCategory")}</div>
                      <div className="text-sm">{r.listingCategory || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{t("adminMobileApp.submittedAt")}</div>
                      <div className="text-sm" dir="ltr">{formatDate(r.submittedAt)}</div>
                    </div>
                  </div>

                  {r.listingIconUrl && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1">{t("adminMobileApp.listingIcon")}</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.listingIconUrl} alt="" className="w-14 h-14 rounded-xl object-cover border" />
                    </div>
                  )}

                  {r.listingShortDescription && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-400 mb-0.5">{t("mobileApp.listingShortDescription")}</div>
                      <div className="text-sm">{r.listingShortDescription}</div>
                    </div>
                  )}
                  {r.listingDescription && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-400 mb-0.5">{t("mobileApp.listingDescription")}</div>
                      <div className="text-sm whitespace-pre-wrap">{r.listingDescription}</div>
                    </div>
                  )}
                  {r.listingScreenshots.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1">{t("mobileApp.listingScreenshots")}</div>
                      <div className="flex gap-2 flex-wrap">
                        {r.listingScreenshots.map((s, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={s} alt="" className="w-14 h-24 rounded-lg object-cover border" />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                    <input
                      type="text"
                      className="border rounded px-2 py-1"
                      placeholder="App Store URL"
                      dir="ltr"
                      value={u.appStoreUrl}
                      onChange={(e) => setUrl(r.id, { appStoreUrl: e.target.value })}
                    />
                    <input
                      type="text"
                      className="border rounded px-2 py-1"
                      placeholder="Google Play URL"
                      dir="ltr"
                      value={u.googlePlayUrl}
                      onChange={(e) => setUrl(r.id, { googlePlayUrl: e.target.value })}
                    />
                    <input
                      type="text"
                      className="border rounded px-2 py-1"
                      placeholder={t("adminMobileApp.appVersion")}
                      dir="ltr"
                      value={u.appVersion}
                      onChange={(e) => setUrl(r.id, { appVersion: e.target.value })}
                    />
                  </div>
                  <input
                    type="text"
                    className="border rounded px-2 py-1 w-full mb-3"
                    placeholder={t("adminMobileApp.notePlaceholder")}
                    value={note}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  />

                  {/* ── بناء ملف التطبيق (APK) ── */}
                  <AdminBuildControl
                    t={t}
                    build={builds[r.id] ?? null}
                    busy={busy}
                    onStart={() => startBuild(r)}
                    onRefresh={(id: number) => refreshBuild(r, id)}
                    onDownload={(id: number) => downloadBuild(r, id)}
                  />

                  <div className="flex gap-2 flex-wrap">
                    {r.publishStatus === "Submitted" && (
                      <button className="btn" disabled={busy} onClick={() => startReview(r)}>
                        {t("adminMobileApp.startReviewBtn")}
                      </button>
                    )}
                    <button className="btn btn-primary" disabled={busy} onClick={() => publish(r)}>
                      {busy ? t("adminMobileApp.processing") : t("adminMobileApp.publishBtn")}
                    </button>
                    <button className="btn" disabled={busy} onClick={() => rejectPublish(r)}>
                      {t("adminMobileApp.rejectPublishBtn")}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── لوحة بناء التطبيق (APK) في صفحة الأدمن ──
function AdminBuildControl({ t, build, busy, onStart, onRefresh, onDownload }: {
  t: (key: string) => string;
  build: AppBuild | null;
  busy: boolean;
  onStart: () => void;
  onRefresh: (id: number) => void;
  onDownload: (id: number) => void;
}) {
  const badgeCls = (s: string) => {
    switch (s) {
      case "Succeeded": return "badge badge--green";
      case "Running": return "badge badge--yellow";
      case "Queued": return "badge badge--yellow";
      case "Failed": return "badge badge--red";
      default: return "badge badge--gray";
    }
  };
  const statusLabel = (s: string) => {
    switch (s) {
      case "Succeeded": return t("adminMobileApp.buildStatusSucceeded");
      case "Running": return t("adminMobileApp.buildStatusRunning");
      case "Queued": return t("adminMobileApp.buildStatusQueued");
      case "Failed": return t("adminMobileApp.buildStatusFailed");
      default: return t("adminMobileApp.buildStatusNone");
    }
  };
  const sizeMb = build?.apkSizeBytes ? (build.apkSizeBytes / (1024 * 1024)).toFixed(1) : null;

  return (
    <div className="border rounded-lg p-3 mb-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <span className="text-sm font-bold text-gray-700">{t("adminMobileApp.buildTitle")}</span>
        <div className="flex items-center gap-2">
          {build && <span className={badgeCls(build.status)}>{statusLabel(build.status)}</span>}
          {!build || build.status === "Failed" || build.status === "Succeeded" ? (
            <button className="btn btn-sm" disabled={busy} onClick={onStart}>
              {build ? t("adminMobileApp.buildRebuildBtn") : t("adminMobileApp.buildStartBtn")}
            </button>
          ) : (
            <button className="btn btn-sm" disabled={busy} onClick={() => onRefresh(build.id)}>
              {t("adminMobileApp.buildRefreshBtn")}
            </button>
          )}
        </div>
      </div>

      {build && (
        <div className="text-xs text-gray-600 space-y-1">
          {build.packageName && (
            <div className="flex justify-between">
              <span className="text-gray-400">{t("mobileApp.buildPackage")}</span>
              <span dir="ltr" className="font-mono">{build.packageName}</span>
            </div>
          )}
          {build.versionName && (
            <div className="flex justify-between">
              <span className="text-gray-400">{t("mobileApp.buildVersion")}</span>
              <span dir="ltr">v{build.versionName}</span>
            </div>
          )}
          {build.status === "Succeeded" && sizeMb && (
            <div className="flex justify-between">
              <span className="text-gray-400">{t("mobileApp.buildSize")}</span>
              <span dir="ltr">{sizeMb} MB</span>
            </div>
          )}
          {build.githubRunUrl && (
            <div className="flex justify-between">
              <span className="text-gray-400">{t("adminMobileApp.buildRun")}</span>
              <a href={build.githubRunUrl} target="_blank" rel="noreferrer" className="text-blue-600 truncate" dir="ltr">
                #{build.githubRunId}
              </a>
            </div>
          )}
          {build.errorMessage && (
            <div className="text-xs text-red-600 break-all mt-1">{build.errorMessage}</div>
          )}
        </div>
      )}

      {build?.isApkReady && (
        <button className="btn btn-primary btn-sm mt-2" onClick={() => onDownload(build.id)}>
          {t("adminMobileApp.buildDownloadBtn")}
        </button>
      )}
    </div>
  );
}

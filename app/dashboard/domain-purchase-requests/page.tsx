"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";

interface PurchaseRequest {
  id: number;
  storeId: number;
  storeName: string;
  preferredName: string;
  notes: string | null;
  status: string;
  assignedDomain: string | null;
  adminNote: string | null;
  createdAt: string;
  handledAt: string | null;
}

type Draft = { domain: string; note: string };
const EMPTY_DRAFT: Draft = { domain: "", note: "" };

export default function DomainPurchaseRequestsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/domain-purchase-requests");
      setItems(res.data.data);
    } catch {
      setMessage({ ok: false, text: t("adminDomainPurchase.error") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getDraft = (id: number): Draft => drafts[id] ?? EMPTY_DRAFT;
  const setDraft = (id: number, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_DRAFT), ...patch } }));

  const complete = async (r: PurchaseRequest) => {
    const d = getDraft(r.id);
    if (!d.domain.trim()) {
      setMessage({ ok: false, text: t("adminDomainPurchase.domainRequired") });
      return;
    }
    setBusyId(r.id);
    setMessage(null);
    try {
      await api.post(`/admin/domain-purchase-requests/${r.id}/complete`, {
        domainName: d.domain.trim(),
        adminNote: d.note.trim() || null,
      });
      setMessage({ ok: true, text: t("adminDomainPurchase.linked") });
      await load();
    } catch (err: any) {
      setMessage({ ok: false, text: err.response?.data?.message || t("adminDomainPurchase.error") });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (r: PurchaseRequest) => {
    const d = getDraft(r.id);
    if (!d.note.trim()) {
      setMessage({ ok: false, text: t("adminDomainPurchase.reasonRequired") });
      return;
    }
    setBusyId(r.id);
    setMessage(null);
    try {
      await api.post(`/admin/domain-purchase-requests/${r.id}/reject`, { adminNote: d.note.trim() });
      setMessage({ ok: true, text: t("adminDomainPurchase.rejected") });
      await load();
    } catch (err: any) {
      setMessage({ ok: false, text: err.response?.data?.message || t("adminDomainPurchase.error") });
    } finally {
      setBusyId(null);
    }
  };

  const badgeClass = (s: string) =>
    s === "Completed" ? "badge badge--green" : s === "Rejected" ? "badge badge--red" : "badge badge--yellow";

  if (loading) return <div className="p-6">...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-1">{t("adminDomainPurchase.title")}</h1>
      <p className="text-sm text-gray-500 mb-4">{t("adminDomainPurchase.desc")}</p>

      {message && (
        <div className={message.ok ? "alert alert--info mb-4" : "alert alert--warning mb-4"}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 text-right">{t("adminDomainPurchase.colStore")}</th>
              <th className="p-3 text-right">{t("adminDomainPurchase.colRequested")}</th>
              <th className="p-3 text-right">{t("adminDomainPurchase.colNotes")}</th>
              <th className="p-3 text-right">{t("adminDomainPurchase.colStatus")}</th>
              <th className="p-3 text-right">{t("adminDomainPurchase.colDate")}</th>
              <th className="p-3 text-right">{t("adminDomainPurchase.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={6}>
                  {t("adminDomainPurchase.empty")}
                </td>
              </tr>
            )}
            {items.map((r) => {
              const d = getDraft(r.id);
              const busy = busyId === r.id;
              return (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-3">{r.storeName}</td>
                  <td className="p-3" dir="ltr">{r.preferredName}</td>
                  <td className="p-3">{r.notes || "—"}</td>
                  <td className="p-3">
                    <span className={badgeClass(r.status)}>{t(`adminDomainPurchase.status${r.status}`)}</span>
                    {r.assignedDomain && <div className="mt-1 text-xs" dir="ltr">{r.assignedDomain}</div>}
                    {r.adminNote && <div className="mt-1 text-xs text-gray-500">{r.adminNote}</div>}
                  </td>
                  <td className="p-3">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    {r.status === "Pending" ? (
                      <div className="flex flex-col gap-2 min-w-[240px]">
                        <input
                          type="text"
                          dir="ltr"
                          className="border rounded px-2 py-1"
                          placeholder={t("adminDomainPurchase.domainPlaceholder")}
                          value={d.domain}
                          onChange={(e) => setDraft(r.id, { domain: e.target.value })}
                        />
                        <input
                          type="text"
                          className="border rounded px-2 py-1"
                          placeholder={t("adminDomainPurchase.notePlaceholder")}
                          value={d.note}
                          onChange={(e) => setDraft(r.id, { note: e.target.value })}
                        />
                        <div className="flex gap-2">
                          <button className="btn btn-primary" disabled={busy} onClick={() => complete(r)}>
                            {busy ? t("adminDomainPurchase.processing") : t("adminDomainPurchase.linkBtn")}
                          </button>
                          <button className="btn" disabled={busy} onClick={() => reject(r)}>
                            {t("adminDomainPurchase.rejectBtn")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
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

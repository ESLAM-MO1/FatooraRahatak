"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import SuccessToast from "@/components/SuccessToast";

interface StoreOption {
  id: number;
  storeName: string;
  storeSlug: string;
  ownerName: string;
  ownerEmail: string;
}

interface HistoryItem {
  id: number;
  adminName: string;
  recipientType: string;
  storeId?: number | null;
  type: string;
  title: string;
  message: string;
  recipientsCount: number;
  createdAt: string;
}

interface ConfirmState {
  kind: "resend" | "delete";
  item: HistoryItem;
}

const TYPE_KEYS: Record<string, string> = {
  Update: "users.notifUpdate",
  Maintenance: "users.notifMaintenance",
  Offer: "users.notifOffer",
};

const parseUtc = (value: string) =>
  new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(value) ? value : value + "Z");

export default function CentralNotifications() {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({ recipientType: "All", type: "Update", title: "", message: "" });
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreOption | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const loadHistory = async () => {
    try {
      const res = await api.get("/admin/notifications/history");
      setHistory(res.data.data || []);
    } catch { } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    api
      .get("/admin/stores")
      .then((res) => setStores(res.data.data || []))
      .catch(() => { });
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((s) =>
      [s.storeName, s.storeSlug, s.ownerName, s.ownerEmail, String(s.id)].some((v) =>
        (v || "").toLowerCase().includes(q)
      )
    );
  }, [stores, query]);

  const storeNameById = useMemo(() => {
    const map: Record<number, string> = {};
    stores.forEach((s) => {
      map[s.id] = s.storeName;
    });
    return map;
  }, [stores]);

  const recipientLabel = (item: HistoryItem) =>
    item.recipientType === "All"
      ? t("users.notifAll")
      : item.storeId
      ? storeNameById[item.storeId] || `#${item.storeId}`
      : t("users.notifSpecific");

  const formatDate = (value: string) =>
    parseUtc(value).toLocaleString(i18n.language?.startsWith("ar") ? "ar-EG" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.recipientType === "Specific" && !selectedStore) {
      setError(t("users.notifSelectStoreRequired"));
      return;
    }
    setSending(true);
    try {
      await api.post("/admin/notifications/send", {
        ...form,
        storeId: form.recipientType === "Specific" && selectedStore ? selectedStore.id : null,
      });
      setSuccess(t("users.notifSent"));
      setForm({ recipientType: "All", type: "Update", title: "", message: "" });
      setSelectedStore(null);
      setQuery("");
      loadHistory();
    } catch (err: any) {
      setError(err.response?.data?.message || t("users.notifSendError"));
    } finally {
      setSending(false);
    }
  };

  const handleReuse = (item: HistoryItem) => {
    setError("");
    setSuccess("");
    const isSpecific = item.recipientType === "Specific";
    const store = isSpecific && item.storeId ? stores.find((s) => s.id === item.storeId) || null : null;
    setForm({
      recipientType: isSpecific ? "Specific" : "All",
      type: TYPE_KEYS[item.type] ? item.type : "Update",
      title: item.title,
      message: item.message,
    });
    setSelectedStore(store);
    setQuery("");
    setOpen(false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (confirmAction.kind === "resend") {
        await api.post(`/admin/notifications/history/${confirmAction.item.id}/resend`);
        setSuccess(t("users.notifResent"));
      } else {
        await api.delete(`/admin/notifications/history/${confirmAction.item.id}`);
        setSuccess(t("users.notifLogDeleted"));
      }
      setConfirmAction(null);
      await loadHistory();
    } catch (err: any) {
      setConfirmAction(null);
      setError(err.response?.data?.message || t("users.notifActionError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {error && <div className="alert alert--danger mb-3">{error}</div>}
      <SuccessToast message={success} fixed className="mb-3" />

      <div className="grid gap-5 lg:grid-cols-2 items-start">
        <div ref={formRef} className="card p-5">
          <h3 className="text-[15px] font-bold text-[var(--ink)] mb-4">{t("users.sendNotification")}</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label>{t("users.notifRecipient")}</label>
              <div className="field-shell">
                <select
                  value={form.recipientType}
                  onChange={(e) => {
                    setForm({ ...form, recipientType: e.target.value });
                    setSelectedStore(null);
                    setQuery("");
                  }}
                >
                  <option value="All">{t("users.notifAll")}</option>
                  <option value="Specific">{t("users.notifSpecific")}</option>
                </select>
              </div>
            </div>

            {form.recipientType === "Specific" && (
              <div ref={pickerRef} className="relative">
                <label>{t("users.notifStore")}</label>
                {selectedStore ? (
                  <div className="field-shell flex items-center justify-between gap-2">
                    <div className="min-w-0 py-2">
                      <div className="text-[14px] font-semibold text-[var(--ink)] truncate">{selectedStore.storeName}</div>
                      <div className="text-[12px] text-[var(--sub)] truncate">
                        {selectedStore.ownerName} · {selectedStore.storeSlug}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStore(null);
                        setQuery("");
                        setOpen(true);
                      }}
                      className="text-[var(--sub)] hover:text-[var(--ink)] px-2"
                      aria-label={t("common.close")}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="field-shell">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                      }}
                      onFocus={() => setOpen(true)}
                      placeholder={t("users.notifSearchStore")}
                      autoComplete="off"
                    />
                  </div>
                )}

                {open && !selectedStore && (
                  <div className="card absolute z-20 mt-1 w-full max-h-64 overflow-y-auto shadow-lg">
                    {filtered.length === 0 ? (
                      <p className="text-center text-[var(--sub)] py-4 text-[13px]">{t("users.notifNoStores")}</p>
                    ) : (
                      filtered.slice(0, 50).map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => {
                            setSelectedStore(s);
                            setOpen(false);
                            setQuery("");
                          }}
                          className="block w-full text-start px-3 py-2 hover:bg-black/5"
                        >
                          <div className="text-[14px] font-semibold text-[var(--ink)] truncate">{s.storeName}</div>
                          <div className="text-[12px] text-[var(--sub)] truncate">
                            {s.ownerName} · {s.ownerEmail} · {s.storeSlug}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label>{t("users.notifType")}</label>
              <div className="field-shell">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="Update">{t("users.notifUpdate")}</option>
                  <option value="Maintenance">{t("users.notifMaintenance")}</option>
                  <option value="Offer">{t("users.notifOffer")}</option>
                </select>
              </div>
            </div>

            <div>
              <label>{t("users.notifTitle")}</label>
              <div className="field-shell">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label>{t("users.notifMessage")}</label>
              <div className="field-shell">
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={4}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={sending} className="btn-primary w-full">
              {sending ? t("users.sending") : t("users.send")}
            </button>
          </form>
        </div>

        <div className="card p-5">
          <h3 className="text-[15px] font-bold text-[var(--ink)] mb-4">{t("users.notifHistory")}</h3>

          {historyLoading ? (
            <p className="text-center text-[var(--sub)] py-8">{t("users.notifHistoryLoading")}</p>
          ) : history.length === 0 ? (
            <p className="text-center text-[var(--sub)] py-8">{t("users.notifHistoryEmpty")}</p>
          ) : (
            <div className="space-y-3 max-h-[640px] overflow-y-auto">
              {history.map((item) => {
                const expanded = expandedId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                    className="cursor-pointer rounded-xl border border-black/10 p-3 hover:bg-black/[0.02] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-[14px] font-bold text-[var(--ink)]">{item.title}</div>
                      <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-black/5 text-[var(--sub)]">
                        {TYPE_KEYS[item.type] ? t(TYPE_KEYS[item.type]) : item.type}
                      </span>
                    </div>
                    <p
                      className={`text-[13px] text-[var(--sub)] mt-1 whitespace-pre-wrap ${expanded ? "" : "line-clamp-2"}`}
                    >
                      {item.message}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[12px] text-[var(--sub)]">
                      <span>{recipientLabel(item)}</span>
                      <span>{t("users.notifRecipientsCount", { n: item.recipientsCount })}</span>
                      <span>
                        {t("users.notifSentBy")}: {item.adminName}
                      </span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleReuse(item)}
                        className="text-[12px] px-3 py-1 rounded-lg border border-black/10 text-[var(--ink)] hover:bg-black/5 transition-colors"
                      >
                        {t("users.notifReuse")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ kind: "resend", item })}
                        className="text-[12px] px-3 py-1 rounded-lg border border-black/10 text-[var(--ink)] hover:bg-black/5 transition-colors"
                      >
                        {t("users.notifResend")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ kind: "delete", item })}
                        className="text-[12px] px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        {t("users.notifDeleteLog")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {confirmAction && (
        <div className="modal-overlay" onClick={() => !busy && setConfirmAction(null)}>
          <div className="modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[18px] font-bold text-[var(--blue-deep)] mb-3">
              {confirmAction.kind === "resend" ? t("users.notifResendConfirmTitle") : t("users.notifDeleteConfirmTitle")}
            </h2>
            <p className="text-[14px] font-semibold text-[var(--ink)] mb-1">{confirmAction.item.title}</p>
            {confirmAction.kind === "resend" && (
              <p className="text-[13px] text-[var(--sub)] mb-2">{recipientLabel(confirmAction.item)}</p>
            )}
            <p className="text-[13px] text-[var(--sub)]">
              {confirmAction.kind === "resend" ? t("users.notifResendConfirmDesc") : t("users.notifDeleteConfirmDesc")}
            </p>
            <div className="flex gap-3 justify-end mt-5">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmAction(null)}
                className="text-[14px] px-4 py-2 rounded-xl border border-black/10 text-[var(--ink)] hover:bg-black/5 transition-colors"
              >
                {t("users.notifCancel")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={runConfirmedAction}
                className={
                  confirmAction.kind === "delete"
                    ? "text-[14px] px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
                    : "btn-primary px-4"
                }
              >
                {busy ? t("users.sending") : t("users.notifConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

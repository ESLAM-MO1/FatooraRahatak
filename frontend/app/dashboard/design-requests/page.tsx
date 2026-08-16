"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { isAuthenticated, getUserType } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import Toast from "@/components/Toast";
import "@/lib/i18n/config";

interface DesignRequest {
  id: number;
  storeId: number;
  storeName: string;
  status: string;
  appliedCss?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
}

interface DesignMessage {
  id: number;
  senderType: string;
  senderName: string;
  body: string;
  cssPayload?: string | null;
  createdAt: string;
}

const STATUSES = ["Open", "InProgress", "Completed"];

export default function DesignRequestsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [ready, setReady] = useState(false);
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [selected, setSelected] = useState<DesignRequest | null>(null);
  const [messages, setMessages] = useState<DesignMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [cssText, setCssText] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated() || getUserType() !== "SuperAdmin") {
      router.push("/dashboard");
      return;
    }
    setAuthorized(true);
    setReady(true);
  }, [router]);

  const load = useCallback(async () => {
    const res = await api.get("/admin/design-requests");
    setRequests(res.data.data || []);
  }, []);

  useEffect(() => {
    if (!ready) return;
    load().catch(() => setMessage({ type: "error", text: t("error.serverError") })).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, load]);

  const loadMessages = async (id: number) => {
    const res = await api.get(`/admin/design-requests/${id}/messages`);
    setMessages(res.data.data || []);
  };

  const open = async (r: DesignRequest) => {
    setSelected(r);
    setReply("");
    setCssText(r.appliedCss || "");
    try {
      await loadMessages(r.id);
    } catch { setMessages([]); }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selected]);

  const sendReply = async () => {
    if (!selected) return;
    if (!reply.trim() && !cssText.trim()) {
      setMessage({ type: "error", text: t("design.replyPlaceholder") });
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      await api.post(`/admin/design-requests/${selected.id}/messages`, {
        body: reply.trim(),
        cssPayload: cssText.trim() || null,
      });
      setReply("");
      await loadMessages(selected.id);
      await load();
      setMessage({ type: "success", text: t("design.sendReply") });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!selected || selected.status === status) return;
    try {
      await api.put(`/admin/design-requests/${selected.id}/status`, { status });
      const updated = { ...selected, status };
      setSelected(updated);
      setRequests(prev => prev.map(r => r.id === selected.id ? updated : r));
    } catch { setMessage({ type: "error", text: t("error.serverError") }); }
  };

  if (!ready) return <LoadingState />;
  if (!authorized) return null;

  const statusLabel = (s: string) => {
    const v = t(`design.status${s}`);
    return v === `design.status${s}` ? s : v;
  };
  const fmtTime = (iso: string) => new Date(iso).toLocaleString();

  return (
    <div>
      <PageHeader icon="palette" title={t("nav.designRequests")} />
      <p className="mb-5 text-[13px]" style={{ color: "var(--sub)" }}>{t("design.pageIntro")}</p>
      {message && <Toast message={message.text} type={message.type} fixed />}

      {loading ? <LoadingState /> : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 space-y-2">
            {requests.length === 0 ? (
              <div className="card p-10 text-center"><p className="text-[13.5px]" style={{ color: "var(--sub)" }}>{t("design.noRequests")}</p></div>
            ) : (
              requests.map(r => (
                <div key={r.id} className={`card p-4 cursor-pointer ${selected?.id === r.id ? "ring-2" : ""}`} style={{ borderColor: selected?.id === r.id ? "var(--blue)" : undefined }} onClick={() => open(r)}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13.5px] font-bold truncate" style={{ color: "var(--ink)" }}>{r.storeName}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold shrink-0" style={{ color: "var(--blue)", backgroundColor: "var(--blue-50)" }}>{statusLabel(r.status)}</span>
                  </div>
                  <p className="text-[11.5px] text-[var(--sub)] mt-1">{r.lastMessageAt ? fmtTime(r.lastMessageAt) : fmtTime(r.createdAt)}</p>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-3">
            {!selected ? (
              <div className="card p-10 text-center"><p className="text-[13.5px]" style={{ color: "var(--sub)" }}>{t("design.open")}</p></div>
            ) : (
              <div className="card flex flex-col" style={{ minHeight: 420 }}>
                <div className="flex items-center justify-between gap-3 p-4 border-b" style={{ borderColor: "var(--border)" }}>
                  <div>
                    <p className="text-[14px] font-bold" style={{ color: "var(--ink)" }}>{selected.storeName}</p>
                    <p className="text-[11.5px] text-[var(--sub)]">{t("design.statusLabel")}: {statusLabel(selected.status)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map(s => (
                      <button key={s} className={`btn !px-2.5 !py-1 !text-[11px] ${selected.status === s ? "btn-primary" : "btn-outline"}`} onClick={() => changeStatus(s)}>{statusLabel(s)}</button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 320 }}>
                  {messages.length === 0 ? (
                    <p className="text-[12.5px] text-[var(--sub)] text-center py-10">{t("design.noMessages")}</p>
                  ) : (
                    messages.map(m => (
                      <div key={m.id} className="flex flex-col" style={{ alignItems: m.senderType === "Admin" ? "flex-end" : "flex-start" }}>
                        <div className="max-w-[85%] rounded-2xl p-3" style={{ backgroundColor: m.senderType === "Admin" ? "var(--blue-50)" : "var(--bg)", border: "1px solid var(--border)" }}>
                          <p className="text-[11px] font-bold mb-1" style={{ color: "var(--blue)" }}>
                            {m.senderType === "Admin" ? t("design.platformAdmin") : t("design.storeOwner")}
                          </p>
                          {m.body && <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink)" }}>{m.body}</p>}
                          {m.cssPayload && (
                            <pre className="mt-2 p-2 rounded-lg text-[11px] overflow-x-auto" dir="ltr" style={{ backgroundColor: "#0f172a", color: "#e2e8f0", whiteSpace: "pre-wrap" }}>{m.cssPayload}</pre>
                          )}
                          <p className="text-[10.5px] text-[var(--sub)] mt-1.5">{fmtTime(m.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={endRef} />
                </div>

                <div className="p-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
                  <div className="field-shell"><textarea rows={2} placeholder={t("design.replyPlaceholder")} value={reply} onChange={e => setReply(e.target.value)} /></div>
                  <div>
                    <p className="text-[12px] font-bold mb-1" style={{ color: "var(--ink)" }}>{t("design.applyCss")}</p>
                    <textarea rows={5} dir="ltr" placeholder={t("design.cssPlaceholder")} value={cssText} onChange={e => setCssText(e.target.value)} className="w-full p-3 rounded-xl text-[12px] font-mono" style={{ border: "1px solid var(--border)", color: "#0f172a", background: "#f8fafc" }} />
                  </div>
                  <button disabled={sending} className="btn btn-primary disabled:opacity-60" onClick={sendReply}>
                    {sending ? t("common.loading") : t("design.sendReply")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";

type Pending = { tool: string; arguments: string; description: string };
type Msg = {
  role: "user" | "bot";
  text: string;
  fallback?: boolean;
  pending?: Pending;
  done?: "confirmed" | "cancelled";
};
const STORE_KEY = "supportChat.v1";
const REQ_TIMEOUT = 90000;

export default function SupportChatWidget() {
  const { t, i18n } = useTranslation();
  const en = !!i18n.language?.startsWith("en");
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMsgs(parsed.slice(-20));
      }
    } catch {
      /* ignore corrupted storage */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-20)));
    } catch {
      /* quota exceeded - ignore */
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, busy]);

  const buildHistory = (list: Msg[]) =>
    list
      .filter((m) => m.text.trim().length > 0)
      .slice(-10)
      .map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setErr("");
    const next: Msg[] = [...msgs, { role: "user", text }];
    setMsgs(next);
    setBusy(true);
    try {
      const res = await api.post(
        "/chat",
        { message: text, history: buildHistory(next) },
        { timeout: REQ_TIMEOUT }
      );
      const data = res.data.data;
      setMsgs((p) => [
        ...p,
        {
          role: "bot",
          text: data.reply || "",
          fallback: !!data.fallback,
          pending: data.pendingAction || undefined,
        },
      ]);
    } catch {
      setErr(t("chat.error"));
    } finally {
      setBusy(false);
    }
  };

  const confirmAction = async (idx: number) => {
    const m = msgs[idx];
    if (!m || !m.pending || busy) return;
    setErr("");
    setBusy(true);
    try {
      const res = await api.post(
        "/chat",
        {
          message: "(تم تأكيد الأمر)",
          history: buildHistory(msgs),
          confirmedAction: { tool: m.pending.tool, arguments: m.pending.arguments },
        },
        { timeout: REQ_TIMEOUT }
      );
      const data = res.data.data;
      setMsgs((p) => [
        ...p.map((x, i) => (i === idx ? { ...x, done: "confirmed" as const } : x)),
        { role: "bot", text: data.reply || "" },
      ]);
    } catch {
      setErr(t("chat.error"));
    } finally {
      setBusy(false);
    }
  };

  const cancelAction = (idx: number) => {
    setMsgs((p) =>
      p.map((x, i) => (i === idx ? { ...x, done: "cancelled" as const } : x))
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("chat.title")}
        className="fixed bottom-5 left-5 z-[75] w-14 h-14 rounded-full text-white shadow-[0_10px_30px_rgba(0,82,204,0.45)] flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #0052CC 0%, #00A3FF 100%)" }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="25" height="25" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="white"
              d="M12 3C6.9 3 3 6.4 3 10.7c0 2.4 1.2 4.6 3.2 6l-.7 3.2c-.1.5.4.9.8.6l3.8-2.1c.6.1 1.3.2 1.9.2 5.1 0 9-3.4 9-7.9S17.1 3 12 3z"
            />
            <circle cx="8" cy="10.7" r="1.3" fill="#0052CC" />
            <circle cx="12" cy="10.7" r="1.3" fill="#0052CC" />
            <circle cx="16" cy="10.7" r="1.3" fill="#0052CC" />
          </svg>
        )}
        {!open && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" aria-hidden />
        )}
      </button>

      {open && (
        <div
          dir={en ? "ltr" : "rtl"}
          className="fixed bottom-24 left-5 z-[75] w-[min(360px,calc(100vw-40px))] h-[480px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2 bg-[var(--blue)] text-white">
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold truncate">{t("chat.title")}</p>
              <p className="text-[11px] opacity-80 truncate">{t("chat.subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={() => { setMsgs([]); setErr(""); }}
              className="text-[11px] underline opacity-80 hover:opacity-100 shrink-0"
            >
              {t("chat.clear")}
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-[#F7F9FB]">
            {msgs.length === 0 && (
              <div className="bg-white border border-gray-100 rounded-xl rounded-start-sm px-3 py-2 text-[12.5px] text-[var(--ink)] leading-relaxed max-w-[85%]">
                {t("chat.welcome")}
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="bg-[var(--blue)] text-white rounded-xl rounded-end-sm px-3 py-2 text-[12.5px] leading-relaxed max-w-[85%] ms-auto whitespace-pre-wrap break-words">
                  {m.text}
                </div>
              ) : m.pending ? (
                <div key={i} className="bg-white border border-gray-100 rounded-xl rounded-start-sm px-3 py-2 text-[12.5px] text-[var(--ink)] leading-relaxed max-w-[85%] space-y-2">
                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                  {m.pending && !m.done && (
                    <div className="border border-dashed rounded-lg p-2.5 space-y-2" style={{ borderColor: "var(--blue)", background: "rgba(0,122,255,0.05)" }}>
                      <p className="text-[12px] font-bold flex items-center gap-1.5">
                        <span>⚡</span>
                        <span>{m.pending.description}</span>
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => confirmAction(i)}
                          disabled={busy}
                          className="btn btn-primary text-[11.5px] px-3 py-1.5 disabled:opacity-50"
                        >
                          {busy ? "…" : t("chat.confirm")}
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelAction(i)}
                          disabled={busy}
                          className="btn text-[11.5px] px-3 py-1.5 border border-gray-200 disabled:opacity-50"
                        >
                          {t("chat.cancel")}
                        </button>
                      </div>
                    </div>
                  )}
                  {m.done === "confirmed" && (
                    <p className="text-[11.5px] font-bold" style={{ color: "#16A34A" }}>✓ {t("chat.confirmed")}</p>
                  )}
                  {m.done === "cancelled" && (
                    <p className="text-[11.5px] text-[var(--sub)]">✕ {t("chat.cancelled")}</p>
                  )}
                </div>
              ) : m.fallback ? (
                <div key={i} className="bg-white border border-gray-100 rounded-xl rounded-start-sm px-3 py-2 text-[12.5px] text-[var(--ink)] leading-relaxed max-w-[85%]">
                  {t("chat.fallback")}{" "}
                  <Link href="/contact" className="underline text-[var(--blue)] font-bold">{t("chat.contact")}</Link>
                </div>
              ) : (
                <div key={i} className="bg-white border border-gray-100 rounded-xl rounded-start-sm px-3 py-2 text-[12.5px] text-[var(--ink)] leading-relaxed max-w-[85%] whitespace-pre-wrap break-words">
                  {m.text}
                </div>
              )
            )}
            {busy && (
              <div className="bg-white border border-gray-100 rounded-xl rounded-start-sm px-3 py-2 text-[12px] text-[var(--sub)] max-w-[40%]">
                …
              </div>
            )}
            {err && <p className="text-[11.5px] text-[var(--danger)] pt-1">{err}</p>}
          </div>

          <div className="border-t border-gray-100 p-2 flex items-end gap-2 bg-white">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={t("chat.placeholder")}
              className="flex-1 resize-none px-3 py-2 text-[12.5px] outline-none max-h-24 bg-transparent"
            />
            <button
              type="button"
              onClick={send}
              disabled={busy || !input.trim()}
              className="btn btn-primary text-[12px] px-3 py-2 disabled:opacity-50"
            >
              {t("chat.send")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

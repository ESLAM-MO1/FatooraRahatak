"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";

type Msg = {
  role: "user" | "bot";
  text: string;
  fallback?: boolean;
};

const STORE_KEY = "publicChat.v1";
const REQ_TIMEOUT = 90000;

// روابط قابلة للنقر: روابط كاملة (http)، روابط تبدأ بـ www، مسارات داخلية شائعة،
// ودومينات من غير بروتوكول زي rahtk.sa/contact — كمان يدعم النص الغامق **...**
const LINK_RE =
  /(https?:\/\/[^\s<>"'`]+|www\.[^\s<>"'`]+|\/(?:pricing|register|login|packages|packages-domains|contact|features|faq|about|academy|privacy|terms)(?:\/[\w\-?=&#%]*)*|(?<![@\w])(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"'`]*)?)/;
const TRAIL_RE = /[.,;:!?\u060C\u061F)'"\]}*`]+$/;

function linkify(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const bold = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;

  const pushPlain = (chunk: string, key: string) => {
    let l = 0;
    let match: RegExpExecArray | null;
    bold.lastIndex = 0;
    while ((match = bold.exec(chunk)) !== null) {
      if (match.index > l) out.push(chunk.slice(l, match.index));
      out.push(
        <strong key={`${key}-b${match.index}`} className="font-bold">
          {match[1]}
        </strong>
      );
      l = match.index + match[0].length;
    }
    if (l < chunk.length) out.push(chunk.slice(l));
  };

  let idx = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    const raw = m[0];
    const trimmed = raw.replace(TRAIL_RE, "");
    const tail = raw.slice(trimmed.length);
    if (m.index > last) pushPlain(text.slice(last, m.index), `${keyBase}-${idx}`);
    const href = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : /^www\./i.test(trimmed)
        ? `https://${trimmed}`
        : /^\//.test(trimmed)
          ? trimmed
          : `https://${trimmed}`;
    const external = /^https?:\/\//i.test(href);
    out.push(
      external ? (
        <a
          key={`${keyBase}-l${idx}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-[var(--blue)] font-bold break-all"
        >
          {trimmed}
        </a>
      ) : (
        <Link
          key={`${keyBase}-l${idx}`}
          href={href}
          className="underline text-[var(--blue)] font-bold break-all"
        >
          {trimmed}
        </Link>
      )
    );
    if (tail) out.push(tail);
    last = m.index + raw.length;
    idx++;
  }
  if (last < text.length) pushPlain(text.slice(last), `${keyBase}-end`);
  return out;
}

// بوت الدعم العام لزوار الصفحة الخارجية (غير المسجّلين). معلوماتي فقط عن
// المنصة — بلا أدوات تنفيذ وبلا وصول لأي بيانات متجر.
export default function PublicChatWidget() {
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
  }, [msgs]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
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
        "/chat/public",
        { message: text, history: buildHistory(next) },
        { timeout: REQ_TIMEOUT }
      );
      const data = res.data.data;
      const reply = (data.reply || "").trim();
      setMsgs((p) => [
        ...p,
        {
          role: "bot",
          text: reply,
          // رد فاضي أو تعذّر الوصول للموديل: نعرض رسالة الدعم بدل فقاعة فاضية.
          fallback: !reply || !!data.fallback,
        },
      ]);
    } catch {
      setErr(t("chat.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("publicChat.title")}
        className="flex items-center gap-2 rounded-full px-4 py-3 font-bold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
        style={{
          position: "fixed",
          bottom: 82,
          right: 22,
          zIndex: 61,
          background: "linear-gradient(135deg, #0052CC 0%, #00A3FF 100%)",
          boxShadow: "0 8px 24px rgba(0,82,204,0.35)",
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
        <span className="text-[13px] hidden sm:inline">{t("publicChat.button")}</span>
      </button>

      {open && (
        <div
          dir={en ? "ltr" : "rtl"}
          className="fixed z-[61] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{
            bottom: 138,
            right: 22,
            width: "min(360px, calc(100vw - 40px))",
            height: 460,
            maxHeight: "70vh",
          }}
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2 bg-[var(--blue)] text-white">
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold truncate">{t("publicChat.title")}</p>
              <p className="text-[11px] opacity-80 truncate">{t("publicChat.subtitle")}</p>
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
                {t("publicChat.welcome")}
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="bg-[var(--blue)] text-white rounded-xl rounded-end-sm px-3 py-2 text-[12.5px] leading-relaxed max-w-[85%] ms-auto whitespace-pre-wrap break-words">
                  {m.text}
                </div>
              ) : m.fallback ? (
                <div key={i} className="bg-white border border-gray-100 rounded-xl rounded-start-sm px-3 py-2 text-[12.5px] text-[var(--ink)] leading-relaxed max-w-[85%]">
                  {t("chat.fallback")}{" "}
                  <Link href="/contact" className="underline text-[var(--blue)] font-bold">{t("chat.contact")}</Link>
                </div>
              ) : (
                <div key={i} className="bg-white border border-gray-100 rounded-xl rounded-start-sm px-3 py-2 text-[12.5px] text-[var(--ink)] leading-relaxed max-w-[85%] whitespace-pre-wrap break-words">
                  {linkify(m.text, `b${i}`)}
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
              placeholder={t("publicChat.placeholder")}
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

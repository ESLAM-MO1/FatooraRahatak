"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { globalSearch, SearchResult } from "@/lib/search";
import "@/lib/i18n/config";

const typeColors: Record<string, string> = {
  product: "#12a8db",
  category: "#8b5cf6",
  order: "#f59e0b",
  customer: "#10b981",
  employee: "#ec4899",
  coupon: "#ef4444",
  invoice: "#6366f1",
};

export default function GlobalSearch() {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await globalSearch(query);
        setResults(data);
        setOpen(true);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    router.push(result.link);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className={`relative flex items-center rounded-2xl border transition-all duration-150 ${
          focused
            ? "border-transparent ring-2 ring-[var(--blue)] shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
            : "border-[var(--border)] hover:border-[#c9ced3]"
        }`}
        style={{ background: "var(--bg)" }}
      >
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={focused ? "var(--blue)" : "var(--sub-light)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-colors duration-150"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (results.length > 0) setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          className="w-full py-4 pr-12 pl-11 rounded-2xl text-[16px] outline-none bg-transparent placeholder:text-[var(--sub-light)]"
        />

        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--sub-light)] hover:text-[var(--ink)] transition-colors"
            tabIndex={-1}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-2 w-full bg-white border border-[var(--border)] rounded-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.1)] max-h-[380px] overflow-y-auto z-50 animate-[fadeIn_0.12s_ease-out]">
          {loading && (
            <div className="flex items-center gap-2.5 px-4 py-3.5 text-[13px] text-[var(--sub)]">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
              {t("search.searching")}
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-[13px] text-[var(--sub)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--sub-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              {t("search.noResults")}
            </div>
          )}

          {!loading &&
            results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => handleSelect(r)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full text-right px-3.5 py-2.5 flex items-center justify-between border-b border-[var(--border)] last:border-0 transition-colors ${
                  activeIndex === i ? "bg-[#f5f7f8]" : "bg-white"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[13.5px] font-bold text-[var(--ink)] truncate">{r.title}</div>
                  {r.subtitle && (
                    <div className="text-[12px] text-[var(--sub)] truncate">{r.subtitle}</div>
                  )}
                </div>
                <span
                  className="text-[11px] font-bold shrink-0 px-2 py-0.5 rounded-full"
                  style={{
                    color: typeColors[r.type] ?? "var(--blue)",
                    background: `${typeColors[r.type] ?? "var(--blue)"}14`,
                  }}
                >
                  {t(`search.${r.type}`) || r.type}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
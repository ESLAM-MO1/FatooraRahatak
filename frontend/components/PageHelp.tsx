"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { PAGE_HELP_CONTENT } from "@/lib/pageHelpContent";

const STORAGE_KEY = "pageHelpButtonPos";
const BUTTON_SIZE = 56; // w-14 / h-14 (أكبر قليلًا عشان يبقى سهل الضغط على الموبايل)
const MARGIN = 24;
const DRAG_THRESHOLD = 8; // للماوس فقط

type Pos = { x: number; y: number };

function clampPosition(x: number, y: number): Pos {
  if (typeof window === "undefined") return { x, y };
  const maxX = Math.max(window.innerWidth - BUTTON_SIZE, 0);
  const maxY = Math.max(window.innerHeight - BUTTON_SIZE, 0);
  return {
    x: Math.min(Math.max(x, 0), maxX),
    y: Math.min(Math.max(y, 0), maxY),
  };
}

function getDefaultPosition(): Pos {
  if (typeof window === "undefined") return { x: MARGIN, y: MARGIN };
  return clampPosition(MARGIN, window.innerHeight - BUTTON_SIZE - MARGIN);
}

export default function PageHelp() {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);

  const posRef = useRef<Pos>({ x: MARGIN, y: MARGIN });
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // تحميل الموضع المحفوظ (أو الموضع الافتراضي) عند أول تحميل
  useEffect(() => {
    let initial = getDefaultPosition();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved?.x === "number" && typeof saved?.y === "number") {
          initial = clampPosition(saved.x, saved.y);
        }
      }
    } catch {
      // تجاهل أي خطأ في القراءة من localStorage
    }
    posRef.current = initial;
    setPos(initial);
  }, []);

  // إعادة تصحيح الموضع لو الشاشة اتغيرت
  useEffect(() => {
    function handleResize() {
      const clamped = clampPosition(posRef.current.x, posRef.current.y);
      posRef.current = clamped;
      setPos(clamped);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
      } catch {
        // تجاهل
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // السحب يعمل بالماوس فقط. اللمس على الموبايل لا يتدخل في الـ pointer events
  // إطلاقًا — فتح النافذة يتم عبر onClick المباشر (مضمون على كل المتصفحات).
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse") return;
    suppressClickRef.current = false;
    draggingRef.current = true;
    movedRef.current = false;
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: posRef.current.x,
      posY: posRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;

    if (!movedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      movedRef.current = true;
    }

    if (movedRef.current) {
      const next = clampPosition(startRef.current.posX + dx, startRef.current.posY + dy);
      posRef.current = next;
      setPos(next);
    }
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (movedRef.current) {
      // كان سحب (ماوس): نحفظ الموضع النهائي ومنفتحش النافذة
      suppressClickRef.current = true; // منع الـ click اللي بعد السحب من فتحها
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current));
      } catch {
        // تجاهل
      }
    } else {
      setOpen(true);
    }
    movedRef.current = false;
  }, []);

  // المصدر الأساسي لفتح النافذة (يعمل بالماوس واللمس معًا)
  const handleClick = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setOpen(true);
  }, []);

  const entry = pathname ? PAGE_HELP_CONTENT[pathname] : undefined;
  if (!entry) return null;

  const isAr = i18n.language === "ar";
  const title = isAr ? entry.titleAr : entry.titleEn;
  const body = isAr ? entry.bodyAr : entry.bodyEn;

  return (
    <>
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={handleClick}
        style={pos ? { left: pos.x, top: pos.y } : { left: MARGIN, bottom: MARGIN }}
        className="fixed z-[95] w-14 h-14 rounded-full bg-[var(--blue)] text-white shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer select-none"
        aria-label={t("nav.help")}
        title={t("nav.help")}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      </button>

      {open && (
        <div
          dir="rtl"
          className="fixed inset-0 bg-[var(--blue-deep)]/50 flex items-center justify-center z-[100] p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="text-[16px] font-bold text-[var(--blue-deep)]">{title}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#9AA4AC] hover:text-[var(--ink)] shrink-0"
                aria-label={t("common.close")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-[13.5px] text-[var(--ink)] leading-relaxed whitespace-pre-line">{body}</div>
          </div>
        </div>
      )}
    </>
  );
}

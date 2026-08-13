"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

interface InfoTooltipProps {
  message?: string;
  messageKey?: string;
  iconSize?: number;
  className?: string;
}

export default function InfoTooltip({
  message,
  messageKey,
  iconSize = 14,
  className = "",
}: InfoTooltipProps) {
  const { t, i18n } = useTranslation();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; placement: "top" | "bottom" }>({
    top: 0,
    left: 0,
    placement: "bottom",
  });

  const text = message ?? (messageKey ? t(messageKey) : "");

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const tip = tipRef.current;
    if (!trigger || !tip) return;

    const tr = trigger.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const gap = 7;
    const margin = 8;
    const spaceBelow = window.innerHeight - tr.bottom;
    const spaceAbove = tr.top;
    const placeBelow = spaceBelow >= th + gap || spaceBelow >= spaceAbove;

    let top = placeBelow ? tr.bottom + gap : tr.top - th - gap;
    if (top < margin) top = margin;
    if (top + th > window.innerHeight - margin) top = window.innerHeight - th - margin;

    let left = tr.left + tr.width / 2 - tw / 2;
    if (left < margin) left = margin;
    if (left + tw > window.innerWidth - margin) left = window.innerWidth - tw - margin;

    setPos({ top, left, placement: placeBelow ? "bottom" : "top" });
  }, [open, text]);

  if (!text) return null;

  return (
    <>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-label={text}
        aria-expanded={open}
        className={`info-tooltip-trigger ${className}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </span>
      {open && (
        <div
          ref={tipRef}
          role="tooltip"
          dir={i18n.language === "ar" ? "rtl" : "ltr"}
          className={`info-tooltip-bubble info-tooltip-bubble--${pos.placement}`}
          style={{ top: pos.top, left: pos.left }}
        >
          {text}
        </div>
      )}
    </>
  );
}

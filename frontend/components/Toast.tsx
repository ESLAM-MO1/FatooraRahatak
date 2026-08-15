"use client";

import { useEffect, useRef, useState } from "react";

export type ToastType = "success" | "error" | "warning";

interface ToastProps {
  message: string | null;
  type?: ToastType;
  className?: string;
  fixed?: boolean;
  onClose?: () => void;
}

const DEFAULT_ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" width="15" height="15" aria-hidden="true">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" width="15" height="15" aria-hidden="true">
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" width="15" height="15" aria-hidden="true">
      <path
        d="M12 8v5M12 17h.01"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const TOAST_CLASS: Record<ToastType, string> = {
  success: "toast toast--success",
  error: "toast toast--error",
  warning: "toast toast--warning",
};

const TOAST_TIMEOUT_MS = 3200;
const TOAST_FADE_OUT_MS = 3650;

export default function Toast({
  message,
  type = "success",
  className = "",
  fixed = true,
  onClose,
}: ToastProps) {
  const [rendered, setRendered] = useState(false);
  const [fading, setFading] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];

    if (!message) {
      setRendered(false);
      setFading(false);
      return;
    }

    setRendered(true);
    setFading(false);

    timers.current.push(setTimeout(() => setFading(true), TOAST_TIMEOUT_MS));
    timers.current.push(
      setTimeout(() => {
        setRendered(false);
        onClose?.();
      }, TOAST_FADE_OUT_MS)
    );

    return () => {
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, [message]);

  if (!message || !rendered) return null;

  return (
    <div
      role="status"
      className={`${TOAST_CLASS[type]} ${fixed ? "toast--fixed " : ""}${className}`}
      style={{
        opacity: fading ? 0 : 1,
        transform: fixed
          ? fading
            ? "translate(-50%, -8px)"
            : "translate(-50%, 0)"
          : fading
          ? "translateY(-8px)"
          : "translateY(0)",
      }}
    >
      <span className="toast-icon" aria-hidden="true">
        {DEFAULT_ICONS[type]}
      </span>
      <span>{message}</span>
    </div>
  );
}
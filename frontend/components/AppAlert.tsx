"use client";

import { useEffect, useRef, useState } from "react";

/**
 * الكومبوننت الموحّد لكل رسائل/تنبيهات النظام (Success / Error / Warning / Info).
 * تصميم مميز: خلفية بيضاء + border جانبي ملون (4px) + أيقونة SVG مخصصة داخل
 * مربع ملوّن + ظل عميق + حركة دخول/خروج (slide + fade) تدعم RTL بالكامل.
 *
 * الاستخدام كرسالة ثابتة داخل الصفحة (Alert):
 *   <AppAlert type="error" title="تعذر الحفظ">{message}</AppAlert>
 *
 * الاستخدام كـ Toast منبثق (fixed) مع أزرار إغلاق تلقائي:
 *   <AppToast type="success" message={msg} onClose={() => setMsg(null)} />
 */

export type AlertType = "success" | "error" | "warning" | "info";

const TYPE_STYLES: Record<AlertType, string> = {
  success: "alert alert--success",
  error: "alert alert--danger",
  warning: "alert alert--warning",
  info: "alert alert--info",
};

const TOAST_STYLES: Record<AlertType, string> = {
  success: "toast toast--success",
  error: "toast toast--error",
  warning: "toast toast--warning",
  info: "toast toast--info",
};

const DEFAULT_ICONS: Record<AlertType, React.ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">
      <path d="M20 7 10 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">
      <path d="M12 8v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 16.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">
      <path d="M12 9v4.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 3 2.5 20.5h19L12 3Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" />
      <path d="M12 16v-4.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 8h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  ),
};

interface AppAlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export default function AppAlert({ type = "info", title, children, className = "", icon }: AppAlertProps) {
  return (
    <div role={type === "error" ? "alert" : "status"} className={`${TYPE_STYLES[type]} ${className}`.trim()}>
      <span className="app-alert-icon" aria-hidden="true">
        {icon || DEFAULT_ICONS[type]}
      </span>
      <div className="app-alert-body">
        {title && <p className="app-alert-title">{title}</p>}
        <div className="app-alert-content">{children}</div>
      </div>
    </div>
  );
}

interface AppToastProps {
  message: string | null;
  type?: AlertType;
  className?: string;
  fixed?: boolean;
  onClose?: () => void;
  duration?: number;
}

const TOAST_TIMEOUT_MS = 3200;
const TOAST_FADE_OUT_MS = 3650;

export function AppToast({ message, type = "success", className = "", fixed = true, onClose, duration }: AppToastProps) {
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

    const timeout = duration ?? TOAST_TIMEOUT_MS;
    const fadeOut = (duration ?? TOAST_FADE_OUT_MS) + 450;

    timers.current.push(setTimeout(() => setFading(true), timeout));
    timers.current.push(
      setTimeout(() => {
        setRendered(false);
        onClose?.();
      }, fadeOut)
    );

    return () => {
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, [message]);

  if (!message || !rendered) return null;

  return (
    <div
      role="status"
      className={`${TOAST_STYLES[type]} ${fixed ? "toast--fixed " : ""}${className}`}
      style={{
        opacity: fading ? 0 : 1,
        transform: fixed
          ? fading
            ? "translate(-50%, -10px) scale(0.97)"
            : "translate(-50%, 0) scale(1)"
          : fading
            ? "translateY(-8px) scale(0.98)"
            : "translateY(0) scale(1)",
        transition: "opacity 0.45s ease, transform 0.45s ease",
      }}
    >
      <span className="toast-icon" aria-hidden="true">
        {DEFAULT_ICONS[type]}
      </span>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={() => {
            setRendered(false);
            onClose();
          }}
          className="opacity-60 hover:opacity-100 transition-opacity shrink-0"
          aria-label="إغلاق"
        >
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

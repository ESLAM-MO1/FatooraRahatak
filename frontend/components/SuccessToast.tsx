"use client";

import { useEffect, useRef, useState } from "react";

interface SuccessToastProps {
  message: string | null;
  className?: string;
  fixed?: boolean;
  onClose?: () => void;
}

export default function SuccessToast({ message, className = "", fixed = false, onClose }: SuccessToastProps) {
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

    timers.current.push(setTimeout(() => setFading(true), 3200));
    timers.current.push(
      setTimeout(() => {
        setRendered(false);
        onClose?.();
      }, 3650)
    );

    return () => {
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, [message]);

  if (!message || !rendered) return null;

  return (
    <div
      role="status"
      className={`toast-success ${fixed ? "toast-success--fixed " : ""}${className}`}
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
      <span className="toast-success-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
          <path
            d="M20 6 9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{message}</span>
    </div>
  );
}

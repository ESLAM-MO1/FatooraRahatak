"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

const ConfirmContext = createContext<((options: ConfirmOptions | string) => Promise<boolean>) | null>(null);

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="22" height="22">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const alertPath = "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";
const helpPath = "M9.5 9a2.5 2.5 0 1 1 3.6 2.25c-.7.35-1.1.9-1.1 1.75M12 17h.01";

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>({ open: false, message: "" });
  const resolver = useRef<((value: boolean) => void) | undefined>(undefined);

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const normalized = typeof options === "string" ? { message: options } : options;
    setState({ ...normalized, open: true });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handleClose = (result: boolean) => {
    setState((prev) => ({ ...prev, open: false }));
    resolver.current?.(result);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {state.open && (
        <div
          dir="rtl"
          className="fixed inset-0 bg-[var(--blue-deep)]/50 flex items-center justify-center z-[100] p-4"
          onClick={() => handleClose(false)}
        >
          <div
            className="card p-6 w-full max-w-sm text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                state.danger
                  ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                  : "bg-[var(--blue-50)] text-[var(--blue)]"
              }`}
            >
              <Icon path={state.danger ? alertPath : helpPath} />
            </div>

            {state.title && (
              <h3 className="text-[16px] font-bold text-[var(--blue-deep)] mb-2">{state.title}</h3>
            )}
            <p className="text-[13.5px] text-[var(--ink)] leading-relaxed mb-6">{state.message}</p>

            <div className="flex gap-3">
              <button
                onClick={() => handleClose(false)}
                className="btn-secondary flex-1"
              >
                {state.cancelLabel || "إلغاء"}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={state.danger ? "btn-danger flex-1" : "btn-primary flex-1"}
              >
                {state.confirmLabel || "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm لازم يتستخدم جوه ConfirmProvider");
  }
  return ctx;
}
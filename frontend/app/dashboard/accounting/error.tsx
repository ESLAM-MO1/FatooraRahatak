"use client";

import { useEffect } from "react";

export default function AccountingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Accounting page error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="card p-8 max-w-lg w-full text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v5" />
            <path d="M12 16h.01" />
          </svg>
        </div>

        <h2 className="text-[16px] font-bold text-[var(--ink)] mb-2">عذرًا، حدث خطأ في هذه الصفحة</h2>

        <p className="text-[13px] text-[var(--sub)] mb-5 leading-relaxed">
          تفاصيل الخطأ الفنية — يُرجى إرسالها لفريق الدعم:
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-5 text-left" dir="ltr">
          <code className="text-[11px] text-[var(--danger)] break-all whitespace-pre-wrap font-mono">
            {error?.message || error?.toString?.() || "خطأ غير معروف"}
          </code>
          {error?.digest && (
            <code className="text-[10px] text-[var(--sub)] block mt-2">
              digest: {error.digest}
            </code>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn btn-primary">
            إعادة المحاولة
          </button>
          <button onClick={() => window.history.back()} className="btn btn-outline">
            العودة
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { CURRENCY_SYMBOLS } from "@/lib/hooks/useStorefront";

// يرجّع رمز عملة المتجر (مثل ر.س / ج.م / $). فاضي لحد ما تتحمّل بيانات المتجر
// عشان مايظهرش رمز غلط للحظة. لو العملة مش في الجدول يظهر كودها كما هو.
export function useStoreCurrencySymbol(slug: string): string {
  const [symbol, setSymbol] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/public/stores/${slug}`)
      .then((res) => {
        const code = res.data?.data?.currency as string | undefined;
        if (!cancelled && code) setSymbol(CURRENCY_SYMBOLS[code] || code);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return symbol;
}

"use client";

/**
 * أداة موحّدة للتحقق من الحقول وإظهار خطأ بجانب الحقل نفسه (inline)
 * بدل رسالة عامة تظهر بعيد عن مكان الخطأ.
 */

export type FieldErrors = Record<string, string>;

export interface ValidatorRule {
  field: string;
  validate: (value: string) => string | null;
}

export function validateFields(
  values: Record<string, string>,
  rules: ValidatorRule[]
): FieldErrors {
  const errors: FieldErrors = {};
  for (const rule of rules) {
    const msg = rule.validate(values[rule.field] ?? "");
    if (msg) errors[rule.field] = msg;
  }
  return errors;
}

export const required = (msg: string) => (v: string) => (v.trim() ? null : msg);
export const email = (msg: string) => (v: string) =>
  !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : msg;
export const minLength = (n: number, msg: string) => (v: string) =>
  v.trim().length >= n ? null : msg;
export const phone = (msg: string) => (v: string) => {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 9 ? null : msg;
};

interface FieldErrorProps {
  message?: string;
}

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 mt-1.5 text-[12px] font-semibold text-[var(--danger)]">
      <svg viewBox="0 0 24 24" fill="none" width="14" height="14" className="shrink-0">
        <path d="M12 8v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M12 16.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      </svg>
      {message}
    </p>
  );
}

/** كلاس الحدود للخانة: يضيف إطار أحمر على الحقل اللي فيه خطأ */
export function fieldErrorClass(hasError: boolean): string {
  return hasError ? " field-error" : "";
}

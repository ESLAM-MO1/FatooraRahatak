"use client";

import { useEffect } from "react";

/**
 * تحقق تلقائي موحّد لكل فورمات المشروع.
 * عند الضغط على "إرسال" في أي <form>:
 *   - يتحقق من الحقول المطلوبة (required) والحقول ذات الأنماط (email/phone/number)
 *   - يظهر خطأ عربي بجانب الحقل نفسه (تحته) + إطار أحمر حوله
 *   - يمرّر التركيز لأول حقل فيه خطأ (بدل رسالة عامة أعلى/أسفل الصفحة)
 *
 * لا يحتاج أي تعديل في ملفات الفورمات — يعمل تلقائياً على أي <form> في الصفحة.
 * يمكن تعطيله من فورم معين بإضافة خاصية data-skip-validation
 */

const ARABIC_LABELS: Record<string, string> = {
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  phone: "رقم الجوال",
  tel: "رقم الجوال",
  name: "الاسم",
  "full-name": "الاسم الكامل",
  text: "هذا الحقل",
  number: "القيمة",
  date: "التاريخ",
  select: "الاختيار",
  textarea: "النص",
};

function defaultMsg(fieldName: string, input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  const el = input as HTMLInputElement;
  const name = input.name || input.id || el.placeholder || fieldName;
  const label = ARABIC_LABELS[el.type] || ARABIC_LABELS[fieldName] || name || "هذا الحقل";
  if (el.type === "email") return `يرجى إدخال بريد إلكتروني صحيح في "${label}"`;
  if (el.type === "tel" || fieldName === "phone") return `يرجى إدخال رقم جوال صحيح في "${label}"`;
  return `يرجى إدخال ${label}`;
}

function getLabelText(input: HTMLElement): string | null {
  const id = input.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent?.trim() || null;
  }
  const wrap = input.closest("div");
  const label = wrap?.querySelector("label");
  return label?.textContent?.trim() || null;
}

function validateField(input: HTMLElement): string | null {
  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
    const type = (input as HTMLInputElement).type || "";
    const value = input.value.trim();
    const el = input as HTMLInputElement;
    const label = getLabelText(input) || (ARABIC_LABELS[type] || ARABIC_LABELS[input.name] || el.placeholder || input.name || "هذا الحقل");

    if (input.hasAttribute("required") && !value) {
      return `يرجى إدخال ${label}`;
    }
    if (value && type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return `صيغة البريد الإلكتروني غير صحيحة (${label})`;
    }
    if (value && (type === "tel" || input.name.toLowerCase().includes("phone")) && value.replace(/\D/g, "").length < 9) {
      return `رقم الجوال غير صحيح (${label})`;
    }
    if (value && type === "number" && input.hasAttribute("min")) {
      const min = parseFloat(input.getAttribute("min") || "");
      if (!Number.isNaN(min) && parseFloat(value) < min) {
        return `${label} يجب ألا يقل عن ${min}`;
      }
    }
  }
  return null;
}

function clearFieldErrors(input: HTMLElement) {
  input.classList.remove("field-error");
  const wrap = input.closest(".field-shell") || input.parentElement;
  if (wrap) wrap.classList.remove("field-error");
  input.removeAttribute("data-field-error");
  const existing = input.parentElement?.querySelector(".field-inline-error");
  existing?.remove();
}

function markFieldError(input: HTMLElement, message: string) {
  input.classList.add("field-error");
  const wrap = input.closest(".field-shell") || input.parentElement;
  if (wrap && wrap !== input) wrap.classList.add("field-error");
  input.setAttribute("data-field-error", message);

  const container = wrap || input.parentElement;
  const existing = container?.querySelector(".field-inline-error");
  existing?.remove();

  const err = document.createElement("p");
  err.className = "field-inline-error";
  err.setAttribute("role", "alert");
  err.textContent = message;
  container?.appendChild(err);
}

export default function GlobalFormValidation() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // ⚠️ أي رسالة خطأ (alert--danger) تظهر في الصفحة → اتمرر إليها تلقائياً
    const observer = new MutationObserver(() => {
      const alert = document.querySelector(".alert--danger");
      if (alert && !alert.getAttribute("data-scrolled-to")) {
        alert.setAttribute("data-scrolled-to", "1");
        setTimeout(() => alert.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.hasAttribute("data-skip-validation")) return;

      const fields = Array.from(
        form.querySelectorAll<HTMLElement>("input, select, textarea")
      );

      // مسح أخطاء سابقة
      fields.forEach(clearFieldErrors);

      let firstError: HTMLElement | null = null;
      for (const field of fields) {
        if (field.hasAttribute("data-skip-validation")) continue;
        const msg = validateField(field);
        if (msg) {
          markFieldError(field, msg);
          if (!firstError) firstError = field;
        }
      }

      if (firstError) {
        e.preventDefault();
        e.stopPropagation();
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        try {
          (firstError as HTMLElement).focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
      }
    };

    // تنظيف الأخطاء عند بدء الكتابة من جديد
    const onInput = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && typeof target.classList !== "undefined" && target.classList.contains("field-error")) {
        clearFieldErrors(target);
      }
    };

    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("input", onInput, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("input", onInput, true);
    };
  }, []);

  return null;
}

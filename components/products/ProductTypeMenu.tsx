"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import Icon from "@/components/Icon";

type TypeDef = {
  tp: string | null;
  emoji: string;
  ar: [string, string];
  en: [string, string];
};

const TYPES: TypeDef[] = [
  { tp: "Physical", emoji: "📦", ar: ["منتج ملموس", "منتجات جاهزة يمكن شحنها أو استلامها"], en: ["Physical product", "Ready items that can be shipped or picked up"] },
  { tp: "Service", emoji: "🛠️", ar: ["خدمة حسب الطلب", "خدمات التصميم والكتابة والطباعة وغيرها"], en: ["Custom service", "Design, writing, printing and similar services"] },
  { tp: "Food", emoji: "🍔", ar: ["أكل ومشروبات", "منتجات غذائية تتطلب شحنًا خاصًا"], en: ["Food & drinks", "Food products that need special shipping"] },
  { tp: "Digital", emoji: "💾", ar: ["منتج رقمي", "ملفات وكتب إلكترونية ودورات مسجلة"], en: ["Digital product", "Files, e-books and recorded courses"] },
  { tp: "Card", emoji: "🎟️", ar: ["بطاقة رقمية", "بطاقات مسبقة الدفع أو اشتراكات مرخصة"], en: ["Digital card", "Prepaid cards or licensed subscriptions"] },
  { tp: "Bundle", emoji: "🧺", ar: ["مجموعة منتجات", "منتجات متعددة تُباع كمنتج واحد"], en: ["Product bundle", "Several products sold as one"] },
  { tp: null, emoji: "📅", ar: ["حجوزات", "دورات واستشارات وخدمات طبية أو سياحية"], en: ["Bookings", "Courses, consultations, medical or travel services"] },
];

type Pos = { top: number; left: number; width: number; maxH: number; rtl: boolean };

export default function ProductTypeMenu() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const en = !!i18n.language?.startsWith("en");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [active, setActive] = useState(0);
  const [soon, setSoon] = useState<TypeDef | null>(null);
  const btn = useRef<HTMLButtonElement>(null);

  const place = () => {
    const el = btn.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(340, vw - 24);
    const rtl = getComputedStyle(el).direction === "rtl";
    let left = rtl ? r.right - width : r.left;
    left = Math.max(12, Math.min(left, vw - width - 12));
    const top = r.bottom + 8;
    setPos({ top, left, width, maxH: Math.max(240, vh - top - 12), rtl });
  };

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    place();
    setOpen(true);
  };

  const pick = (t: TypeDef) => {
    setOpen(false);
    if (t.tp) router.push(`/dashboard/products/new?type=${t.tp}`);
    else setSoon(t);
  };

  const cur = TYPES[active];
  const [curTitle, curDesc] = en ? cur.en : cur.ar;

  return (
    <>
      <button ref={btn} type="button" className="btn btn-primary" onClick={toggle} aria-expanded={open}>
        <Icon name="plus" />
        {en ? "New product" : "منتج جديد"}
        <span aria-hidden>▾</span>
      </button>

      {open && pos && createPortal(
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div
            dir={pos.rtl ? "rtl" : "ltr"}
            className="card p-2.5 shadow-lg"
            style={{
              position: "fixed",
              zIndex: 50,
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxH,
              overflowY: "auto",
            }}
          >
            <div className="flex items-center justify-between px-1 pt-0.5 pb-2">
              <span className="text-[12px] font-bold text-[var(--ink)]">{en ? "Product type" : "نوع المنتج"}</span>
              <span className="text-[10.5px] text-[var(--sub)]">{en ? "Choose one" : "اختر نوعًا"}</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t, i) => {
                const [title] = en ? t.en : t.ar;
                return (
                  <button
                    key={t.ar[0]}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => pick(t)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-bold transition border ${
                      active === i
                        ? "bg-[var(--blue)] text-white border-transparent shadow-sm"
                        : "bg-white text-[var(--ink)] border-[var(--border)] hover:border-[var(--blue)] hover:text-[var(--blue)]"
                    }`}
                  >
                    <span aria-hidden>{t.emoji}</span>
                    <span className="max-w-[120px] truncate">{title}</span>
                    {t.tp === null && <span className="text-[9.5px] font-bold opacity-80">{en ? "Soon" : "قريبًا"}</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 rounded-xl bg-gray-50 border border-[var(--border)] p-3 flex items-start gap-2.5">
              <span className="text-[26px] leading-none shrink-0" aria-hidden>{cur.emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold text-[var(--ink)]">{curTitle}</span>
                <span className="block text-[11.5px] text-[var(--sub)] leading-snug mt-1">{curDesc}</span>
              </span>
              {cur.tp === null && <span className="badge badge--yellow shrink-0">{en ? "Soon" : "قريبًا"}</span>}
            </div>

            <div className="mt-2 px-1 text-[11px] text-[var(--sub)]">
              {en ? "The form opens with the selected type." : "الفورم هيفتح بالنوع اللي اخترته."}
            </div>
          </div>
        </>,
        document.body
      )}

      {soon && (
        <div className="modal-overlay" onClick={() => setSoon(null)}>
          <div className="card p-8 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-[44px] mb-2" aria-hidden>{soon.emoji}</p>
            <span className="badge badge--yellow">{en ? "Coming soon" : "قريبًا"}</span>
            <h2 className="text-[18px] font-bold text-[var(--blue-deep)] mt-3 mb-2">{(en ? soon.en : soon.ar)[0]}</h2>
            <p className="text-[13px] text-[var(--sub)] leading-relaxed mb-5">
              {en
                ? "We are studying this product type and designing its experience. It will arrive in an upcoming update."
                : "نعمل حاليًا على دراسة هذا النوع وتصميم تجربته بالشكل الأمثل، وسيكون متاحًا في تحديث قادم."}
            </p>
            <button type="button" className="btn btn-secondary w-full" onClick={() => setSoon(null)}>
              {en ? "Got it" : "حسنًا"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

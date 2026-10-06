"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import Icon from "@/components/Icon";

const TYPES = [
  { key: "physical", emoji: "📦", ready: true,
    ar: ["منتج ملموس", "منتجات جاهزة يمكن شحنها أو استلامها"],
    en: ["Physical product", "Ready items that can be shipped or picked up"] },
  { key: "service", emoji: "🛠️", ready: false,
    ar: ["خدمة حسب الطلب", "خدمات التصميم والكتابة والطباعة وغيرها"],
    en: ["Custom service", "Design, writing, printing and similar services"] },
  { key: "food", emoji: "🍔", ready: false,
    ar: ["أكل ومشروبات", "منتجات غذائية تتطلب شحنًا خاصًا"],
    en: ["Food & drinks", "Food products that need special shipping"] },
  { key: "digital", emoji: "💾", ready: false,
    ar: ["منتج رقمي", "ملفات وكتب إلكترونية ودورات مسجلة"],
    en: ["Digital product", "Files, e-books and recorded courses"] },
  { key: "card", emoji: "🎟️", ready: false,
    ar: ["بطاقة رقمية", "بطاقات مسبقة الدفع أو اشتراكات مرخصة"],
    en: ["Digital card", "Prepaid cards or licensed subscriptions"] },
  { key: "bundle", emoji: "🧺", ready: false,
    ar: ["مجموعة منتجات", "منتجات متعددة تُباع كمنتج واحد"],
    en: ["Product bundle", "Several products sold as one"] },
  { key: "booking", emoji: "📅", ready: false,
    ar: ["حجوزات", "دورات واستشارات وخدمات طبية أو سياحية"],
    en: ["Bookings", "Courses, consultations, medical or travel services"] },
] as const;

type Pos = { top: number; left: number; width: number; maxH: number; rtl: boolean };

export default function ProductTypeMenu() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const en = !!i18n.language?.startsWith("en");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [soon, setSoon] = useState<(typeof TYPES)[number] | null>(null);
  const btn = useRef<HTMLButtonElement>(null);

  const place = () => {
    const el = btn.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(320, vw - 24);
    const rtl = getComputedStyle(el).direction === "rtl";
    let left = rtl ? r.right - width : r.left;
    left = Math.max(12, Math.min(left, vw - width - 12));
    const top = r.bottom + 8;
    setPos({ top, left, width, maxH: Math.max(200, vh - top - 12), rtl });
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

  const pick = (t: (typeof TYPES)[number]) => {
    setOpen(false);
    if (t.ready) router.push("/dashboard/products/new");
    else setSoon(t);
  };

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
            className="card p-2 shadow-lg"
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
            {TYPES.map((t) => {
              const [title, desc] = en ? t.en : t.ar;
              return (
                <button key={t.key} type="button" onClick={() => pick(t)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-start hover:bg-[var(--blue-50)] transition-colors">
                  <span className="text-[22px] w-8 text-center shrink-0" aria-hidden>{t.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] font-bold text-[var(--ink)]">{title}</span>
                    <span className="block text-[11.5px] text-[var(--sub)] leading-snug">{desc}</span>
                  </span>
                  {!t.ready && <span className="badge badge--yellow shrink-0">{en ? "Soon" : "قريبًا"}</span>}
                </button>
              );
            })}
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

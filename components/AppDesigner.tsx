"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import Icon from "@/components/Icon";
import { STORE_THEMES, getDefaultColors, type StoreColors } from "@/components/store-templates/configs";

// ── مصمّم التطبيق بالسحب والإفلات مع معاينة مباشرة ──
// يتيح للتاجر ترتيب أقسام الشاشة الرئيسية، وتخصيص الألوان والأيقونة،
// ومشاهدة النتيجة فورًا داخل هاتف تجريبي، مطابقةً لصانع تطبيقات سلة.

export type AppSectionKey =
  | "hero"
  | "categories"
  | "banners"
  | "featured"
  | "newArrivals"
  | "offers"
  | "brands"
  | "testimonials"
  | "newsletter"
  | "contact";

export interface AppSection {
  key: AppSectionKey;
  enabled: boolean;
}

export interface AppDesign {
  themeId: string;
  colors: StoreColors;
  sections: AppSection[];
  appName: string;
  iconUrl: string;
  splashText: string;
  bottomNav: string[];
}

const SECTION_KEYS: AppSectionKey[] = [
  "hero", "categories", "banners", "featured", "newArrivals",
  "offers", "brands", "testimonials", "newsletter", "contact",
];

export const DEFAULT_DESIGN: AppDesign = {
  themeId: "professional-blue",
  colors: getDefaultColors("professional-blue"),
  sections: SECTION_KEYS.map((k) => ({ key: k, enabled: ["hero", "categories", "featured", "newArrivals"].includes(k) })),
  appName: "",
  iconUrl: "",
  splashText: "",
  bottomNav: ["home", "categories", "cart", "account"],
};

export function parseDesign(json: string | null | undefined, appName?: string | null): AppDesign {
  const base: AppDesign = { ...DEFAULT_DESIGN, appName: appName || "" };
  if (!json) return base;
  try {
    const parsed = JSON.parse(json);
    return {
      themeId: typeof parsed.themeId === "string" ? parsed.themeId : base.themeId,
      colors: parsed.colors && typeof parsed.colors === "object"
        ? { ...base.colors, ...parsed.colors } : base.colors,
      sections: Array.isArray(parsed.sections) && parsed.sections.length
        ? normalizeSections(parsed.sections) : base.sections,
      appName: typeof parsed.appName === "string" && parsed.appName ? parsed.appName : base.appName,
      iconUrl: typeof parsed.iconUrl === "string" ? parsed.iconUrl : "",
      splashText: typeof parsed.splashText === "string" ? parsed.splashText : "",
      bottomNav: Array.isArray(parsed.bottomNav) && parsed.bottomNav.length ? parsed.bottomNav : base.bottomNav,
    };
  } catch {
    return base;
  }
}

function normalizeSections(arr: any[]): AppSection[] {
  const seen = new Set<string>();
  const out: AppSection[] = [];
  for (const item of arr) {
    const key = item?.key as AppSectionKey;
    if (SECTION_KEYS.includes(key) && !seen.has(key)) {
      seen.add(key);
      out.push({ key, enabled: !!item.enabled });
    }
  }
  // إضافة أي أقسام مفقودة في نهاية القائمة
  for (const k of SECTION_KEYS) if (!seen.has(k)) out.push({ key: k, enabled: false });
  return out;
}

export function serializeDesign(d: AppDesign): string {
  return JSON.stringify(d);
}

interface Props {
  design: AppDesign;
  onChange: (d: AppDesign) => void;
  products: { name: string; price: number; imageUrl?: string | null }[];
  storeName: string;
}

export default function AppDesigner({ design, onChange, products, storeName }: Props) {
  const { t } = useTranslation();
  const [dragKey, setDragKey] = useState<AppSectionKey | null>(null);
  const [overKey, setOverKey] = useState<AppSectionKey | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const theme = useMemo(
    () => STORE_THEMES.find((x) => x.id === design.themeId) || STORE_THEMES[0],
    [design.themeId]
  );

  const update = (patch: Partial<AppDesign>) => onChange({ ...design, ...patch });

  const setTheme = (id: string) => {
    update({ themeId: id, colors: getDefaultColors(id) });
  };

  const toggleSection = (key: AppSectionKey) => {
    update({
      sections: design.sections.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)),
    });
  };

  const onDragStart = (key: AppSectionKey, index: number) => {
    setDragKey(key);
    dragIndexRef.current = index;
  };

  const onDragOver = (e: React.DragEvent, key: AppSectionKey) => {
    e.preventDefault();
    setOverKey(key);
  };

  const onDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    setOverKey(null);
    setDragKey(null);
    if (from === null || from === targetIndex) return;
    const next = [...design.sections];
    const [moved] = next.splice(from, 1);
    next.splice(targetIndex, 0, moved);
    update({ sections: next });
    dragIndexRef.current = null;
  };

  const setColor = (key: keyof StoreColors, val: string) => {
    update({ colors: { ...design.colors, [key]: val } });
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= design.sections.length) return;
    const next = [...design.sections];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    update({ sections: next });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* ── لوحة الإعدادات ── */}
      <div className="lg:col-span-3 space-y-5">
        {/* الاسم والأيقونة */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
          <p className="text-[13px] font-extrabold text-[var(--ink)] mb-4">{t("appDesigner.identity")}</p>
          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.appName")}</label>
              <div className="field-shell">
                <input
                  type="text"
                  value={design.appName}
                  onChange={(e) => update({ appName: e.target.value })}
                  maxLength={200}
                  placeholder={storeName || t("mobileApp.appNamePlaceholder")}
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("appDesigner.iconUrl")}</label>
              <div className="field-shell">
                <input
                  type="text"
                  value={design.iconUrl}
                  onChange={(e) => update({ iconUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("appDesigner.splashText")}</label>
              <div className="field-shell">
                <input
                  type="text"
                  value={design.splashText}
                  onChange={(e) => update({ splashText: e.target.value })}
                  maxLength={80}
                  placeholder={t("appDesigner.splashPlaceholder")}
                />
              </div>
            </div>
          </div>
        </div>

        {/* القالب */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
          <p className="text-[13px] font-extrabold text-[var(--ink)] mb-4">{t("appDesigner.template")}</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {STORE_THEMES.map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => setTheme(th.id)}
                className="rounded-xl border-2 p-2 transition-all text-center"
                style={{ borderColor: design.themeId === th.id ? "var(--blue)" : "var(--border)" }}
                title={t(th.nameKey)}
              >
                <span className="flex items-center justify-center gap-1 mb-1.5">
                  <span className="w-4 h-4 rounded-full" style={{ background: th.previewPrimary }} />
                  <span className="w-4 h-4 rounded-full" style={{ background: th.previewSecondary }} />
                </span>
                <span className="block text-[10.5px] font-bold text-[var(--ink)] leading-tight truncate">{t(th.nameKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* الألوان */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
          <p className="text-[13px] font-extrabold text-[var(--ink)] mb-4">{t("appDesigner.colors")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              ["headerColor", "appDesigner.colorHeader"],
              ["buttonColor", "appDesigner.colorButton"],
              ["accentColor", "appDesigner.colorAccent"],
              ["heroFrom", "appDesigner.colorHeroFrom"],
              ["heroTo", "appDesigner.colorHeroTo"],
              ["footerColor", "appDesigner.colorFooter"],
            ] as [keyof StoreColors, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-xl border p-2 cursor-pointer" style={{ borderColor: "var(--border)" }}>
                <input
                  type="color"
                  value={design.colors[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="text-[11.5px] font-bold text-[var(--ink)]">{t(label)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* الأقسام بالسحب والإفلات */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
          <p className="text-[13px] font-extrabold text-[var(--ink)] mb-1">{t("appDesigner.sections")}</p>
          <p className="text-[11.5px] text-[var(--sub)] mb-4">{t("appDesigner.sectionsHint")}</p>
          <div className="space-y-2">
            {design.sections.map((s, i) => (
              <div
                key={s.key}
                draggable
                onDragStart={() => onDragStart(s.key, i)}
                onDragOver={(e) => onDragOver(e, s.key)}
                onDragLeave={() => setOverKey(null)}
                onDrop={(e) => onDrop(e, i)}
                className="flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors"
                style={{
                  borderColor: overKey === s.key ? "var(--blue)" : "var(--border)",
                  background: overKey === s.key ? "var(--blue-50, #f5f9ff)" : "transparent",
                  opacity: dragKey === s.key ? 0.5 : 1,
                }}
              >
                <span className="cursor-grab text-[var(--sub)]" title={t("appDesigner.dragHint")}>
                  <Icon name="sidebarToggle" size={14} />
                </span>
                <span className="flex-1 text-[12.5px] font-bold text-[var(--ink)]">{t(`appDesigner.section.${s.key}`)}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-[var(--sub)] disabled:opacity-30" title={t("appDesigner.moveUp")}>
                    <span className="block rotate-[-90deg]"><Icon name="arrowLeft" size={13} /></span>
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === design.sections.length - 1} className="p-1 text-[var(--sub)] disabled:opacity-30" title={t("appDesigner.moveDown")}>
                    <span className="block rotate-[90deg]"><Icon name="arrowLeft" size={13} /></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSection(s.key)}
                    className="ms-1 px-2 py-1 rounded-lg text-[10.5px] font-bold"
                    style={{
                      background: s.enabled ? "var(--green-soft, #e4f9f0)" : "var(--bg, #f3f4f6)",
                      color: s.enabled ? "var(--green)" : "var(--sub)",
                    }}
                  >
                    {s.enabled ? t("appDesigner.shown") : t("appDesigner.hidden")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── المعاينة المباشرة ── */}
      <div className="lg:col-span-2">
        <div className="lg:sticky lg:top-4">
          <p className="text-[13px] font-extrabold text-[var(--ink)] mb-3 text-center">{t("appDesigner.preview")}</p>
          <AppPreview design={design} products={products} storeName={storeName} theme={theme} />
        </div>
      </div>
    </div>
  );
}

// ── هاتف تجريبي يعرض المعاينة الحيّة ──
export function AppPreview({
  design,
  products,
  storeName,
  theme,
}: {
  design: AppDesign;
  products: { name: string; price: number; imageUrl?: string | null }[];
  storeName: string;
  theme: { previewPrimary: string; previewSecondary: string; previewAccent: string };
}) {
  const { t, i18n } = useTranslation();
  const c = design.colors;
  const appName = design.appName || storeName || t("mobileApp.title");
  const isRtl = (i18n.language || "ar").startsWith("ar");
  const enabled = design.sections.filter((s) => s.enabled);

  const navIcons: Record<string, "home" | "layers" | "cashier" | "user" | "star" | "search"> = { home: "home", categories: "layers", cart: "cashier", account: "user", wishlist: "star", search: "search" };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="mx-auto" style={{ width: 300 }}>
      <div
        className="rounded-[36px] border-[10px] shadow-xl overflow-hidden bg-white"
        style={{ borderColor: "#111827", height: 600 }}
      >
        {/* شريط الحالة + الهيدر */}
        <div className="px-4 pt-2 pb-3" style={{ background: c.headerColor }}>
          <div className="flex items-center justify-between text-white/90 text-[9px] mb-2">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span>▮▮▮</span><span>WiFi</span><span>🔋</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {design.iconUrl ? (
              <img src={design.iconUrl} alt="" className="w-7 h-7 rounded-lg object-cover bg-white/20" />
            ) : (
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold" style={{ background: c.buttonColor }}>
                {appName.slice(0, 1)}
              </span>
            )}
            <span className="text-white text-[12.5px] font-extrabold truncate">{appName}</span>
            <span className="ms-auto text-white/90"><Icon name="bell" size={14} /></span>
          </div>
        </div>

        {/* محتوى الشاشة */}
        <div className="overflow-y-auto" style={{ height: 600 - 96 - 52, background: "#fafafa" }}>
          {design.splashText && (
            <div className="px-3 py-2 text-center text-[11px] font-bold" style={{ background: c.accentColor, color: "#fff" }}>
              {design.splashText}
            </div>
          )}

          {enabled.length === 0 && (
            <div className="p-6 text-center text-[11.5px] text-gray-400">{t("appDesigner.noSections")}</div>
          )}

          {enabled.map((s) => (
            <PreviewSection key={s.key} sectionKey={s.key} colors={c} theme={theme} products={products} t={t} />
          ))}
        </div>

        {/* شريط التنقل السفلي */}
        <div className="flex items-center justify-around border-t bg-white" style={{ height: 52, borderColor: "#eee" }}>
          {design.bottomNav.map((n) => (
            <span key={n} className="flex flex-col items-center gap-0.5" style={{ color: c.buttonColor }}>
              <Icon name={navIcons[n] ?? "home"} size={16} />
              <span className="text-[8px] font-bold">{t(`appDesigner.nav.${n}`)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewSection({
  sectionKey,
  colors,
  theme,
  products,
  t,
}: {
  sectionKey: AppSectionKey;
  colors: StoreColors;
  theme: { previewPrimary: string; previewSecondary: string; previewAccent: string };
  products: { name: string; price: number; imageUrl?: string | null }[];
  t: (k: string) => string;
}) {
  const sample = products.length ? products : [
    { name: t("appDesigner.sampleProduct1"), price: 120, imageUrl: null },
    { name: t("appDesigner.sampleProduct2"), price: 89, imageUrl: null },
    { name: t("appDesigner.sampleProduct3"), price: 240, imageUrl: null },
    { name: t("appDesigner.sampleProduct4"), price: 75, imageUrl: null },
  ];

  const Card = ({ p }: { p: { name: string; price: number; imageUrl?: string | null } }) => (
    <div className="rounded-xl bg-white border overflow-hidden" style={{ borderColor: "#eee" }}>
      <div className="h-16 flex items-center justify-center" style={{ background: "#f3f4f6" }}>
        {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : <Icon name="box" size={18} className="text-gray-300" />}
      </div>
      <div className="p-1.5">
        <p className="text-[9px] font-bold text-gray-700 truncate">{p.name}</p>
        <p className="text-[9.5px] font-extrabold mt-0.5" style={{ color: colors.buttonColor }}>{p.price} ر.س</p>
      </div>
    </div>
  );

  switch (sectionKey) {
    case "hero":
      return (
        <div className="m-3 rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${colors.heroFrom}, ${colors.heroTo})` }}>
          <p className="text-[13px] font-extrabold mb-1">{t("appDesigner.heroTitle")}</p>
          <p className="text-[10px] opacity-90 mb-2">{t("appDesigner.heroSub")}</p>
          <span className="inline-block text-[10px] font-bold px-3 py-1 rounded-full" style={{ background: colors.buttonColor }}>
            {t("appDesigner.heroCta")}
          </span>
        </div>
      );
    case "categories":
      return (
        <div className="px-3 py-2">
          <p className="text-[11px] font-extrabold text-gray-800 mb-2">{t("appDesigner.section.categories")}</p>
          <div className="grid grid-cols-4 gap-2">
            {["electronics", "fashion", "home", "beauty"].map((k) => (
              <div key={k} className="flex flex-col items-center gap-1">
                <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${colors.accentColor}22` }}>
                  <Icon name="tag" size={16} className="text-gray-600" />
                </span>
                <span className="text-[8px] text-gray-600">{t(`appDesigner.cat.${k}`)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "banners":
      return (
        <div className="px-3 py-2">
          <div className="rounded-xl h-20 flex items-center justify-center text-white text-[11px] font-bold" style={{ background: theme.previewSecondary }}>
            {t("appDesigner.section.banners")}
          </div>
        </div>
      );
    case "featured":
      return (
        <div className="px-3 py-2">
          <p className="text-[11px] font-extrabold text-gray-800 mb-2">{t("appDesigner.section.featured")}</p>
          <div className="grid grid-cols-3 gap-2">{sample.slice(0, 3).map((p, i) => <Card key={i} p={p} />)}</div>
        </div>
      );
    case "newArrivals":
      return (
        <div className="px-3 py-2">
          <p className="text-[11px] font-extrabold text-gray-800 mb-2">{t("appDesigner.section.newArrivals")}</p>
          <div className="grid grid-cols-2 gap-2">{sample.slice(0, 4).map((p, i) => <Card key={i} p={p} />)}</div>
        </div>
      );
    case "offers":
      return (
        <div className="px-3 py-2">
          <p className="text-[11px] font-extrabold text-gray-800 mb-2">{t("appDesigner.section.offers")}</p>
          <div className="grid grid-cols-3 gap-2">{sample.slice(0, 3).map((p, i) => <Card key={i} p={p} />)}</div>
        </div>
      );
    case "brands":
      return (
        <div className="px-3 py-2">
          <p className="text-[11px] font-extrabold text-gray-800 mb-2">{t("appDesigner.section.brands")}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="flex-1 h-8 rounded-lg bg-gray-100" />)}
          </div>
        </div>
      );
    case "testimonials":
      return (
        <div className="px-3 py-2">
          <p className="text-[11px] font-extrabold text-gray-800 mb-2">{t("appDesigner.section.testimonials")}</p>
          <div className="rounded-xl bg-white border p-2.5" style={{ borderColor: "#eee" }}>
            <p className="text-[9.5px] text-gray-600 leading-relaxed">{t("appDesigner.sampleReview")}</p>
            <p className="text-[9px] font-bold mt-1" style={{ color: colors.buttonColor }}>— {t("appDesigner.sampleReviewer")}</p>
          </div>
        </div>
      );
    case "newsletter":
      return (
        <div className="m-3 rounded-xl p-3" style={{ background: colors.footerColor }}>
          <p className="text-[10.5px] font-extrabold text-white mb-2">{t("appDesigner.section.newsletter")}</p>
          <div className="flex gap-1.5">
            <span className="flex-1 bg-white/90 rounded-lg h-7" />
            <span className="text-[9px] font-bold px-3 rounded-lg flex items-center text-white" style={{ background: colors.buttonColor }}>
              {t("appDesigner.subscribeBtn")}
            </span>
          </div>
        </div>
      );
    case "contact":
      return (
        <div className="px-3 py-2 pb-4">
          <p className="text-[11px] font-extrabold text-gray-800 mb-2">{t("appDesigner.section.contact")}</p>
          <div className="flex gap-2 text-gray-500">
            <Icon name="phone" size={14} /><Icon name="mail" size={14} /><Icon name="whatsapp" size={14} /><Icon name="location" size={14} />
          </div>
        </div>
      );
    default:
      return null;
  }
}

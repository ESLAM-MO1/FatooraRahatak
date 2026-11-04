"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import { STORE_THEMES, getDefaultColors, type StoreColors } from "@/components/store-templates/configs";

// ── مصمّم التطبيق بالسحب والإفلات مع معاينة مباشرة ──
// يتيح للتاجر ترتيب أقسام الشاشة الرئيسية، وتخصيص الألوان والأيقونة برفع صورة،
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
  tagline: string;
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
  tagline: "",
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
      tagline: typeof parsed.tagline === "string" ? parsed.tagline : "",
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const theme = useMemo(
    () => STORE_THEMES.find((x) => x.id === design.themeId) || STORE_THEMES[0],
    [design.themeId]
  );

  const update = (patch: Partial<AppDesign>) => onChange({ ...design, ...patch });

  const setTheme = (id: string) => update({ themeId: id, colors: getDefaultColors(id) });

  const toggleSection = (key: AppSectionKey) => {
    update({ sections: design.sections.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)) });
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

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/products/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = res.data?.data?.url;
      if (url) update({ iconUrl: url });
    } catch (err: any) {
      setUploadError(err.response?.data?.message || t("appDesigner.uploadError"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* ── لوحة الإعدادات ── */}
      <div className="lg:col-span-3 space-y-5">
        {/* الهوية: الاسم + الشعار/الأيقونة + الشريط العلوي */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--blue-50)", color: "var(--blue)" }}>
              <Icon name="star" size={15} />
            </span>
            <p className="text-[13px] font-extrabold text-[var(--ink)]">{t("appDesigner.identity")}</p>
          </div>

          {/* اسم التطبيق */}
          <div className="mb-4">
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
            <p className="text-[10.5px] text-[var(--sub)] mt-1">{t("appDesigner.appNameHint")}</p>
          </div>

          {/* وصف قصير تحت الاسم */}
          <div className="mb-4">
            <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("appDesigner.tagline")}</label>
            <div className="field-shell">
              <input
                type="text"
                value={design.tagline}
                onChange={(e) => update({ tagline: e.target.value })}
                maxLength={60}
                placeholder={t("appDesigner.taglinePlaceholder")}
              />
            </div>
          </div>

          {/* الأيقونة: رفع صورة */}
          <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("appDesigner.iconLabel")}</label>
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0"
              style={{ borderColor: design.iconUrl ? "transparent" : "var(--border)", background: design.iconUrl ? "transparent" : "var(--bg)" }}
            >
              {design.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={design.iconUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <Icon name="package" size={26} className="text-[var(--sub-light)]" />
              )}
            </div>
            <div className="flex-1">
              <label className="btn btn-sm btn-outline inline-flex items-center gap-2 cursor-pointer">
                <Icon name="download" size={14} />
                {uploading ? t("appDesigner.uploading") : design.iconUrl ? t("appDesigner.changeIcon") : t("appDesigner.uploadIcon")}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleIconUpload} disabled={uploading} />
              </label>
              {design.iconUrl && (
                <button type="button" className="btn btn-sm btn-ghost ms-2" onClick={() => update({ iconUrl: "" })}>
                  {t("appDesigner.removeIcon")}
                </button>
              )}
              <p className="text-[10.5px] text-[var(--sub)] mt-1.5">{t("appDesigner.iconHint")}</p>
              {uploadError && <p className="text-[10.5px] text-[var(--red)] mt-1">{uploadError}</p>}
            </div>
          </div>

          {/* نص الشريط العلوي */}
          <div className="mt-4">
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
            {design.splashText.trim() && (
              <div className="mt-2 rounded-xl overflow-hidden flex items-center gap-2 px-3 py-2 text-white text-[11.5px] font-bold"
                style={{ background: `linear-gradient(90deg, ${design.colors.heroFrom}, ${design.colors.heroTo})` }}>
                <Icon name="tag" size={13} />
                <span className="truncate">{design.splashText}</span>
                <span className="ms-auto text-white/70"><Icon name="close" size={12} /></span>
              </div>
            )}
          </div>
        </div>

        {/* القالب */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--blue-50)", color: "var(--blue)" }}>
              <Icon name="layout" size={15} />
            </span>
            <p className="text-[13px] font-extrabold text-[var(--ink)]">{t("appDesigner.template")}</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {STORE_THEMES.map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => setTheme(th.id)}
                className="rounded-xl border-2 p-2 transition-all text-center relative"
                style={{ borderColor: design.themeId === th.id ? "var(--blue)" : "var(--border)" }}
                title={t(th.nameKey)}
              >
                {design.themeId === th.id && (
                  <span className="absolute -top-1.5 -end-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ background: "var(--blue)" }}>
                    <Icon name="check" size={10} />
                  </span>
                )}
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
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--blue-50)", color: "var(--blue)" }}>
              <Icon name="palette" size={15} />
            </span>
            <p className="text-[13px] font-extrabold text-[var(--ink)]">{t("appDesigner.colors")}</p>
          </div>
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
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--blue-50)", color: "var(--blue)" }}>
              <Icon name="layers" size={15} />
            </span>
            <p className="text-[13px] font-extrabold text-[var(--ink)]">{t("appDesigner.sections")}</p>
          </div>
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
                  background: overKey === s.key ? "var(--blue-50)" : "transparent",
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
                      background: s.enabled ? "var(--green-soft)" : "var(--bg)",
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
          <div className="flex items-center justify-center gap-2 mb-3">
            <Icon name="eye" size={15} className="text-[var(--blue)]" />
            <p className="text-[13px] font-extrabold text-[var(--ink)]">{t("appDesigner.preview")}</p>
          </div>
          <AppPreview design={design} products={products} storeName={storeName} theme={theme} />
        </div>
      </div>
    </div>
  );
}

// ── هاتف تجريبي فاخر يعرض المعاينة الحيّة ──
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

  const navIcons: Record<string, "home" | "layers" | "cashier" | "user" | "star" | "search"> = {
    home: "home", categories: "layers", cart: "cashier", account: "user", wishlist: "star", search: "search",
  };

  const sample = products.length ? products : [
    { name: t("appDesigner.sampleProduct1"), price: 120, imageUrl: null },
    { name: t("appDesigner.sampleProduct2"), price: 89, imageUrl: null },
    { name: t("appDesigner.sampleProduct3"), price: 240, imageUrl: null },
    { name: t("appDesigner.sampleProduct4"), price: 75, imageUrl: null },
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="mx-auto" style={{ width: 306 }}>
      <div className="rounded-[40px] shadow-2xl overflow-hidden bg-white relative" style={{ border: "11px solid #0f172a", height: 610 }}>
        {/* النوتش */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-2xl" style={{ width: 120, height: 22, background: "#0f172a", zIndex: 20 }} />

        {/* شريط الحالة */}
        <div className="flex items-center justify-between px-5 pt-2.5 pb-1.5" style={{ background: c.headerColor }}>
          <span className="text-white/90 text-[10px] font-bold">9:41</span>
          <span className="flex items-center gap-1 text-white/90 text-[9px]">
            <span>●●●</span><span>◗</span><span>▮</span>
          </span>
        </div>

        {/* شريط التطبيق */}
        <div className="px-4 pb-3.5" style={{ background: c.headerColor }}>
          <div className="flex items-center gap-2.5">
            {design.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={design.iconUrl} alt="" className="w-9 h-9 rounded-xl object-cover bg-white/20 ring-2 ring-white/30" />
            ) : (
              <span className="w-9 h-9 rounded-xl flex items-center justify-center text-[15px] font-extrabold text-white shadow-inner" style={{ background: c.buttonColor }}>
                {appName.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-white text-[12.5px] font-extrabold truncate leading-tight">{appName}</p>
              {design.tagline && <p className="text-white/70 text-[9px] truncate">{design.tagline}</p>}
            </div>
            <span className="relative text-white/95">
              <Icon name="bell" size={16} />
              <span className="absolute -top-1 -end-1 w-3 h-3 rounded-full text-[7px] flex items-center justify-center text-white font-bold" style={{ background: "#ef4444" }}>3</span>
            </span>
          </div>
          {/* شريط بحث */}
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-1.5">
            <Icon name="search" size={13} className="text-gray-400" />
            <span className="text-[9.5px] text-gray-400">{t("appDesigner.searchPlaceholder")}</span>
          </div>
        </div>

        {/* محتوى الشاشة */}
        <div className="overflow-y-auto" style={{ height: 610 - 30 - 96 - 54, background: "#f7f8fa" }}>
          {/* الشريط العلوي (الخبر/الإعلان) بتصميم أنيق */}
          {design.splashText.trim() && (
            <div className="mx-3 mt-3 rounded-xl flex items-center gap-2 px-3 py-2 shadow-sm"
              style={{ background: `linear-gradient(90deg, ${c.heroFrom}, ${c.heroTo})` }}>
              <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-white shrink-0">
                <Icon name="tag" size={11} />
              </span>
              <span className="text-[10.5px] text-white font-bold truncate flex-1">{design.splashText}</span>
              <span className="text-white/70 shrink-0"><Icon name="close" size={11} /></span>
            </div>
          )}

          {enabled.length === 0 && (
            <div className="p-6 text-center text-[11.5px] text-gray-400">{t("appDesigner.noSections")}</div>
          )}

          {enabled.map((s) => (
            <PreviewSection key={s.key} sectionKey={s.key} colors={c} theme={theme} products={sample} t={t} />
          ))}

          {/* حقوق */}
          <div className="text-center text-[8px] text-gray-300 py-3">{t("appDesigner.poweredBy")}</div>
        </div>

        {/* شريط التنقل السفلي */}
        <div className="flex items-center justify-around bg-white border-t relative" style={{ height: 54, borderColor: "#eef0f3" }}>
          {design.bottomNav.map((n, idx) => (
            <span key={n} className="flex flex-col items-center gap-0.5" style={{ color: idx === 0 ? c.buttonColor : "#9ca3af" }}>
              <Icon name={navIcons[n] ?? "home"} size={17} />
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
  const Card = ({ p, badge }: { p: { name: string; price: number; imageUrl?: string | null }; badge?: string }) => (
    <div className="rounded-xl bg-white border overflow-hidden relative" style={{ borderColor: "#eef0f3" }}>
      {badge && (
        <span className="absolute top-1 start-1 z-10 text-[7px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: colors.buttonColor }}>
          {badge}
        </span>
      )}
      <div className="h-16 flex items-center justify-center relative" style={{ background: "#f3f4f6" }}>
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Icon name="box" size={18} className="text-gray-300" />
        )}
      </div>
      <div className="p-1.5">
        <p className="text-[9px] font-bold text-gray-700 truncate">{p.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[9.5px] font-extrabold" style={{ color: colors.buttonColor }}>{p.price} ر.س</span>
          <span className="text-[7.5px] text-amber-500 flex items-center ms-auto">
            ★ <span className="text-gray-400 ms-0.5">4.8</span>
          </span>
        </div>
      </div>
    </div>
  );

  switch (sectionKey) {
    case "hero":
      return (
        <div className="mx-3 mt-3 rounded-2xl p-4 text-white relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${colors.heroFrom}, ${colors.heroTo})` }}>
          <div className="absolute -end-6 -bottom-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -end-2 top-2 w-12 h-12 rounded-full bg-white/10" />
          <p className="text-[13.5px] font-extrabold mb-1 relative">{t("appDesigner.heroTitle")}</p>
          <p className="text-[10px] opacity-90 mb-2.5 relative">{t("appDesigner.heroSub")}</p>
          <span className="inline-block text-[10px] font-bold px-3.5 py-1.5 rounded-full shadow relative" style={{ background: "#fff", color: colors.buttonColor }}>
            {t("appDesigner.heroCta")}
          </span>
        </div>
      );
    case "categories":
      return (
        <div className="px-3 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-extrabold text-gray-800">{t("appDesigner.section.categories")}</p>
            <span className="text-[8.5px] font-bold" style={{ color: colors.buttonColor }}>{t("appDesigner.viewAll")}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {["electronics", "fashion", "home", "beauty"].map((k) => (
              <div key={k} className="flex flex-col items-center gap-1">
                <span className="w-11 h-11 rounded-full flex items-center justify-center ring-1 ring-black/5" style={{ background: `${colors.accentColor}1a`, color: colors.accentColor }}>
                  <Icon name="tag" size={16} />
                </span>
                <span className="text-[8px] text-gray-600 font-bold">{t(`appDesigner.cat.${k}`)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "banners":
      return (
        <div className="px-3 pt-3">
          <div className="rounded-xl h-20 flex flex-col items-center justify-center text-white relative overflow-hidden"
            style={{ background: `linear-gradient(120deg, ${theme.previewSecondary}, ${colors.accentColor})` }}>
            <span className="text-[11.5px] font-extrabold">{t("appDesigner.bannerTitle")}</span>
            <span className="text-[8.5px] opacity-90 mt-0.5">{t("appDesigner.bannerSub")}</span>
            <span className="flex gap-1 mt-2">
              <span className="w-4 h-1 rounded-full bg-white" />
              <span className="w-1.5 h-1 rounded-full bg-white/50" />
              <span className="w-1.5 h-1 rounded-full bg-white/50" />
            </span>
          </div>
        </div>
      );
    case "featured":
      return (
        <div className="px-3 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-extrabold text-gray-800">{t("appDesigner.section.featured")}</p>
            <span className="text-[8.5px] font-bold" style={{ color: colors.buttonColor }}>{t("appDesigner.viewAll")}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">{products.slice(0, 3).map((p, i) => <Card key={i} p={p} badge={i === 0 ? t("appDesigner.badgeNew") : undefined} />)}</div>
        </div>
      );
    case "newArrivals":
      return (
        <div className="px-3 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-extrabold text-gray-800">{t("appDesigner.section.newArrivals")}</p>
            <span className="text-[8.5px] font-bold" style={{ color: colors.buttonColor }}>{t("appDesigner.viewAll")}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">{products.slice(0, 4).map((p, i) => <Card key={i} p={p} />)}</div>
        </div>
      );
    case "offers":
      return (
        <div className="px-3 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-extrabold text-gray-800">{t("appDesigner.section.offers")}</p>
            <span className="text-[8.5px] font-bold text-red-500">{t("appDesigner.endsSoon")}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">{products.slice(0, 3).map((p, i) => <Card key={i} p={p} badge={`-${20 + i * 5}%`} />)}</div>
        </div>
      );
    case "brands":
      return (
        <div className="px-3 pt-3">
          <p className="text-[11px] font-extrabold text-gray-800 mb-2">{t("appDesigner.section.brands")}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-9 rounded-lg bg-white border flex items-center justify-center" style={{ borderColor: "#eef0f3" }}>
                <Icon name="store" size={13} className="text-gray-300" />
              </div>
            ))}
          </div>
        </div>
      );
    case "testimonials":
      return (
        <div className="px-3 pt-3">
          <p className="text-[11px] font-extrabold text-gray-800 mb-2">{t("appDesigner.section.testimonials")}</p>
          <div className="rounded-xl bg-white border p-2.5" style={{ borderColor: "#eef0f3" }}>
            <div className="flex gap-0.5 text-amber-400 mb-1">{"★★★★★".split("").map((s, i) => <span key={i} className="text-[8px]">{s}</span>)}</div>
            <p className="text-[9.5px] text-gray-600 leading-relaxed">{t("appDesigner.sampleReview")}</p>
            <p className="text-[9px] font-bold mt-1" style={{ color: colors.buttonColor }}>— {t("appDesigner.sampleReviewer")}</p>
          </div>
        </div>
      );
    case "newsletter":
      return (
        <div className="mx-3 mt-3 rounded-xl p-3" style={{ background: colors.footerColor }}>
          <p className="text-[10.5px] font-extrabold text-white mb-0.5">{t("appDesigner.section.newsletter")}</p>
          <p className="text-[8px] text-white/60 mb-2">{t("appDesigner.newsletterSub")}</p>
          <div className="flex gap-1.5">
            <span className="flex-1 bg-white/90 rounded-lg h-7 flex items-center px-2 text-[8px] text-gray-400">{t("appDesigner.emailPlaceholder")}</span>
            <span className="text-[9px] font-bold px-3 rounded-lg flex items-center text-white" style={{ background: colors.buttonColor }}>
              {t("appDesigner.subscribeBtn")}
            </span>
          </div>
        </div>
      );
    case "contact":
      return (
        <div className="px-3 pt-3 pb-4">
          <p className="text-[11px] font-extrabold text-gray-800 mb-2">{t("appDesigner.section.contact")}</p>
          <div className="flex gap-2">
            {["phone", "mail", "whatsapp", "location"].map((ic) => (
              <span key={ic} className="w-8 h-8 rounded-full flex items-center justify-center bg-white border" style={{ borderColor: "#eef0f3" }}>
                <Icon name={ic as any} size={13} className="text-gray-500" />
              </span>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}

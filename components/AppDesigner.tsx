"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import { STORE_THEMES, getDefaultColors, type StoreColors } from "@/components/store-templates/configs";

// ── مصمّم التطبيق بمحرّك شاشات ومعاينة حيّة ──
// يتيح للتاجر تصميم شاشات التطبيق الخمس (الرئيسية، المنتج، السلة، الحساب، تتبّع الطلب)،
// واختيار الأقسام داخل كل شاشة، ومعاينة النتيجة فورًا ببيانات متجره الحقيقية،
// مطابقةً لصانع تطبيقات سلة.

// ── أنواع البيانات الحقيقية القادمة من /mobile-app/bundle ──
export interface BundleBranding {
  storeId: number;
  storeName: string;
  storeSlug: string;
  logo?: string | null;
  coverImage?: string | null;
  currency: string;
  themeName: string;
  colorsJson?: string | null;
  bio?: string | null;
}
export interface BundleCategory {
  id: number;
  name: string;
  image?: string | null;
  productCount: number;
}
export interface BundleProduct {
  id: number;
  name: string;
  price: number;
  discountPrice?: number | null;
  discountPercent?: number | null;
  imageUrl?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  inStock: boolean;
  shortDescription?: string | null;
  createdAt: string;
}
export interface BundleBanner {
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
}
export interface BundleContact {
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  facebook?: string | null;
}
export interface MobileAppBundle {
  store: BundleBranding;
  categories: BundleCategory[];
  products: BundleProduct[];
  featuredProducts: BundleProduct[];
  newArrivals: BundleProduct[];
  offers: BundleProduct[];
  banners: BundleBanner[];
  contact: BundleContact;
}

// ── محرّك الشاشات ──
export type AppScreenKey = "home" | "product" | "cart" | "account" | "tracking" | "catalog";

export type HomeSectionKey =
  | "hero"
  | "categories"
  | "banners"
  | "featured"
  | "newArrivals"
  | "offers"
  | "testimonials"
  | "newsletter"
  | "contact"
  | "brands";

export interface AppSection {
  key: HomeSectionKey;
  enabled: boolean;
}

export interface ScreenConfig {
  enabled: boolean;
  sections: AppSection[];
  // عناصر قابلة للإظهار/الإخفاء داخل الشاشات الداخلية (المنتج، السلة، الحساب، التتبّع).
  items?: Record<string, boolean>;
}

export interface AppDesign {
  version: number;
  themeId: string;
  colors: StoreColors;
  appName: string;
  tagline: string;
  iconUrl: string;
  splashText: string;
  bottomNav: string[];
  screens: Record<AppScreenKey, ScreenConfig>;
}

const HOME_SECTION_KEYS: HomeSectionKey[] = [
  "hero", "categories", "banners", "featured", "newArrivals",
  "offers", "brands", "testimonials", "newsletter", "contact",
];

const DEFAULT_HOME_ENABLED = ["hero", "categories", "featured", "newArrivals", "offers"];

// عناصر الشاشات الداخلية القابلة للتحكم (مفتاح العنصر).
export const SCREEN_ITEMS: Record<Exclude<AppScreenKey, "home">, string[]> = {
  product: ["photos", "price", "discount", "rating", "description", "addToCart", "related"],
  cart: ["items", "coupon", "shipping", "total", "checkout"],
  account: ["profile", "orders", "wishlist", "addresses", "support", "settings", "trackOrder"],
  tracking: ["timeline", "courier"],
  catalog: ["search", "categories", "grid"],
};

function defaultItems(screen: Exclude<AppScreenKey, "home">): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of SCREEN_ITEMS[screen]) out[k] = true;
  return out;
}

export const DEFAULT_DESIGN: AppDesign = {
  version: 2,
  themeId: "professional-blue",
  colors: getDefaultColors("professional-blue"),
  appName: "",
  tagline: "",
  iconUrl: "",
  splashText: "",
  bottomNav: ["home", "categories", "cart", "account"],
  screens: {
    home: {
      enabled: true,
      sections: HOME_SECTION_KEYS.map((k) => ({ key: k, enabled: DEFAULT_HOME_ENABLED.includes(k) })),
    },
    product: { enabled: true, sections: [], items: defaultItems("product") },
    cart: { enabled: true, sections: [], items: defaultItems("cart") },
    account: { enabled: true, sections: [], items: defaultItems("account") },
    tracking: { enabled: true, sections: [], items: defaultItems("tracking") },
    catalog: { enabled: true, sections: [], items: defaultItems("catalog") },
  },
};

export function parseDesign(json: string | null | undefined, appName?: string | null): AppDesign {
  const base: AppDesign = {
    ...DEFAULT_DESIGN,
    appName: appName || "",
    screens: { ...DEFAULT_DESIGN.screens },
  };
  if (!json) return base;
  try {
    const parsed = JSON.parse(json);

    // تصميم الإصدار الأول (شاشة واحدة) — نُرحّل أقسامه إلى شاشة الرئيسية.
    const isV1 = !parsed.screens && Array.isArray(parsed.sections);

    const themeId = typeof parsed.themeId === "string" ? parsed.themeId : base.themeId;
    const colors = parsed.colors && typeof parsed.colors === "object"
      ? { ...getDefaultColors(themeId), ...parsed.colors } : getDefaultColors(themeId);

    const homeSections = isV1 && Array.isArray(parsed.sections)
      ? normalizeSections(parsed.sections)
      : (parsed.screens?.home?.sections ? normalizeSections(parsed.screens.home.sections) : base.screens.home.sections);

    return {
      version: 2,
      themeId,
      colors,
      appName: typeof parsed.appName === "string" && parsed.appName ? parsed.appName : base.appName,
      tagline: typeof parsed.tagline === "string" ? parsed.tagline : "",
      iconUrl: typeof parsed.iconUrl === "string" ? parsed.iconUrl : "",
      splashText: typeof parsed.splashText === "string" ? parsed.splashText : "",
      bottomNav: Array.isArray(parsed.bottomNav) && parsed.bottomNav.length ? parsed.bottomNav : base.bottomNav,
      screens: {
        home: { enabled: true, sections: homeSections },
        product: { enabled: parsed.screens?.product?.enabled !== false, sections: [], items: mergeItems("product", parsed.screens?.product?.items) },
        cart: { enabled: parsed.screens?.cart?.enabled !== false, sections: [], items: mergeItems("cart", parsed.screens?.cart?.items) },
        account: { enabled: parsed.screens?.account?.enabled !== false, sections: [], items: mergeItems("account", parsed.screens?.account?.items) },
        tracking: { enabled: parsed.screens?.tracking?.enabled !== false, sections: [], items: mergeItems("tracking", parsed.screens?.tracking?.items) },
        catalog: { enabled: parsed.screens?.catalog?.enabled !== false, sections: [], items: mergeItems("catalog", parsed.screens?.catalog?.items) },
      },
    };
  } catch {
    return base;
  }
}

function mergeItems(screen: Exclude<AppScreenKey, "home">, incoming: any): Record<string, boolean> {
  const out = defaultItems(screen);
  if (incoming && typeof incoming === "object") {
    for (const k of SCREEN_ITEMS[screen]) {
      if (typeof incoming[k] === "boolean") out[k] = incoming[k];
    }
  }
  return out;
}

function normalizeSections(arr: any[]): AppSection[] {
  const seen = new Set<string>();
  const out: AppSection[] = [];
  for (const item of arr) {
    const key = item?.key as HomeSectionKey;
    if (HOME_SECTION_KEYS.includes(key) && !seen.has(key)) {
      seen.add(key);
      out.push({ key, enabled: !!item.enabled });
    }
  }
  for (const k of HOME_SECTION_KEYS) if (!seen.has(k)) out.push({ key: k, enabled: false });
  return out;
}

export function serializeDesign(d: AppDesign): string {
  return JSON.stringify(d);
}

interface Props {
  design: AppDesign;
  onChange: (d: AppDesign) => void;
  bundle: MobileAppBundle | null;
  storeName: string;
}

export default function AppDesigner({ design, onChange, bundle, storeName }: Props) {
  const { t } = useTranslation();
  const [activeScreen, setActiveScreen] = useState<AppScreenKey>("home");
  const [previewScreen, setPreviewScreen] = useState<AppScreenKey>("home");
  const [previewProduct, setPreviewProduct] = useState<BundleProduct | null>(null);
  const [dragKey, setDragKey] = useState<HomeSectionKey | null>(null);
  const [overKey, setOverKey] = useState<HomeSectionKey | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const theme = useMemo(
    () => STORE_THEMES.find((x) => x.id === design.themeId) || STORE_THEMES[0],
    [design.themeId]
  );

  const update = (patch: Partial<AppDesign>) => onChange({ ...design, ...patch });

  const setTheme = (id: string) => update({ themeId: id, colors: getDefaultColors(id) });

  const toggleSection = (key: HomeSectionKey) => {
    const home = design.screens.home;
    update({
      screens: {
        ...design.screens,
        home: { ...home, sections: home.sections.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)) },
      },
    });
  };

  const toggleScreenItem = (screen: Exclude<AppScreenKey, "home">, item: string) => {
    const cfg = design.screens[screen];
    const items = { ...(cfg.items ?? {}) };
    items[item] = !items[item];
    update({ screens: { ...design.screens, [screen]: { ...cfg, items } } });
  };

  const onDragStart = (key: HomeSectionKey, index: number) => {
    setDragKey(key);
    dragIndexRef.current = index;
  };
  const onDragOver = (e: React.DragEvent, key: HomeSectionKey) => {
    e.preventDefault();
    setOverKey(key);
  };
  const onDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    setOverKey(null);
    setDragKey(null);
    if (from === null || from === targetIndex) return;
    const home = design.screens.home;
    const next = [...home.sections];
    const [moved] = next.splice(from, 1);
    next.splice(targetIndex, 0, moved);
    update({ screens: { ...design.screens, home: { ...home, sections: next } } });
    dragIndexRef.current = null;
  };

  const move = (index: number, dir: -1 | 1) => {
    const home = design.screens.home;
    const target = index + dir;
    if (target < 0 || target >= home.sections.length) return;
    const next = [...home.sections];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    update({ screens: { ...design.screens, home: { ...home, sections: next } } });
  };

  const setColor = (key: keyof StoreColors, val: string) => {
    update({ colors: { ...design.colors, [key]: val } });
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

  const screens: { key: AppScreenKey; icon: any }[] = [
    { key: "home", icon: "home" },
    { key: "catalog", icon: "search" },
    { key: "product", icon: "package" },
    { key: "cart", icon: "cashier" },
    { key: "account", icon: "user" },
    { key: "tracking", icon: "truck" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* ── لوحة الإعدادات ── */}
      <div className="lg:col-span-3 space-y-5">
        {/* الهوية */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
          <PanelHeader icon="star" title={t("appDesigner.identity")} />
          <div className="mb-4">
            <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("mobileApp.appName")}</label>
            <div className="field-shell">
              <input type="text" value={design.appName} onChange={(e) => update({ appName: e.target.value })} maxLength={200} placeholder={storeName || t("mobileApp.appNamePlaceholder")} />
            </div>
            <p className="text-[10.5px] text-[var(--sub)] mt-1">{t("appDesigner.appNameHint")}</p>
          </div>

          <div className="mb-4">
            <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("appDesigner.tagline")}</label>
            <div className="field-shell">
              <input type="text" value={design.tagline} onChange={(e) => update({ tagline: e.target.value })} maxLength={60} placeholder={t("appDesigner.taglinePlaceholder")} />
            </div>
          </div>

          <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("appDesigner.iconLabel")}</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0"
              style={{ borderColor: design.iconUrl ? "transparent" : "var(--border)", background: design.iconUrl ? "transparent" : "var(--bg)" }}>
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
                <button type="button" className="btn btn-sm btn-ghost ms-2" onClick={() => update({ iconUrl: "" })}>{t("appDesigner.removeIcon")}</button>
              )}
              <p className="text-[10.5px] text-[var(--sub)] mt-1.5">{t("appDesigner.iconHint")}</p>
              {uploadError && <p className="text-[10.5px] text-[var(--red)] mt-1">{uploadError}</p>}
            </div>
          </div>

          <div className="mt-4">
            <label className="text-[12px] font-bold text-[var(--ink)] mb-1.5 block">{t("appDesigner.splashText")}</label>
            <div className="field-shell">
              <input type="text" value={design.splashText} onChange={(e) => update({ splashText: e.target.value })} maxLength={80} placeholder={t("appDesigner.splashPlaceholder")} />
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

        {/* القالب والألوان */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
          <PanelHeader icon="layout" title={t("appDesigner.template")} />
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mb-4">
            {STORE_THEMES.map((th) => (
              <button key={th.id} type="button" onClick={() => setTheme(th.id)}
                className="rounded-xl border-2 p-2 transition-all text-center relative"
                style={{ borderColor: design.themeId === th.id ? "var(--blue)" : "var(--border)" }} title={t(th.nameKey)}>
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
                <input type="color" value={design.colors[key]} onChange={(e) => setColor(key, e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                <span className="text-[11.5px] font-bold text-[var(--ink)]">{t(label)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* الشاشات */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
          <PanelHeader icon="layers" title={t("appDesigner.screensTitle")} />
          <p className="text-[11.5px] text-[var(--sub)] mb-4">{t("appDesigner.screensHint")}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {screens.map((s) => (
              <button key={s.key} type="button"
                onClick={() => { setActiveScreen(s.key); setPreviewScreen(s.key); setPreviewProduct(null); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11.5px] font-bold transition-all"
                style={{
                  borderColor: activeScreen === s.key ? "var(--blue)" : "var(--border)",
                  background: activeScreen === s.key ? "var(--blue-50)" : "transparent",
                  color: activeScreen === s.key ? "var(--blue)" : "var(--ink)",
                }}>
                <Icon name={s.icon} size={14} />
                {t(`appDesigner.screen.${s.key}`)}
              </button>
            ))}
          </div>

          {activeScreen === "home" ? (
            <div className="space-y-2">
              {design.screens.home.sections.map((s, i) => (
                <div key={s.key} draggable
                  onDragStart={() => onDragStart(s.key, i)}
                  onDragOver={(e) => onDragOver(e, s.key)}
                  onDragLeave={() => setOverKey(null)}
                  onDrop={(e) => onDrop(e, i)}
                  className="flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors"
                  style={{
                    borderColor: overKey === s.key ? "var(--blue)" : "var(--border)",
                    background: overKey === s.key ? "var(--blue-50)" : "transparent",
                    opacity: dragKey === s.key ? 0.5 : 1,
                  }}>
                  <span className="cursor-grab text-[var(--sub)]"><Icon name="sidebarToggle" size={14} /></span>
                  <span className="flex-1 text-[12.5px] font-bold text-[var(--ink)]">{t(`appDesigner.section.${s.key}`)}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-[var(--sub)] disabled:opacity-30">
                      <span className="block rotate-[-90deg]"><Icon name="arrowLeft" size={13} /></span>
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === design.screens.home.sections.length - 1} className="p-1 text-[var(--sub)] disabled:opacity-30">
                      <span className="block rotate-[90deg]"><Icon name="arrowLeft" size={13} /></span>
                    </button>
                    <button type="button" onClick={() => toggleSection(s.key)}
                      className="ms-1 px-2 py-1 rounded-lg text-[10.5px] font-bold"
                      style={{ background: s.enabled ? "var(--green-soft)" : "var(--bg)", color: s.enabled ? "var(--green)" : "var(--sub)" }}>
                      {s.enabled ? t("appDesigner.shown") : t("appDesigner.hidden")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ScreenInspector screen={activeScreen} bundle={bundle} t={t} design={design} onToggleItem={toggleScreenItem} dict={t} />
          )}
        </div>

        {/* بيانات المتجر الحقيقية */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
          <PanelHeader icon="store" title={t("appDesigner.storeData")} />
          {bundle ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat value={bundle.products.length} label={t("appDesigner.dataProducts")} />
              <Stat value={bundle.categories.length} label={t("appDesigner.dataCategories")} />
              <Stat value={bundle.offers.length} label={t("appDesigner.dataOffers")} />
            </div>
          ) : (
            <p className="text-[11.5px] text-[var(--sub)]">{t("appDesigner.loadingStoreData")}</p>
          )}
        </div>
      </div>

      {/* ── المعاينة المباشرة ── */}
      <div className="lg:col-span-2">
        <div className="lg:sticky lg:top-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Icon name="eye" size={15} className="text-[var(--blue)]" />
            <p className="text-[13px] font-extrabold text-[var(--ink)]">{t("appDesigner.preview")}</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "var(--green-soft)", color: "var(--green)" }}>
              {t("appDesigner.liveData")}
            </span>
          </div>
          <AppPreview
            design={design} bundle={bundle} storeName={storeName} theme={theme}
            screen={previewScreen} product={previewProduct}
            onNavigate={(s, p) => { setPreviewScreen(s); if (p !== undefined) setPreviewProduct(p); }}
          />
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--blue-50)", color: "var(--blue)" }}>
        <Icon name={icon} size={15} />
      </span>
      <p className="text-[13px] font-extrabold text-[var(--ink)]">{title}</p>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border py-3" style={{ borderColor: "var(--border)" }}>
      <p className="text-[19px] font-extrabold" style={{ color: "var(--blue)" }}>{value}</p>
      <p className="text-[10.5px] text-[var(--sub)] mt-0.5">{label}</p>
    </div>
  );
}

// لوحة معلومات الشاشة الداخلية (المنتج/السلة/الحساب/التتبّع)
function ScreenInspector({
  screen, bundle, t, design, onToggleItem,
}: {
  screen: AppScreenKey;
  bundle: MobileAppBundle | null;
  t: (k: string) => string;
  design: AppDesign;
  onToggleItem: (screen: Exclude<AppScreenKey, "home">, item: string) => void;
  dict?: unknown;
}) {
  if (screen === "home") return null;
  const list = SCREEN_ITEMS[screen];
  const items = design.screens[screen].items ?? {};
  return (
    <div>
      <p className="text-[11.5px] text-[var(--sub)] mb-3">{t(`appDesigner.screenDesc.${screen}`)}</p>
      <div className="space-y-2">
        {list.map((k) => {
          const on = items[k] !== false;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onToggleItem(screen, k)}
              className="w-full flex items-center gap-2.5 rounded-xl border p-2.5 text-start transition-colors"
              style={{
                borderColor: on ? "var(--border)" : "var(--border-light, #f3f4f6)",
                background: on ? "transparent" : "var(--bg)",
              }}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ background: on ? "var(--green)" : "#cbd5e1" }}>
                <Icon name={on ? "check" : "close"} size={11} />
              </span>
              <span className="flex-1 text-[12px] font-bold" style={{ color: on ? "var(--ink)" : "var(--sub)" }}>
                {t(`appDesigner.screenItem.${screen}.${k}`)}
              </span>
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-lg"
                style={{ background: on ? "var(--green-soft)" : "var(--bg)", color: on ? "var(--green)" : "var(--sub)" }}>
                {on ? t("appDesigner.shown") : t("appDesigner.hidden")}
              </span>
            </button>
          );
        })}
      </div>
      {bundle && screen === "product" && bundle.products.length > 0 && (
        <p className="text-[10.5px] text-[var(--sub)] mt-3">
          {t("appDesigner.dataNoteProducts")} {bundle.products.length}
        </p>
      )}
    </div>
  );
}

// ── هاتف تجريبي بمحرّك تنقّل يعرض بيانات المتجر الحقيقية ──
export function AppPreview({
  design, bundle, storeName, theme, screen, product, onNavigate,
}: {
  design: AppDesign;
  bundle: MobileAppBundle | null;
  storeName: string;
  theme: { previewPrimary: string; previewSecondary: string; previewAccent: string };
  screen: AppScreenKey;
  product: BundleProduct | null;
  onNavigate: (s: AppScreenKey, p?: BundleProduct | null) => void;
}) {
  const { t, i18n } = useTranslation();
  const c = design.colors;
  const appName = design.appName || bundle?.store.storeName || storeName || t("mobileApp.title");
  const isRtl = (i18n.language || "ar").startsWith("ar");
  const currency = bundle?.store.currency === "SAR" ? "ر.س" : (bundle?.store.currency || "ر.س");
  const logo = design.iconUrl || bundle?.store.logo || "";

  const navIcons: Record<string, any> = {
    home: "home", categories: "layers", catalog: "search", cart: "cashier", account: "user", wishlist: "star", tracking: "truck",
  };

  // شاشة فرعية تُفتح داخل الإطار عند الضغط على عنصر (بدل أن يبقى الضغط بلا أثر)
  const [detail, setDetail] = useState<string | null>(null);

  // حالة تسجيل الدخول لحساب العميل داخل المعاينة (تطابق متجرك الحقيقي)
  const [loggedIn, setLoggedIn] = useState(false);

  const openDetail = (key: string) => setDetail(key);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="mx-auto" style={{ width: 306 }}>
      <div className="rounded-[36px] shadow-2xl overflow-hidden bg-white relative flex flex-col" style={{ border: "10px solid #0f172a", height: 620 }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-2xl" style={{ width: 110, height: 20, background: "#0f172a", zIndex: 30 }} />

        {/* شريط الحالة */}
        <div className="flex items-center justify-between px-5 pt-2 pb-1 shrink-0" style={{ background: c.headerColor }}>
          <span className="text-white/90 text-[10px] font-bold">9:41</span>
          <span className="flex items-center gap-1 text-white/90 text-[9px]"><span>●●●</span><span>◗</span><span>▮</span></span>
        </div>

        {/* شريط التطبيق + بحث */}
        <div className="px-4 pb-3 shrink-0" style={{ background: c.headerColor }}>
          <div className="flex items-center gap-2.5">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="w-9 h-9 rounded-xl object-cover bg-white/20 ring-2 ring-white/30" />
            ) : (
              <span className="w-9 h-9 rounded-xl flex items-center justify-center text-[15px] font-extrabold text-white" style={{ background: c.buttonColor }}>{appName.slice(0, 1)}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-white text-[12.5px] font-extrabold truncate leading-tight">{appName}</p>
              {design.tagline && <p className="text-white/70 text-[9px] truncate">{design.tagline}</p>}
            </div>
            <button type="button" onClick={() => openDetail("notifications")} className="relative text-white/95 cursor-pointer active:scale-90 transition-transform">
              <Icon name="bell" size={16} />
              <span className="absolute -top-1 -end-1 w-3 h-3 rounded-full text-[7px] flex items-center justify-center text-white font-bold" style={{ background: "#ef4444" }}>3</span>
            </button>
          </div>
          {screen !== "product" && (
            <button type="button" onClick={() => openDetail("search")} className="mt-3 w-full flex items-center gap-2 rounded-xl bg-white/95 px-3 py-1.5 cursor-pointer active:scale-[0.99] transition-transform">
              <Icon name="search" size={13} className="text-gray-400" />
              <span className="text-[9.5px] text-gray-400">{t("appDesigner.searchPlaceholder")}</span>
            </button>
          )}
        </div>

        {/* محتوى الشاشة — يملأ المساحة المتبقية تلقائيًا */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ background: "#f7f8fa" }}>
          {design.splashText.trim() && screen === "home" && (
            <div className="mx-3 mt-3 rounded-xl flex items-center gap-2 px-3 py-2 shadow-sm" style={{ background: `linear-gradient(90deg, ${c.heroFrom}, ${c.heroTo})` }}>
              <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-white shrink-0"><Icon name="tag" size={11} /></span>
              <span className="text-[10.5px] text-white font-bold truncate flex-1">{design.splashText}</span>
              <button type="button" onClick={() => onNavigate("catalog")} className="text-white/70 shrink-0"><Icon name="close" size={11} /></button>
            </div>
          )}

          {screen === "home" && <HomeScreen design={design} bundle={bundle} appName={appName} currency={currency} theme={theme} onNavigate={onNavigate} c={c} t={t} />}
          {screen === "product" && <ProductScreen product={product || bundle?.products?.[0] || null} bundle={bundle} c={c} currency={currency} onNavigate={onNavigate} t={t} items={design.screens.product.items ?? {}} />}
          {screen === "cart" && <CartScreen bundle={bundle} c={c} currency={currency} onNavigate={onNavigate} onDetail={openDetail} t={t} items={design.screens.cart.items ?? {}} />}
          {screen === "account" && <AccountScreen c={c} appName={appName} onNavigate={onNavigate} onDetail={openDetail} t={t} items={design.screens.account.items ?? {}} loggedIn={loggedIn} onLogin={() => setLoggedIn(true)} onLogout={() => setLoggedIn(false)} />}
          {screen === "tracking" && <TrackingScreen c={c} onNavigate={onNavigate} t={t} items={design.screens.tracking.items ?? {}} />}
          {screen === "catalog" && <CatalogScreen bundle={bundle} c={c} currency={currency} onNavigate={onNavigate} onDetail={openDetail} t={t} items={design.screens.catalog.items ?? {}} />}

          <div className="flex items-center justify-center gap-1.5 py-4 mt-2 border-t" style={{ borderColor: "#eef0f3" }}>
            <span className="w-4 h-4 rounded-md flex items-center justify-center text-[8px] font-extrabold text-white" style={{ background: c.buttonColor }}>
              {appName.slice(0, 1)}
            </span>
            <span className="text-[9px] font-bold" style={{ color: "#9aa1ac" }}>{t("appDesigner.poweredBy")}</span>
          </div>
        </div>

        {/* شاشة فرعية داخلية (تُفتح عند الضغط على عناصر لم تكن تستجيب) */}
        {detail && (
          <div className="absolute inset-x-0 top-0 bottom-[66px] bg-white z-40 flex flex-col" style={{ borderTopLeftRadius: 26, borderTopRightRadius: 26 }}>
            <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b" style={{ background: c.headerColor, borderColor: "#e6e8ee" }}>
              <button type="button" onClick={() => setDetail(null)} className="text-white cursor-pointer active:scale-90 transition-transform">
                <span className="block rotate-180"><Icon name="arrowLeft" size={15} /></span>
              </button>
              <p className="text-[12px] font-extrabold text-white">{t(`appDesigner.detail.${detail}.title`)}</p>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0" style={{ background: "#f7f8fa" }}>
              <DetailBody detail={detail} c={c} currency={currency} bundle={bundle} t={t} />
            </div>
          </div>
        )}

        {/* شريط التنقل السفلي */}
        <div className="shrink-0 flex items-stretch bg-white border-t" style={{ height: 66, borderColor: "#e6e8ee", paddingBottom: 4, boxShadow: "0 -2px 10px rgba(15,23,42,0.05)" }}>
          {design.bottomNav.map((n) => {
            const target: AppScreenKey = n === "home" ? "home" : n === "cart" ? "cart" : n === "account" ? "account" : n === "categories" ? "catalog" : "home";
            const active = previewActive(screen, n);
            const color = active ? c.buttonColor : "#98a0ab";
            return (
              <button
                key={n}
                type="button"
                onClick={() => { setDetail(null); onNavigate(target, null); }}
                className="flex-1 flex flex-col items-center justify-center gap-1 pt-2 transition-all cursor-pointer active:scale-95 hover:bg-gray-50"
                style={{ color }}
              >
                <span className="flex items-center justify-center rounded-full transition-all"
                  style={{ width: 30, height: 22, background: active ? `${c.buttonColor}18` : "transparent" }}>
                  <Icon name={navIcons[n] ?? "home"} size={19} />
                </span>
                <span className="text-[9px] leading-none" style={{ fontWeight: active ? 800 : 600 }}>{t(`appDesigner.nav.${n}`)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function previewActive(screen: AppScreenKey, nav: string): boolean {
  if (nav === "home" && (screen === "home" || screen === "tracking")) return true;
  if (nav === "cart" && screen === "cart") return true;
  if (nav === "account" && screen === "account") return true;
  if (nav === "categories" && (screen === "catalog" || screen === "product")) return true;
  return false;
}

// ── محتوى الشاشات الفرعية التي تُفتح داخل الإطار ──
function DetailBody({ detail, c, currency, bundle, t }: any) {
  const rowCls = "bg-white rounded-xl border p-3 mb-2 flex items-center justify-between";
  if (detail === "orders") {
    const orders = [
      { id: "#10245", total: 320, status: t("appDesigner.detail.orders.shipped") },
      { id: "#10231", total: 180, status: t("appDesigner.detail.orders.delivered") },
    ];
    return (
      <div className="p-3">
        {orders.map((o) => (
          <div key={o.id} className={rowCls} style={{ borderColor: "#eef0f3" }}>
            <div>
              <p className="text-[11px] font-extrabold text-gray-800">{o.id}</p>
              <p className="text-[9px] text-gray-400">{o.status}</p>
            </div>
            <p className="text-[11px] font-extrabold" style={{ color: c.buttonColor }}>{o.total} {currency}</p>
          </div>
        ))}
      </div>
    );
  }
  if (detail === "wishlist") {
    const items = (bundle?.products ?? []).slice(0, 3);
    return (
      <div className="p-3 grid grid-cols-2 gap-2">
        {items.map((p: BundleProduct) => (
          <div key={p.id} className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#eef0f3" }}>
            <div className="h-16 bg-gray-100 flex items-center justify-center"><Icon name="package" size={20} className="text-gray-300" /></div>
            <div className="p-1.5">
              <p className="text-[9px] font-bold text-gray-700 truncate">{p.name}</p>
              <p className="text-[9.5px] font-extrabold" style={{ color: c.buttonColor }}>{p.discountPrice ?? p.price} {currency}</p>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="col-span-2 text-center text-[10px] text-gray-400 py-6">{t("appDesigner.detail.empty")}</p>}
      </div>
    );
  }
  if (detail === "addresses") {
    const addrs = [t("appDesigner.detail.addresses.home"), t("appDesigner.detail.addresses.work")];
    return (
      <div className="p-3">
        {addrs.map((a: string) => (
          <div key={a} className={rowCls} style={{ borderColor: "#eef0f3" }}>
            <span className="flex items-center gap-2 text-[10.5px] font-bold text-gray-700"><Icon name="location" size={13} className="text-gray-400" />{a}</span>
            <span className="text-gray-300"><Icon name="arrowLeft" size={12} /></span>
          </div>
        ))}
      </div>
    );
  }
  if (detail === "support") {
    return (
      <div className="p-3 space-y-2">
        <div className="bg-white rounded-xl border p-3" style={{ borderColor: "#eef0f3" }}>
          <p className="text-[10.5px] font-bold text-gray-700 mb-1.5">{t("appDesigner.detail.support.msg")}</p>
          <textarea readOnly className="w-full text-[10px] border rounded-lg p-2 h-16 resize-none" style={{ borderColor: "#e6e8ee" }} placeholder={t("appDesigner.detail.support.ph")} />
          <button type="button" className="w-full mt-2 py-1.5 rounded-lg text-[10.5px] font-bold text-white" style={{ background: c.buttonColor }}>{t("appDesigner.detail.support.send")}</button>
        </div>
      </div>
    );
  }
  if (detail === "settings") {
    const opts = [t("appDesigner.detail.settings.notifications"), t("appDesigner.detail.settings.lang"), t("appDesigner.detail.settings.about")];
    return (
      <div className="p-3">
        {opts.map((o: string) => (
          <div key={o} className={rowCls} style={{ borderColor: "#eef0f3" }}>
            <span className="text-[10.5px] font-bold text-gray-700">{o}</span>
            <span className="text-gray-300"><Icon name="arrowLeft" size={12} /></span>
          </div>
        ))}
      </div>
    );
  }
  if (detail === "notifications") {
    const notes = [t("appDesigner.detail.notifications.n1"), t("appDesigner.detail.notifications.n2")];
    return (
      <div className="p-3">
        {notes.map((n: string) => (
          <div key={n} className="bg-white rounded-xl border p-3 mb-2 flex items-start gap-2" style={{ borderColor: "#eef0f3" }}>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: c.buttonColor }}><Icon name="bell" size={12} /></span>
            <p className="text-[10px] text-gray-600 leading-relaxed">{n}</p>
          </div>
        ))}
      </div>
    );
  }
  if (detail === "coupon") {
    return (
      <div className="p-3">
        <div className="bg-white rounded-xl border p-3" style={{ borderColor: "#eef0f3" }}>
          <input readOnly className="w-full text-[10.5px] border rounded-lg px-2 py-1.5 mb-2" style={{ borderColor: "#e6e8ee" }} placeholder={t("appDesigner.detail.coupon.ph")} />
          <button type="button" className="w-full py-1.5 rounded-lg text-[10.5px] font-bold text-white" style={{ background: c.buttonColor }}>{t("appDesigner.detail.coupon.apply")}</button>
        </div>
      </div>
    );
  }
  if (detail === "search") {
    return (
      <div className="p-3">
        <input readOnly className="w-full text-[10.5px] border rounded-lg px-2 py-1.5 mb-2" style={{ borderColor: "#e6e8ee" }} placeholder={t("appDesigner.searchPlaceholder")} />
        <div className="grid grid-cols-2 gap-2">
          {(bundle?.products ?? []).slice(0, 4).map((p: BundleProduct) => (
            <div key={p.id} className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#eef0f3" }}>
              <div className="h-14 bg-gray-100 flex items-center justify-center"><Icon name="package" size={18} className="text-gray-300" /></div>
              <div className="p-1.5"><p className="text-[9px] font-bold text-gray-700 truncate">{p.name}</p><p className="text-[9px] font-extrabold" style={{ color: c.buttonColor }}>{p.discountPrice ?? p.price} {currency}</p></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return <div className="p-6 text-center text-[10px] text-gray-400">{t("appDesigner.detail.empty")}</div>;
}

function ProductCard({ p, c, currency, badge, wide, onTap }: { p: BundleProduct; c: StoreColors; currency: string; badge?: string; wide?: boolean; onTap?: () => void }) {
  const price = p.discountPrice ?? p.price;
  return (
    <button type="button" onClick={onTap} className="rounded-xl bg-white border overflow-hidden relative text-start cursor-pointer transition-all hover:shadow-md active:scale-[0.98]" style={{ borderColor: "#eef0f3" }}>
      {badge && <span className="absolute top-1 start-1 z-10 text-[7px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: c.buttonColor }}>{badge}</span>}
      <div className={wide ? "h-24 flex items-center justify-center relative" : "h-16 flex items-center justify-center relative"} style={{ background: "#f3f4f6" }}>
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
          <span className="text-[9.5px] font-extrabold" style={{ color: c.buttonColor }}>{price} {currency}</span>
          {p.discountPrice && <span className="text-[7.5px] text-gray-400 line-through">{p.price}</span>}
        </div>
      </div>
    </button>
  );
}

function HomeScreen({ design, bundle, appName, currency, theme, onNavigate, c, t }: any) {
  const enabled = design.screens.home.sections.filter((s: AppSection) => s.enabled);
  const products: BundleProduct[] = bundle?.products ?? [];
  const cats: BundleCategory[] = bundle?.categories ?? [];

  if (products.length === 0 && cats.length === 0) {
    return (
      <div className="p-6 text-center">
        <Icon name="box" size={28} className="text-gray-300 mx-auto mb-2" />
        <p className="text-[11px] text-gray-400">{t("appDesigner.noProducts")}</p>
      </div>
    );
  }

  return (
    <>
      {enabled.map((s: AppSection) => (
        <HomeSection key={s.key} sectionKey={s.key} bundle={bundle} currency={currency} theme={theme} onNavigate={onNavigate} c={c} t={t} appName={appName} />
      ))}
    </>
  );
}

function HomeSection({ sectionKey, bundle, currency, theme, onNavigate, c, t }: any) {
  const products: BundleProduct[] = bundle?.products ?? [];
  const cats: BundleCategory[] = bundle?.categories ?? [];

  switch (sectionKey) {
    case "hero":
      return (
        <div className="mx-3 mt-3 rounded-2xl p-4 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${c.heroFrom}, ${c.heroTo})` }}>
          <div className="absolute -end-6 -bottom-6 w-24 h-24 rounded-full bg-white/10" />
          <p className="text-[13.5px] font-extrabold mb-1 relative">{bundle?.store.storeName || t("appDesigner.heroTitle")}</p>
          <p className="text-[10px] opacity-90 mb-2.5 relative">{bundle?.store.bio || t("appDesigner.heroSub")}</p>
          <button onClick={() => onNavigate("catalog")} className="inline-block text-[10px] font-bold px-3.5 py-1.5 rounded-full shadow bg-white cursor-pointer transition-transform active:scale-95" style={{ color: c.buttonColor }}>{t("appDesigner.heroCta")}</button>
        </div>
      );
    case "categories":
      return (
        <div className="px-3 pt-3">
          <SectionHeader title={t("appDesigner.section.categories")} cta={t("appDesigner.viewAll")} color={c.buttonColor} onClick={() => onNavigate("catalog")} />
          <div className="grid grid-cols-4 gap-2">
            {cats.slice(0, 8).map((cat: BundleCategory) => (
              <button key={cat.id} onClick={() => onNavigate("catalog")} className="flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-95">
                <span className="w-11 h-11 rounded-full flex items-center justify-center ring-1 ring-black/5 overflow-hidden" style={{ background: `${c.accentColor}1a`, color: c.accentColor }}>
                  {cat.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cat.image} alt="" className="w-full h-full object-cover" />
                  ) : <Icon name="tag" size={16} />}
                </span>
                <span className="text-[8px] text-gray-600 font-bold truncate w-full text-center">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      );
    case "banners":
      return (
        <div className="px-3 pt-3">
          <button type="button" onClick={() => onNavigate("catalog")} className="w-full rounded-xl h-20 flex flex-col items-center justify-center text-white relative overflow-hidden" style={{ background: `linear-gradient(120deg, ${theme.previewSecondary}, ${c.accentColor})` }}>
            <span className="text-[11.5px] font-extrabold">{bundle?.banners?.[0]?.title || t("appDesigner.bannerTitle")}</span>
            <span className="text-[8.5px] opacity-90 mt-0.5">{bundle?.banners?.[0]?.subtitle || t("appDesigner.bannerSub")}</span>
            <span className="flex gap-1 mt-2"><span className="w-4 h-1 rounded-full bg-white" /><span className="w-1.5 h-1 rounded-full bg-white/50" /><span className="w-1.5 h-1 rounded-full bg-white/50" /></span>
          </button>
        </div>
      );
    case "featured": {
      const list = (bundle?.featuredProducts?.length ? bundle.featuredProducts : products).slice(0, 3);
      return (
        <div className="px-3 pt-3">
          <SectionHeader title={t("appDesigner.section.featured")} cta={t("appDesigner.viewAll")} color={c.buttonColor} onClick={() => onNavigate("catalog")} />
          <div className="grid grid-cols-3 gap-2">
            {list.map((p: BundleProduct, i: number) => <ProductCard key={p.id} p={p} c={c} currency={currency} badge={i === 0 ? t("appDesigner.badgeNew") : undefined} onTap={() => onNavigate("product", p)} />)}
          </div>
        </div>
      );
    }
    case "newArrivals": {
      const list = (bundle?.newArrivals?.length ? bundle.newArrivals : products).slice(0, 4);
      return (
        <div className="px-3 pt-3">
          <SectionHeader title={t("appDesigner.section.newArrivals")} cta={t("appDesigner.viewAll")} color={c.buttonColor} onClick={() => onNavigate("catalog")} />
          <div className="grid grid-cols-2 gap-2">
            {list.map((p: BundleProduct) => <ProductCard key={p.id} p={p} c={c} currency={currency} onTap={() => onNavigate("product", p)} />)}
          </div>
        </div>
      );
    }
    case "offers": {
      const list = (bundle?.offers?.length ? bundle.offers : products).slice(0, 3);
      return (
        <div className="px-3 pt-3">
          <SectionHeader title={t("appDesigner.section.offers")} cta={t("appDesigner.endsSoon")} color="#ef4444" />
          <div className="grid grid-cols-3 gap-2">
            {list.map((p: BundleProduct) => <ProductCard key={p.id} p={p} c={c} currency={currency} badge={p.discountPercent ? `-${p.discountPercent}%` : undefined} onTap={() => onNavigate("product", p)} />)}
          </div>
        </div>
      );
    }
    case "testimonials":
      return (
        <div className="px-3 pt-3">
          <p className="text-[11px] font-extrabold text-gray-800 mb-2">{t("appDesigner.section.testimonials")}</p>
          <div className="rounded-xl bg-white border p-2.5" style={{ borderColor: "#eef0f3" }}>
            <div className="flex gap-0.5 text-amber-400 mb-1">{"★★★★★".split("").map((s, i) => <span key={i} className="text-[8px]">{s}</span>)}</div>
            <p className="text-[9.5px] text-gray-600 leading-relaxed">{t("appDesigner.sampleReview")}</p>
            <p className="text-[9px] font-bold mt-1" style={{ color: c.buttonColor }}>— {t("appDesigner.sampleReviewer")}</p>
          </div>
        </div>
      );
    case "newsletter":
      return (
        <div className="mx-3 mt-3 rounded-xl p-3" style={{ background: c.footerColor }}>
          <p className="text-[10.5px] font-extrabold text-white mb-0.5">{t("appDesigner.section.newsletter")}</p>
          <p className="text-[8px] text-white/60 mb-2">{t("appDesigner.newsletterSub")}</p>
          <div className="flex gap-1.5">
            <span className="flex-1 bg-white/90 rounded-lg h-7 flex items-center px-2 text-[8px] text-gray-400">{t("appDesigner.emailPlaceholder")}</span>
            <button type="button" onClick={() => onNavigate("account")} className="text-[9px] font-bold px-3 rounded-lg flex items-center text-white" style={{ background: c.buttonColor }}>{t("appDesigner.subscribeBtn")}</button>
          </div>
        </div>
      );
    case "contact":
      return (
        <div className="px-3 pt-3 pb-4">
          <p className="text-[11px] font-extrabold text-gray-800 mb-2">{t("appDesigner.section.contact")}</p>
          <div className="flex gap-2">
            {["phone", "mail", "whatsapp", "location"].map((ic) => (
              <button key={ic} type="button" onClick={() => onNavigate("account")} className="w-9 h-9 rounded-full flex items-center justify-center bg-white border" style={{ borderColor: "#e6e8ee" }}>
                <Icon name={ic as any} size={13} className="text-gray-500" />
              </button>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}

function SectionHeader({ title, cta, color, onClick }: { title: string; cta: string; color: string; onClick?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <p className="text-[11px] font-extrabold text-gray-800">{title}</p>
      <button type="button" onClick={onClick} className="text-[8.5px] font-bold cursor-pointer hover:underline" style={{ color }}>{cta}</button>
    </div>
  );
}

// ── شاشة المنتج ──
function ProductScreen({ product, bundle, c, currency, onNavigate, t, items }: any) {
  if (!product) return <div className="p-6 text-center text-[11px] text-gray-400">{t("appDesigner.noProducts")}</div>;
  const on = (k: string) => items?.[k] !== false;
  const price = product.discountPrice ?? product.price;
  return (
    <div className="pb-3">
      {on("photos") && (
      <div className="h-44 bg-gray-100 flex items-center justify-center relative">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : <Icon name="box" size={32} className="text-gray-300" />}
        {on("discount") && product.discountPercent ? (
          <span className="absolute top-2 start-2 text-[9px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: c.buttonColor }}>-{product.discountPercent}%</span>
        ) : null}
      </div>
      )}
      <div className="px-3 pt-3">
        {product.categoryName && <p className="text-[9px] font-bold mb-1" style={{ color: c.accentColor }}>{product.categoryName}</p>}
        <p className="text-[13px] font-extrabold text-gray-800 mb-1">{product.name}</p>
        {on("price") && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[15px] font-extrabold" style={{ color: c.buttonColor }}>{price} {currency}</span>
          {product.discountPrice && <span className="text-[10px] text-gray-400 line-through">{product.price}</span>}
        </div>
        )}
        {on("rating") && (
        <div className="flex gap-0.5 text-amber-400 mb-2">{"★★★★★".split("").map((s, i) => <span key={i} className="text-[10px]">{s}</span>)}<span className="text-[9px] text-gray-400 ms-1">4.8 (23)</span></div>
        )}
        {on("description") && <p className="text-[9.5px] text-gray-500 leading-relaxed mb-3">{product.shortDescription || t("appDesigner.sampleProductDesc")}</p>}
        {on("addToCart") && (
        <div className="flex gap-2">
          <button type="button" onClick={() => onNavigate("cart")} className="flex-1 py-2 rounded-xl text-[11px] font-bold text-white cursor-pointer transition-transform active:scale-[0.98]" style={{ background: c.buttonColor }}>{t("appDesigner.addToCart")}</button>
          <button type="button" onClick={() => onNavigate("cart")} className="w-10 h-9 rounded-xl flex items-center justify-center text-white cursor-pointer active:scale-95" style={{ background: c.headerColor }}>
            <Icon name="cashier" size={15} />
          </button>
        </div>
        )}
      </div>
      {on("related") && bundle?.products?.length > 1 && (
        <div className="px-3 pt-4">
          <p className="text-[11px] font-extrabold text-gray-800 mb-2">{t("appDesigner.related")}</p>
          <div className="grid grid-cols-3 gap-2">
            {bundle.products.filter((x: BundleProduct) => x.id !== product.id).slice(0, 3).map((p: BundleProduct) => (
              <ProductCard key={p.id} p={p} c={c} currency={currency} onTap={() => onNavigate("product", p)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── شاشة السلة ──
function CartScreen({ bundle, c, currency, onNavigate, onDetail, t, items }: any) {
  const on = (k: string) => items?.[k] !== false;
  const list = (bundle?.products ?? []).slice(0, 2);
  const subtotal = list.reduce((s: number, p: BundleProduct) => s + (p.discountPrice ?? p.price), 0);
  return (
    <div className="p-3">
      <p className="text-[12px] font-extrabold text-gray-800 mb-2">{t("appDesigner.screen.cart")}</p>
      {list.length === 0 ? <div className="text-center text-[11px] text-gray-400 py-6">{t("appDesigner.cartEmpty")}</div> : (
        <>
          {on("items") && list.map((p: BundleProduct) => (
            <div key={p.id} className="flex items-center gap-2 bg-white rounded-xl border p-2 mb-2" style={{ borderColor: "#eef0f3" }}>
              <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : <Icon name="box" size={14} className="text-gray-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9.5px] font-bold text-gray-700 truncate">{p.name}</p>
                <p className="text-[9.5px] font-extrabold" style={{ color: c.buttonColor }}>{p.discountPrice ?? p.price} {currency}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onNavigate("cart")} className="w-6 h-6 rounded-md border flex items-center justify-center text-[12px] text-gray-500" style={{ borderColor: "#e6e8ee" }} aria-label="−">&minus;</button>
                <span className="text-[10px] font-bold w-4 text-center">1</span>
                <button type="button" onClick={() => onNavigate("cart")} className="w-6 h-6 rounded-md border flex items-center justify-center text-[12px] text-gray-500" style={{ borderColor: "#e6e8ee" }} aria-label="+">+</button>
              </div>
            </div>
          ))}
          {(on("coupon") || on("shipping") || on("total")) && (
          <div className="bg-white rounded-xl border p-2.5 mb-2" style={{ borderColor: "#eef0f3" }}>
            {on("coupon") && (
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9.5px] text-gray-500">{t("appDesigner.coupon")}</span>
              <button type="button" onClick={() => onDetail("coupon")} className="text-[9px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer active:scale-95 transition-transform" style={{ borderColor: "#e6e8ee", color: c.buttonColor }}>{t("appDesigner.applyCoupon")}</button>
            </div>
            )}
            {on("total") && <div className="flex items-center justify-between text-[9.5px] mb-1"><span className="text-gray-500">{t("appDesigner.subtotal")}</span><span className="font-bold">{subtotal} {currency}</span></div>}
            {on("shipping") && <div className="flex items-center justify-between text-[9.5px]"><span className="text-gray-500">{t("appDesigner.shipping")}</span><span className="font-bold" style={{ color: "var(--green)" }}>{t("appDesigner.free")}</span></div>}
          </div>
          )}
          {on("total") && <div className="flex items-center justify-between mb-2"><span className="text-[11px] font-extrabold text-gray-800">{t("appDesigner.total")}</span><span className="text-[12px] font-extrabold" style={{ color: c.buttonColor }}>{subtotal} {currency}</span></div>}
          {on("checkout") && <button type="button" onClick={() => onNavigate("tracking")} className="w-full py-2.5 rounded-xl text-[11.5px] font-bold text-white cursor-pointer transition-transform active:scale-[0.99]" style={{ background: c.buttonColor }}>{t("appDesigner.checkout")}</button>}
        </>
      )}
    </div>
  );
}

// ── شاشة الحساب ──
function AccountScreen({ c, appName, onNavigate, onDetail, t, items, loggedIn, onLogin, onLogout }: any) {
  const on = (k: string) => items?.[k] !== false;
  const [tab, setTab] = useState<"orders" | "addresses" | "profile">("orders");
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");

  // ── شاشة تسجيل الدخول (مطابقة لمتجرك الحقيقي) ──
  if (on("profile") && !loggedIn) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-2xl border p-5 text-center" style={{ borderColor: "#eef0f3" }}>
          <div className="mx-auto mb-3 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${c.buttonColor}14`, color: c.buttonColor }}>
            <Icon name="user" size={24} />
          </div>
          <p className="text-[13px] font-extrabold text-gray-800 mb-1">{t("storefront.myAccount")}</p>
          <p className="text-[10px] text-gray-500 mb-4">{t("storefront.notLoggedInHint")}</p>
          {step === "email" ? (
            <div className="text-start">
              <label className="block text-[10px] font-bold text-gray-700 mb-1">{t("storefront.quickLoginEmail")}</label>
              <input
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[11px] outline-none"
              />
              <button type="button" onClick={() => setStep("code")} className="w-full mt-2.5 rounded-lg py-2 text-[11px] font-bold text-white cursor-pointer active:scale-[0.99] transition-transform" style={{ background: c.buttonColor }}>
                {t("storefront.quickLoginSendCode")}
              </button>
            </div>
          ) : (
            <div className="text-start">
              <p className="text-[9.5px] text-gray-500 mb-2">{t("storefront.quickLoginCodeDesc")}</p>
              <label className="block text-[10px] font-bold text-gray-700 mb-1">{t("storefront.quickLoginCode")}</label>
              <input dir="ltr" placeholder="••••" maxLength={6} className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[11px] outline-none text-center tracking-widest" />
              <button type="button" onClick={onLogin} className="w-full mt-2.5 rounded-lg py-2 text-[11px] font-bold text-white cursor-pointer active:scale-[0.99] transition-transform" style={{ background: c.buttonColor }}>
                {t("storefront.quickLoginVerify")}
              </button>
              <button type="button" onClick={() => setStep("email")} className="w-full mt-1.5 text-center text-[9.5px] text-gray-500 cursor-pointer">
                {t("storefront.quickLoginBack")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── الحساب بعد الدخول: تبويبات الطلبات/العناوين/بياناتي + خروج ──
  const tabs: { k: "orders" | "addresses" | "profile"; label: string }[] = [
    { k: "orders", label: t("account.orders") },
    { k: "addresses", label: t("account.addresses") },
    { k: "profile", label: t("account.profile") },
  ];
  const statusLabel: Record<string, string> = {
    confirmed: t("account.statusProcessing"),
    preparing: t("account.statusProcessing"),
    shipped: t("account.statusShipped"),
    delivered: t("account.statusDelivered"),
  };
  return (
    <div className="p-3">
      <div className="rounded-2xl p-4 text-white mb-3" style={{ background: `linear-gradient(135deg, ${c.headerColor}, ${c.accentColor})` }}>
        <div className="flex items-center gap-2.5">
          <span className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center"><Icon name="user" size={20} /></span>
          <div className="flex-1">
            <p className="text-[12px] font-extrabold">{t("appDesigner.welcomeUser")}</p>
            <p className="text-[9px] text-white/70">{appName}</p>
          </div>
          <button type="button" onClick={onLogout} className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-white/20 cursor-pointer active:scale-95 transition-transform">
            {t("account.logout")}
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 mb-3">
        {tabs.map((tb) => (
          <button
            key={tb.k}
            type="button"
            onClick={() => setTab(tb.k)}
            className="flex-1 py-1.5 rounded-full text-[9.5px] font-bold cursor-pointer transition-colors"
            style={tab === tb.k ? { background: c.buttonColor, color: "#fff" } : { background: "#eef0f3", color: "#6b7280" }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div>
          <div className="bg-white rounded-xl border p-3 mb-2 flex items-center justify-between cursor-pointer" style={{ borderColor: "#eef0f3" }}>
            <div>
              <p className="text-[11px] font-extrabold text-gray-800">#10245</p>
              <p className="text-[9px] text-gray-400">{statusLabel.shipped}</p>
            </div>
            <p className="text-[11px] font-extrabold" style={{ color: c.buttonColor }}>320 ر.س</p>
          </div>
          <div className="bg-white rounded-xl border p-3 flex items-center justify-between cursor-pointer" style={{ borderColor: "#eef0f3" }}>
            <div>
              <p className="text-[11px] font-extrabold text-gray-800">#10231</p>
              <p className="text-[9px] text-gray-400">{statusLabel.delivered}</p>
            </div>
            <p className="text-[11px] font-extrabold" style={{ color: c.buttonColor }}>180 ر.س</p>
          </div>
        </div>
      )}

      {tab === "addresses" && (
        <div>
          <div className="bg-white rounded-xl border p-3 mb-2 flex items-center justify-between cursor-pointer" style={{ borderColor: "#eef0f3" }}>
            <span className="flex items-center gap-2 text-[10.5px] font-bold text-gray-700"><Icon name="location" size={13} className="text-gray-400" />{t("appDesigner.detail.addresses.home")}</span>
            <span className="text-gray-300"><Icon name="arrowLeft" size={12} /></span>
          </div>
          <div className="bg-white rounded-xl border p-3 flex items-center justify-between cursor-pointer" style={{ borderColor: "#eef0f3" }}>
            <span className="flex items-center gap-2 text-[10.5px] font-bold text-gray-700"><Icon name="location" size={13} className="text-gray-400" />{t("appDesigner.detail.addresses.work")}</span>
            <span className="text-gray-300"><Icon name="arrowLeft" size={12} /></span>
          </div>
        </div>
      )}

      {tab === "profile" && (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#eef0f3" }}>
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-b" style={{ borderColor: "#f3f4f6", color: c.buttonColor }}>
            <Icon name="mail" size={14} />
            <span className="flex-1 text-[10.5px] font-bold text-gray-700">{t("account.email")}</span>
            <span className="text-[10px] text-gray-400" dir="ltr">customer@example.com</span>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ color: c.buttonColor }}>
            <Icon name="phone" size={14} />
            <span className="flex-1 text-[10.5px] font-bold text-gray-700">{t("account.phone")}</span>
            <span className="text-[10px] text-gray-400" dir="ltr">+966 5x xxx xxxx</span>
          </div>
        </div>
      )}

      <button type="button" onClick={() => onNavigate("tracking")} className="w-full mt-3 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer transition-colors active:scale-[0.99]" style={{ background: `${c.buttonColor}1a`, color: c.buttonColor }}>
        {t("appDesigner.trackOrder")}
      </button>
    </div>
  );
}

// ── شاشة تتبّع الطلب ──
function TrackingScreen({ c, onNavigate, t, items }: any) {
  const on = (k: string) => items?.[k] !== false;
  const steps = ["confirmed", "preparing", "shipped", "delivered"];
  const activeIdx = 2;
  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => onNavigate("account")} className="text-gray-400"><span className="block rotate-180"><Icon name="arrowLeft" size={14} /></span></button>
        <p className="text-[12px] font-extrabold text-gray-800">{t("appDesigner.screen.tracking")}</p>
      </div>
      <div className="bg-white rounded-xl border p-3 mb-3" style={{ borderColor: "#eef0f3" }}>
        <div className="flex items-center justify-between mb-1"><span className="text-[9.5px] text-gray-500">{t("appDesigner.orderNumber")}</span><span className="text-[10px] font-bold">#10245</span></div>
        <p className="text-[9.5px] text-gray-500">{t("appDesigner.arrivesTomorrow")}</p>
      </div>
      {on("timeline") && (
      <div className="bg-white rounded-xl border p-3" style={{ borderColor: "#eef0f3" }}>
        {steps.map((s, i) => {
          const done = i <= activeIdx;
          const last = i === steps.length - 1;
          return (
            <div key={s} className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: done ? c.buttonColor : "#e5e7eb" }}>
                  {done ? <Icon name="check" size={10} /> : <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                {!last && <span className="w-0.5 flex-1 my-0.5" style={{ background: i < activeIdx ? c.buttonColor : "#e5e7eb", minHeight: 18 }} />}
              </div>
              <div className="pb-3">
                <p className="text-[10.5px] font-bold" style={{ color: done ? "#1f2937" : "#9ca3af" }}>{t(`appDesigner.track.${s}`)}</p>
                {i === activeIdx && <p className="text-[8.5px] text-gray-400 mt-0.5">{t("appDesigner.trackNow")}</p>}
              </div>
            </div>
          );
        })}
      </div>
      )}
      {on("courier") && <button type="button" onClick={() => onNavigate("account")} className="w-full mt-3 py-2 rounded-xl text-[11px] font-bold text-white" style={{ background: c.headerColor }}>{t("appDesigner.contactCourier")}</button>}
    </div>
  );
}

// ── شاشة التصفّح ──
function CatalogScreen({ bundle, c, currency, onNavigate, onDetail, t, items }: any) {
  const on = (k: string) => items?.[k] !== false;
  const cats: BundleCategory[] = bundle?.categories ?? [];
  const products: BundleProduct[] = bundle?.products ?? [];
  return (
    <div className="p-3">
      <p className="text-[11px] font-extrabold text-gray-800 mb-2">{t("appDesigner.screen.catalog")}</p>
      {on("search") && (
        <button type="button" onClick={() => onDetail("search")} className="w-full flex items-center gap-2 rounded-xl bg-white border px-3 py-1.5 mb-2 cursor-pointer active:scale-[0.99] transition-transform" style={{ borderColor: "#e6e8ee" }}>
          <Icon name="search" size={13} className="text-gray-400" />
          <span className="text-[9.5px] text-gray-400">{t("appDesigner.searchPlaceholder")}</span>
        </button>
      )}
      {on("categories") && cats.length > 0 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5">
          {cats.slice(0, 6).map((cat: BundleCategory) => (
            <button key={cat.id} type="button" onClick={() => onDetail("search")} className="px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap cursor-pointer transition-transform active:scale-95" style={{ background: `${c.buttonColor}14`, color: c.buttonColor }}>{cat.name}</button>
          ))}
        </div>
      )}
      {on("grid") && (
      <div className="grid grid-cols-2 gap-2">
        {products.slice(0, 8).map((p: BundleProduct) => <ProductCard key={p.id} p={p} c={c} currency={currency} wide onTap={() => onNavigate("product", p)} />)}
      </div>
      )}
    </div>
  );
}

"use client";
import { useTranslation } from "react-i18next";
import { useStore } from "@/components/StoreContext";

export interface StoreMenuConfigItem {
  id: string;
  isEnabled: boolean;
  order: number;
}

export interface StorePageConfig {
  key: string;
  titleAr?: string;
  titleEn?: string;
  contentAr?: string;
  contentEn?: string;
  isEnabled?: boolean;
}

export interface MenuItemDef {
  id: string;
  labelKey: string;
  href: (slug: string) => string;
}

// العناصر الافتراضية للقائمة الرئيسية — 10 عناصر كما طُلب
export const MENU_ITEMS: MenuItemDef[] = [
  { id: "home", labelKey: "storefront.menuHome", href: (s) => `/store/${s}` },
  { id: "store", labelKey: "storefront.menuStore", href: (s) => `/store/${s}/products` },
  { id: "deals", labelKey: "storefront.menuDeals", href: (s) => `/store/${s}/products?deals=1` },
  { id: "best-sellers", labelKey: "storefront.menuBestSellers", href: (s) => `/store/${s}/products?sort=best-selling` },
  { id: "new-arrivals", labelKey: "storefront.menuNewArrivals", href: (s) => `/store/${s}/products?sort=newest` },
  { id: "about", labelKey: "storefront.menuAbout", href: (s) => `/store/${s}/about` },
  { id: "blog", labelKey: "storefront.menuBlog", href: (s) => `/store/${s}/blog` },
  { id: "track-order", labelKey: "storefront.menuTrackOrder", href: (s) => `/store/${s}/track-order` },
  { id: "faq", labelKey: "storefront.menuFaq", href: (s) => `/store/${s}/faq` },
  { id: "contact", labelKey: "storefront.menuContact", href: (s) => `/store/${s}/contact` },
];

// روابط قسم "سياسات المتجر" في الفوتر
export const POLICY_LINKS: MenuItemDef[] = [
  { id: "terms", labelKey: "storefront.policyTerms", href: (s) => `/store/${s}/terms` },
  { id: "privacy", labelKey: "storefront.policyPrivacy", href: (s) => `/store/${s}/privacy-policy` },
  { id: "return", labelKey: "storefront.policyReturn", href: (s) => `/store/${s}/return-policy` },
  { id: "shipping", labelKey: "storefront.policyShipping", href: (s) => `/store/${s}/shipping-policy` },
  { id: "usage", labelKey: "storefront.policyUsage", href: (s) => `/store/${s}/usage-policy` },
];

// مفاتيح محتوى صفحات المتجر وربطها بالمفاتيح الافتراضية في ملفات الترجمة
export const PAGE_DEFS: Record<string, { titleKey: string; contentKey: string }> = {
  about: { titleKey: "storePages.aboutTitle", contentKey: "storePages.aboutContent" },
  blog: { titleKey: "storePages.blogTitle", contentKey: "storePages.blogContent" },
  faq: { titleKey: "storePages.faqTitle", contentKey: "storePages.faqContent" },
  terms: { titleKey: "storePages.termsTitle", contentKey: "storePages.termsContent" },
  "privacy-policy": { titleKey: "storePages.privacyTitle", contentKey: "storePages.privacyContent" },
  "shipping-policy": { titleKey: "storePages.shippingTitle", contentKey: "storePages.shippingContent" },
  "usage-policy": { titleKey: "storePages.usageTitle", contentKey: "storePages.usageContent" },
};

export function parseMenuConfig(json: string | null | undefined): Map<string, StoreMenuConfigItem> {
  const map = new Map<string, StoreMenuConfigItem>();
  if (!json) return map;
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      parsed.forEach((item: any) => {
        if (item && typeof item.id === "string") {
          map.set(item.id, {
            id: item.id,
            isEnabled: item.isEnabled !== false,
            order: typeof item.order === "number" ? item.order : 999,
          });
        }
      });
    }
  } catch {
    /* ignore invalid JSON */
  }
  return map;
}

export function parseStorePages(json: string | null | undefined): StorePageConfig[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((p: any) => p && typeof p.key === "string")
        .map((p: any) => ({
          key: p.key,
          titleAr: p.titleAr || undefined,
          titleEn: p.titleEn || undefined,
          contentAr: p.contentAr || undefined,
          contentEn: p.contentEn || undefined,
          isEnabled: p.isEnabled !== false,
        }));
    }
  } catch {
    /* ignore invalid JSON */
  }
  return [];
}

export function getStorePageConfig(json: string | null | undefined, key: string): StorePageConfig | undefined {
  return parseStorePages(json).find((p) => p.key === key);
}

// فهرس عناصر القائمة المفعلة والمرتبة حسب الإعدادات المحفوظة في صفحة اعدادات المتجر
export function getEnabledMenuItems(slug: string, json: string | null | undefined): MenuItemDef[] {
  const config = parseMenuConfig(json);
  return MENU_ITEMS
    .map((item) => {
      const cfg = config.get(item.id);
      const enabled = cfg ? cfg.isEnabled : true;
      const order = cfg ? cfg.order : MENU_ITEMS.findIndex((m) => m.id === item.id);
      return { item, enabled, order };
    })
    .filter((x) => x.enabled)
    .sort((a, b) => a.order - b.order)
    .map((x) => x.item);
}

export function getEnabledPolicyLinks(slug: string, json: string | null | undefined): MenuItemDef[] {
  const config = parseMenuConfig(json);
  return POLICY_LINKS.filter((link) => {
    const cfg = config.get(link.id);
    return cfg ? cfg.isEnabled : true;
  });
}

export interface StorePageContent {
  title: string;
  content: string;
  isEnabled: boolean;
}

// Hook يقرأ محتوى الصفحة (المخصص من صاحب المتجر) مع الرجوع للمحتوى الافتراضي
export function useStorePageContent(pageKey: string): StorePageContent {
  const { t, i18n } = useTranslation();
  const store = useStore();
  const isAr = i18n.language !== "en";
  const cfg = getStorePageConfig(store.storePagesJson, pageKey);
  const def = PAGE_DEFS[pageKey];

  let title = cfg ? (isAr ? cfg.titleAr : cfg.titleEn) : undefined;
  title = title || (def ? t(def.titleKey) : pageKey);
  let content = cfg ? (isAr ? cfg.contentAr : cfg.contentEn) : undefined;
  content = content || (def ? t(def.contentKey) : "");
  const isEnabled = cfg ? cfg.isEnabled !== false : true;

  return { title, content, isEnabled };
}
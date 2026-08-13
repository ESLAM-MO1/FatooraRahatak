export type ThemeGroup = "b2c" | "b2b" | "special";

export interface StoreThemeMeta {
  id: string;
  nameKey: string;
  descKey: string;
  group: ThemeGroup;
  isB2B: boolean;
  isRestaurant: boolean;
  isPharmacy: boolean;
  previewPrimary: string;
  previewSecondary: string;
  previewAccent: string;
}

export interface StoreColors {
  headerColor: string;
  buttonColor: string;
  accentColor: string;
  heroFrom: string;
  heroTo: string;
  footerColor: string;
  newsletterColor: string;
}

export const STORE_THEMES: StoreThemeMeta[] = [
  {
    id: "professional-blue",
    nameKey: "storeSettings.tplProfessionalBlue",
    descKey: "storeSettings.tplProfessionalBlueDesc",
    group: "b2c",
    isB2B: false,
    isRestaurant: false,
    isPharmacy: false,
    previewPrimary: "#1E3A8A",
    previewSecondary: "#3B82F6",
    previewAccent: "#1E293B",
  },
  {
    id: "warm-modern",
    nameKey: "storeSettings.tplWarmModern",
    descKey: "storeSettings.tplWarmModernDesc",
    group: "b2c",
    isB2B: false,
    isRestaurant: false,
    isPharmacy: false,
    previewPrimary: "#C2410C",
    previewSecondary: "#F97316",
    previewAccent: "#292524",
  },
  {
    id: "natural-green",
    nameKey: "storeSettings.tplNaturalGreen",
    descKey: "storeSettings.tplNaturalGreenDesc",
    group: "b2c",
    isB2B: false,
    isRestaurant: false,
    isPharmacy: false,
    previewPrimary: "#166534",
    previewSecondary: "#22C55E",
    previewAccent: "#1C1917",
  },
  {
    id: "pink-elegant",
    nameKey: "storeSettings.tplPinkElegant",
    descKey: "storeSettings.tplPinkElegantDesc",
    group: "b2c",
    isB2B: false,
    isRestaurant: false,
    isPharmacy: false,
    previewPrimary: "#9D174D",
    previewSecondary: "#EC4899",
    previewAccent: "#1F1315",
  },
  {
    id: "royal-purple",
    nameKey: "storeSettings.tplRoyalPurple",
    descKey: "storeSettings.tplRoyalPurpleDesc",
    group: "b2c",
    isB2B: false,
    isRestaurant: false,
    isPharmacy: false,
    previewPrimary: "#5B21B6",
    previewSecondary: "#8B5CF6",
    previewAccent: "#1E1B2E",
  },
  {
    id: "black-minimal",
    nameKey: "storeSettings.tplBlackMinimal",
    descKey: "storeSettings.tplBlackMinimalDesc",
    group: "b2c",
    isB2B: false,
    isRestaurant: false,
    isPharmacy: false,
    previewPrimary: "#18181B",
    previewSecondary: "#71717A",
    previewAccent: "#09090B",
  },
  {
    id: "b2b-formal",
    nameKey: "storeSettings.tplB2BFormal",
    descKey: "storeSettings.tplB2BFormalDesc",
    group: "b2b",
    isB2B: true,
    isRestaurant: false,
    isPharmacy: false,
    previewPrimary: "#1F2937",
    previewSecondary: "#4B5563",
    previewAccent: "#111827",
  },
  {
    id: "b2b-calm",
    nameKey: "storeSettings.tplB2BCalm",
    descKey: "storeSettings.tplB2BCalmDesc",
    group: "b2b",
    isB2B: true,
    isRestaurant: false,
    isPharmacy: false,
    previewPrimary: "#0F766E",
    previewSecondary: "#14B8A6",
    previewAccent: "#134E4A",
  },
  {
    id: "restaurant",
    nameKey: "storeSettings.tplRestaurant",
    descKey: "storeSettings.tplRestaurantDesc",
    group: "special",
    isB2B: false,
    isRestaurant: true,
    isPharmacy: false,
    previewPrimary: "#7C2D12",
    previewSecondary: "#EA580C",
    previewAccent: "#292524",
  },
  {
    id: "pharmacy",
    nameKey: "storeSettings.tplPharmacy",
    descKey: "storeSettings.tplPharmacyDesc",
    group: "special",
    isB2B: false,
    isRestaurant: false,
    isPharmacy: true,
    previewPrimary: "#0369A1",
    previewSecondary: "#0EA5E9",
    previewAccent: "#0C4A6E",
  },
];

export const DEFAULT_COLORS: Record<string, StoreColors> = {
  "professional-blue": { headerColor: "#1E3A8A", buttonColor: "#3B82F6", accentColor: "#3B82F6", heroFrom: "#1E3A8A", heroTo: "#3B82F6", footerColor: "#1E293B", newsletterColor: "#1E3A8A" },
  "warm-modern": { headerColor: "#C2410C", buttonColor: "#EA580C", accentColor: "#F97316", heroFrom: "#C2410C", heroTo: "#F97316", footerColor: "#292524", newsletterColor: "#C2410C" },
  "natural-green": { headerColor: "#166534", buttonColor: "#16A34A", accentColor: "#22C55E", heroFrom: "#166534", heroTo: "#22C55E", footerColor: "#1C1917", newsletterColor: "#166534" },
  "pink-elegant": { headerColor: "#9D174D", buttonColor: "#DB2777", accentColor: "#EC4899", heroFrom: "#9D174D", heroTo: "#EC4899", footerColor: "#1F1315", newsletterColor: "#9D174D" },
  "royal-purple": { headerColor: "#5B21B6", buttonColor: "#7C3AED", accentColor: "#8B5CF6", heroFrom: "#5B21B6", heroTo: "#8B5CF6", footerColor: "#1E1B2E", newsletterColor: "#5B21B6" },
  "black-minimal": { headerColor: "#18181B", buttonColor: "#27272A", accentColor: "#71717A", heroFrom: "#18181B", heroTo: "#18181B", footerColor: "#09090B", newsletterColor: "#18181B" },
  "b2b-formal": { headerColor: "#1F2937", buttonColor: "#374151", accentColor: "#4B5563", heroFrom: "#1F2937", heroTo: "#1F2937", footerColor: "#111827", newsletterColor: "#1F2937" },
  "b2b-calm": { headerColor: "#0F766E", buttonColor: "#0D9488", accentColor: "#14B8A6", heroFrom: "#0F766E", heroTo: "#0F766E", footerColor: "#134E4A", newsletterColor: "#0F766E" },
  restaurant: { headerColor: "#7C2D12", buttonColor: "#DC2626", accentColor: "#EA580C", heroFrom: "#7C2D12", heroTo: "#EA580C", footerColor: "#292524", newsletterColor: "#7C2D12" },
  pharmacy: { headerColor: "#0369A1", buttonColor: "#0284C7", accentColor: "#0EA5E9", heroFrom: "#0369A1", heroTo: "#0EA5E9", footerColor: "#0C4A6E", newsletterColor: "#0369A1" },
};

const LEGACY_MAP: Record<string, string> = {
  basic: "professional-blue",
  "digital-menu": "restaurant",
  elegant: "royal-purple",
  colorful: "warm-modern",
};

export function resolveThemeConfig(themeName: string | null | undefined): StoreThemeMeta {
  const key = (themeName || "").trim();
  const resolved = LEGACY_MAP[key] || key || "professional-blue";
  return STORE_THEMES.find((c) => c.id === resolved) || STORE_THEMES[0];
}

export function getThemeById(id: string): StoreThemeMeta | undefined {
  return STORE_THEMES.find((c) => c.id === id);
}

export function getDefaultColors(themeId: string): StoreColors {
  return DEFAULT_COLORS[themeId] || DEFAULT_COLORS["professional-blue"];
}

export function parseStoreColors(themeId: string, colorsJson: string | null | undefined): StoreColors {
  const defaults = getDefaultColors(themeId);
  if (!colorsJson) return defaults;
  try {
    const parsed = JSON.parse(colorsJson);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}
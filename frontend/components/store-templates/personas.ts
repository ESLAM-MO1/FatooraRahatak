export type LayoutVariant = "classic" | "deals" | "story" | "luxury" | "lookbook" | "list" | "wholesale" | "catalog" | "menu" | "medical";
export type HeaderVariant = "solid" | "white" | "dark" | "glass";
export type HeroVariant = "centered" | "split" | "minimal" | "darkbanner";
export type CardVariant = "rounded" | "sharp" | "soft" | "bordered";
export type TitleStyle = "centerline" | "rightbar" | "topborder" | "leftbar";
export type TrustVariant = "strip" | "pill" | "none";

export interface TemplatePersona {
  layout: LayoutVariant;
  fontFamily: string;
  headingFont: string;
  headerVariant: HeaderVariant;
  heroVariant: HeroVariant;
  cardVariant: CardVariant;
  titleStyle: TitleStyle;
  trustVariant: TrustVariant;
  cardRadius: number;
  buttonRadius: number;
  gridCols: string;
  productsColumns: 1 | 2 | 3 | 4;
  heroHeight: number;
  heroTitleSize: number;
  showCountdown: boolean;
  showWishlist: boolean;
  showQuickView: boolean;
  showQuoteRequest: boolean;
  showOrderTypeToggle: boolean;
  showPrescriptionTag: boolean;
  showStoryBlock: boolean;
  showBulkPricingTable: boolean;
}

const DEFAULT_PERSONA: TemplatePersona = {
  layout: "classic",
  fontFamily: "'Segoe UI', 'Tajawal', system-ui, sans-serif",
  headingFont: "'Segoe UI', 'Tajawal', system-ui, sans-serif",
  headerVariant: "white",
  heroVariant: "centered",
  cardVariant: "rounded",
  titleStyle: "centerline",
  trustVariant: "strip",
  cardRadius: 14,
  buttonRadius: 999,
  gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  productsColumns: 4,
  heroHeight: 400,
  heroTitleSize: 40,
  showCountdown: false,
  showWishlist: false,
  showQuickView: false,
  showQuoteRequest: false,
  showOrderTypeToggle: false,
  showPrescriptionTag: false,
  showStoryBlock: false,
  showBulkPricingTable: false,
};

export const PERSONAS: Record<string, TemplatePersona> = {
  "professional-blue": {
    ...DEFAULT_PERSONA,
    layout: "classic",
  },
  "warm-modern": {
    ...DEFAULT_PERSONA,
    layout: "deals",
    fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
    headingFont: "'Trebuchet MS', 'Segoe UI', sans-serif",
    heroVariant: "split",
    cardVariant: "soft",
    titleStyle: "rightbar",
    trustVariant: "pill",
    cardRadius: 18,
    buttonRadius: 12,
    gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    productsColumns: 3,
    heroHeight: 440,
    heroTitleSize: 42,
    showCountdown: true,
  },
  "natural-green": {
    ...DEFAULT_PERSONA,
    layout: "story",
    fontFamily: "'Verdana', 'Segoe UI', sans-serif",
    headingFont: "'Verdana', 'Segoe UI', sans-serif",
    heroVariant: "minimal",
    cardVariant: "bordered",
    cardRadius: 12,
    buttonRadius: 10,
    heroHeight: 300,
    heroTitleSize: 32,
    showStoryBlock: true,
  },
  "pink-elegant": {
    ...DEFAULT_PERSONA,
    layout: "luxury",
    headingFont: "Georgia, 'Times New Roman', 'Tajawal', serif",
    cardVariant: "soft",
    trustVariant: "pill",
    cardRadius: 20,
    gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    productsColumns: 3,
    heroHeight: 420,
    heroTitleSize: 44,
    showWishlist: true,
    showQuickView: true,
  },
  "royal-purple": {
    ...DEFAULT_PERSONA,
    layout: "lookbook",
    fontFamily: "'Palatino Linotype', Georgia, serif",
    headingFont: "'Palatino Linotype', Georgia, serif",
    headerVariant: "dark",
    heroVariant: "split",
    cardVariant: "bordered",
    cardRadius: 10,
    buttonRadius: 6,
    gridCols: "grid-cols-1 sm:grid-cols-2",
    productsColumns: 2,
    heroHeight: 430,
    heroTitleSize: 42,
    showQuickView: true,
  },
  "black-minimal": {
    ...DEFAULT_PERSONA,
    layout: "list",
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    headingFont: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    headerVariant: "dark",
    heroVariant: "minimal",
    cardVariant: "sharp",
    titleStyle: "topborder",
    trustVariant: "none",
    cardRadius: 4,
    buttonRadius: 2,
    productsColumns: 1,
    heroHeight: 320,
    heroTitleSize: 38,
  },
  "b2b-formal": {
    ...DEFAULT_PERSONA,
    layout: "wholesale",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    headingFont: "'Segoe UI', Arial, sans-serif",
    headerVariant: "solid",
    heroVariant: "darkbanner",
    cardVariant: "sharp",
    titleStyle: "leftbar",
    cardRadius: 4,
    buttonRadius: 4,
    gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    productsColumns: 3,
    heroHeight: 380,
    heroTitleSize: 40,
    showQuoteRequest: true,
  },
  "b2b-calm": {
    ...DEFAULT_PERSONA,
    layout: "catalog",
    fontFamily: "'Arial', 'Segoe UI', sans-serif",
    headingFont: "'Arial', 'Segoe UI', sans-serif",
    headerVariant: "solid",
    cardVariant: "bordered",
    titleStyle: "rightbar",
    cardRadius: 12,
    heroHeight: 390,
    heroTitleSize: 40,
    showBulkPricingTable: true,
  },
  restaurant: {
    ...DEFAULT_PERSONA,
    layout: "menu",
    headingFont: "Georgia, 'Times New Roman', serif",
    headerVariant: "glass",
    heroVariant: "darkbanner",
    cardVariant: "soft",
    trustVariant: "pill",
    cardRadius: 16,
    gridCols: "grid-cols-1 lg:grid-cols-2",
    productsColumns: 2,
    heroHeight: 460,
    heroTitleSize: 44,
    showOrderTypeToggle: true,
  },
  pharmacy: {
    ...DEFAULT_PERSONA,
    layout: "medical",
    fontFamily: "'Arial', 'Segoe UI', sans-serif",
    headingFont: "'Arial', 'Segoe UI', sans-serif",
    heroVariant: "split",
    cardVariant: "soft",
    trustVariant: "pill",
    cardRadius: 16,
    heroHeight: 420,
    heroTitleSize: 40,
    showPrescriptionTag: true,
  },
};

export function getPersona(themeId: string): TemplatePersona {
  return PERSONAS[themeId] || DEFAULT_PERSONA;
}
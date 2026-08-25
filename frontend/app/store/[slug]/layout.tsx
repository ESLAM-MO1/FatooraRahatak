"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n/config";
import { StoreProvider, StoreData, StoreMethodInfo } from "@/components/StoreContext";
import ThemeRouter from "@/components/store-templates/ThemeRouter";
import MarketingScripts from "@/components/store-templates/MarketingScripts";
import { resolveThemeConfig, parseStoreColors } from "@/components/store-templates/configs";
import { parseMenuConfig, parseStorePages } from "@/lib/storePages";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

export interface StoreTrustBadge {
  icon: string;
  text: string;
  isEnabled: boolean;
}

export interface StoreTemplateProps {
  children: React.ReactNode;
  storeName: string;
  coverImage: string | null;
  slug: string;
  showHero?: boolean;
  storeId: number;
  logo: string | null;
  currency: string;
  defaultLanguage: string;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  whatsappUrl: string | null;
  snapchatUrl: string | null;
  tiktokUrl: string | null;
  telegramUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  pinterestUrl: string | null;
  shippingMethods: StoreMethodInfo[];
  paymentMethods: StoreMethodInfo[];
  isSearchEnabled: boolean;
  isReviewsEnabled: boolean;
  trustBadges: StoreTrustBadge[];
  menuConfigJson: string | null;
  storePagesJson: string | null;
}

function LoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f7f8fa" }} dir="rtl">
      <div className="flex flex-col items-center gap-3">
        <span className="w-7 h-7 rounded-full border-[3px] border-[var(--blue)] border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500">{t("store.loadingStore")}</p>
      </div>
    </div>
  );
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const params = useParams();
  const pathname = usePathname();
  const slug = params.slug as string;

  const [checking, setChecking] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [store, setStore] = useState<StoreData | null>(null);
  const [storeId, setStoreId] = useState<number | null>(null);

  const isRootStore = pathname === `/store/${slug}`;

  useEffect(() => {
    const load = async () => {
      setChecking(true);
      try {
        const res = await fetch(`${API_BASE}/public/stores/${slug}`);
        const data = await res.json();
        const d = data.data;
        setIsOffline(d.isOnline === false);
        setStoreId(d.id ?? null);
        const lang = d.defaultLanguage === "en" ? "en" : "ar";
        if (i18n.language !== lang) {
          i18n.changeLanguage(lang);
        }
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
        // التبويب يعرض اسم المتجر بدل اسم المنصة
        if (d.storeName) document.title = d.storeName;
        setStore({
          id: d.id ?? 0,
          storeName: d.storeName || "",
          storeSlug: slug,
          isOnline: d.isOnline,
          themeName: d.themeName || "basic",
          colorsJson: d.colorsJson || null,
          coverImage: d.coverImage || null,
          customCss: d.customCss || null,
          logo: d.logo || null,
          favicon: d.favicon || null,
          currency: d.currency || "SAR",
          defaultLanguage: lang,
          contactPhone: d.contactPhone || null,
          contactEmail: d.contactEmail || null,
          contactAddress: d.contactAddress || null,
          bioLink: d.bioLink || null,
          facebookUrl: d.facebookUrl || null,
          instagramUrl: d.instagramUrl || null,
          whatsappUrl: d.whatsappUrl || null,
          snapchatUrl: d.snapchatUrl || null,
          tiktokUrl: d.tiktokUrl || null,
          telegramUrl: d.telegramUrl || null,
          linkedinUrl: d.linkedinUrl || null,
          twitterUrl: d.twitterUrl || null,
          youtubeUrl: d.youtubeUrl || null,
          pinterestUrl: d.pinterestUrl || null,
          returnPolicyText: d.returnPolicyText || null,
          shippingMethods: d.shippingMethods || [],
          paymentMethods: d.paymentMethods || [],
          isSearchEnabled: d.isSearchEnabled ?? true,
          isReviewsEnabled: d.isReviewsEnabled ?? false,
          trustBadges: d.trustBadges || [],
          menuConfigJson: d.menuConfigJson || null,
          storePagesJson: d.storePagesJson || null,
        });
      } catch {
        setIsOffline(false);
      } finally {
        setChecking(false);
      }
    };
    load();
  }, [slug]);

  useEffect(() => {
    if (!store?.favicon) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      document.head.appendChild(link);
    }
    link.href = store.favicon;
  }, [store?.favicon]);

  if (checking) return <LoadingFallback />;

  if (isOffline) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f7f8fa" }} dir="rtl">
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
            <span style={{ fontSize: 26 }}>🔒</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">{t("store.storeOffline", "المتجر غير متاح حاليًا")}</h1>
          <p className="text-sm text-gray-500">{t("store.storeOfflineDesc", "صاحب المتجر عطّله مؤقتًا، حاول زيارة المتجر في وقت لاحق")}</p>
        </div>
      </div>
    );
  }

  if (!store || storeId === null) return null;

  const themeMeta = resolveThemeConfig(store.themeName);
  const colors = parseStoreColors(themeMeta.id, store.colorsJson);

  return (
    <StoreProvider value={store}>
      {store.customCss ? (
        <style dangerouslySetInnerHTML={{ __html: store.customCss }} />
      ) : null}
      <Suspense fallback={<LoadingFallback />}>
        <ThemeRouter
          themeMeta={themeMeta}
          colors={colors}
          storeId={storeId}
          storeName={store.storeName}
          coverImage={store.coverImage}
          logo={store.logo}
          currency={store.currency}
          defaultLanguage={store.defaultLanguage}
          slug={slug}
          showHero={isRootStore}
          contactPhone={store.contactPhone}
          contactEmail={store.contactEmail}
          contactAddress={store.contactAddress}
          facebookUrl={store.facebookUrl}
          instagramUrl={store.instagramUrl}
          whatsappUrl={store.whatsappUrl}
          snapchatUrl={store.snapchatUrl}
          tiktokUrl={store.tiktokUrl}
          telegramUrl={store.telegramUrl}
          linkedinUrl={store.linkedinUrl}
          twitterUrl={store.twitterUrl}
          youtubeUrl={store.youtubeUrl}
          pinterestUrl={store.pinterestUrl}
          shippingMethods={store.shippingMethods}
          paymentMethods={store.paymentMethods}
          isSearchEnabled={store.isSearchEnabled}
          isReviewsEnabled={store.isReviewsEnabled}
          trustBadges={store.trustBadges}
          menuConfigJson={store.menuConfigJson}
          storePagesJson={store.storePagesJson}
        >
          {children}
        </ThemeRouter>
      </Suspense>
      <MarketingScripts slug={slug} />
    </StoreProvider>
  );
}
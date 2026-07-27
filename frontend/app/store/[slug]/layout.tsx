"use client";
import { useEffect, useState, lazy, Suspense } from "react";
import { useParams, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { StoreProvider, StoreData, StoreMethodInfo } from "@/components/StoreContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

const StoreTemplateBasic = lazy(() => import("@/components/StoreTemplateBasic"));
const StoreTemplateDigitalMenu = lazy(() => import("@/components/StoreTemplateDigitalMenu"));
const StoreTemplateElegant = lazy(() => import("@/components/StoreTemplateElegant"));
const StoreTemplateColorful = lazy(() => import("@/components/StoreTemplateColorful"));

export interface StoreTemplateProps {
  children: React.ReactNode;
  primaryColor: string;
  storeName: string;
  coverImage: string | null;
  slug: string;
  showHero?: boolean;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  whatsappUrl: string | null;
  shippingMethods: StoreMethodInfo[];
  paymentMethods: StoreMethodInfo[];
}

const TEMPLATES: Record<string, React.ComponentType<StoreTemplateProps>> = {
  basic: StoreTemplateBasic,
  "digital-menu": StoreTemplateDigitalMenu,
  elegant: StoreTemplateElegant,
  colorful: StoreTemplateColorful,
};

function LoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f7f8fa" }} dir="rtl">
      <div className="flex flex-col items-center gap-3">
        <span className="w-7 h-7 rounded-full border-[3px] border-[var(--blue)] border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500">{t("store.loadingStore") || "جاري تحميل المتجر..."}</p>
      </div>
    </div>
  );
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const slug = params.slug as string;

  const [checking, setChecking] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [store, setStore] = useState<StoreData | null>(null);

  const isRootStore = pathname === `/store/${slug}`;

  useEffect(() => {
    const load = async () => {
      setChecking(true);
      try {
        const res = await fetch(`${API_BASE}/public/stores/${slug}`);
        const data = await res.json();
        const d = data.data;
        setIsOffline(d.isOnline === false);
        setStore({
          storeName: d.storeName || "",
          storeSlug: slug,
          isOnline: d.isOnline,
          themeName: d.themeName || "basic",
          primaryColor: d.primaryColor || "#12a8db",
          coverImage: d.coverImage || null,
          logo: d.logo || null,
          currency: d.currency || "SAR",
          contactPhone: d.contactPhone || null,
          contactEmail: d.contactEmail || null,
          contactAddress: d.contactAddress || null,
          bioLink: d.bioLink || null,
          facebookUrl: d.facebookUrl || null,
          instagramUrl: d.instagramUrl || null,
          whatsappUrl: d.whatsappUrl || null,
          returnPolicyText: d.returnPolicyText || null,
          shippingMethods: d.shippingMethods || [],
          paymentMethods: d.paymentMethods || [],
        });
      } catch {
        setIsOffline(false);
      } finally {
        setChecking(false);
      }
    };
    load();
  }, [slug]);

  if (checking) return <LoadingFallback />;
  if (isOffline) return null;
  if (!store) return null;

  const Template = TEMPLATES[store.themeName] || TEMPLATES.basic;

  return (
    <StoreProvider value={store}>
      <Suspense fallback={<LoadingFallback />}>
        <Template
          primaryColor={store.primaryColor}
          storeName={store.storeName}
          coverImage={store.coverImage}
          slug={slug}
          showHero={isRootStore}
          contactPhone={store.contactPhone}
          contactEmail={store.contactEmail}
          contactAddress={store.contactAddress}
          facebookUrl={store.facebookUrl}
          instagramUrl={store.instagramUrl}
          whatsappUrl={store.whatsappUrl}
          shippingMethods={store.shippingMethods}
          paymentMethods={store.paymentMethods}
        >
          {children}
        </Template>
      </Suspense>
    </StoreProvider>
  );
}
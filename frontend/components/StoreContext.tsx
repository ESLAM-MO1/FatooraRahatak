"use client";
import { createContext, useContext, ReactNode } from "react";

export interface StoreMethodInfo {
  type: string;
}

export interface StoreTrustBadge {
  icon: string;
  text: string;
  isEnabled: boolean;
}

export interface StoreData {
  id: number;
  storeName: string;
  storeSlug: string;
  isOnline: boolean;
  themeName: string;
  colorsJson: string | null;
  coverImage: string | null;
  customCss: string | null;
  logo: string | null;
  favicon: string | null;
  currency: string;
  defaultLanguage: string;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  bioLink: string | null;
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
  returnPolicyText: string | null;
  menuConfigJson: string | null;
  storePagesJson: string | null;
  shippingMethods: StoreMethodInfo[];
  paymentMethods: StoreMethodInfo[];
  isSearchEnabled: boolean;
  isReviewsEnabled: boolean;
  trustBadges: StoreTrustBadge[];
}

const StoreCtx = createContext<StoreData | null>(null);

export function StoreProvider({ value, children }: { value: StoreData; children: ReactNode }) {
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreData {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}
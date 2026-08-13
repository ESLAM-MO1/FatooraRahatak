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
  storeName: string;
  storeSlug: string;
  isOnline: boolean;
  themeName: string;
  colorsJson: string | null;
  coverImage: string | null;
  logo: string | null;
  currency: string;
  defaultLanguage: string;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  bioLink: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  whatsappUrl: string | null;
  returnPolicyText: string | null;
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
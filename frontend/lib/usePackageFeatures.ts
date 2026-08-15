"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";

export type PackageFeatureKey =
  | "hasPos"
  | "hasPayroll"
  | "hasAccountingFull"
  | "hasZatcaInvoice"
  | "hasCustomDomain"
  | "hasLogo"
  | "hasApiAccess"
  | "hasAffiliateMarketing"
  | "hasShippingIntegration"
  | "hasShippingCalculator"
  | "hasShippingTracking"
  | "hasShippingLabelPrinting"
  | "hasFreeShipping"
  | "hasCashOnDelivery"
  | "hasShippingDiscounts";

export interface PackageFeatures {
  hasPos: boolean;
  hasPayroll: boolean;
  hasAccountingFull: boolean;
  hasZatcaInvoice: boolean;
  hasCustomDomain: boolean;
  hasLogo: boolean;
  hasApiAccess: boolean;
  hasAffiliateMarketing: boolean;
  hasShippingIntegration: boolean;
  hasShippingCalculator: boolean;
  hasShippingTracking: boolean;
  hasShippingLabelPrinting: boolean;
  hasFreeShipping: boolean;
  hasCashOnDelivery: boolean;
  hasShippingDiscounts: boolean;
}

type StatusShape = Record<string, boolean>;

let cached: PackageFeatures | null = null;
let inFlight: Promise<PackageFeatures> | null = null;

async function loadFeatures(): Promise<PackageFeatures> {
  if (cached) return cached;
  if (!inFlight) {
    inFlight = api
      .get("/subscriptions/status")
      .then((res) => {
        const d = (res.data?.data ?? res.data) as StatusShape;
        cached = {
          hasPos: !!d.hasPos,
          hasPayroll: !!d.hasPayroll,
          hasAccountingFull: !!d.hasAccountingFull,
          hasZatcaInvoice: !!d.hasZatcaInvoice,
          hasCustomDomain: !!d.hasCustomDomain,
          hasLogo: !!d.hasLogo,
          hasApiAccess: !!d.hasApiAccess,
          hasAffiliateMarketing: !!d.hasAffiliateMarketing,
          hasShippingIntegration: !!d.hasShippingIntegration,
          hasShippingCalculator: !!d.hasShippingCalculator,
          hasShippingTracking: !!d.hasShippingTracking,
          hasShippingLabelPrinting: !!d.hasShippingLabelPrinting,
          hasFreeShipping: !!d.hasFreeShipping,
          hasCashOnDelivery: !!d.hasCashOnDelivery,
          hasShippingDiscounts: !!d.hasShippingDiscounts,
        };
        return cached;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function clearFeaturesCache() {
  cached = null;
}

export interface PackageFeatureState {
  features: PackageFeatures | null;
  loading: boolean;
  hasFeature: (key: PackageFeatureKey) => boolean;
  refresh: () => Promise<PackageFeatures>;
}

export interface FeatureGate {
  ready: boolean;
  allowed: boolean;
}

/**
 * Returns gate state for a single package feature.
 * - `ready === false`: package status still loading (datasets should not fetch yet).
 * - `ready === true && allowed === false`: feature locked — render RestrictedFeatureState.
 * - If the status request fails, the feature falls back to allowed so the backend 403
 *   interceptor remains the safety net rather than blocking legitimate users.
 */
export function usePackageFeature(featureKey: PackageFeatureKey): FeatureGate {
  const { features, loading } = usePackageFeatures();
  const ready = !loading;
  let allowed = true;
  if (features) allowed = !!features[featureKey];
  return { ready, allowed };
}

export function usePackageFeatures(): PackageFeatureState {
  const [features, setFeatures] = useState<PackageFeatures | null>(cached);
  const [loading, setLoading] = useState(!cached);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const f = await loadFeatures();
      setFeatures(f);
    } catch {
      setFeatures(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      load();
    }
  }, [load]);

  const refresh = useCallback(async () => {
    clearFeaturesCache();
    setLoading(true);
    try {
      const f = await loadFeatures();
      setFeatures(f);
      return f;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    features,
    loading,
    hasFeature: (key: PackageFeatureKey) => !!features?.[key],
    refresh,
  };
}
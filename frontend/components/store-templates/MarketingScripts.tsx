"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

interface ScriptIntegration {
  channel: string;
  code: string;
  additionalCode?: string | null;
}

export default function MarketingScripts({ slug }: { slug: string }) {
  const [integrations, setIntegrations] = useState<ScriptIntegration[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/public/stores/${slug}/scripts`, { method: "POST" })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        const list: ScriptIntegration[] = res?.data?.integrations || [];
        setIntegrations(list);
        const wa = list.find((i) => i.channel === "WhatsAppBusiness");
        setWhatsappNumber(wa?.code || "");
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    const loadScript = (src: string, id: string) => {
      if (document.getElementById(id)) return;
      const s = document.createElement("script");
      s.id = id;
      s.async = true;
      s.src = src;
      document.head.appendChild(s);
    };

    const facebook = integrations.find((i) => i.channel === "FacebookPixel");
    if (facebook?.code) {
      loadScript("https://connect.facebook.net/en_US/fbevents.js", "fb-pixel-sdk");
      const w = window as any;
      w.fbq = w.fbq || function (...args: unknown[]) { (w.fbq.q = w.fbq.q || []).push(args); };
      w.fbq("init", facebook.code);
      w.fbq("track", "PageView");
    }

    const instagram = integrations.find((i) => i.channel === "InstagramBusiness");
    if (instagram?.code) {
      loadScript("https://connect.facebook.net/en_US/fbevents.js", "ig-pixel-sdk");
      const w = window as any;
      w.fbq = w.fbq || function (...args: unknown[]) { (w.fbq.q = w.fbq.q || []).push(args); };
      w.fbq("init", instagram.code);
      w.fbq("track", "PageView");
    }

    const ga = integrations.find((i) => i.channel === "GoogleAnalytics");
    const googleAds = integrations.find((i) => i.channel === "GoogleAds");
    const landingPages = integrations.find((i) => i.channel === "LandingPages");
    const searchPages = integrations.find((i) => i.channel === "SearchPages");
    const googleCodes = [ga?.code, googleAds?.code, landingPages?.code, searchPages?.code].filter(Boolean) as string[];
    if (googleCodes.length > 0) {
      loadScript(`https://www.googletagmanager.com/gtag/js?id=${googleCodes[0]}`, "ga-script");
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      w.gtag = function (...args: unknown[]) { w.dataLayer.push(args); };
      w.gtag("js", new Date());
      googleCodes.forEach((id) => {
        w.gtag("config", id);
        if (id.startsWith("AW-")) {
          w.gtag("config", id, { send_page_view: true });
        }
      });
      w.gtag("set", "linker", { domains: ["googlesyndication.com"] });
    }

    const tiktok = integrations.find((i) => i.channel === "TikTokPixel");
    if (tiktok?.code) {
      loadScript("https://analytics.tiktok.com/i18n/pixel/events.js", "tt-pixel-sdk");
      const w = window as any;
      w.ttq = w.ttq || [];
      w.ttq.load(tiktok.code);
      w.ttq.page();
    }

    const snapchat = integrations.find((i) => i.channel === "SnapchatPixel");
    if (snapchat?.code) {
      loadScript("https://tr.snapchat.com/si.js", "snap-pixel-sdk");
      const w = window as any;
      w.snaptr = w.snaptr || function (...args: unknown[]) { (w.snaptr.q = w.snaptr.q || []).push(args); };
      w.snaptr("init", snapchat.code);
      w.snaptr("track", "PAGE_VIEW");
    }
  }, [integrations]);

  if (!whatsappNumber) return null;

  return (
    <a
      href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      style={{ position: "fixed", bottom: 18, left: 18, zIndex: 9999, width: 52, height: 52, borderRadius: "50%", background: "#25D366", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(0,0,0,.18)" }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.85 9.85 0 0 0 12.04 2Zm5.83 14.12c-.25.7-1.45 1.33-2.02 1.42-.52.08-1.17.11-1.88-.12-.44-.14-1-.32-1.71-.63-3.03-1.3-5-4.35-5.15-4.55-.15-.2-1.23-1.63-1.23-3.11 0-1.48.78-2.21 1.05-2.51.28-.3.6-.38.8-.38.2 0 .4 0 .57.01.18.01.43-.07.68.53.25.61.86 2.11.93 2.26.08.15.13.33.03.54-.1.2-.15.32-.3.5-.15.18-.32.4-.45.53-.15.15-.31.32-.13.63.18.3.79 1.3 1.7 2.11 1.17 1.04 2.16 1.37 2.46 1.52.3.15.48.13.66-.08.18-.2.76-.88.96-1.18.2-.3.4-.25.68-.15.27.1 1.74.82 2.04.97.3.15.5.22.57.35.08.13.08.7-.17 1.4Z" />
      </svg>
    </a>
  );
}
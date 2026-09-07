"use client";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import Icon from "@/components/Icon";
import LangSwitch from "@/components/LangSwitch";
import "@/lib/i18n/config";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

interface SiteMenuItem {
  id: number;
  location: string;
  titleAr: string;
  titleEn: string;
  href: string;
  icon?: string | null;
  parentId?: number | null;
  sortOrder: number;
  isActive: boolean;
}

interface ResolvedLink {
  key: string;
  href: string;
  label: string;
  icon?: string;
  children: ResolvedLink[];
}

type LinkDef = { labelKey: string; href: string; icon?: string };

const FEATURES_LINKS: LinkDef[] = [
  { labelKey: "page.accountingSystem", href: "/accounting-system", icon: "book" },
  { labelKey: "page.posSystem", href: "/pos-system", icon: "cashier" },
  { labelKey: "page.invoicing", href: "/invoicing", icon: "receipt" },
  { labelKey: "page.ecommerce", href: "/ecommerce", icon: "store" },
  { labelKey: "page.inventoryManagement", href: "/inventory-management", icon: "warehouse" },
  { labelKey: "page.smartReports", href: "/smart-reports", icon: "chart" },
  { labelKey: "page.paymentLinks", href: "/payment-links", icon: "link" },
  { labelKey: "page.pos", href: "/pos", icon: "package" },
  { labelKey: "page.paymentGateway", href: "/payment-gateway", icon: "card" },
  { labelKey: "page.websiteIntegration", href: "/website-integration", icon: "globe" },
  { labelKey: "page.usersPermissions", href: "/users-permissions", icon: "users" },
  { labelKey: "page.packagesDomains", href: "/packages-domains", icon: "crown" },
  { labelKey: "page.generalAccounts", href: "/general-accounts", icon: "ledger" },
  { labelKey: "page.affiliate", href: "/affiliate", icon: "share" },
  { labelKey: "page.productManagement", href: "/product-management", icon: "box" },
  { labelKey: "page.customerManagement", href: "/customer-management", icon: "userGroup" },
  { labelKey: "page.purchases", href: "/purchases", icon: "truck" },
  { labelKey: "page.pricing", href: "/pricing", icon: "tag" },
  { labelKey: "page.suppliers", href: "/suppliers", icon: "clipboard" },
  { labelKey: "page.sales", href: "/sales", icon: "wallet" },
  { labelKey: "page.reports", href: "/reports", icon: "layers" },
];

const ABOUT_LINKS: LinkDef[] = [
  { labelKey: "page.about", href: "/about" },
  { labelKey: "page.pricing", href: "/packages" },
  { labelKey: "page.affiliate", href: "/affiliate" },
  { labelKey: "page.careers", href: "/careers" },
  { labelKey: "page.academy", href: "/academy" },
  { labelKey: "page.freeTools", href: "/free-tools" },
];

const FOOTER_TOOLS: LinkDef[] = [
  { labelKey: "page.accountingSystem", href: "/accounting-system" },
  { labelKey: "page.posSystem", href: "/pos-system" },
  { labelKey: "page.invoicing", href: "/invoicing" },
  { labelKey: "page.ecommerce", href: "/ecommerce" },
  { labelKey: "page.inventoryManagement", href: "/inventory-management" },
  { labelKey: "page.smartReports", href: "/smart-reports" },
  { labelKey: "page.paymentLinks", href: "/payment-links" },
  { labelKey: "page.pos", href: "/pos" },
  { labelKey: "page.paymentGateway", href: "/payment-gateway" },
  { labelKey: "page.websiteIntegration", href: "/website-integration" },
];

const FOOTER_ABOUT: LinkDef[] = [
  { labelKey: "page.about", href: "/about" },
  { labelKey: "page.pricing", href: "/packages" },
  { labelKey: "page.terms", href: "/terms" },
  { labelKey: "page.privacy", href: "/privacy" },
  { labelKey: "page.shippingPolicy", href: "/shipping-policy" },
  { labelKey: "page.returnPolicy", href: "/return-policy" },
  { labelKey: "page.affiliate", href: "/affiliate" },
  { labelKey: "page.careers", href: "/careers" },
  { labelKey: "page.academy", href: "/academy" },
  { labelKey: "page.freeTools", href: "/free-tools" },
];

const FOOTER_HELP: LinkDef[] = [
  { labelKey: "page.contact", href: "/contact" },
  { labelKey: "page.faq", href: "/faq" },
  { labelKey: "page.helpCenter", href: "/help-center" },
  { labelKey: "page.terms", href: "/terms" },
];

interface BlogPost {
  id: number;
  titleAr: string;
  titleEn?: string;
  slugAr: string;
  slugEn?: string;
}

interface FooterData {
  description: string;
  copyright: string;
  social: { facebook: string; instagram: string; whatsapp: string; snapchat: string; tiktok: string; telegram: string; linkedin: string };
}

interface RawFooterData {
  descriptionAr?: string;
  descriptionEn?: string;
  copyrightAr?: string;
  copyrightEn?: string;
  social?: Partial<FooterData["social"]>;
}

function pickLang(isAr: boolean, ar?: string, en?: string): string {
  const a = ar || "";
  const e = en || "";
  return isAr ? (a || e) : (e || a);
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const featuresBtnRef = useRef<HTMLButtonElement>(null);
  const featuresDropdownRef = useRef<HTMLDivElement>(null);
  const aboutBtnRef = useRef<HTMLButtonElement>(null);
  const aboutDropdownRef = useRef<HTMLDivElement>(null);
  const [featuresPos, setFeaturesPos] = useState<{ top: number; left: number } | null>(null);
  const [aboutPos, setAboutPos] = useState<{ top: number; left: number } | null>(null);
  const isAr = i18n.language === "ar";

  // Computes a dropdown's fixed `left` offset so it always stays fully inside the
  // viewport, opening toward the natural reading direction (RTL -> panel's right
  // edge meets the button; LTR -> panel's left edge meets the button), then clamps
  // it within a 16px margin on both sides so it never gets clipped off-screen.
  const computeDropdownLeft = (btnRect: DOMRect, panelWidth: number) => {
    const margin = 16;
    const desiredLeft = isAr ? btnRect.right - panelWidth : btnRect.left;
    const maxLeft = window.innerWidth - panelWidth - margin;
    return Math.max(margin, Math.min(desiredLeft, maxLeft));
  };
  const [rawFooter, setRawFooter] = useState<RawFooterData | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [menus, setMenus] = useState<SiteMenuItem[]>([]);
  const footer: FooterData = rawFooter
    ? {
        description: pickLang(isAr, rawFooter.descriptionAr, rawFooter.descriptionEn) || t("footer.description"),
        copyright: pickLang(isAr, rawFooter.copyrightAr, rawFooter.copyrightEn) || t("footer.copyright"),
        social: {
          facebook: rawFooter.social?.facebook || "#",
          instagram: rawFooter.social?.instagram || "#",
          whatsapp: rawFooter.social?.whatsapp || "#",
          snapchat: rawFooter.social?.snapchat || "#",
          tiktok: rawFooter.social?.tiktok || "#",
          telegram: rawFooter.social?.telegram || "#",
          linkedin: rawFooter.social?.linkedin || "#",
        },
      }
    : { description: t("footer.description"), copyright: t("footer.copyright"), social: { facebook: "#", instagram: "#", whatsapp: "#", snapchat: "#", tiktok: "#", telegram: "#", linkedin: "#" } };

  useEffect(() => {
    fetch(`${API_BASE}/site/menus`)
      .then(r => r.json())
      .then(json => {
        const data = json.data || json;
        if (Array.isArray(data)) setMenus(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/site/landing-page`).then(r => r.json()).then(json => {
      const d = json.data || json;
      if (d.footer) setRawFooter(d.footer);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/site/blog`).then(r => r.json()).then(json => {
      const data = json.data || json;
      if (Array.isArray(data)) setBlogPosts(data.slice(0, 3));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const insideFeaturesBtn = featuresRef.current?.contains(target);
      const insideFeaturesDropdown = featuresDropdownRef.current?.contains(target);
      const insideAboutBtn = aboutRef.current?.contains(target);
      const insideAboutDropdown = aboutDropdownRef.current?.contains(target);
      if (featuresOpen && !insideFeaturesBtn && !insideFeaturesDropdown) setFeaturesOpen(false);
      if (aboutOpen && !insideAboutBtn && !insideAboutDropdown) setAboutOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [featuresOpen, aboutOpen]);

  useLayoutEffect(() => {
    if (!featuresOpen || !featuresBtnRef.current) return;
    const update = () => {
      const btn = featuresBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setFeaturesPos({ top: rect.bottom + 8, left: computeDropdownLeft(rect, 920) });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      setFeaturesPos(null);
    };
  }, [featuresOpen, isAr]);

  useLayoutEffect(() => {
    if (!aboutOpen || !aboutBtnRef.current) return;
    const update = () => {
      const btn = aboutBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setAboutPos({ top: rect.bottom + 8, left: computeDropdownLeft(rect, 240) });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      setAboutPos(null);
    };
  }, [aboutOpen, isAr]);

  const resolved = (location: string, fallback: LinkDef[]): ResolvedLink[] => {
    const isAr = i18n.language === "ar";
    const active = menus.filter(m => m.location === location && m.isActive);
    if (active.length > 0) {
      const byId = new Map<number, ResolvedLink>();
      const roots: ResolvedLink[] = [];
      const sort = (a: SiteMenuItem, b: SiteMenuItem) => a.sortOrder - b.sortOrder || a.id - b.id;
      active.sort(sort).forEach(m => {
        byId.set(m.id, {
          key: String(m.id),
          href: m.href,
          label: isAr ? (m.titleAr || m.titleEn) : (m.titleEn || m.titleAr),
          icon: m.icon || undefined,
          children: [],
        });
      });
      active.sort(sort).forEach(m => {
        const node = byId.get(m.id)!;
        if (m.parentId && byId.has(m.parentId)) {
          byId.get(m.parentId)!.children.push(node);
        } else {
          roots.push(node);
        }
      });
      return roots;
    }
    return fallback.map((l, i) => ({ key: l.href + i, href: l.href, label: t(l.labelKey), icon: l.icon, children: [] }));
  };

  const featuresLinks = resolved("features", FEATURES_LINKS);
  const aboutLinks = resolved("about", ABOUT_LINKS);
  const footerTools = resolved("footer-tools", FOOTER_TOOLS);
  const footerAbout = resolved("footer-about", FOOTER_ABOUT);
  const footerHelp = resolved("footer-help", FOOTER_HELP);

  const renderHeaderItems = (links: ResolvedLink[], withArrow: boolean, onOpen: () => void,
    btnRef: React.RefObject<HTMLButtonElement>, dropdownRef: React.RefObject<HTMLDivElement>,
    pos: { top: number; right: number } | null, width: string, colStyle: "grid2" | "list") => {
    return (
      <div className="relative">
        <button
          ref={btnRef}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-[14px] font-bold transition-colors hover:bg-gray-100"
          style={{ color: "var(--ink)" }}
          onClick={onOpen}
        >
          {withArrow}
        </button>
        {pos && typeof document === "object" && createPortal(
          <div
            ref={dropdownRef}
            className="rounded-xl border shadow-lg bg-white overflow-hidden"
            style={{
              position: "fixed",
              top: pos.top,
              right: pos.right,
              width,
              maxHeight: "calc(100vh - 100px)",
              zIndex: 9999,
              borderColor: "var(--border)",
            }}
          >
            <div className="p-2">
              <div className={colStyle === "grid2" ? "grid grid-cols-2 gap-1.5" : ""}>
                {links.map(link => (
                  <div key={link.key} className="relative group">
                    <Link
                      href={link.href}
                      className="flex items-center gap-2 px-2 py-2 rounded-lg text-[12px] font-bold transition-colors hover:bg-gray-50"
                      style={{ color: "var(--ink)" }}
                      onClick={() => onOpen()}
                    >
                      {link.icon && (
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}>
                          <Icon name={(link.icon as any) || "store"} size={16} />
                        </span>
                      )}
                      {link.label}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  };

  return (
    <div>
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md bg-white/90"
        style={{ borderColor: "var(--border)" }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="brand-logo-frame" style={{ width: 44, height: 44 }}>
              <img src="/logo.png" alt={t("brand.name")} className="brand-logo" />
            </div>
            <span className="text-[17px] font-extrabold" style={{ color: "var(--blue-deep)" }}>
              {t("brand.name")}
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            <div className="relative" ref={featuresRef}>
              <button
                ref={featuresBtnRef}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-[14px] font-bold transition-colors hover:bg-gray-100"
                style={{ color: "var(--ink)" }}
                onClick={() => { setFeaturesOpen(!featuresOpen); setAboutOpen(false); }}
              >
                {t("nav.features")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {featuresOpen && featuresPos && typeof document === "object" && createPortal(
                <div
                  ref={featuresDropdownRef}
                  className="rounded-xl border shadow-lg bg-white overflow-hidden"
                  style={{
                    position: "fixed",
                    top: featuresPos.top,
                    left: featuresPos.left,
                    width: "920px",
                    maxWidth: "calc(100vw - 32px)",
                    maxHeight: "calc(100vh - " + (featuresPos.top + 24) + "px)",
                    overflowY: "auto",
                    zIndex: 9999,
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="flex">
                    <div className="flex-1 grid grid-cols-3 gap-1.5 p-2">
                      {featuresLinks.map(link => (
                        <div key={link.key} className="relative group">
                          <Link
                            href={link.href}
                            className="flex items-center gap-2 px-2 py-2 rounded-lg text-[12px] font-bold transition-colors hover:bg-gray-50"
                            style={{ color: "var(--ink)" }}
                            onClick={() => setFeaturesOpen(false)}
                          >
                            <span
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}
                            >
                              <Icon name={(link.icon as any) || "store"} size={16} />
                            </span>
                            {link.label}
                            {link.children.length > 0 && (
                              <svg className="ms-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 6l6 6-6 6" />
                              </svg>
                            )}
                          </Link>
                          {link.children.length > 0 && (
                            <div className="absolute top-0 left-full ml-1 hidden group-hover:block min-w-[200px] rounded-lg border shadow-lg bg-white p-1.5" style={{ borderColor: "var(--border)" }}>
                              {link.children.map(child => (
                                <Link
                                  key={child.key}
                                  href={child.href}
                                  className="block px-3 py-2 rounded-lg text-[12.5px] font-bold transition-colors hover:bg-gray-50"
                                  style={{ color: "var(--ink)" }}
                                  onClick={() => setFeaturesOpen(false)}
                                >
                                  {child.label}
                                  {child.children.length > 0 && (
                                    <div className="mt-1 ml-3 border-s ps-2" style={{ borderColor: "var(--border)" }}>
                                      {child.children.map(grand => (
                                        <Link key={grand.key} href={grand.href} className="block py-1 text-[12px]" style={{ color: "var(--sub)" }} onClick={() => setFeaturesOpen(false)}>
                                          {grand.label}
                                        </Link>
                                      ))}
                                    </div>
                                  )}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>

            <div className="relative" ref={aboutRef}>
              <button
                ref={aboutBtnRef}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-[14px] font-bold transition-colors hover:bg-gray-100"
                style={{ color: "var(--ink)" }}
                onClick={() => { setAboutOpen(!aboutOpen); setFeaturesOpen(false); }}
              >
                {t("nav.about")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {aboutOpen && aboutPos && typeof document === "object" && createPortal(
                <div
                  ref={aboutDropdownRef}
                  className="rounded-xl border shadow-lg bg-white overflow-hidden"
                  style={{
                    position: "fixed",
                    top: aboutPos.top,
                    left: aboutPos.left,
                    width: "240px",
                    maxHeight: "calc(100vh - 100px)",
                    zIndex: 9999,
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="p-2">
                    {aboutLinks.map(link => (
                      <div key={link.key} className="relative group">
                        <Link
                          href={link.href}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13.5px] font-bold transition-colors hover:bg-gray-50"
                          style={{ color: "var(--ink)" }}
                          onClick={() => setAboutOpen(false)}
                        >
                          {link.label}
                          {link.children.length > 0 && (
                            <svg className="ms-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          )}
                        </Link>
                        {link.children.length > 0 && (
                          <div className="absolute top-0 left-full ml-1 hidden group-hover:block min-w-[200px] rounded-lg border shadow-lg bg-white p-1.5" style={{ borderColor: "var(--border)" }}>
                            {link.children.map(child => (
                              <Link
                                key={child.key}
                                href={child.href}
                                className="block px-3 py-2 rounded-lg text-[12.5px] font-bold transition-colors hover:bg-gray-50"
                                style={{ color: "var(--ink)" }}
                                onClick={() => setAboutOpen(false)}
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>,
                document.body
              )}
            </div>

            <Link
              href="/contact"
              className="px-3 py-2 rounded-lg text-[14px] font-bold transition-colors hover:bg-gray-100"
              style={{ color: "var(--ink)" }}
            >
              {t("nav.contact")}
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <LangSwitch />
            <Link
              href="/login"
              className="px-5 py-2 rounded-lg text-[14px] font-bold transition-colors hover:bg-gray-100"
              style={{ color: "var(--ink)" }}
            >
              {t("nav.login")}
            </Link>
            <Link href="/register" className="btn btn-primary !text-[13px] !py-2 !px-5">
              {t("nav.register")}
            </Link>
          </div>

          <div className="lg:hidden flex items-center gap-1.5">
            <LangSwitch />
            <button
              className="p-2 rounded-lg hover:bg-gray-100"
              style={{ color: "var(--ink)" }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={t("nav.mobileMenu")}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
              </svg>
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="lg:hidden border-t bg-white shadow-lg" style={{ borderColor: "var(--border)" }}>
            <div className="px-4 py-4 space-y-1">
              <p className="px-3 py-1 text-[12px] font-bold" style={{ color: "var(--sub)" }}>
                {t("nav.mobileFeatures")}
              </p>
              {featuresLinks.map(link => (
                <div key={link.key}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-bold"
                    style={{ color: "var(--ink)" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span style={{ color: "var(--blue)" }}>
                      <Icon name={(link.icon as any) || "store"} size={18} />
                    </span>
                    {link.label}
                  </Link>
                  {link.children.length > 0 && (
                    <div className="ms-4 border-s ps-3 space-y-1" style={{ borderColor: "var(--border)" }}>
                      {link.children.map(child => (
                        <Link
                          key={child.key}
                          href={child.href}
                          className="block px-3 py-2 rounded-lg text-[13px] font-bold"
                          style={{ color: "var(--sub)" }}
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="border-t my-3" style={{ borderColor: "var(--border)" }} />
              <p className="px-3 py-1 text-[12px] font-bold" style={{ color: "var(--sub)" }}>
                {t("nav.mobileAbout")}
              </p>
              {aboutLinks.map(link => (
                <div key={link.key}>
                  <Link
                    href={link.href}
                    className="block px-3 py-2.5 rounded-lg text-[14px] font-bold"
                    style={{ color: "var(--ink)" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                  {link.children.length > 0 && (
                    <div className="ms-4 border-s ps-3 space-y-1" style={{ borderColor: "var(--border)" }}>
                      {link.children.map(child => (
                        <Link
                          key={child.key}
                          href={child.href}
                          className="block px-3 py-2 rounded-lg text-[13px] font-bold"
                          style={{ color: "var(--sub)" }}
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="border-t my-3" style={{ borderColor: "var(--border)" }} />
              <Link
                href="/contact"
                className="block px-3 py-2.5 rounded-lg text-[14px] font-bold"
                style={{ color: "var(--ink)" }}
                onClick={() => setMobileOpen(false)}
              >
                {t("nav.contact")}
              </Link>
              <hr style={{ borderColor: "var(--border)" }} />
              <div className="flex items-center gap-2 px-3 pt-2">
                <Link
                  href="/login"
                  className="flex-1 btn btn-outline !text-[13px] !py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.login")}
                </Link>
                <Link
                  href="/register"
                  className="flex-1 btn btn-primary !text-[13px] !py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.register")}
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main style={{ minHeight: "60vh" }}>{children}</main>

      <footer style={{ backgroundColor: "var(--blue-deep)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="brand-logo-frame" style={{ width: 54, height: 54 }}>
                  <img src="/logo.png" alt={t("brand.name")} className="brand-logo" />
                </div>
                <span className="text-[18px] font-bold text-white">{t("brand.name")}</span>
              </div>
              <p className="text-[13.5px] leading-relaxed" style={{ color: "#BFE6F3" }}>
                {footer.description}
              </p>
            </div>

            <div>
              <h3 className="text-[15px] font-bold text-white mb-5">{t("footer.tools")}</h3>
              <ul className="space-y-3">
                {footerTools.map(link => (
                  <li key={link.key}>
                    <Link href={link.href} className="text-[13.5px] transition-colors hover:text-white" style={{ color: "#BFE6F3" }}>
                      {link.label}
                    </Link>
                    {link.children.length > 0 && (
                      <ul className="mt-2 space-y-2 ms-3 border-s ps-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                        {link.children.map(child => (
                          <li key={child.key}>
                            <Link href={child.href} className="text-[12.5px] transition-colors hover:text-white" style={{ color: "#9FCBDD" }}>
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[15px] font-bold text-white mb-5">{t("footer.about")}</h3>
              <ul className="space-y-3">
                {footerAbout.map(link => (
                  <li key={link.key}>
                    <Link href={link.href} className="text-[13.5px] transition-colors hover:text-white" style={{ color: "#BFE6F3" }}>
                      {link.label}
                    </Link>
                    {link.children.length > 0 && (
                      <ul className="mt-2 space-y-2 ms-3 border-s ps-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                        {link.children.map(child => (
                          <li key={child.key}>
                            <Link href={child.href} className="text-[12.5px] transition-colors hover:text-white" style={{ color: "#9FCBDD" }}>
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[15px] font-bold text-white mb-5">{t("footer.help")}</h3>
              <ul className="space-y-3">
                {footerHelp.map(link => (
                  <li key={link.key}>
                    <Link href={link.href} className="text-[13.5px] transition-colors hover:text-white" style={{ color: "#BFE6F3" }}>
                      {link.label}
                    </Link>
                    {link.children.length > 0 && (
                      <ul className="mt-2 space-y-2 ms-3 border-s ps-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                        {link.children.map(child => (
                          <li key={child.key}>
                            <Link href={child.href} className="text-[12.5px] transition-colors hover:text-white" style={{ color: "#9FCBDD" }}>
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {blogPosts.length > 0 && (
            <div className="mt-12 pt-10 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              <h3 className="text-[17px] font-bold text-white mb-6">{t("footer.blog")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {blogPosts.map((post) => (
                  <Link key={post.id} href={i18n.language === "en" && post.slugEn ? `/blog/${post.slugEn}` : `/blog/${post.slugAr}`} className="block p-5 rounded-xl transition-colors" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                    <h4 className="text-[14px] font-bold text-white mb-1">{i18n.language === "en" && post.titleEn ? post.titleEn : post.titleAr}</h4>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-3">
              {footer.social.facebook !== "#" && footer.social.facebook && (
                <Link href={footer.social.facebook} aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#BFE6F3"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                </Link>
              )}
              {footer.social.instagram !== "#" && footer.social.instagram && (
                <Link href={footer.social.instagram} aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BFE6F3" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><path d="M17.5 6.5h.01" /></svg>
                </Link>
              )}
              {footer.social.whatsapp !== "#" && footer.social.whatsapp && (
                <Link href={footer.social.whatsapp} aria-label="WhatsApp" target="_blank" rel="noopener noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#BFE6F3"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                </Link>
              )}
              {footer.social.snapchat !== "#" && (
                <Link href={footer.social.snapchat} aria-label="Snapchat" target="_blank" rel="noopener noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BFE6F3" strokeWidth="2"><path d="M12 3c3.2 0 5.3 2.1 5.3 4.9 0 1.9-.3 3.1-.8 4.5-.1.3.1.5.4.5.4 0 1-.1 1.6-.3.2-.1.4.1.3.3-.2.9-2.1 2-3.6 2.3-.2 0-.3.3-.2.5.1.3.6.8 1.6.8.8-.1 1.3.2 1.3.6 0 .9-1.8 1.3-3.1 1.3-1.3 0-2-.4-2.9-.8-.7-.4-1.4-.3-2.2 0-.8.4-1.6.8-2.9.8-1.3 0-3.1-.4-3.1-1.3 0-.4.5-.7 1.3-.6 1 0 1.5-.5 1.6-.8 0-.2-.1-.5-.2-.5-1.5-.3-3.4-1.4-3.6-2.3 0-.2.1-.4.3-.3.6.2 1.2.3 1.6.3.3 0 .5-.2.4-.5-.5-1.4-.8-2.6-.8-4.5C6.7 5.1 8.8 3 12 3z" /></svg>
                </Link>
              )}
              {footer.social.tiktok !== "#" && (
                <Link href={footer.social.tiktok} aria-label="TikTok" target="_blank" rel="noopener noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BFE6F3" strokeWidth="2"><path d="M13.5 3h3c.1 0 .2.1.2.3.1 1.6 1.1 2.9 2.6 3.2.2 0 .4.2.3.4v2.7c0 .3-.2.5-.5.5-1.2 0-2.3-.4-3.1-1.1v5.5c0 2.6-2 4.5-4.2 4.5A4.1 4.1 0 0 1 7.5 15c0-2.4 2-4.3 4.6-4.1.3 0 .6.1.9.3V13.5a2 2 0 0 0-1-.3 2.1 2.1 0 0 0 0 4.2c1.1 0 1.5-.8 1.5-2V3z" /></svg>
                </Link>
              )}
              {footer.social.telegram !== "#" && (
                <Link href={footer.social.telegram} aria-label="Telegram" target="_blank" rel="noopener noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BFE6F3" strokeWidth="2"><path d="M20.7 4.2 3.7 10.9c-.8.3-1 1.4-.3 1.8l4 2.3.3 4.4c0 .6.8.9 1.4.5l2.5-1.9 3.9 2.8c.5.4 1.3.1 1.5-.6l3.6-14.6c.2-.8-.5-1.5-1.3-1.2zM8.4 14.6l9.6-6.6c.2-.1.4.1.2.3l-7.9 7.6c-.3.3-.5.7-.6 1.1l-.3 2.1c0 .3-.5.3-.5-.1l-.5-3.2c0-.4 0-.8 0-.8s0 0 .4-.4z" /></svg>
                </Link>
              )}
              {footer.social.linkedin !== "#" && (
                <Link href={footer.social.linkedin} aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BFE6F3" strokeWidth="2"><path d="M6.5 8H4v12h2.5V8z" /><circle cx="5.5" cy="5" r="1.8" /><path d="M20 13.4c0-3-1.6-4.6-3.8-4.6-1.3 0-2 .5-2.5 1.2V8.9H11V20h2.6v-6.1c0-1.2.6-2.1 1.8-2.1s1.6.9 1.6 2.1V20H20v-6.6z" /></svg>
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[12.5px]" style={{ color: "#9FCBDD" }}>
              &copy; {new Date().getFullYear()} {footer.copyright}
            </p>
          </div>
        </div>
      </footer>

      <a
        href="https://wa.me/966531118224"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="flex items-center gap-2 rounded-full px-4 py-3 font-bold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
        style={{ position: "fixed", bottom: 22, right: 22, zIndex: 60, backgroundColor: "#25D366", boxShadow: "0 8px 24px rgba(37,211,102,0.35)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.3c-.6.3-1.7 1.5-2.9 1.5s-2.5-.9-4.4-2.8C8.3 11 7.5 9.7 7.5 8.5s1.2-2.3 1.5-2.9c.1-.3.2-.7.1-1-.1-.4-.5-.8-.7-1-.3-.3-.6-.5-.9-.5h-.9c-.4 0-.8.1-1.1.4-.4.3-.9.9-1.2 1.5-.4.6-.7 1.5-.7 2.4 0 1.5.6 3 1.8 4.6 1.2 1.6 2.8 3.1 4.8 4.1 1.5.7 2.7 1 3.7 1.2.5.1 1 .1 1.5.1.5 0 1.1-.1 1.6-.4.5-.3 1-.7 1.3-1.2.3-.5.5-1 .5-1.6v-1c0-.3-.2-.6-.5-.7-.3-.1-.8-.3-1.4-.6Z" /></svg>
        <span className="text-[13px]">{t("footer.help")}</span>
      </a>
    </div>
  );
}
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "./site-layout";
import "@/lib/i18n/config";
import PackageCard from "@/components/PackageCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

interface StatItem { number: string; label: string }
interface FeatureContent { title: string; description: string; image: string; knowMoreText: string; knowMoreHref: string }
interface DistinctiveCard { title: string; description: string }
interface PackageItem {
  id: number;
  name: string;
  monthlyPrice: number;
  maxProducts: number | null;
  maxEmployees: number;
  maxWarehouses: number;
  hasAccountingFull: boolean;
  hasPayroll: boolean;
  hasZatcaInvoice: boolean;
  hasCustomDomain: boolean;
  hasAffiliateMarketing: boolean;
  hasApiAccess: boolean;
  hasPos: boolean;
  hasLogo: boolean;
  maxThemes: number;
  maxShippingCompanies: number;
  commissionPercentage: number;
  color: string;
  hasShippingIntegration: boolean;
  hasShippingCalculator: boolean;
  hasShippingTracking: boolean;
  hasShippingLabelPrinting: boolean;
  hasFreeShipping: boolean;
  hasCashOnDelivery: boolean;
  hasShippingDiscounts: boolean;
}

interface FaqItem { id: number; questionAr: string; questionEn: string; answerAr: string; answerEn: string; displayOrder: number }
interface LandingContent {
  hero: { title: string; description: string; backgroundImage: string; primaryCta: string; primaryCtaHref: string; secondaryCta: string; secondaryCtaHref: string; stats: StatItem[] };
  videoSection: { title: string; description?: string; videoUrl: string };
  features: FeatureContent[];
  distinctiveSection: { title: string; cards: DistinctiveCard[]; ctaText: string; ctaHref: string };
}

function getDefaultContent(t: (s: string) => string): LandingContent {
  return {
    hero: {
      title: t("site.hero.title"),
      description: t("site.hero.description"),
      backgroundImage: "",
      primaryCta: t("site.hero.primaryCta"),
      primaryCtaHref: "/register",
      secondaryCta: t("site.hero.secondaryCta"),
      secondaryCtaHref: "#",
      stats: [
        { number: "10,000+", label: t("site.hero.statMerchants") },
        { number: "50,000+", label: t("site.hero.statInvoices") },
        { number: "99.9%", label: t("site.hero.statUptime") },
      ],
    },
    videoSection: { title: t("site.video.title"), description: "", videoUrl: "" },
    features: [
      { title: t("site.features.ecommerce"), description: "", image: "", knowMoreText: "", knowMoreHref: "" },
      { title: t("site.features.paymentLinks"), description: "", image: "", knowMoreText: t("site.knowMore"), knowMoreHref: "#" },
      { title: t("site.features.paymentGateway"), description: "", image: "", knowMoreText: "", knowMoreHref: "" },
      { title: t("site.features.pos"), description: "", image: "", knowMoreText: t("site.knowMore"), knowMoreHref: "#" },
      { title: t("site.features.ai"), description: "", image: "", knowMoreText: "", knowMoreHref: "" },
    ],
    distinctiveSection: {
      title: t("site.distinctive.title"),
      cards: [
        { title: t("site.distinctive.allInOne"), description: "" },
        { title: t("site.distinctive.ux"), description: "" },
        { title: t("site.distinctive.security"), description: "" },
      ],
      ctaText: t("site.distinctive.cta"),
      ctaHref: "#",
    },
  };
}

const FAQ_INITIAL_COUNT = 5;

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const defaultContent = getDefaultContent(t);
  const [content, setContent] = useState<LandingContent>(defaultContent);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const { hero, videoSection, features, distinctiveSection } = content;

  useEffect(() => {
    fetch(`${API_BASE}/site/landing-page`)
      .then(r => r.json())
      .then(json => {
        const d = json.data || json;
        const dc = getDefaultContent(t);
        setContent({
          hero: { ...dc.hero, ...d.hero },
          videoSection: { ...dc.videoSection, ...d.videoSection, description: d.videoSection?.description || "" },
          features: d.features && d.features.length > 0 ? d.features.map((f: any) => ({ ...dc.features[0], ...f })) : dc.features,
          distinctiveSection: { ...dc.distinctiveSection, ...d.distinctiveSection },
        });
      })
      .catch(() => {});
    fetch(`${API_BASE}/site/packages`)
      .then(r => r.json())
      .then(json => { const d = json.data || json; if (Array.isArray(d)) setPackages(d); })
      .catch(() => {});
    fetch(`${API_BASE}/site/faq`)
      .then(r => r.json())
      .then(json => { const d = json.data || json; if (Array.isArray(d)) setFaqs(d); })
      .catch(() => {});
  }, []);

  return (
    <SiteLayout>
      <section style={{ backgroundColor: "var(--blue-deep)", position: "relative", overflow: "hidden" }}>
        {hero.backgroundImage && (
          <img src={hero.backgroundImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.15 }} />
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24" style={{ position: "relative", zIndex: 1 }}>
          <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-16">
            <div className="flex-1 text-center lg:text-right">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-5">
                {hero.title.split("\n").map((line, i) => (
                  <span key={i}>{i > 0 && <br />}{line}</span>
                ))}
              </h1>
              <p className="text-[15px] sm:text-[16px] leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8" style={{ color: "#BFE6F3" }}>
                {hero.description}
              </p>
              <div className="flex items-center gap-3 sm:gap-6 mb-8 justify-center lg:justify-start flex-wrap">
                {hero.stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-[18px] sm:text-[22px] lg:text-[26px] font-extrabold text-white">{stat.number}</p>
                    <p className="text-[10px] sm:text-[12px] lg:text-[13px] font-bold" style={{ color: "#9FCBDD" }}>{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 justify-center lg:justify-start flex-col sm:flex-row">
                <Link href={hero.primaryCtaHref} className="btn !bg-white !text-[var(--blue-deep)] !font-extrabold !px-8 !py-3.5 !text-[15px] !rounded-xl">
                  {hero.primaryCta}
                </Link>
                <Link href={hero.secondaryCtaHref} className="btn !bg-transparent !text-white !border-2 !border-white/30 !px-8 !py-3.5 !text-[15px] !rounded-xl hover:!bg-white/10">
                  {hero.secondaryCta}
                </Link>
              </div>
            </div>
            <div className="flex-1 w-full max-w-lg">
              <div className="aspect-[4/3] rounded-2xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                {hero.backgroundImage ? (
                  <img src={hero.backgroundImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                    <rect x="10" y="15" width="100" height="90" rx="10" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
                    <rect x="20" y="30" width="35" height="8" rx="4" fill="rgba(255,255,255,0.2)" />
                    <rect x="20" y="45" width="60" height="6" rx="3" fill="rgba(255,255,255,0.12)" />
                    <rect x="20" y="57" width="45" height="6" rx="3" fill="rgba(255,255,255,0.12)" />
                    <rect x="20" y="69" width="50" height="6" rx="3" fill="rgba(255,255,255,0.12)" />
                    <rect x="75" y="85" width="25" height="10" rx="5" fill="rgba(255,255,255,0.15)" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-[26px] sm:text-[30px] font-extrabold mb-4" style={{ color: "var(--blue-deep)" }}>
            {videoSection.title}
          </h2>
          <p className="text-[14px] sm:text-[15px] leading-relaxed mb-8 max-w-2xl mx-auto" style={{ color: "var(--sub)" }}>
            {(videoSection as any).description}
          </p>
          {videoSection.videoUrl ? (
            <video src={videoSection.videoUrl} controls className="w-full aspect-video rounded-2xl shadow-lg" style={{ backgroundColor: "var(--bg)" }} />
          ) : (
            <div className="aspect-video rounded-2xl shadow-lg flex items-center justify-center" style={{ backgroundColor: "var(--bg)" }}>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--blue)" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </div>
          )}
        </div>
      </section>

      {features.map((feature, idx) => (
        <FeatureSection
          key={feature.title + idx}
          title={feature.title}
          description={feature.description}
          image={feature.image}
          knowMoreText={feature.knowMoreText}
          knowMoreHref={feature.knowMoreHref}
          reversed={idx % 2 === 1}
          bgWhite={idx % 2 === 0}
        />
      ))}

      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-[26px] sm:text-[30px] font-extrabold mb-12" style={{ color: "var(--blue-deep)" }}>
            {distinctiveSection.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {distinctiveSection.cards.map((item) => (
              <div key={item.title} className="card p-6 sm:p-8 text-center">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z" /><path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-extrabold mb-2" style={{ color: "var(--ink)" }}>{item.title}</h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--sub)" }}>{item.description}</p>
              </div>
            ))}
          </div>
            <p className="text-[14px] sm:text-[15px] leading-relaxed mt-8 max-w-xl mx-auto" style={{ color: "var(--sub)" }}>
            {t("site.target")}
          </p>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="py-16 sm:py-20" style={{ backgroundColor: "var(--bg-card)" }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="text-[26px] sm:text-[30px] font-extrabold mb-10 text-center" style={{ color: "var(--blue-deep)" }}>
              {t("page.faq")}
            </h2>
            <div className="space-y-3">
              {faqs.slice(0, FAQ_INITIAL_COUNT).map((faq) => (
                <FaqAccordion key={faq.id} faq={faq} openFaq={openFaq} setOpenFaq={setOpenFaq} i18n={i18n} />
              ))}
              {faqs.length > FAQ_INITIAL_COUNT && (
                <>
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ maxHeight: showAllFaqs ? `${(faqs.length - FAQ_INITIAL_COUNT) * 80}px` : "0", opacity: showAllFaqs ? 1 : 0 }}
                  >
                    <div className="space-y-3">
                      {faqs.slice(FAQ_INITIAL_COUNT).map((faq) => (
                        <FaqAccordion key={faq.id} faq={faq} openFaq={openFaq} setOpenFaq={setOpenFaq} i18n={i18n} />
                      ))}
                    </div>
                  </div>
                  <div className="text-center pt-4">
                    <button
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold transition-all hover:gap-3"
                      style={{ color: "var(--blue)", backgroundColor: "var(--blue-50)" }}
                      onClick={() => setShowAllFaqs(!showAllFaqs)}
                    >
                      {showAllFaqs ? t("page.faqShowLess") : t("page.faqShowMore")}
                      <svg
                        className={`w-4 h-4 transition-transform duration-300 ${showAllFaqs ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 sm:py-20" style={{ backgroundColor: "var(--blue-deep)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-[26px] sm:text-[30px] font-extrabold text-white mb-4">{t("site.cta.title")}</h2>
          <p className="text-[14px] sm:text-[15px] leading-relaxed mb-8 max-w-xl mx-auto" style={{ color: "#BFE6F3" }}>
            {t("site.cta.description")}
          </p>
          <Link href="/register" className="btn !bg-white !text-[var(--blue-deep)] !font-extrabold !px-10 !py-3.5 !text-[15px] !rounded-xl">
            {t("site.cta.title")}
          </Link>
        </div>
      </section>

      {packages.length > 0 && (
        <section style={{ backgroundColor: "var(--blue-deep)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
            <h2 className="text-[26px] sm:text-[30px] font-extrabold text-white mb-4">{t("packages.pricing")}</h2>
            <p className="text-[15px] text-white/80 mb-10 max-w-3xl mx-auto">{t("packages.subtitle")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  footer={
                    <Link href="/register" className="btn-primary w-full">{t("packages.start")}</Link>
                  }
                />
              ))}
            </div>
            <p className="text-center text-[12px] text-white/80 mt-10 max-w-2xl mx-auto leading-relaxed">
              {t("packages.refundPolicy")}
            </p>
          </div>
        </section>
      )}
    </SiteLayout>
  );
}

function FeatureSection({ title, description, image, knowMoreText, knowMoreHref, reversed, bgWhite }: {
  title: string; description: string; image: string; knowMoreText: string; knowMoreHref: string; reversed: boolean; bgWhite?: boolean;
}) {
  const content = (
    <div className="flex-1">
      <h3 className="text-[22px] sm:text-[26px] font-extrabold mb-4" style={{ color: "var(--blue-deep)" }}>{title}</h3>
      <p className="text-[14px] sm:text-[15px] leading-relaxed mb-6" style={{ color: "var(--sub)" }}>{description}</p>
      {knowMoreText && (
        <Link href={knowMoreHref} className="inline-flex items-center gap-1.5 text-[14px] font-extrabold transition-colors hover:gap-2" style={{ color: "var(--blue)" }}>
          {knowMoreText}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </Link>
      )}
    </div>
  );
  const mockup = (
    <div className="flex-1 w-full">
      <div className="aspect-[4/3] rounded-xl flex items-center justify-center shadow-md overflow-hidden" style={{ backgroundColor: bgWhite ? "var(--bg)" : "var(--blue-50)" }}>
        {image ? (
          <img src={image} alt="" className="w-full h-full object-cover" />
        ) : (
          <svg width="100" height="80" viewBox="0 0 120 80" fill="none">
            <rect x="5" y="5" width="110" height="70" rx="8" stroke="var(--blue)" strokeWidth="1.5" strokeOpacity="0.3" />
            <rect x="15" y="18" width="40" height="6" rx="3" fill="var(--blue)" fillOpacity="0.15" />
            <rect x="15" y="30" width="70" height="4" rx="2" fill="var(--blue)" fillOpacity="0.1" />
            <rect x="15" y="40" width="55" height="4" rx="2" fill="var(--blue)" fillOpacity="0.1" />
            <rect x="15" y="50" width="60" height="4" rx="2" fill="var(--blue)" fillOpacity="0.1" />
            <rect x="85" y="60" width="20" height="8" rx="4" fill="var(--blue)" fillOpacity="0.15" />
          </svg>
        )}
      </div>
    </div>
  );
  return (
    <article className="py-16 sm:py-20" style={{ backgroundColor: bgWhite ? "var(--bg-card)" : undefined }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className={`flex flex-col ${reversed ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-10 lg:gap-16`}>
          {reversed ? <>{mockup}{content}</> : <>{content}{mockup}</>}
        </div>
      </div>
    </article>
  );
}

function FaqAccordion({ faq, openFaq, setOpenFaq, i18n }: {
  faq: FaqItem;
  openFaq: number | null;
  setOpenFaq: (id: number | null) => void;
  i18n: any;
}) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-right text-[14px] font-bold transition-colors hover:bg-black/5"
        style={{ color: "var(--ink)" }}
        onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
      >
        <span>{i18n.language === "ar" ? faq.questionAr : faq.questionEn}</span>
        <svg className={`w-5 h-5 transition-transform ${openFaq === faq.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {openFaq === faq.id && (
        <div className="px-5 pb-4 text-[13px] leading-relaxed" style={{ color: "var(--sub)" }} dir={i18n.language === "ar" ? "rtl" : "ltr"}>
          {i18n.language === "ar" ? faq.answerAr : faq.answerEn}
        </div>
      )}
    </div>
  );
}

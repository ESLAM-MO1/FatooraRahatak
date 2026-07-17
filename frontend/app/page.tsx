"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "./site-layout";
import "@/lib/i18n/config";

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
  maxThemes: number;
}

interface LandingContent {
  hero: { title: string; description: string; backgroundImage: string; primaryCta: string; primaryCtaHref: string; secondaryCta: string; secondaryCtaHref: string; stats: StatItem[] };
  videoSection: { title: string; videoUrl: string };
  features: FeatureContent[];
  distinctiveSection: { title: string; cards: DistinctiveCard[]; ctaText: string; ctaHref: string };
}

const DEFAULT_CONTENT: LandingContent = {
  hero: {
    title: "منصة متكاملة لإدارة\nمتجرك بالكامل",
    description: "الفواتير، روابط الدفع، الكاشير، المتجر الإلكتروني، بوابة الدفع — كل ما تحتاجه في نظام واحد لتنمية أعمالك.",
    backgroundImage: "",
    primaryCta: "ابدأ الآن مجانًا",
    primaryCtaHref: "/register",
    secondaryCta: "اعرف أكثر",
    secondaryCtaHref: "#",
    stats: [
      { number: "10,000+", label: "تاجر" },
      { number: "50,000+", label: "فاتورة" },
      { number: "99.9%", label: "وقت تشغيل" },
    ],
  },
  videoSection: { title: "كل ما تحتاجه في منصة واحدة", videoUrl: "" },
  features: [
    { title: "المتجر الإلكتروني الخاص بك", description: "أنشئ متجرك الإلكتروني بكل سهولة وأطلق أعمالك على الإنترنت. تحكم في المنتجات، التصنيفات، والعروض.", image: "", knowMoreText: "اعرف المزيد", knowMoreHref: "#" },
    { title: "روابط الدفع", description: "أرسل روابط دفع احترافية لعملائك واستلم المدفوعات بسرعة وأمان عبر قنوات التواصل المفضلة لديهم.", image: "", knowMoreText: "اعرف المزيد", knowMoreHref: "#" },
    { title: "بوابة الدفع الإلكتروني", description: "بوابة دفع متكاملة تدعم جميع طرق الدفع المحلية والعالمية. استلم مدفوعاتك بأمان وسرعة فائقة.", image: "", knowMoreText: "اعرف المزيد", knowMoreHref: "#" },
    { title: "الكاشير ونقاط البيع", description: "نظام كاشير سريع وسهل لإدارة المبيعات في متجرك الفعلي. يدعم الباركود، الطلبات، والفواتير.", image: "", knowMoreText: "اعرف المزيد", knowMoreHref: "#" },
  ],
  distinctiveSection: {
    title: "ما الذي يميزنا؟",
    cards: [
      { title: "أمان وخصوصية عالية", description: "بياناتك مشفرة ومحمية بأعلى معايير الأمان العالمية." },
      { title: "واجهات سهلة الاستخدام", description: "تصميم عصري وبسيط يسهل على الجميع استخدامه دون تعقيد." },
      { title: "أدوات عديدة في نظام واحد", description: "المتجر، الفواتير، الكاشير، روابط الدفع، والمزيد في منصة واحدة." },
    ],
    ctaText: "شاهد كل المزايا",
    ctaHref: "#",
  },
};

function getFeatureConfig(t: (s: string) => string) {
  return [
    { key: "maxProducts" as const, label: t("packages.products"), format: (v: number | null) => v === null ? t("packages.unlimited") : String(v) },
    { key: "maxEmployees" as const, label: t("packages.employees"), format: (v: number) => String(v) },
    { key: "maxWarehouses" as const, label: t("packages.warehouses"), format: (v: number) => String(v) },
    { key: "hasAccountingFull" as const, label: t("packages.accounting"), format: () => "" },
    { key: "hasPayroll" as const, label: t("packages.payroll"), format: () => "" },
    { key: "hasZatcaInvoice" as const, label: t("packages.zatcaInvoice"), format: () => "" },
    { key: "hasCustomDomain" as const, label: t("packages.customDomain"), format: () => "" },
    { key: "maxThemes" as const, label: t("packages.templates"), format: (v: number) => String(v) },
  ];
}

function isCheckItem(key: string): boolean {
  return ["hasAccountingFull", "hasPayroll", "hasZatcaInvoice", "hasCustomDomain"].includes(key);
}

export default function HomePage() {
  const { t } = useTranslation();
  const featureConfig = getFeatureConfig(t);
  const [content, setContent] = useState<LandingContent>(DEFAULT_CONTENT);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const { hero, videoSection, features, distinctiveSection } = content;

  useEffect(() => {
    fetch(`${API_BASE}/site/landing-page`)
      .then(r => r.json())
      .then(json => {
        const d = json.data || json;
        setContent({
          hero: { ...DEFAULT_CONTENT.hero, ...d.hero },
          videoSection: { ...DEFAULT_CONTENT.videoSection, ...d.videoSection },
          features: d.features && d.features.length > 0 ? d.features.map((f: any) => ({ ...DEFAULT_CONTENT.features[0], ...f })) : DEFAULT_CONTENT.features,
          distinctiveSection: { ...DEFAULT_CONTENT.distinctiveSection, ...d.distinctiveSection },
        });
      })
      .catch(() => {});
    fetch(`${API_BASE}/site/packages`)
      .then(r => r.json())
      .then(json => { const d = json.data || json; if (Array.isArray(d)) setPackages(d); })
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
              <div className="flex items-center gap-6 mb-8 justify-center lg:justify-start">
                {hero.stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-[22px] sm:text-[26px] font-extrabold text-white">{stat.number}</p>
                    <p className="text-[12px] sm:text-[13px] font-bold" style={{ color: "#9FCBDD" }}>{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 justify-center lg:justify-start">
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
          <h2 className="text-[26px] sm:text-[30px] font-extrabold mb-8" style={{ color: "var(--blue-deep)" }}>
            {videoSection.title}
          </h2>
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
          <div className="mt-10">
            <Link href={distinctiveSection.ctaHref} className="btn btn-primary !px-8 !py-3 !text-[14px]">
              {distinctiveSection.ctaText}
            </Link>
          </div>
        </div>
      </section>

      {packages.length > 0 && (
        <section style={{ backgroundColor: "var(--blue-deep)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
            <h2 className="text-[26px] sm:text-[30px] font-extrabold text-white mb-10">{t("packages.pricing")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {packages.map((pkg) => (
                <div key={pkg.id} className="card p-6 sm:p-8 text-right flex flex-col">
                  <h3 className="text-[16px] font-extrabold mb-4" style={{ color: "var(--ink)" }}>{pkg.name}</h3>
                  <p className="text-[32px] sm:text-[36px] font-extrabold mb-5" style={{ color: "var(--ink)" }}>
                    {pkg.monthlyPrice.toLocaleString("ar-SA")}
                    <span className="text-[14px] font-bold mr-1" style={{ color: "var(--sub)" }}>{t("packages.month")}</span>
                  </p>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {featureConfig.map((feat) => {
                      const val = (pkg as any)[feat.key];
                      if (isCheckItem(feat.key)) {
                        return (
                          <li key={feat.key} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--ink-light)" }}>
                            {val ? (
                              <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-red-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                            {feat.label}
                          </li>
                        );
                      }
                      return (
                        <li key={feat.key} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--ink-light)" }}>
                          <svg className="w-4 h-4 text-[var(--blue)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {feat.label}: <span className="font-bold" style={{ color: "var(--ink)" }}>{feat.format(val)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <Link href="/register" className="btn btn-primary w-full !text-[13px] !py-3 justify-center">{t("packages.start")}</Link>
                </div>
              ))}
            </div>
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
      <Link href={knowMoreHref} className="inline-flex items-center gap-1.5 text-[14px] font-extrabold transition-colors hover:gap-2" style={{ color: "var(--blue)" }}>
        {knowMoreText}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
      </Link>
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

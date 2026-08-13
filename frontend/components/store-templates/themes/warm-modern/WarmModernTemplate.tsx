"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStorefront } from "@/lib/hooks/useStorefront";
import type { StoreTemplateProps } from "@/app/store/[slug]/layout";
import type { StoreThemeMeta, StoreColors } from "@/components/store-templates/configs";
import QuickLoginButton from "@/components/store-templates/QuickLoginButton";
import SuccessToast from "@/components/SuccessToast";
import ProductRating from "@/components/store-templates/ProductRating";
import { resolveSocialUrl } from "@/components/store-templates/social";
import { SearchIcon, BagIcon, HeartIcon, HeartFilledIcon, MenuIcon, CloseIcon, TruckIcon, MailIcon, PhoneIcon, MapPinIcon, FacebookIcon, InstagramIcon, WhatsAppIcon, PackageIcon, CheckIcon, SparklesIcon } from "@/components/store-templates/icons";

interface TemplateProps extends StoreTemplateProps {
  themeMeta: StoreThemeMeta;
  colors: StoreColors;
}

export default function WarmModernTemplate({
  children, storeName, slug, showHero = true, storeId, logo, currency = "SAR", coverImage = null,
  contactPhone, contactEmail, contactAddress, facebookUrl, instagramUrl, whatsappUrl, trustBadges = [], themeMeta, colors,
}: TemplateProps) {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { categories, products, productsLoading, selectedCategoryId, setSelectedCategoryId, showAllProducts, setShowAllProducts,
    cartCount, wishlist, toggleWishlist, searchInput, setSearchInput, handleSearchSubmit, isSearchActive, searchResults,
    countdown, currencySymbol, isRtl, handleAddToCart, cartMessage } = useStorefront(slug, storeId, currency, true, showHero, themeMeta);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hasSocial = !!(facebookUrl || instagramUrl || whatsappUrl);
  const fbUrl = resolveSocialUrl(facebookUrl);
  const igUrl = resolveSocialUrl(instagramUrl);
  const waUrl = resolveSocialUrl(whatsappUrl);
  const isWishlist = (id: number) => wishlist.includes(id);
  const hasDiscount = (p: { basePrice: number; discountPrice: number | null }) => p.discountPrice !== null && p.discountPrice < p.basePrice;
  const getDiscount = (p: { basePrice: number; discountPrice: number | null }) => hasDiscount(p) ? Math.round((1 - (p.discountPrice as number) / p.basePrice) * 100) : 0;
  const pad = (n: number) => String(n).padStart(2, "0");

  const displayProducts = isSearchActive ? searchResults : products.slice(0, showAllProducts ? products.length : 8);
  const tickerItems = [t("storefront.ticker1"), t("storefront.ticker2"), t("storefront.ticker3")];
  const catCards = categories.length
    ? categories
    : [{ id: null, nameAr: t("storefront.all"), image: null }, { id: null, nameAr: t("storefront.featuredProducts"), image: null }, { id: null, nameAr: t("storefront.liveDeals"), image: null }];

  const heroBg = coverImage
    ? `linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.35)),url("${coverImage}") center/cover no-repeat`
    : `linear-gradient(130deg, ${colors.heroFrom}, ${colors.heroTo})`;

  const ProductCard = ({ product, tall = false }: { product: { id: number; nameAr: string; basePrice: number; discountPrice: number | null; primaryImageUrl: string | null; averageRating?: number; ratingCount?: number }; tall?: boolean }) => (
    <div key={product.id} className="bg-white rounded-3xl overflow-hidden transition-transform duration-300 hover:-translate-y-1.5" style={{ boxShadow: `0 14px 34px ${colors.accentColor}22` }}>
      <div className="relative" style={{ aspectRatio: tall ? "3/4" : "4/3", background: "#F9FAFB" }}>
        <a href={`/store/${slug}/products/${product.id}`} className="block w-full h-full">
          {product.primaryImageUrl
            ? <img src={product.primaryImageUrl} alt={product.nameAr} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center" style={{ color: "#D1D5DB" }}><PackageIcon size={44} /></div>}
        </a>
        {hasDiscount(product) && <span className="absolute rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: colors.accentColor, color: "#fff", top: 12, insetInlineStart: 12 }}>-{getDiscount(product)}%</span>}
        <button type="button" onClick={() => toggleWishlist(product.id)} aria-label={t("storefront.wishlist")} className="absolute rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ width: 32, height: 32, background: "rgba(255,255,255,0.94)", top: 12, insetInlineEnd: 12, color: "#DC2626" }}>
          {isWishlist(product.id) ? <HeartFilledIcon size={16} /> : <HeartIcon size={16} />}
        </button>
      </div>
      <div className="p-5">
        <a href={`/store/${slug}/products/${product.id}`} className="block">
          <h3 className="font-extrabold text-[16px] truncate" style={{ color: "#1C1917" }}>{product.nameAr}</h3>
        </a>
        {(product.ratingCount ?? 0) > 0 && (<div className="mt-1"><ProductRating rating={product.averageRating} count={product.ratingCount} size={12} /></div>)}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-extrabold text-lg" style={{ color: colors.accentColor }}>{product.discountPrice || product.basePrice} {currencySymbol}</span>
          {hasDiscount(product) && <span className="text-xs line-through" style={{ color: "#A8A29E" }}>{product.basePrice} {currencySymbol}</span>}
        </div>
        <button type="button" onClick={() => handleAddToCart(product.id)} className="mt-3.5 w-full py-2.5 rounded-2xl font-bold text-sm" style={{ background: colors.buttonColor, color: "#fff", boxShadow: `0 8px 20px ${colors.accentColor}40` }}>
          {t("storefront.addToCart")}
        </button>
      </div>
    </div>
  );

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="font-sans" style={{ fontFamily: "'Segoe UI', 'Tajawal', system-ui, sans-serif", background: "#FFFBF5" }}>
      <div className="overflow-hidden whitespace-nowrap py-2.5 text-white text-[13px] font-bold" style={{ background: colors.footerColor }}>
        <div className="inline-block" style={{ animation: "wm-marquee 22s linear infinite" }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="mx-8 inline-flex items-center gap-2"><SparklesIcon size={14} />{tickerItems.map((item, j) => <span key={j} className="mx-3">{item}</span>)}</span>
          ))}
        </div>
      </div>
      <style>{`@keyframes wm-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>

      <header className="sticky top-0 z-40 transition-all duration-300" style={{ background: scrolled ? "rgba(255,255,255,0.96)" : "transparent", backdropFilter: scrolled ? "blur(10px)" : "none", WebkitBackdropFilter: scrolled ? "blur(10px)" : "none", boxShadow: scrolled ? "0 1px 10px rgba(0,0,0,0.08)" : "none" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4 h-16">
          <button className="md:hidden p-1.5 -ml-1.5" onClick={() => setMobileOpen(!mobileOpen)} style={{ color: "#1C1917" }}>{mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}</button>
          <a href={`/store/${slug}`} className="flex items-center gap-2.5 shrink-0 min-w-0">
            {logo && <img src={logo} alt={storeName} className="w-10 h-10 rounded-full object-cover" />}
            <span className="font-extrabold text-xl truncate" style={{ color: colors.headerColor }}>{storeName}</span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-[15px] font-semibold ms-8">
            <a href={`/store/${slug}`} className="hover:opacity-70" style={{ color: "#1C1917" }}>{t("storefront.home")}</a>
            <a href={`/store/${slug}#products`} className="hover:opacity-70" style={{ color: "#1C1917" }}>{t("storefront.products")}</a>
            <a href={`/store/${slug}/contact`} className="hover:opacity-70" style={{ color: "#1C1917" }}>{t("storefront.contactUs")}</a>
          </nav>
          <div className="flex items-center gap-1 ms-auto shrink-0">
            <form onSubmit={handleSearchSubmit} className="hidden md:block"><div className="relative">
              <span className="absolute inset-y-0 inline-flex items-center ps-3 pointer-events-none" style={{ color: "#A8A29E" }}><SearchIcon size={16} /></span>
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder={t("storefront.searchPlaceholder")} className="w-44 lg:w-56 rounded-full outline-none text-[14px] ps-9 pe-3 py-2" style={{ background: "rgba(0,0,0,0.05)", color: "#1C1917" }} />
            </div></form>
            <QuickLoginButton slug={slug} />
            <a href={`/store/${slug}/wishlist`} className="relative p-2 rounded-full" style={{ color: "#1C1917" }} aria-label={t("storefront.wishlist")}><HeartIcon size={21} />{wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ width: 16, height: 16, background: "#DC2626" }}>{wishlist.length}</span>}</a>
            <a href={`/store/${slug}/cart`} className="relative p-2 rounded-full" style={{ color: "#1C1917" }} aria-label={t("storefront.cart")}><BagIcon size={21} />{cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ width: 16, height: 16, background: "#DC2626" }}>{cartCount}</span>}</a>
          </div>
        </div>
        {mobileOpen && <div className="md:hidden px-4 pb-3 border-t" style={{ borderColor: "#F5F0E8", background: "rgba(255,255,255,0.98)" }}><form onSubmit={handleSearchSubmit} className="mt-3"><div className="relative"><span className="absolute inset-y-0 inline-flex items-center ps-3" style={{ color: "#A8A29E" }}><SearchIcon size={16} /></span><input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder={t("storefront.searchPlaceholder")} className="w-full rounded-full outline-none text-[14px] ps-9 pe-3 py-2" style={{ background: "#F5F0E8", color: "#1C1917" }} /></div></form><div className="mt-3 space-y-2 text-[15px] font-semibold" style={{ color: "#1C1917" }}>
          <a href={`/store/${slug}`} className="block">{t("storefront.home")}</a>
          <a href={`/store/${slug}#products`} className="block">{t("storefront.products")}</a>
          <a href={`/store/${slug}/contact`} className="block">{t("storefront.contactUs")}</a>
        </div></div>}
      </header>

      {!showHero && <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>}

      {showHero && <section className="w-full relative overflow-hidden" style={{ minHeight: "560px", background: heroBg, color: "#fff" }}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center" style={{ paddingTop: "72px", paddingBottom: "72px" }}>
          <div className="text-center lg:text-start">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-bold" style={{ background: `${colors.accentColor}33`, border: `1px solid ${colors.accentColor}88` }}><SparklesIcon size={14} />{t("storefront.liveDeals")}</span>
            <h1 className="mt-5 font-extrabold leading-tight" style={{ fontSize: "clamp(40px, 6vw, 64px)" }}>{storeName}</h1>
            <p className="mt-4 text-base max-w-md mx-auto lg:mx-0" style={{ color: "rgba(255,255,255,0.9)" }}>{t("storefront.heroWelcome")}</p>
            <div className="mt-9" dir="ltr">
              <p className="text-[12px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.8)" }}>{t("storefront.dealEndsIn")}</p>
              <div className="flex items-center justify-center lg:justify-start gap-2.5">
                {[["h", countdown.h], ["m", countdown.m], ["s", countdown.s]].map(([label, value], i) => (
                  <div key={label as string} className="flex items-center gap-2.5">
                    <div className="rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.35)", backdropFilter: "blur(8px)", minWidth: 76, padding: "12px 6px" }}>
                      <div className="text-4xl font-extrabold tabular-nums">{pad(value as number)}</div>
                      <div className="text-[11px] font-bold uppercase mt-1" style={{ color: "rgba(255,255,255,0.85)" }}>{label === "h" ? "hrs" : label === "m" ? "min" : "sec"}</div>
                    </div>
                    {i < 2 && <span className="text-2xl font-extrabold">:</span>}
                  </div>
                ))}
              </div>
            </div>
            <a href="#products" onClick={(e) => { e.preventDefault(); document.getElementById("products")?.scrollIntoView?.({ behavior: "smooth" }); }} className="inline-block mt-9 px-11 py-3.5 rounded-full font-extrabold text-[15px]" style={{ background: colors.buttonColor, color: "#fff", boxShadow: `0 14px 34px ${colors.accentColor}66` }}>
              {t("storefront.shopNow")}
            </a>
          </div>
          <div className="hidden lg:flex justify-center">
            <div className="relative">
              <div className="absolute -inset-5 rounded-[40px]" style={{ background: `${colors.accentColor}44`, filter: "blur(36px)" }} />
              <div className="relative rounded-[30px] overflow-hidden" style={{ width: 340, height: 460, boxShadow: "0 40px 80px rgba(0,0,0,0.4)", border: "3px solid rgba(255,255,255,0.28)" }}>
                {coverImage ? <img src={coverImage} alt={storeName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(150deg, ${colors.heroFrom}, ${colors.heroTo})`, color: "rgba(255,255,255,0.5)" }}><PackageIcon size={80} /></div>}
              </div>
            </div>
          </div>
        </div>
      </section>}

      {!isSearchActive && showHero && <section style={{ padding: "44px 0 20px" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-extrabold text-2xl" style={{ color: "#1C1917" }}>{t("storefront.shopByCategory")}</h2>
          <div className="mt-6 flex gap-4 overflow-x-auto pb-3">
            {catCards.map((cat, idx: number) => (
              <button key={idx} type="button" onClick={() => { if (cat.id !== null) setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id); }} className="shrink-0 rounded-2xl overflow-hidden text-start transition-transform hover:scale-[1.03]" style={{ width: 150, border: `1px solid ${colors.accentColor}2e`, boxShadow: `0 10px 26px ${colors.accentColor}17` }}>
                <div className="h-24 bg-gray-100 flex items-center justify-center" style={{ color: "#D1D5DB" }}>{cat.image ? <img src={cat.image} alt={cat.nameAr} className="w-full h-full object-cover" /> : <PackageIcon size={30} />}</div>
                <div className="px-3 py-2.5 text-[13px] font-extrabold" style={{ color: "#1C1917", background: "#fff" }}>{cat.nameAr}</div>
              </button>
            ))}
          </div>
        </div>
      </section>}

      {showHero && <section id="products" style={{ padding: "44px 0" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-7"><span className="inline-block rounded" style={{ width: 6, height: 36, background: colors.accentColor, borderRadius: 3 }} /><h2 className="font-extrabold text-2xl" style={{ color: "#1C1917" }}>{t("storefront.featuredProducts")}</h2></div>
          {productsLoading && <p className="text-center py-12" style={{ color: "#6B7280" }}>{t("storefront.loadingProducts")}</p>}
          {!productsLoading && displayProducts.length === 0 && <div className="flex flex-col items-center gap-3 py-16"><span style={{ color: "#D1D5DB" }}><PackageIcon size={48} /></span><p style={{ color: "#6B7280" }}>{t("storefront.noProducts")}</p></div>}
          {!productsLoading && displayProducts.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-start">
              {displayProducts.map((p, i) => <div key={p.id} className={i % 4 === 1 ? "lg:mt-10" : ""}><ProductCard product={p} tall={i % 5 === 2} /></div>)}
            </div>
          )}
          {!isSearchActive && !showAllProducts && products.length > 8 && <div className="mt-10 text-center"><button type="button" onClick={() => setShowAllProducts(true)} className="px-9 py-3 rounded-full font-bold text-sm" style={{ border: `1px solid ${colors.accentColor}`, color: colors.accentColor }}>{t("storefront.viewAll")}</button></div>}
        </div>
      </section>}

      <SuccessToast message={cartMessage} />

      {showHero && <><svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="w-full block" style={{ height: 64, display: "block" }}>
        <path d="M0,32 C240,62 480,2 720,18 C960,34 1200,62 1440,22 L1440,64 L0,64 Z" fill={colors.newsletterColor} />
      </svg>
      <section style={{ background: colors.newsletterColor, padding: "40px 0 64px" }}>
        <div className="text-center max-w-3xl mx-auto px-4">
          <span className="inline-flex items-center justify-center rounded-full mb-4" style={{ width: 52, height: 52, background: "rgba(255,255,255,0.15)", color: "#fff" }}><TruckIcon size={24} /></span>
          <h3 className="text-white font-extrabold" style={{ fontSize: "27px" }}>{t("storefront.newsletterTitle")}</h3>
          <p className="mt-2 text-white/90 text-[15px]">{t("storefront.newsletterThanks")}</p>
          <form className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3" onSubmit={(e) => e.preventDefault()}>
            <input type="email" required placeholder={t("storefront.newsletterEmail")} className="w-full sm:w-[340px] px-5 py-3 rounded-full outline-none text-base" style={{ background: "#fff", color: "#1C1917" }} />
            <button type="submit" className="px-9 py-3 rounded-full font-extrabold text-base" style={{ background: "#fff", color: colors.headerColor }}>{t("storefront.newsletterSubscribe")}</button>
          </form>
        </div>
      </section></>}

      <footer style={{ background: colors.footerColor, padding: "52px 0 32px" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div><h4 className="text-white font-extrabold text-lg">{storeName}</h4><p className="mt-2 text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>{t("storefront.footerTagline")}</p></div>
          <div>
            <h4 className="text-white font-extrabold text-[14px] uppercase tracking-wider">{t("storefront.footerLinks")}</h4>
            <ul className="mt-3 space-y-2 text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>
              <li><a href={`/store/${slug}`} className="hover:text-white">{t("storefront.home")}</a></li>
              <li><a href={`/store/${slug}#products`} className="hover:text-white">{t("storefront.products")}</a></li>
              <li><a href={`/store/${slug}/track-order`} className="hover:text-white">{t("storefront.trackOrder")}</a></li>
              <li><a href={`/store/${slug}/contact`} className="hover:text-white">{t("storefront.contactFooter")}</a></li>
              <li><a href={`/store/${slug}/return-policy`} className="hover:text-white">{t("storefront.returnPolicy")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-extrabold text-[14px] uppercase tracking-wider">{t("storefront.contactHeading")}</h4>
            <ul className="mt-3 space-y-2 text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>
              {contactEmail && <li className="flex items-center gap-2"><MailIcon size={14} /><span dir="ltr">{contactEmail}</span></li>}
              {contactPhone && <li className="flex items-center gap-2"><PhoneIcon size={14} /><span dir="ltr">{contactPhone}</span></li>}
              {contactAddress && <li className="flex items-start gap-2"><span className="mt-0.5"><MapPinIcon size={14} /></span><span>{contactAddress}</span></li>}
              {!contactEmail && !contactPhone && !contactAddress && <li>{t("storefront.noContact")}</li>}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-extrabold text-[14px] uppercase tracking-wider">{t("storefront.followUs")}</h4>
            <div className="mt-3 flex gap-3">
              {fbUrl && <a href={fbUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70" style={{ width: 36, height: 36, background: "rgba(255,255,255,0.15)", color: "#fff" }}><FacebookIcon size={17} /></a>}
              {igUrl && <a href={igUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70" style={{ width: 36, height: 36, background: "rgba(255,255,255,0.15)", color: "#fff" }}><InstagramIcon size={17} /></a>}
              {waUrl && <a href={waUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70" style={{ width: 36, height: 36, background: "rgba(255,255,255,0.15)", color: "#fff" }}><WhatsAppIcon size={17} /></a>}
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-8 pt-5 border-t text-center" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>© {new Date().getFullYear()} {storeName}. {t("storefront.footerBy")}</p>
        </div>
      </footer>
    </div>
  );
}
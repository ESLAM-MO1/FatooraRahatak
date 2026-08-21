"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStorefront } from "@/lib/hooks/useStorefront";
import type { StoreTemplateProps } from "@/app/store/[slug]/layout";
import type { StoreThemeMeta, StoreColors } from "@/components/store-templates/configs";
import QuickLoginButton from "@/components/store-templates/QuickLoginButton";
import Toast from "@/components/Toast";
import ProductRating from "@/components/store-templates/ProductRating";
import { resolveSocialUrl } from "@/components/store-templates/social";
import StoreSocialLinks from "@/components/store-templates/StoreSocialLinks";
import { SearchIcon, BagIcon, HeartIcon, HeartFilledIcon, MenuIcon, CloseIcon, MailIcon, PhoneIcon, MapPinIcon, PackageIcon, SparklesIcon } from "@/components/store-templates/icons";
import StoreMainMenu from "@/components/store-templates/StoreMainMenu";
import StorePolicyLinks from "@/components/store-templates/StorePolicyLinks";

interface TemplateProps extends StoreTemplateProps {
  themeMeta: StoreThemeMeta;
  colors: StoreColors;
}

export default function RoyalPurpleTemplate({
  children, storeName, slug, showHero = true, storeId, logo, currency = "SAR", coverImage = null,
  contactPhone, contactEmail, contactAddress, facebookUrl, instagramUrl, whatsappUrl, snapchatUrl, tiktokUrl, telegramUrl, linkedinUrl, twitterUrl, youtubeUrl, pinterestUrl, trustBadges = [], themeMeta, colors,
}: TemplateProps) {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { categories, products, productsLoading, selectedCategoryId, setSelectedCategoryId, showAllProducts, setShowAllProducts,
    cartCount, wishlist, toggleWishlist, searchInput, setSearchInput, handleSearchSubmit, isSearchActive, searchResults,
    currencySymbol, isRtl, handleAddToCart, cartMessage, cartMessageType } = useStorefront(slug, storeId, currency, true, showHero, themeMeta);

  const fbUrl = resolveSocialUrl(facebookUrl);
  const igUrl = resolveSocialUrl(instagramUrl);
  const waUrl = resolveSocialUrl(whatsappUrl);
  const scUrl = resolveSocialUrl(snapchatUrl);
  const tkUrl = resolveSocialUrl(tiktokUrl);
  const tgUrl = resolveSocialUrl(telegramUrl);
  const liUrl = resolveSocialUrl(linkedinUrl);
  const twUrl = resolveSocialUrl(twitterUrl);
  const ytUrl = resolveSocialUrl(youtubeUrl);
  const pinUrl = resolveSocialUrl(pinterestUrl);
  const hasSocial = !!(fbUrl || igUrl || waUrl || scUrl || tkUrl || tgUrl || liUrl || twUrl || ytUrl || pinUrl);
  const isWishlist = (id: number) => wishlist.includes(id);
  const hasDiscount = (p: { basePrice: number; discountPrice: number | null }) => p.discountPrice !== null && p.discountPrice < p.basePrice;
  const getDiscount = (p: { basePrice: number; discountPrice: number | null }) => hasDiscount(p) ? Math.round((1 - (p.discountPrice as number) / p.basePrice) * 100) : 0;

  const displayProducts = isSearchActive ? searchResults : products.slice(0, showAllProducts ? products.length : 8);
  const catChips = categories.length
    ? categories
    : [{ id: null, nameAr: t("storefront.all"), image: null }, { id: null, nameAr: t("storefront.trustedStore"), image: null }, { id: null, nameAr: t("storefront.easyReturns"), image: null }];

  const gold = colors.accentColor;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="font-serif" style={{ fontFamily: "'Palatino Linotype', Georgia, 'Tajawal', serif", background: "#1B1626" }}>
      <header className="z-40" style={{ background: colors.headerColor, borderBottom: `1px solid ${gold}33` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
          <StoreMainMenu slug={slug} mobile={false} containerClassName="hidden md:flex items-center gap-10 text-[13px] font-semibold tracking-[0.22em] uppercase text-white/80" linkClassName="hover:text-white" />
          <button className="md:hidden p-1.5 -ml-1.5 text-white" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}</button>
          <a href={`/store/${slug}`} className="flex flex-col items-center min-w-0">
            {logo && <img src={logo} alt={storeName} className="w-11 h-11 rounded-full object-cover" />}
            <span className="mt-1 font-bold text-xl tracking-[0.18em] uppercase truncate text-white">{storeName}</span>
          </a>
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="hidden lg:block"><div className="relative">
              <span className="absolute inset-y-0 inline-flex items-center ps-3 pointer-events-none" style={{ color: "rgba(255,255,255,0.4)" }}><SearchIcon size={15} /></span>
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder={t("storefront.searchPlaceholder")} className="w-44 rounded-none outline-none text-[13px] tracking-wide ps-9 pe-3 py-2 bg-transparent text-white" style={{ border: `1px solid ${gold}44` }} />
            </div></form>
            <QuickLoginButton slug={slug} />
            <a href={`/store/${slug}/wishlist`} className="relative p-2 text-white" aria-label={t("storefront.wishlist")}><HeartIcon size={20} />{wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ width: 16, height: 16, background: "#DC2626" }}>{wishlist.length}</span>}</a>
            <a href={`/store/${slug}/cart`} className="relative p-2 text-white" aria-label={t("storefront.cart")}><BagIcon size={20} />{cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ width: 16, height: 16, background: "#DC2626" }}>{cartCount}</span>}</a>
          </div>
        </div>
        {mobileOpen && <StoreMainMenu slug={slug} mobile containerClassName="md:hidden px-4 pb-4 space-y-2 text-[15px] font-semibold text-white" linkClassName="block py-1.5" />}
      </header>

      {!showHero && <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</main>}

      {showHero && <section className="w-full" style={{ background: `linear-gradient(150deg, ${colors.heroFrom}, ${colors.heroTo})`, color: "#fff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center" style={{ paddingTop: "76px", paddingBottom: "76px" }}>
          <div className="text-center lg:text-start">
            <span className="inline-block text-[12px] tracking-[0.34em] uppercase" style={{ color: gold }}>{t("storefront.featuredProduct")}</span>
            <h1 className="mt-5 font-bold leading-tight" style={{ fontSize: "clamp(40px, 6vw, 62px)", letterSpacing: "0.04em" }}>{storeName}</h1>
            <p className="mt-5 text-[15px] max-w-md mx-auto lg:mx-0 leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>{t("storefront.heroWelcome")}</p>
            <a href="#products" onClick={(e) => { e.preventDefault(); document.getElementById("products")?.scrollIntoView?.({ behavior: "smooth" }); }} className="inline-block mt-9 px-12 py-3.5 text-[13px] font-bold tracking-[0.2em] uppercase" style={{ border: `1px solid ${gold}`, color: gold }}>
              {t("storefront.shopNow")}
            </a>
          </div>
          <div className="hidden lg:flex justify-center">
            <div className="relative w-full max-w-md" style={{ aspectRatio: "3/4" }}>
              <div className="absolute inset-0" style={{ border: `1px solid ${gold}44`, transform: "translate(16px,16px)" }} />
              <div className="absolute inset-0 overflow-hidden" style={{ border: `1px solid ${gold}88` }}>
                {coverImage ? <img src={coverImage} alt={storeName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{ background: `${gold}22`, color: gold }}><PackageIcon size={80} /></div>}
              </div>
            </div>
          </div>
        </div>
      </section>}

      {!isSearchActive && showHero && <section style={{ padding: "40px 0 12px" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8 overflow-x-auto pb-2 justify-start lg:justify-center">
          {catChips.map((cat, idx: number) => (
            <button key={idx} type="button" onClick={() => { if (cat.id !== null) setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id); }} className="shrink-0 text-[14px] font-semibold tracking-[0.16em] uppercase transition-colors" style={{ color: selectedCategoryId === cat.id ? gold : "rgba(255,255,255,0.6)", borderBottom: `1px solid ${selectedCategoryId === cat.id ? gold : "transparent"}`, paddingBottom: 6 }}>
              {cat.nameAr}
            </button>
          ))}
        </div>
      </section>}

      {showHero && <section id="products" style={{ padding: "40px 0 64px" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-[13px] tracking-[0.3em] uppercase" style={{ color: gold }}>— {t("storefront.featuredProducts")} —</span>
          </div>
          {productsLoading && <p className="text-center py-12" style={{ color: "rgba(255,255,255,0.6)" }}>{t("storefront.loadingProducts")}</p>}
          {!productsLoading && displayProducts.length === 0 && <div className="flex flex-col items-center gap-3 py-16"><span style={{ color: gold }}><PackageIcon size={48} /></span><p style={{ color: "rgba(255,255,255,0.6)" }}>{t("storefront.noProducts")}</p></div>}
          {!productsLoading && displayProducts.length > 0 && <div className="grid gap-12 sm:grid-cols-2">
            {displayProducts.map(p => (
              <div key={p.id} className="group">
                <div className="relative overflow-hidden" style={{ aspectRatio: "3/4", background: `${gold}14`, border: `1px solid ${gold}2b` }}>
                  <a href={`/store/${slug}/products/${p.id}`} className="block w-full h-full">
                    {p.primaryImageUrl
                      ? <img src={p.primaryImageUrl} alt={p.nameAr} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      : <div className="w-full h-full flex items-center justify-center" style={{ color: gold }}><PackageIcon size={56} /></div>}
                  </a>
                  {hasDiscount(p) && <span className="absolute text-[11px] font-bold tracking-[0.14em] px-3 py-1" style={{ background: "#DC2626", color: "#fff", top: 12, insetInlineStart: 12 }}>{t("storefront.discount")} {getDiscount(p)}%</span>}
                  <button type="button" onClick={() => toggleWishlist(p.id)} aria-label={t("storefront.wishlist")} className="absolute flex items-center justify-center transition-transform hover:scale-110" style={{ width: 36, height: 36, border: `1px solid ${gold}66`, background: "rgba(0,0,0,0.35)", color: "#DC2626", top: 12, insetInlineEnd: 12 }}>
                    {isWishlist(p.id) ? <HeartFilledIcon size={16} /> : <HeartIcon size={16} />}
                  </button>
                </div>
                <div className="pt-4 text-center">
                  <a href={`/store/${slug}/products/${p.id}`} className="block"><h3 className="font-bold text-[16px] tracking-[0.08em]" style={{ color: "#fff" }}>{p.nameAr}</h3></a>
                  {(p.ratingCount ?? 0) > 0 && (<div className="mt-1"><ProductRating rating={p.averageRating} count={p.ratingCount} size={12} /></div>)}
                  <div className="mt-2 flex items-baseline justify-center gap-2">
                    <span className="font-bold text-[15px] tracking-[0.1em]" style={{ color: gold }}>{p.discountPrice || p.basePrice} {currencySymbol}</span>
                    {hasDiscount(p) && <span className="text-[12px] line-through" style={{ color: "rgba(255,255,255,0.45)" }}>{p.basePrice} {currencySymbol}</span>}
                  </div>
                  <button type="button" onClick={() => handleAddToCart(p.id)} className="mt-4 px-7 py-2 text-[12px] font-bold tracking-[0.16em] uppercase transition-colors" style={{ border: `1px solid ${gold}66`, color: gold }} onMouseEnter={(e) => { e.currentTarget.style.background = gold; e.currentTarget.style.color = "#1B1626"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = gold; }}>
                    {t("storefront.addToCart")}
                  </button>
                </div>
              </div>
            ))}
          </div>}
          {!isSearchActive && !showAllProducts && products.length > 8 && <div className="mt-12 text-center"><button type="button" onClick={() => setShowAllProducts(true)} className="px-8 py-2.5 font-bold text-sm tracking-[0.14em]" style={{ border: `1px solid ${gold}`, color: gold }}>{t("storefront.viewAll")}</button></div>}
        </div>
      </section>}

      <Toast message={cartMessage} type={cartMessageType} />

      {showHero && <section style={{ background: colors.newsletterColor, padding: "56px 0" }}>
        <div className="text-center max-w-3xl mx-auto px-4">
          <span className="inline-block text-[12px] tracking-[0.3em] uppercase" style={{ color: gold }}><SparklesIcon size={16} /></span>
          <h3 className="mt-3 text-white font-bold" style={{ fontSize: "26px", letterSpacing: "0.04em" }}>{t("storefront.newsletterTitle")}</h3>
          <p className="mt-2 text-white/80 text-[15px]">{t("storefront.newsletterThanks")}</p>
          <form className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3" onSubmit={(e) => e.preventDefault()}>
            <input type="email" required placeholder={t("storefront.newsletterEmail")} className="w-full sm:w-[340px] px-5 py-3 outline-none text-base bg-transparent text-white" style={{ border: `1px solid ${gold}55` }} />
            <button type="submit" className="px-9 py-3 font-bold text-base" style={{ background: gold, color: "#1B1626" }}>{t("storefront.newsletterSubscribe")}</button>
          </form>
        </div>
      </section>}

      <footer style={{ background: colors.footerColor, padding: "56px 0 36px" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div><h4 className="font-bold text-lg tracking-[0.12em] text-white">{storeName}</h4><p className="mt-2 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{t("storefront.footerTagline")}</p></div>
          <div>
            <StorePolicyLinks slug={slug} title={t("storefront.storePolicies")} titleClassName="font-bold text-[13px] tracking-[0.2em] uppercase" titleStyle={{ color: gold }} listClassName="mt-3 space-y-2 text-[13px]" listStyle={{ color: "rgba(255,255,255,0.55)" }} linkClassName="hover:text-white" />
          </div>
          <div>
            <h4 className="font-bold text-[13px] tracking-[0.2em] uppercase" style={{ color: gold }}>{t("storefront.contactHeading")}</h4>
            <ul className="mt-3 space-y-2 text-[13px]" style={{ color: "rgba(255,255,255,0.55)" }}>
              {contactEmail && <li className="flex items-center gap-2"><MailIcon size={14} /><span dir="ltr">{contactEmail}</span></li>}
              {contactPhone && <li className="flex items-center gap-2"><PhoneIcon size={14} /><span dir="ltr">{contactPhone}</span></li>}
              {contactAddress && <li className="flex items-start gap-2"><span className="mt-0.5"><MapPinIcon size={14} /></span><span>{contactAddress}</span></li>}
              {!contactEmail && !contactPhone && !contactAddress && <li>{t("storefront.noContact")}</li>}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-[13px] tracking-[0.2em] uppercase" style={{ color: gold }}>{t("storefront.followUs")}</h4>
            <div className="mt-3 flex gap-3">
              <StoreSocialLinks
                urls={{ facebook: fbUrl, instagram: igUrl, whatsapp: waUrl, snapchat: scUrl, tiktok: tkUrl, telegram: tgUrl, linkedin: liUrl, twitter: twUrl, youtube: ytUrl, pinterest: pinUrl }}
                linkClassName="flex items-center justify-center transition-opacity hover:opacity-70"
                linkStyle={{ width: 34, height: 34, border: `1px solid ${gold}55`, color: gold }}
                iconSize={16}
              />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t text-center" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>© {new Date().getFullYear()} {storeName}. {t("storefront.footerBy")}</p>
        </div>
      </footer>
    </div>
  );
}
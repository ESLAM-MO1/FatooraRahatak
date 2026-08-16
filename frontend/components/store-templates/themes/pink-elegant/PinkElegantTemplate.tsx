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
import { SearchIcon, BagIcon, HeartIcon, HeartFilledIcon, MenuIcon, CloseIcon, MailIcon, PhoneIcon, MapPinIcon, PackageIcon, CheckIcon, TruckIcon } from "@/components/store-templates/icons";

interface TemplateProps extends StoreTemplateProps {
  themeMeta: StoreThemeMeta;
  colors: StoreColors;
}

export default function PinkElegantTemplate({
  children, storeName, slug, showHero = true, storeId, logo, currency = "SAR", coverImage = null,
  contactPhone, contactEmail, contactAddress, facebookUrl, instagramUrl, whatsappUrl, snapchatUrl, tiktokUrl, telegramUrl, linkedinUrl, trustBadges = [], themeMeta, colors,
}: TemplateProps) {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { categories, products, productsLoading, selectedCategoryId, setSelectedCategoryId, showAllProducts, setShowAllProducts,
    cartCount, wishlist, toggleWishlist, searchInput, setSearchInput, handleSearchSubmit, isSearchActive, searchResults,
    currencySymbol, isRtl, handleAddToCart, cartMessage, cartMessageType } = useStorefront(slug, storeId, currency, true, showHero, themeMeta);

  const hasSocial = !!(facebookUrl || instagramUrl || whatsappUrl || snapchatUrl || tiktokUrl || telegramUrl || linkedinUrl);
  const fbUrl = resolveSocialUrl(facebookUrl);
  const igUrl = resolveSocialUrl(instagramUrl);
  const waUrl = resolveSocialUrl(whatsappUrl);
  const scUrl = resolveSocialUrl(snapchatUrl);
  const tkUrl = resolveSocialUrl(tiktokUrl);
  const tgUrl = resolveSocialUrl(telegramUrl);
  const liUrl = resolveSocialUrl(linkedinUrl);
  const isWishlist = (id: number) => wishlist.includes(id);
  const hasDiscount = (p: { basePrice: number; discountPrice: number | null }) => p.discountPrice !== null && p.discountPrice < p.basePrice;
  const getDiscount = (p: { basePrice: number; discountPrice: number | null }) => hasDiscount(p) ? Math.round((1 - (p.discountPrice as number) / p.basePrice) * 100) : 0;

  const displayProducts = isSearchActive ? searchResults : products.slice(0, showAllProducts ? products.length : 8);
  const [featuredItems, restItems] = [displayProducts.slice(0, 2), displayProducts.slice(2)];
  const catChips = categories.length
    ? categories
    : [{ id: null, nameAr: t("storefront.all"), image: null }, { id: null, nameAr: t("storefront.featuredProducts"), image: null }, { id: null, nameAr: t("storefront.easyReturns"), image: null }];

  const softGradient = `linear-gradient(160deg, ${colors.heroFrom}22, ${colors.heroTo}44)`;

  const PriceRow = ({ p, accent = true, size = "lg" }: { p: { basePrice: number; discountPrice: number | null }; accent?: boolean; size?: "lg" | "md" }) => (
    <div className="flex items-baseline gap-2">
      <span className="font-bold" style={{ color: accent ? colors.accentColor : "#1C1917", fontSize: size === "lg" ? "20px" : "16px" }}>{p.discountPrice || p.basePrice} {currencySymbol}</span>
      {hasDiscount(p) && <span className="line-through" style={{ color: "#A8A29E", fontSize: size === "lg" ? "14px" : "12px" }}>{p.basePrice} {currencySymbol}</span>}
    </div>
  );

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="font-serif" style={{ fontFamily: "'Georgia', 'Playfair Display', 'Tajawal', serif", background: "#FBF7F5" }}>
      <div style={{ background: "#F3E9E4", color: colors.headerColor }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-center h-8 text-[11px] tracking-[0.18em] uppercase">
          <span>{t("storefront.freeShipping")}</span>
        </div>
      </div>

      <header className="sticky top-0 z-40" style={{ background: "rgba(251,247,245,0.94)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <button className="md:hidden p-1.5 -ml-1.5" onClick={() => setMobileOpen(!mobileOpen)} style={{ color: colors.headerColor }}>{mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}</button>
          <nav className="hidden md:flex items-center gap-9 text-[14px] font-semibold">
            <a href={`/store/${slug}`} className="hover:opacity-70" style={{ color: colors.headerColor }}>{t("storefront.home")}</a>
            <a href={`/store/${slug}#products`} className="hover:opacity-70" style={{ color: colors.headerColor }}>{t("storefront.products")}</a>
            <a href={`/store/${slug}/contact`} className="hover:opacity-70" style={{ color: colors.headerColor }}>{t("storefront.contactUs")}</a>
          </nav>
          <a href={`/store/${slug}`} className="flex items-center gap-2.5 min-w-0">
            {logo && <img src={logo} alt={storeName} className="w-9 h-9 rounded-full object-cover" />}
            <span className="font-bold text-xl tracking-wide truncate" style={{ color: colors.headerColor }}>{storeName}</span>
          </a>
          <div className="flex items-center gap-1">
            <form onSubmit={handleSearchSubmit} className="hidden md:block"><div className="relative">
              <span className="absolute inset-y-0 inline-flex items-center ps-3 pointer-events-none" style={{ color: "#A8A29E" }}><SearchIcon size={16} /></span>
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder={t("storefront.searchPlaceholder")} className="w-40 lg:w-48 rounded-full outline-none text-[14px] ps-9 pe-3 py-2" style={{ background: "#fff", color: "#1C1917", border: "1px solid #EDE1DB" }} />
            </div></form>
            <QuickLoginButton slug={slug} />
            <a href={`/store/${slug}/wishlist`} className="relative p-2 rounded-full" style={{ color: colors.headerColor }} aria-label={t("storefront.wishlist")}><HeartIcon size={20} />{wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ width: 16, height: 16, background: "#DC2626" }}>{wishlist.length}</span>}</a>
            <a href={`/store/${slug}/cart`} className="relative p-2 rounded-full" style={{ color: colors.headerColor }} aria-label={t("storefront.cart")}><BagIcon size={20} />{cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ width: 16, height: 16, background: "#DC2626" }}>{cartCount}</span>}</a>
          </div>
        </div>
        {mobileOpen && <div className="md:hidden px-4 pb-4 space-y-2 text-[15px] font-semibold" style={{ color: colors.headerColor }}>
          <a href={`/store/${slug}`} className="block">{t("storefront.home")}</a>
          <a href={`/store/${slug}#products`} className="block">{t("storefront.products")}</a>
          <a href={`/store/${slug}/contact`} className="block">{t("storefront.contactUs")}</a>
        </div>}
      </header>

      {!showHero && <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>}

      {showHero && <section className="w-full" style={{ background: softGradient }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center" style={{ paddingTop: "84px", paddingBottom: "84px" }}>
          <span className="inline-block text-[12px] tracking-[0.28em] uppercase" style={{ color: colors.accentColor }}>{t("storefront.featuredProduct")}</span>
          <h1 className="mt-4 font-bold leading-tight" style={{ fontSize: "clamp(42px, 7vw, 68px)", color: colors.headerColor }}>{storeName}</h1>
          <p className="mt-5 text-[15px] italic max-w-lg mx-auto" style={{ color: "#6F5A55" }}>{t("storefront.heroWelcome")}</p>
          <div className="mt-9 flex items-center justify-center gap-4">
            <a href="#products" onClick={(e) => { e.preventDefault(); document.getElementById("products")?.scrollIntoView?.({ behavior: "smooth" }); }} className="px-10 py-3 text-[14px] font-bold tracking-[0.12em] uppercase transition-colors" style={{ border: "1px solid rgba(255,255,255,0.7)", background: "transparent", color: colors.headerColor }}>
              {t("storefront.shopNow")}
            </a>
          </div>
        </div>
      </section>}

      {!isSearchActive && showHero && <section style={{ padding: "32px 0 8px" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex justify-center gap-3 overflow-x-auto pb-2 flex-wrap">
          {catChips.map((cat, idx: number) => (
            <button key={idx} type="button" onClick={() => { if (cat.id !== null) setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id); }} className="shrink-0 rounded-full px-6 py-2 text-[13px] font-semibold tracking-wide" style={{ border: `1px solid ${colors.accentColor}55`, color: selectedCategoryId === cat.id ? "#fff" : colors.headerColor, background: selectedCategoryId === cat.id ? colors.accentColor : "transparent" }}>
              {cat.nameAr}
            </button>
          ))}
        </div>
      </section>}

      {showHero && <section id="products" style={{ padding: "40px 0 64px" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-[13px] tracking-[0.3em] uppercase" style={{ color: colors.accentColor }}>{t("storefront.featuredProducts")}</span>
            <div className="mt-4 mx-auto" style={{ width: 56, height: 1, background: colors.accentColor }} />
          </div>

          {productsLoading && <p className="text-center py-12" style={{ color: "#6B7280" }}>{t("storefront.loadingProducts")}</p>}
          {!productsLoading && displayProducts.length === 0 && <div className="flex flex-col items-center gap-3 py-16"><span style={{ color: "#D1D5DB" }}><PackageIcon size={48} /></span><p style={{ color: "#6B7280" }}>{t("storefront.noProducts")}</p></div>}

          {!productsLoading && featuredItems.length > 0 && (
            <div className="grid gap-10 lg:grid-cols-2">
              {featuredItems.map(p => (
                <div key={p.id} className="group">
                  <div className="relative overflow-hidden rounded-[4px]" style={{ aspectRatio: "4/5", background: "#F3E9E4" }}>
                    <a href={`/store/${slug}/products/${p.id}`} className="block w-full h-full">
                      {p.primaryImageUrl
                        ? <img src={p.primaryImageUrl} alt={p.nameAr} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        : <div className="w-full h-full flex items-center justify-center" style={{ color: "#D8C4BC" }}><PackageIcon size={56} /></div>}
                    </a>
                    {hasDiscount(p) && <span className="absolute rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: colors.accentColor, color: "#fff", top: 14, insetInlineStart: 14 }}>-{getDiscount(p)}%</span>}
                    <button type="button" onClick={() => toggleWishlist(p.id)} aria-label={t("storefront.wishlist")} className="absolute rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ width: 36, height: 36, background: "rgba(255,255,255,0.92)", top: 14, insetInlineEnd: 14, color: "#DC2626" }}>
                      {isWishlist(p.id) ? <HeartFilledIcon size={17} /> : <HeartIcon size={17} />}
                    </button>
                  </div>
                  <div className="pt-5 text-center">
                    <a href={`/store/${slug}/products/${p.id}`} className="block"><h3 className="font-bold text-[17px]" style={{ color: "#1C1917" }}>{p.nameAr}</h3></a>
                    {(p.ratingCount ?? 0) > 0 && (<div className="mt-1"><ProductRating rating={p.averageRating} count={p.ratingCount} size={12} /></div>)}
                    <div className="mt-2 flex justify-center"><PriceRow p={p} /></div>
                    <button type="button" onClick={() => handleAddToCart(p.id)} className="mt-4 px-8 py-2.5 text-[13px] font-bold tracking-wide transition-colors" style={{ border: `1px solid ${colors.buttonColor}`, color: colors.buttonColor }} onMouseEnter={(e) => { e.currentTarget.style.background = colors.buttonColor; e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = colors.buttonColor; }}>
                      {t("storefront.addToCart")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!productsLoading && restItems.length > 0 && (
            <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {restItems.map(p => (
                <div key={p.id} className="group">
                  <div className="relative overflow-hidden rounded-[4px]" style={{ aspectRatio: "4/5", background: "#F3E9E4" }}>
                    <a href={`/store/${slug}/products/${p.id}`} className="block w-full h-full">
                      {p.primaryImageUrl
                        ? <img src={p.primaryImageUrl} alt={p.nameAr} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        : <div className="w-full h-full flex items-center justify-center" style={{ color: "#D8C4BC" }}><PackageIcon size={44} /></div>}
                    </a>
                    {hasDiscount(p) && <span className="absolute rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: colors.accentColor, color: "#fff", top: 12, insetInlineStart: 12 }}>-{getDiscount(p)}%</span>}
                    <button type="button" onClick={() => toggleWishlist(p.id)} aria-label={t("storefront.wishlist")} className="absolute rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ width: 32, height: 32, background: "rgba(255,255,255,0.92)", top: 12, insetInlineEnd: 12, color: "#DC2626" }}>
                      {isWishlist(p.id) ? <HeartFilledIcon size={15} /> : <HeartIcon size={15} />}
                    </button>
                  </div>
                  <div className="pt-4 text-center">
                    <a href={`/store/${slug}/products/${p.id}`} className="block"><h3 className="font-bold text-[15px]" style={{ color: "#1C1917" }}>{p.nameAr}</h3></a>
                    {(p.ratingCount ?? 0) > 0 && (<div className="mt-1"><ProductRating rating={p.averageRating} count={p.ratingCount} size={12} /></div>)}
                    <div className="mt-1.5 flex justify-center"><PriceRow p={p} size="md" /></div>
                    <button type="button" onClick={() => handleAddToCart(p.id)} className="mt-3 px-6 py-2 text-[12px] font-bold tracking-wide transition-colors" style={{ border: `1px solid ${colors.buttonColor}99`, color: colors.buttonColor }} onMouseEnter={(e) => { e.currentTarget.style.background = colors.buttonColor; e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = colors.buttonColor; }}>
                      {t("storefront.addToCart")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isSearchActive && !showAllProducts && products.length > 8 && <div className="mt-10 text-center"><button type="button" onClick={() => setShowAllProducts(true)} className="px-8 py-2.5 font-bold text-sm tracking-wide" style={{ border: `1px solid ${colors.accentColor}`, color: colors.accentColor }}>{t("storefront.viewAll")}</button></div>}
        </div>
      </section>}

      <Toast message={cartMessage} type={cartMessageType} />

      {showHero && <section style={{ background: colors.newsletterColor, padding: "56px 0" }}>
        <div className="text-center max-w-3xl mx-auto px-4">
          <h3 className="text-white font-bold" style={{ fontSize: "26px" }}>{t("storefront.newsletterTitle")}</h3>
          <p className="mt-2 text-white/90 text-[15px]">{t("storefront.newsletterThanks")}</p>
          <form className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3" onSubmit={(e) => e.preventDefault()}>
            <input type="email" required placeholder={t("storefront.newsletterEmail")} className="w-full sm:w-[340px] px-5 py-3 rounded-[2px] outline-none text-base" style={{ background: "#fff", color: "#1C1917" }} />
            <button type="submit" className="px-9 py-3 rounded-[2px] font-bold text-base" style={{ background: "#fff", color: colors.headerColor }}>{t("storefront.newsletterSubscribe")}</button>
          </form>
        </div>
      </section>}

      <footer style={{ background: "#F3E9E4", padding: "52px 0 32px" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div><h4 className="font-bold text-lg" style={{ color: colors.headerColor }}>{storeName}</h4><p className="mt-2 text-[13px] italic" style={{ color: "#6F5A55" }}>{t("storefront.footerTagline")}</p></div>
          <div>
            <h4 className="font-bold text-[14px] tracking-wide" style={{ color: colors.headerColor }}>{t("storefront.footerLinks")}</h4>
            <ul className="mt-3 space-y-2 text-[13px]" style={{ color: "#6F5A55" }}>
              <li><a href={`/store/${slug}`} className="hover:opacity-70">{t("storefront.home")}</a></li>
              <li><a href={`/store/${slug}#products`} className="hover:opacity-70">{t("storefront.products")}</a></li>
              <li><a href={`/store/${slug}/track-order`} className="hover:opacity-70">{t("storefront.trackOrder")}</a></li>
              <li><a href={`/store/${slug}/contact`} className="hover:opacity-70">{t("storefront.contactFooter")}</a></li>
              <li><a href={`/store/${slug}/return-policy`} className="hover:opacity-70">{t("storefront.returnPolicy")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-[14px] tracking-wide" style={{ color: colors.headerColor }}>{t("storefront.contactHeading")}</h4>
            <ul className="mt-3 space-y-2.5 text-[13px]" style={{ color: "#6F5A55" }}>
              {contactEmail && <li className="flex items-center gap-3"><span className="flex items-center justify-center rounded-full" style={{ width: 30, height: 30, border: "1px solid #E4D3CB", color: colors.accentColor }}><MailIcon size={13} /></span><span dir="ltr">{contactEmail}</span></li>}
              {contactPhone && <li className="flex items-center gap-3"><span className="flex items-center justify-center rounded-full" style={{ width: 30, height: 30, border: "1px solid #E4D3CB", color: colors.accentColor }}><PhoneIcon size={13} /></span><span dir="ltr">{contactPhone}</span></li>}
              {contactAddress && <li className="flex items-start gap-3"><span className="flex items-center justify-center rounded-full mt-0.5" style={{ width: 30, height: 30, border: "1px solid #E4D3CB", color: colors.accentColor }}><MapPinIcon size={13} /></span><span>{contactAddress}</span></li>}
              {!contactEmail && !contactPhone && !contactAddress && <li>{t("storefront.noContact")}</li>}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-[14px] tracking-wide" style={{ color: colors.headerColor }}>{t("storefront.followUs")}</h4>
            <div className="mt-3 flex gap-3">
              <StoreSocialLinks
                urls={{ facebook: fbUrl, instagram: igUrl, whatsapp: waUrl, snapchat: scUrl, tiktok: tkUrl, telegram: tgUrl, linkedin: liUrl }}
                linkClassName="flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
                linkStyle={{ width: 34, height: 34, border: "1px solid #E4D3CB", color: colors.accentColor }}
                iconSize={16}
              />
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-8 pt-5 border-t text-center" style={{ borderColor: "#E4D3CB" }}>
          <p className="text-[12px]" style={{ color: "#6F5A55" }}>© {new Date().getFullYear()} {storeName}. {t("storefront.footerBy")}</p>
        </div>
      </footer>
    </div>
  );
}
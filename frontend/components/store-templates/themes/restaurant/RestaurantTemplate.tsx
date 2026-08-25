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
import { BagIcon, HeartIcon, HeartFilledIcon, MenuIcon, CloseIcon, MailIcon, PhoneIcon, MapPinIcon, PackageIcon, TruckIcon, SparklesIcon } from "@/components/store-templates/icons";
import StoreMainMenu from "@/components/store-templates/StoreMainMenu";
import StorePolicyLinks from "@/components/store-templates/StorePolicyLinks";
import StoreBanners from "@/components/store-templates/StoreBanners";

interface TemplateProps extends StoreTemplateProps {
  themeMeta: StoreThemeMeta;
  colors: StoreColors;
}

export default function RestaurantTemplate({
  children, storeName, slug, showHero = true, storeId, logo, currency = "SAR", coverImage = null,
  contactPhone, contactEmail, contactAddress, facebookUrl, instagramUrl, whatsappUrl, snapchatUrl, tiktokUrl, telegramUrl, linkedinUrl, twitterUrl, youtubeUrl, pinterestUrl, trustBadges = [], themeMeta, colors,
}: TemplateProps) {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { categories, products, productsLoading, selectedCategoryId, setSelectedCategoryId, showAllProducts, setShowAllProducts,
    cartCount, wishlist, toggleWishlist, isSearchActive, searchResults, currencySymbol, isRtl, handleAddToCart, cartMessage, cartMessageType, orderType, setOrderType } = useStorefront(slug, storeId, currency, true, showHero, themeMeta);

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
  const displayProducts = isSearchActive ? searchResults : products.slice(0, showAllProducts ? products.length : 8);
  const cats = categories.length ? categories : [{ id: null, nameAr: "الكل", image: null }, { id: null, nameAr: "مقبلات", image: null }, { id: null, nameAr: "أطباق رئيسية", image: null }, { id: null, nameAr: "حلويات", image: null }];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="font-serif" style={{ fontFamily: "'Georgia', 'Tajawal', serif", background: "#FBF6EF" }}>
      <header className="sticky top-0 z-40" style={{ background: colors.headerColor, boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3 min-w-0">
            {logo && <img src={logo} alt={storeName} className="w-10 h-10 rounded-full object-cover" />}
            <a href={`/store/${slug}`} className="font-bold text-xl text-white" style={{ letterSpacing: "0.5px" }}>{storeName}</a>
          </div>
          <StoreMainMenu slug={slug} containerClassName="hidden md:flex items-center gap-8 text-[15px] font-bold text-white" linkClassName="hover:opacity-75" />
          <div className="flex items-center gap-2">
            <QuickLoginButton slug={slug} />
            <a href={`/store/${slug}/wishlist`} className="relative p-2 text-white" aria-label={t("storefront.wishlist")}><HeartIcon size={20} />{wishlist.length > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">{wishlist.length}</span>}</a>
            <a href={`/store/${slug}/cart`} className="relative p-2 text-white" aria-label={t("storefront.cart")}><BagIcon size={20} />{cartCount > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">{cartCount}</span>}</a>
            <button className="md:hidden p-2 text-white" onClick={() => setMobileOpen(!mobileOpen)} aria-label={t("storefront.menu")}>{mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}</button>
          </div>
        </div>
        {mobileOpen && <div className="md:hidden border-t" style={{ borderColor: "rgba(255,255,255,0.15)", background: colors.headerColor }}><StoreMainMenu slug={slug} mobile containerClassName="px-4 py-3 space-y-2 text-white text-[15px] font-bold" linkClassName="block py-1.5" /></div>}
      </header>

      {showHero && <StoreBanners slug={slug} position="HomeTop" />}

      {!showHero && <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>}

      {showHero && (
        <section className="w-full relative" style={{ background: `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)),url("${coverImage || ""}") center/cover no-repeat, linear-gradient(135deg,${colors.heroFrom},${colors.heroTo})`, color: "#fff" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4" style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.35)" }}><SparklesIcon size={30} /></span>
            <h1 className="font-bold leading-tight" style={{ fontSize: "clamp(40px,6vw,60px)" }}>{storeName}</h1>
            <p className="mt-4 max-w-xl mx-auto text-base italic" style={{ color: "rgba(255,255,255,0.9)" }}>{t("storefront.heroWelcome")}</p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <button type="button" onClick={() => setOrderType("delivery")} className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full text-[14px] font-bold transition-colors" style={{ background: orderType === "delivery" ? "#FFFFFF" : "rgba(255,255,255,0.18)", color: orderType === "delivery" ? colors.headerColor : "#FFFFFF" }}><TruckIcon size={16} />{t("storefront.delivery")}</button>
              <button type="button" onClick={() => setOrderType("pickup")} className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full text-[14px] font-bold transition-colors" style={{ background: orderType === "pickup" ? "#FFFFFF" : "rgba(255,255,255,0.18)", color: orderType === "pickup" ? colors.headerColor : "#FFFFFF" }}><MapPinIcon size={16} />{t("storefront.pickup")}</button>
            </div>
            <a href="#menu" onClick={(e) => { e.preventDefault(); document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-block mt-8 px-10 py-3.5 font-bold rounded-full" style={{ background: colors.buttonColor, color: "#fff", boxShadow: `0 12px 30px ${colors.accentColor}55` }}>
              {t("storefront.orderNow")}
            </a>
          </div>
        </section>
      )}

      {!isSearchActive && showHero && (
        <section style={{ padding: "28px 0" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-3 overflow-x-auto pb-2 justify-center">
            {cats.map((cat, idx: number) => (
              <button key={idx} onClick={() => { if (cat.id !== null) setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id); }}
                className="shrink-0 px-6 py-2.5 rounded-full text-[14px] font-bold transition-colors"
                style={{ background: selectedCategoryId === cat.id ? colors.buttonColor : "#fff", color: selectedCategoryId === cat.id ? "#fff" : colors.headerColor, border: "1px solid #EADDCB", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                {cat.nameAr}
              </button>
            ))}
          </div>
        </section>
      )}

      {showHero && <StoreBanners slug={slug} position="HomeMiddle" />}
      {showHero && <section id="menu" style={{ padding: "40px 0 48px" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full" style={{ background: colors.accentColor, color: "#fff" }}><SparklesIcon size={22} /></span>
            <h2 className="mt-3 font-bold text-2xl" style={{ color: colors.headerColor }}>{t("storefront.featuredProducts")}</h2>
            <div className="mt-3 mx-auto" style={{ width: "60px", height: "2px", background: colors.accentColor }} />
          </div>
          {productsLoading && <p className="text-center py-12" style={{ color: "#6B7280" }}>{t("storefront.loadingProducts")}</p>}
          {!productsLoading && displayProducts.length === 0 && <div className="flex flex-col items-center gap-3 py-16"><span style={{ color: "#D1D5DB" }}><PackageIcon size={48} /></span><p style={{ color: "#6B7280" }}>{t("storefront.noProducts")}</p></div>}
          {!productsLoading && displayProducts.length > 0 && <div className="grid gap-6 md:grid-cols-2">
            {displayProducts.map(p => (
              <div key={p.id} className="bg-white rounded-2xl overflow-hidden flex transition-shadow hover:shadow-lg" style={{ border: "1px solid #EFE3D1", boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}>
                <div className="w-32 sm:w-40 shrink-0 relative">
                  <a href={`/store/${slug}/products/${p.id}`} className="block w-full h-full">
                    {p.primaryImageUrl ? <img src={p.primaryImageUrl} alt={p.nameAr} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center w-full h-full" style={{ color: "#D1D5DB" }}><PackageIcon size={36} /></div>}
                  </a>
                  {hasDiscount(p) && <span className="absolute top-2 right-2 px-2 py-0.5 text-[11px] font-bold rounded-full" style={{ background: colors.accentColor, color: "#fff" }}>{t("storefront.discount")}</span>}
                </div>
                <div className="flex-1 p-4 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 text-[16px]">{p.nameAr}</h3>
                    <button onClick={() => toggleWishlist(p.id)} className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-transform hover:scale-110" style={{ color: isWishlist(p.id) ? "#DC2626" : "#6B7280" }}>{isWishlist(p.id) ? <HeartFilledIcon size={18} /> : <HeartIcon size={18} />}</button>
                  </div>
                  {(p.ratingCount ?? 0) > 0 && (<div className="mt-1"><ProductRating rating={p.averageRating} count={p.ratingCount} size={12} /></div>)}
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-bold text-lg" style={{ color: colors.accentColor }}>{p.discountPrice || p.basePrice} {currencySymbol}</span>
                    {hasDiscount(p) && <span className="text-xs text-gray-400 line-through">{p.basePrice} {currencySymbol}</span>}
                  </div>
                  <div className="mt-auto pt-3">
                    <button onClick={() => handleAddToCart(p.id)} className="w-full py-2.5 rounded-full font-bold text-sm" style={{ background: colors.buttonColor, color: "#fff" }}>
                      {t("storefront.orderNow")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>}
          {!isSearchActive && !showAllProducts && products.length > 8 && <div className="mt-8 text-center"><button onClick={() => setShowAllProducts(true)} className="px-8 py-2.5 rounded-full font-bold text-sm" style={{ border: `1px solid ${colors.accentColor}`, color: colors.accentColor }}>{t("storefront.viewAll")}</button></div>}
        </div>
      </section>}

      <Toast message={cartMessage} type={cartMessageType} />

      {showHero && <section style={{ background: colors.newsletterColor, padding: "52px 0" }}>
        <div className="text-center max-w-3xl mx-auto px-4">
          <h3 className="text-white font-bold" style={{ fontSize: "26px" }}>{t("storefront.newsletterTitle")}</h3>
          <p className="mt-2 text-white/85" style={{ fontSize: "15px" }}>{t("storefront.newsletterThanks")}</p>
          <form className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3" onSubmit={(e) => e.preventDefault()}>
            <input type="email" required placeholder={t("storefront.newsletterEmail")} className="w-full sm:w-[340px] px-4 py-3 rounded-full outline-none text-base" style={{ background: "#fff", color: "#111827" }} />
            <button type="submit" className="px-8 py-3 rounded-full font-bold text-base" style={{ background: colors.accentColor, color: "#fff" }}>{t("storefront.newsletterSubscribe")}</button>
          </form>
        </div>
      </section>}

      {showHero && <StoreBanners slug={slug} position="HomeBottom" />}

      <footer style={{ background: colors.footerColor, padding: "48px 0 32px" }}>
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div><h4 className="text-white font-bold text-lg">{storeName}</h4><p className="mt-2 text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>{t("storefront.footerTagline")}</p></div>
          <div>
            <StorePolicyLinks slug={slug} title={t("storefront.storePolicies")} titleClassName="text-white font-bold text-[14px]" listClassName="mt-3 space-y-2 text-[13px]" listStyle={{ color: "rgba(255,255,255,0.65)" }} linkClassName="hover:text-white" />
          </div>
          <div>
            <h4 className="text-white font-bold text-[14px]">{t("storefront.contactHeading")}</h4>
            <ul className="mt-3 space-y-2 text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>
              {contactEmail && <li className="flex items-center gap-2"><MailIcon size={14} /><span dir="ltr">{contactEmail}</span></li>}
              {contactPhone && <li className="flex items-center gap-2"><PhoneIcon size={14} /><span dir="ltr">{contactPhone}</span></li>}
              {contactAddress && <li className="flex items-start gap-2"><MapPinIcon size={14} /><span>{contactAddress}</span></li>}
              {!contactEmail && !contactPhone && !contactAddress && <li>{t("storefront.noContact")}</li>}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-[14px]">{t("storefront.followUs")}</h4>
            <div className="mt-3 flex gap-3">
              <StoreSocialLinks
                urls={{ facebook: fbUrl, instagram: igUrl, whatsapp: waUrl, snapchat: scUrl, tiktok: tkUrl, telegram: tgUrl, linkedin: liUrl, twitter: twUrl, youtube: ytUrl, pinterest: pinUrl }}
                linkClassName="flex items-center justify-center w-9 h-9 rounded-full"
                linkStyle={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
                iconSize={16}
              />
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-8 pt-5 border-t text-center" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>© {new Date().getFullYear()} {storeName}. {t("storefront.footerBy")}</p>
        </div>
      </footer>
    </div>
  );
}
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
import { BagIcon, HeartIcon, HeartFilledIcon, MenuIcon, CloseIcon, MailIcon, PhoneIcon, MapPinIcon, PackageIcon, CrossIcon, PlusIcon } from "@/components/store-templates/icons";
import StoreMainMenu from "@/components/store-templates/StoreMainMenu";
import StorePolicyLinks from "@/components/store-templates/StorePolicyLinks";
import StoreBanners from "@/components/store-templates/StoreBanners";

interface TemplateProps extends StoreTemplateProps {
  themeMeta: StoreThemeMeta;
  colors: StoreColors;
}

export default function PharmacyTemplate({
  children, storeName, slug, showHero = true, storeId, logo, currency = "SAR", coverImage = null,
  contactPhone, contactEmail, contactAddress, facebookUrl, instagramUrl, whatsappUrl, snapchatUrl, tiktokUrl, telegramUrl, linkedinUrl, twitterUrl, youtubeUrl, pinterestUrl, trustBadges = [], themeMeta, colors,
}: TemplateProps) {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { categories, products, productsLoading, selectedCategoryId, setSelectedCategoryId, showAllProducts, setShowAllProducts,
    cartCount, wishlist, toggleWishlist, isSearchActive, searchResults, currencySymbol, isRtl, handleAddToCart, cartMessage, cartMessageType } = useStorefront(slug, storeId, currency, true, showHero, themeMeta);

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
  const cats = categories.length ? categories : [{ id: null, nameAr: "الكل", image: null }, { id: null, nameAr: "فيتامينات", image: null }, { id: null, nameAr: "العناية", image: null }, { id: null, nameAr: "الأطفال", image: null }];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="font-sans" style={{ fontFamily: "'Segoe UI', 'Tajawal', system-ui, sans-serif", background: "#F6FAFC" }}>
      <header className="sticky top-0 z-40" style={{ background: "#FFFFFF", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3 min-w-0">
            {logo ? <img src={logo} alt={storeName} className="w-10 h-10 object-contain" /> : <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: colors.buttonColor, color: "#fff" }}><CrossIcon size={22} /></div>}
            <a href={`/store/${slug}`} className="font-bold text-xl" style={{ color: colors.headerColor }}>{storeName}</a>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-semibold">
            <StoreMainMenu slug={slug} mobile={false} containerClassName="flex items-center gap-8 text-[15px] font-semibold" linkClassName="hover:opacity-70" linkStyle={{ color: colors.headerColor }} />
          </nav>
          <div className="flex items-center gap-2">
            <QuickLoginButton slug={slug} />
            <a href={`/store/${slug}/wishlist`} className="relative p-2" style={{ color: colors.headerColor }} aria-label={t("storefront.wishlist")}><HeartIcon size={20} />{wishlist.length > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">{wishlist.length}</span>}</a>
            <a href={`/store/${slug}/cart`} className="relative p-2" style={{ color: colors.headerColor }} aria-label={t("storefront.cart")}><BagIcon size={20} />{cartCount > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">{cartCount}</span>}</a>
            <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} style={{ color: colors.headerColor }} aria-label={t("storefront.menu")}>{mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}</button>
          </div>
        </div>
        {mobileOpen && <div className="md:hidden border-t" style={{ borderColor: "#E3EDF3", background: "#fff" }}><div className="px-4 py-3 space-y-2 text-[15px] font-semibold" style={{ color: colors.headerColor }}>
          <StoreMainMenu slug={slug} mobile containerClassName="space-y-2" linkClassName="block py-1.5" />
        </div></div>}
      </header>

      {showHero && <StoreBanners slug={slug} position="HomeTop" />}

      {!showHero && <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>}

      {showHero && (
        <section className="w-full" style={{ background: `linear-gradient(120deg,${colors.heroFrom} 0%,${colors.heroTo} 100%)`, color: "#fff" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 items-center" style={{ minHeight: "440px" }}>
            <div className="py-16 text-center md:text-right">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-bold mb-4" style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)" }}><CrossIcon size={14} />{t("storefront.discount")}</span>
              <h1 className="font-bold leading-tight" style={{ fontSize: "clamp(36px,5vw,54px)" }}>{storeName}</h1>
              <p className="mt-4 text-[15px]" style={{ color: "rgba(255,255,255,0.9)" }}>{t("storefront.heroWelcome")}</p>
              <a href="#products" onClick={(e) => { e.preventDefault(); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-block mt-8 px-10 py-3.5 rounded-full font-bold text-sm" style={{ background: "#FFFFFF", color: colors.headerColor }}>
                {t("storefront.shopNow")}
              </a>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <div className="w-52 h-52 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)", border: "3px solid rgba(255,255,255,0.4)", color: "#fff" }}><CrossIcon size={72} /></div>
            </div>
          </div>
        </section>
      )}

      {!isSearchActive && showHero && (
        <section style={{ padding: "28px 0" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-3 overflow-x-auto pb-2">
            {cats.map((cat, idx: number) => (
              <button key={idx} onClick={() => { if (cat.id !== null) setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id); }}
                className="shrink-0 px-5 py-2 rounded-full text-[13px] font-bold transition-colors"
                style={{ background: selectedCategoryId === cat.id ? colors.buttonColor : "#fff", color: selectedCategoryId === cat.id ? "#fff" : colors.headerColor, border: "1px solid #CFE3EC", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                {cat.nameAr}
              </button>
            ))}
          </div>
        </section>
      )}

      {showHero && <StoreBanners slug={slug} position="HomeMiddle" />}
      {showHero && <section id="products" style={{ padding: "40px 0 48px" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="flex items-center justify-center w-9 h-9 rounded-full" style={{ background: colors.buttonColor, color: "#fff" }}><PlusIcon size={18} /></span>
            <h2 className="font-bold text-2xl" style={{ color: colors.headerColor }}>{t("storefront.featuredProducts")}</h2>
          </div>
          {productsLoading && <p className="text-center py-12" style={{ color: "#6B7280" }}>{t("storefront.loadingProducts")}</p>}
          {!productsLoading && displayProducts.length === 0 && <div className="flex flex-col items-center gap-3 py-16"><span style={{ color: "#D1D5DB" }}><PackageIcon size={48} /></span><p style={{ color: "#6B7280" }}>{t("storefront.noProducts")}</p></div>}
          {!productsLoading && displayProducts.length > 0 && <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayProducts.map(p => (
              <div key={p.id} className="bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1" style={{ border: "1px solid #E3EDF3", boxShadow: "0 6px 20px rgba(3,105,161,0.08)" }}>
                <div className="relative aspect-[4/3] bg-gray-50">
                  <a href={`/store/${slug}/products/${p.id}`} className="block w-full h-full">
                    {p.primaryImageUrl ? <img src={p.primaryImageUrl} alt={p.nameAr} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center w-full h-full" style={{ color: "#D1D5DB" }}><PackageIcon size={40} /></div>}
                  </a>
                  {hasDiscount(p) && <span className="absolute top-3 right-3 px-2.5 py-1 text-xs font-bold rounded-full" style={{ background: colors.accentColor, color: "#fff" }}>{t("storefront.discount")}</span>}
                  <button onClick={() => toggleWishlist(p.id)} className="absolute top-3 left-3 bg-white/90 rounded-full w-9 h-9 flex items-center justify-center transition-transform hover:scale-110" style={{ color: isWishlist(p.id) ? "#DC2626" : "#6B7280" }}>{isWishlist(p.id) ? <HeartFilledIcon size={17} /> : <HeartIcon size={17} />}</button>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-[16px]">{p.nameAr}</h3>
                  {(p.ratingCount ?? 0) > 0 && (<div className="mt-1"><ProductRating rating={p.averageRating} count={p.ratingCount} size={12} /></div>)}
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-bold text-lg" style={{ color: colors.accentColor }}>{p.discountPrice || p.basePrice} {currencySymbol}</span>
                    {hasDiscount(p) && <span className="text-xs text-gray-400 line-through">{p.basePrice} {currencySymbol}</span>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleAddToCart(p.id)} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold" style={{ background: colors.buttonColor, color: "#fff" }}>
                      {t("storefront.addToCart")}
                    </button>
                    <button onClick={() => handleAddToCart(p.id)} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold" style={{ background: "transparent", border: `1px solid ${colors.accentColor}`, color: colors.accentColor }}>
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

      {showHero && <section style={{ background: colors.newsletterColor, padding: "48px 0" }}>
        <div className="text-center max-w-3xl mx-auto px-4">
          <h3 className="text-white font-bold" style={{ fontSize: "24px" }}>{t("storefront.newsletterTitle")}</h3>
          <p className="mt-2 text-white/80" style={{ fontSize: "14px" }}>{t("storefront.newsletterThanks")}</p>
          <form className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3" onSubmit={(e) => e.preventDefault()}>
            <input type="email" required placeholder={t("storefront.newsletterEmail")} className="w-full sm:w-[340px] px-4 py-3 rounded-full outline-none text-base" style={{ background: "#fff", color: "#111827" }} />
            <button type="submit" className="px-8 py-3 rounded-full font-bold text-base" style={{ background: "#FFFFFF", color: colors.headerColor }}>{t("storefront.newsletterSubscribe")}</button>
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
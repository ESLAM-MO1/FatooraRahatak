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
import { BagIcon, HeartIcon, HeartFilledIcon, MenuIcon, CloseIcon, MailIcon, PhoneIcon, PackageIcon } from "@/components/store-templates/icons";
import StoreMainMenu from "@/components/store-templates/StoreMainMenu";
import StorePolicyLinks from "@/components/store-templates/StorePolicyLinks";
import StoreBanners from "@/components/store-templates/StoreBanners";

interface TemplateProps extends StoreTemplateProps {
  themeMeta: StoreThemeMeta;
  colors: StoreColors;
}

export default function BlackMinimalTemplate({
  children, storeName, slug, showHero = true, storeId, logo, currency = "SAR", coverImage = null,
  contactPhone, contactEmail, contactAddress, facebookUrl, instagramUrl, whatsappUrl, snapchatUrl, tiktokUrl, telegramUrl, linkedinUrl, twitterUrl, youtubeUrl, pinterestUrl, trustBadges = [], themeMeta, colors,
}: TemplateProps) {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { categories, products, productsLoading, selectedCategoryId, setSelectedCategoryId, showAllProducts, setShowAllProducts,
    cartCount, wishlist, toggleWishlist, isSearchActive, searchResults, currencySymbol, isRtl, handleAddToCart, cartMessage, cartMessageType } = useStorefront(slug, storeId, currency, false, showHero, themeMeta);

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
  const catChips = categories.length
    ? categories
    : [{ id: null, nameAr: t("storefront.all"), image: null }, { id: null, nameAr: t("storefront.products"), image: null }];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="font-sans" style={{ fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif", background: "#FFFFFF" }}>
      <header className="sticky top-0 z-40" style={{ background: colors.headerColor, borderBottom: "1px solid #262626" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <button className="md:hidden p-1.5 -ml-1.5 text-white" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}</button>
          <a href={`/store/${slug}`} className="flex items-center gap-2.5 min-w-0">
            {logo && <img src={logo} alt={storeName} className="w-7 h-7 object-cover" />}
            <span className="font-thin text-lg tracking-[0.28em] uppercase truncate text-white" style={{ fontWeight: 300 }}>{storeName}</span>
          </a>
          <StoreMainMenu slug={slug} mobile={false} containerClassName="hidden md:flex items-center gap-8 text-[13px] font-medium tracking-wide text-white/70" linkClassName="hover:text-white" />
          <div className="flex items-center gap-1">
            <QuickLoginButton slug={slug} />
            <a href={`/store/${slug}/wishlist`} className="relative p-2 text-white" aria-label={t("storefront.wishlist")}><HeartIcon size={18} />{wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[9px] font-bold text-black rounded-full" style={{ width: 15, height: 15, background: "#fff" }}>{wishlist.length}</span>}</a>
            <a href={`/store/${slug}/cart`} className="relative p-2 text-white" aria-label={t("storefront.cart")}><BagIcon size={18} />{cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[9px] font-bold text-black rounded-full" style={{ width: 15, height: 15, background: "#fff" }}>{cartCount}</span>}</a>
          </div>
        </div>
        {mobileOpen && <div className="md:hidden px-4 pb-4 space-y-2 text-[14px] font-medium text-white">
          <StoreMainMenu slug={slug} mobile containerClassName="space-y-2" linkClassName="block py-1.5" />
        </div>}
      </header>

      {showHero && <StoreBanners slug={slug} position="HomeTop" />}

      {!showHero && <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</main>}

      {showHero && <section className="w-full" style={{ background: "#000000", color: "#fff" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h1 className="font-thin leading-tight tracking-[0.1em]" style={{ fontSize: "clamp(34px, 5vw, 48px)", fontWeight: 300, color: "#fff" }}>{storeName}</h1>
          <p className="mt-3 text-[13px] tracking-[0.08em] uppercase" style={{ color: "#A3A3A3" }}>{t("storefront.heroWelcome")}</p>
          <a href="#products" onClick={(e) => { e.preventDefault(); document.getElementById("products")?.scrollIntoView?.({ behavior: "smooth" }); }} className="inline-block mt-7 px-8 py-2.5 text-[12px] font-bold tracking-[0.2em] uppercase" style={{ background: "#fff", color: "#000", borderRadius: 0 }}>
            {t("storefront.shopNow")}
          </a>
        </div>
      </section>}

      {!isSearchActive && showHero && <section style={{ borderBottom: "1px solid #E5E5E5" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-8 overflow-x-auto py-3 justify-start lg:justify-center">
          {catChips.map((cat, idx: number) => (
            <button key={idx} type="button" onClick={() => { if (cat.id !== null) setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id); }} className="shrink-0 text-[12px] font-bold tracking-[0.16em] uppercase transition-colors" style={{ color: selectedCategoryId === cat.id ? "#000" : "#737373", borderBottom: selectedCategoryId === cat.id ? "1px solid #000" : "1px solid transparent", paddingBottom: 4 }}>
              {cat.nameAr}
            </button>
          ))}
        </div>
      </section>}

      {showHero && <StoreBanners slug={slug} position="HomeMiddle" />}
      {showHero && <section id="products" style={{ padding: "48px 0" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-[12px] font-bold tracking-[0.24em] uppercase" style={{ color: "#000" }}>{t("storefront.featuredProducts")}</h2>
          {productsLoading && <p className="text-center py-12" style={{ color: "#737373" }}>{t("storefront.loadingProducts")}</p>}
          {!productsLoading && displayProducts.length === 0 && <div className="flex flex-col items-center gap-3 py-16"><span style={{ color: "#D4D4D4" }}><PackageIcon size={44} /></span><p style={{ color: "#737373" }}>{t("storefront.noProducts")}</p></div>}
          {!productsLoading && displayProducts.length > 0 && (
            <div className="mt-6">
              {displayProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-5 py-5" style={{ borderBottom: i < displayProducts.length - 1 ? "1px solid #E5E5E5" : "none" }}>
                  <a href={`/store/${slug}/products/${p.id}`} className="block shrink-0">
                    <div className="relative overflow-hidden" style={{ width: 92, height: 92, background: "#FAFAFA" }}>
                      {p.primaryImageUrl
                        ? <img src={p.primaryImageUrl} alt={p.nameAr} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center" style={{ color: "#D4D4D4" }}><PackageIcon size={30} /></div>}
                    </div>
                  </a>
                  <div className="flex-1 min-w-0">
                    <a href={`/store/${slug}/products/${p.id}`} className="block"><h3 className="font-medium text-[16px] truncate" style={{ color: "#171717" }}>{p.nameAr}</h3></a>
                    {(p.ratingCount ?? 0) > 0 && (<div className="mt-1"><ProductRating rating={p.averageRating} count={p.ratingCount} size={12} /></div>)}
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="font-semibold" style={{ color: "#000", fontSize: "15px" }}>{p.discountPrice || p.basePrice} {currencySymbol}</span>
                      {hasDiscount(p) && <span className="line-through" style={{ color: "#A3A3A3", fontSize: "12px" }}>{p.basePrice} {currencySymbol}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button type="button" onClick={() => toggleWishlist(p.id)} aria-label={t("storefront.wishlist")} className="w-9 h-9 flex items-center justify-center" style={{ color: isWishlist(p.id) ? "#DC2626" : "#171717" }}>{isWishlist(p.id) ? <HeartFilledIcon size={17} /> : <HeartIcon size={17} />}</button>
                    <button type="button" onClick={() => handleAddToCart(p.id)} className="px-5 py-2 text-[12px] font-bold tracking-[0.12em] uppercase" style={{ background: colors.buttonColor, color: "#fff", borderRadius: 0 }}>{t("storefront.addToCart")}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isSearchActive && !showAllProducts && products.length > 8 && <div className="mt-10 text-center"><button type="button" onClick={() => setShowAllProducts(true)} className="px-8 py-2.5 font-bold text-sm" style={{ border: "1px solid #000", color: "#000", borderRadius: 0 }}>{t("storefront.viewAll")}</button></div>}
        </div>
      </section>}

      <Toast message={cartMessage} type={cartMessageType} />

      {showHero && <section style={{ background: "#000", padding: "44px 0" }}>
        <div className="text-center max-w-2xl mx-auto px-4">
          <h3 className="text-white" style={{ fontSize: "22px", fontWeight: 300, letterSpacing: "0.08em" }}>{t("storefront.newsletterTitle")}</h3>
          <p className="mt-2 text-[13px]" style={{ color: "#A3A3A3" }}>{t("storefront.newsletterThanks")}</p>
          <form className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3" onSubmit={(e) => e.preventDefault()}>
            <input type="email" required placeholder={t("storefront.newsletterEmail")} className="w-full sm:w-[320px] px-4 py-2.5 outline-none text-[14px]" style={{ background: "transparent", color: "#fff", border: "1px solid #404040", borderRadius: 0 }} />
            <button type="submit" className="px-8 py-2.5 font-bold text-[13px] tracking-[0.14em] uppercase" style={{ background: "#fff", color: "#000", borderRadius: 0 }}>{t("storefront.newsletterSubscribe")}</button>
          </form>
        </div>
      </section>}

      {showHero && <StoreBanners slug={slug} position="HomeBottom" />}

      <footer style={{ background: colors.footerColor, padding: "52px 0 40px" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h4 className="text-white font-thin text-lg tracking-[0.24em] uppercase" style={{ fontWeight: 300 }}>{storeName}</h4>
          <p className="mt-2 text-[13px]" style={{ color: "#A3A3A3" }}>{t("storefront.footerTagline")}</p>
          <StorePolicyLinks slug={slug} title={t("storefront.storePolicies")} titleClassName="mt-6 text-white font-thin text-[12px] tracking-[0.24em] uppercase" titleStyle={{ fontWeight: 300 }} listClassName="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-[12px] tracking-wide" listStyle={{ color: "#A3A3A3" }} linkClassName="hover:text-white" />
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-[13px]" style={{ color: "#A3A3A3" }}>
            {contactEmail && <span className="inline-flex items-center gap-1.5"><MailIcon size={13} /><span dir="ltr">{contactEmail}</span></span>}
            {contactPhone && <span className="inline-flex items-center gap-1.5"><PhoneIcon size={13} /><span dir="ltr">{contactPhone}</span></span>}
            {!contactEmail && !contactPhone && <span>{t("storefront.noContact")}</span>}
          </div>
          <div className="mt-5 flex justify-center gap-5">
            <StoreSocialLinks
              urls={{ facebook: fbUrl, instagram: igUrl, whatsapp: waUrl, snapchat: scUrl, tiktok: tkUrl, telegram: tgUrl, linkedin: liUrl, twitter: twUrl, youtube: ytUrl, pinterest: pinUrl }}
              containerClassName="mt-5 flex justify-center gap-5"
              linkClassName="hover:text-white"
              linkStyle={{ color: "#A3A3A3" }}
              iconSize={16}
            />
          </div>
          <p className="mt-6 pt-5 border-t text-[11px]" style={{ borderColor: "#262626", color: "#737373" }}>© {new Date().getFullYear()} {storeName}. {t("storefront.footerBy")}</p>
        </div>
      </footer>
    </div>
  );
}
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
import { SearchIcon, BagIcon, HeartIcon, HeartFilledIcon, MenuIcon, CloseIcon, MailIcon, PhoneIcon, MapPinIcon, FacebookIcon, InstagramIcon, WhatsAppIcon, PackageIcon, LeafIcon, CheckIcon, SparklesIcon } from "@/components/store-templates/icons";

interface TemplateProps extends StoreTemplateProps {
  themeMeta: StoreThemeMeta;
  colors: StoreColors;
}

function OrganicDivider({ fill, flip = false }: { fill: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full block" style={{ height: 70, display: "block", transform: flip ? "rotate(180deg)" : "none" }}>
      <path d="M0,50 C240,10 480,68 720,42 C960,16 1200,58 1440,28 L1440,70 L0,70 Z" fill={fill} />
    </svg>
  );
}

interface NaturalCardProps {
  product: { id: number; nameAr: string; basePrice: number; discountPrice: number | null; primaryImageUrl: string | null; averageRating?: number; ratingCount?: number };
  slug: string;
  currencySymbol: string;
  colors: StoreColors;
  t: (key: string) => string;
  isWishlist: (id: number) => boolean;
  hasDiscount: (p: { basePrice: number; discountPrice: number | null }) => boolean;
  getDiscount: (p: { basePrice: number; discountPrice: number | null }) => number;
  onWishlist: (id: number) => void;
  onAddToCart: (id: number) => void;
}

function ProductCard({ product, slug, currencySymbol, colors, t, isWishlist, hasDiscount, getDiscount, onWishlist, onAddToCart }: NaturalCardProps) {
  return (
    <div className="bg-white rounded-[30px] overflow-hidden transition-transform duration-300 hover:-translate-y-1" style={{ boxShadow: "0 16px 40px rgba(22,101,52,0.10)" }}>
      <div className="relative p-4 pb-0">
        <div className="relative rounded-[24px] overflow-hidden" style={{ aspectRatio: "1/1", background: "#F2F7F2" }}>
          <a href={`/store/${slug}/products/${product.id}`} className="block w-full h-full">
            {product.primaryImageUrl
              ? <img src={product.primaryImageUrl} alt={product.nameAr} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center" style={{ color: "#C6D8C6" }}><LeafIcon size={44} /></div>}
          </a>
          {hasDiscount(product) && <span className="absolute rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: colors.accentColor, color: "#fff", top: 12, insetInlineStart: 12 }}>-{getDiscount(product)}%</span>}
          <button type="button" onClick={() => onWishlist(product.id)} aria-label={t("storefront.wishlist")} className="absolute rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ width: 32, height: 32, background: "rgba(255,255,255,0.94)", top: 12, insetInlineEnd: 12, color: "#DC2626" }}>
            {isWishlist(product.id) ? <HeartFilledIcon size={16} /> : <HeartIcon size={16} />}
          </button>
        </div>
      </div>
      <div className="p-6 pt-4">
        <a href={`/store/${slug}/products/${product.id}`} className="block">
          <h3 className="font-extrabold text-[16px] truncate" style={{ color: "#1C1917" }}>{product.nameAr}</h3>
        </a>
        {(product.ratingCount ?? 0) > 0 && (<div className="mt-1"><ProductRating rating={product.averageRating} count={product.ratingCount} size={12} /></div>)}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-extrabold text-lg" style={{ color: colors.accentColor }}>{product.discountPrice || product.basePrice} {currencySymbol}</span>
          {hasDiscount(product) && <span className="text-xs line-through" style={{ color: "#A8A29E" }}>{product.basePrice} {currencySymbol}</span>}
        </div>
        <button type="button" onClick={() => onAddToCart(product.id)} className="mt-3.5 w-full py-2.5 rounded-full font-bold text-sm" style={{ background: colors.buttonColor, color: "#fff" }}>
          {t("storefront.addToCart")}
        </button>
      </div>
    </div>
  );
}

export default function NaturalGreenTemplate({
  children, storeName, slug, showHero = true, storeId, logo, currency = "SAR", coverImage = null,
  contactPhone, contactEmail, contactAddress, facebookUrl, instagramUrl, whatsappUrl, trustBadges = [], themeMeta, colors,
}: TemplateProps) {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { categories, products, productsLoading, selectedCategoryId, setSelectedCategoryId, showAllProducts, setShowAllProducts,
    cartCount, wishlist, toggleWishlist, searchInput, setSearchInput, handleSearchSubmit, isSearchActive, searchResults,
    currencySymbol, isRtl, handleAddToCart, cartMessage, cartMessageType } = useStorefront(slug, storeId, currency, true, showHero, themeMeta);

  const hasSocial = !!(facebookUrl || instagramUrl || whatsappUrl);
  const fbUrl = resolveSocialUrl(facebookUrl);
  const igUrl = resolveSocialUrl(instagramUrl);
  const waUrl = resolveSocialUrl(whatsappUrl);
  const isWishlist = (id: number) => wishlist.includes(id);
  const hasDiscount = (p: { basePrice: number; discountPrice: number | null }) => p.discountPrice !== null && p.discountPrice < p.basePrice;
  const getDiscount = (p: { basePrice: number; discountPrice: number | null }) => hasDiscount(p) ? Math.round((1 - (p.discountPrice as number) / p.basePrice) * 100) : 0;

  const displayProducts = isSearchActive ? searchResults : products.slice(0, showAllProducts ? products.length : 8);
  const catChips = categories.length
    ? categories
    : [{ id: null, nameAr: t("storefront.all"), image: null }, { id: null, nameAr: t("storefront.originalProducts"), image: null }, { id: null, nameAr: t("storefront.trustedStore"), image: null }];

  const heroBg = coverImage
    ? `linear-gradient(rgba(0,0,0,0.3),rgba(0,0,0,0.3)),url("${coverImage}") center/cover no-repeat`
    : `linear-gradient(150deg, ${colors.heroFrom}, ${colors.heroTo})`;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="font-sans" style={{ fontFamily: "'Segoe UI', 'Tajawal', system-ui, sans-serif", background: "#FAFBF7" }}>
      <header className="sticky top-0 z-40" style={{ background: "rgba(250,251,247,0.9)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <button className="md:hidden p-1.5 -ml-1.5" onClick={() => setMobileOpen(!mobileOpen)} style={{ color: "#1C1917" }}>{mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}</button>
          <div className="hidden md:block w-8" />
          <a href={`/store/${slug}`} className="flex flex-col items-center min-w-0">
            {logo && <img src={logo} alt={storeName} className="w-9 h-9 rounded-full object-cover" />}
            <span className="font-extrabold text-lg truncate mt-0.5" style={{ color: colors.headerColor }}>{storeName}</span>
          </a>
          <div className="flex items-center gap-1">
            <QuickLoginButton slug={slug} />
            <a href={`/store/${slug}/wishlist`} className="relative p-2 rounded-full" style={{ color: "#1C1917" }} aria-label={t("storefront.wishlist")}><HeartIcon size={20} />{wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ width: 16, height: 16, background: "#DC2626" }}>{wishlist.length}</span>}</a>
            <a href={`/store/${slug}/cart`} className="relative p-2 rounded-full" style={{ color: "#1C1917" }} aria-label={t("storefront.cart")}><BagIcon size={20} />{cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ width: 16, height: 16, background: "#DC2626" }}>{cartCount}</span>}</a>
          </div>
        </div>
        <nav className="hidden md:flex items-center justify-center gap-8 pb-3 text-[14px] font-semibold">
          <a href={`/store/${slug}`} className="hover:opacity-70" style={{ color: "#44403C" }}>{t("storefront.home")}</a>
          <a href={`/store/${slug}#products`} className="hover:opacity-70" style={{ color: "#44403C" }}>{t("storefront.products")}</a>
          <a href={`/store/${slug}/contact`} className="hover:opacity-70" style={{ color: "#44403C" }}>{t("storefront.contactUs")}</a>
        </nav>
        {mobileOpen && <div className="md:hidden px-4 pb-3 space-y-2 text-[15px] font-semibold" style={{ color: "#1C1917" }}>
          <a href={`/store/${slug}`} className="block">{t("storefront.home")}</a>
          <a href={`/store/${slug}#products`} className="block">{t("storefront.products")}</a>
          <a href={`/store/${slug}/contact`} className="block">{t("storefront.contactUs")}</a>
        </div>}
      </header>

      {!showHero && <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</main>}

      {showHero && (
        <>
          <section className="w-full relative overflow-hidden" style={{ minHeight: "440px", background: heroBg, color: "#fff" }}>
            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center" style={{ paddingTop: "96px", paddingBottom: "110px" }}>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-bold" style={{ background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.4)" }}><LeafIcon size={14} />{t("storefront.originalProducts")}</span>
              <h1 className="mt-5 font-extrabold leading-tight" style={{ fontSize: "clamp(34px, 5vw, 52px)" }}>{storeName}</h1>
              <p className="mt-4 text-base max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.92)" }}>{t("storefront.heroWelcome")}</p>
              <a href="#story" onClick={(e) => { e.preventDefault(); document.getElementById("story")?.scrollIntoView?.({ behavior: "smooth" }); }} className="inline-block mt-8 px-10 py-3.5 rounded-full font-bold text-[15px]" style={{ background: "#fff", color: colors.headerColor }}>
                {t("storefront.ourStory")}
              </a>
            </div>
          </section>
          <OrganicDivider fill="#FAFBF7" flip />
        </>
      )}

      {showHero && <section id="story" style={{ padding: "8px 0 48px" }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block mb-4" style={{ color: colors.accentColor }}><SparklesIcon size={22} /></span>
          <h2 className="font-extrabold text-3xl" style={{ color: "#1C1917" }}>{t("storefront.ourStory")}</h2>
          <p className="mt-5 text-[17px] leading-loose" style={{ color: "#57534E" }}>{t("storefront.ourStoryText")}</p>
        </div>
      </section>}

      {!isSearchActive && showHero && <section style={{ padding: "0 0 36px" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex justify-center gap-4 overflow-x-auto pb-2 flex-wrap">
            {catChips.map((cat, idx: number) => (
              <button key={idx} type="button" onClick={() => { if (cat.id !== null) setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id); }} className="shrink-0 rounded-full px-6 py-2.5 text-[14px] font-bold transition-colors" style={{ background: selectedCategoryId === cat.id ? colors.buttonColor : "#fff", color: selectedCategoryId === cat.id ? "#fff" : "#44403C", border: `1px solid ${selectedCategoryId === cat.id ? colors.buttonColor : "#D6DED6"}` }}>
                {cat.nameAr}
              </button>
            ))}
          </div>
        </div>
      </section>}

      {showHero && <section id="products" style={{ background: "#FAFBF7", padding: "20px 0 56px" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: colors.accentColor }}><LeafIcon size={15} />{t("storefront.featuredProducts")}</span>
          </div>
          {productsLoading && <p className="text-center py-12" style={{ color: "#6B7280" }}>{t("storefront.loadingProducts")}</p>}
          {!productsLoading && displayProducts.length === 0 && <div className="flex flex-col items-center gap-3 py-16"><span style={{ color: "#D1D5DB" }}><LeafIcon size={48} /></span><p style={{ color: "#6B7280" }}>{t("storefront.noProducts")}</p></div>}
          {!productsLoading && displayProducts.length > 0 && <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {displayProducts.map(p => <ProductCard key={p.id} product={p} slug={slug} currencySymbol={currencySymbol} colors={colors} t={t} isWishlist={isWishlist} hasDiscount={hasDiscount} getDiscount={getDiscount} onWishlist={toggleWishlist} onAddToCart={handleAddToCart} />)}
          </div>}
          {!isSearchActive && !showAllProducts && products.length > 8 && <div className="mt-10 text-center"><button type="button" onClick={() => setShowAllProducts(true)} className="px-9 py-3 rounded-full font-bold text-sm" style={{ border: `1px solid ${colors.accentColor}`, color: colors.accentColor }}>{t("storefront.viewAll")}</button></div>}
        </div>
      </section>}

      <Toast message={cartMessage} type={cartMessageType} />

      {showHero && <><OrganicDivider fill={colors.newsletterColor} flip />
      <section style={{ background: colors.newsletterColor, padding: "44px 0 72px" }}>
        <div className="text-center max-w-3xl mx-auto px-4">
          <h3 className="text-white font-extrabold" style={{ fontSize: "26px" }}>{t("storefront.newsletterTitle")}</h3>
          <p className="mt-2 text-white/90 text-[15px]">{t("storefront.newsletterThanks")}</p>
          <form className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3" onSubmit={(e) => e.preventDefault()}>
            <input type="email" required placeholder={t("storefront.newsletterEmail")} className="w-full sm:w-[340px] px-5 py-3 rounded-full outline-none text-base" style={{ background: "#fff", color: "#1C1917" }} />
            <button type="submit" className="px-9 py-3 rounded-full font-bold text-base" style={{ background: colors.accentColor, color: "#fff" }}>{t("storefront.newsletterSubscribe")}</button>
          </form>
        </div>
      </section></>}

      <OrganicDivider fill={colors.footerColor} />
      <footer style={{ background: colors.footerColor, padding: "40px 0 40px" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div><h4 className="text-white font-extrabold text-lg">{storeName}</h4><p className="mt-2 text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>{t("storefront.footerTagline")}</p></div>
          <div>
            <h4 className="text-white font-extrabold text-[14px]">{t("storefront.footerLinks")}</h4>
            <ul className="mt-3 space-y-2 text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>
              <li><a href={`/store/${slug}`} className="hover:text-white">{t("storefront.home")}</a></li>
              <li><a href={`/store/${slug}#products`} className="hover:text-white">{t("storefront.products")}</a></li>
              <li><a href={`/store/${slug}/track-order`} className="hover:text-white">{t("storefront.trackOrder")}</a></li>
              <li><a href={`/store/${slug}/contact`} className="hover:text-white">{t("storefront.contactFooter")}</a></li>
              <li><a href={`/store/${slug}/return-policy`} className="hover:text-white">{t("storefront.returnPolicy")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-extrabold text-[14px]">{t("storefront.contactHeading")}</h4>
            <ul className="mt-3 space-y-2 text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>
              {contactEmail && <li className="flex items-center gap-2"><MailIcon size={14} /><span dir="ltr">{contactEmail}</span></li>}
              {contactPhone && <li className="flex items-center gap-2"><PhoneIcon size={14} /><span dir="ltr">{contactPhone}</span></li>}
              {contactAddress && <li className="flex items-start gap-2"><span className="mt-0.5"><MapPinIcon size={14} /></span><span>{contactAddress}</span></li>}
              {!contactEmail && !contactPhone && !contactAddress && <li>{t("storefront.noContact")}</li>}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-extrabold text-[14px]">{t("storefront.followUs")}</h4>
            <div className="mt-3 flex gap-3">
              {fbUrl && <a href={fbUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70" style={{ width: 36, height: 36, background: "rgba(255,255,255,0.14)", color: "#fff" }}><FacebookIcon size={17} /></a>}
              {igUrl && <a href={igUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70" style={{ width: 36, height: 36, background: "rgba(255,255,255,0.14)", color: "#fff" }}><InstagramIcon size={17} /></a>}
              {waUrl && <a href={waUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70" style={{ width: 36, height: 36, background: "rgba(255,255,255,0.14)", color: "#fff" }}><WhatsAppIcon size={17} /></a>}
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 mt-8 pt-5 border-t text-center" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>© {new Date().getFullYear()} {storeName}. {t("storefront.footerBy")}</p>
        </div>
      </footer>
    </div>
  );
}
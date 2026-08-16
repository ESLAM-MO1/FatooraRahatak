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
import { SearchIcon, UserIcon, BagIcon, HeartIcon, HeartFilledIcon, MenuIcon, CloseIcon, TruckIcon, ShieldIcon, HeadsetIcon, CreditCardIcon, RefreshIcon, PackageIcon, CheckIcon, SparklesIcon, MailIcon, PhoneIcon, MapPinIcon } from "@/components/store-templates/icons";

interface TemplateProps extends StoreTemplateProps {
  themeMeta: StoreThemeMeta;
  colors: StoreColors;
}

interface BlueCardProps {
  product: { id: number; nameAr: string; basePrice: number; discountPrice: number | null; primaryImageUrl: string | null; averageRating?: number; ratingCount?: number };
  slug: string;
  currencySymbol: string;
  colors: StoreColors;
  t: (key: string) => string;
  quickFeatures: string[];
  isWishlist: (id: number) => boolean;
  hasDiscount: (p: { basePrice: number; discountPrice: number | null }) => boolean;
  getDiscount: (p: { basePrice: number; discountPrice: number | null }) => number;
  onWishlist: (id: number) => void;
  onAddToCart: (id: number) => void;
}

function ProductCard({ product, slug, currencySymbol, colors, t, quickFeatures, isWishlist, hasDiscount, getDiscount, onWishlist, onAddToCart }: BlueCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden" style={{ borderColor: "#E5E7EB" }}>
      <div className="relative" style={{ aspectRatio: "4/3", background: "#F3F4F6" }}>
        {product.primaryImageUrl
          ? <img src={product.primaryImageUrl} alt={product.nameAr} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center" style={{ color: "#D1D5DB" }}><PackageIcon size={44} /></div>
        }
        {hasDiscount(product) && <span className="absolute rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: "#DC2626", color: "#fff", top: 10, insetInlineStart: 10 }}>-{getDiscount(product)}%</span>}
        <button type="button" onClick={() => onWishlist(product.id)} aria-label={t("storefront.wishlist")} className="absolute rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ width: 30, height: 30, background: "rgba(255,255,255,0.94)", top: 10, insetInlineEnd: 10, color: "#DC2626" }}>
          {isWishlist(product.id) ? <HeartFilledIcon size={16} /> : <HeartIcon size={16} />}
        </button>
      </div>
      <div className="p-4">
        <a href={`/store/${slug}/products/${product.id}`} className="block">
          <h3 className="font-extrabold text-[15px] truncate" style={{ color: "#111827" }}>{product.nameAr}</h3>
        </a>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {quickFeatures.slice(0, 2).map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[11px]" style={{ color: "#6B7280" }}><CheckIcon size={11} strokeWidth={2.4} />{f}</span>
          ))}
        </div>
        {(product.ratingCount ?? 0) > 0 && (
          <div className="mt-1.5">
            <ProductRating rating={product.averageRating} count={product.ratingCount} size={12} />
          </div>
        )}
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="font-extrabold text-lg" style={{ color: colors.accentColor }}>{product.discountPrice || product.basePrice} {currencySymbol}</span>
          {hasDiscount(product) && <span className="text-xs line-through" style={{ color: "#9CA3AF" }}>{product.basePrice} {currencySymbol}</span>}
        </div>
        <button type="button" onClick={() => onAddToCart(product.id)} className="mt-3 w-full py-2.5 rounded-lg font-bold text-sm" style={{ background: colors.buttonColor, color: "#fff" }}>
          {t("storefront.addToCart")}
        </button>
      </div>
    </div>
  );
}

export default function ProfessionalBlueTemplate({
  children, storeName, slug, showHero = true, storeId, logo, currency = "SAR", coverImage = null,
  contactPhone, contactEmail, contactAddress, facebookUrl, instagramUrl, whatsappUrl, snapchatUrl, tiktokUrl, telegramUrl, linkedinUrl, trustBadges = [], themeMeta, colors,
}: TemplateProps) {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { categories, products, productsLoading, selectedCategoryId, setSelectedCategoryId, showAllProducts, setShowAllProducts,
    cartCount, wishlist, toggleWishlist, searchInput, setSearchInput, handleSearchSubmit, clearSearch,
    isSearchActive, searchResults, currencySymbol, isRtl, handleAddToCart, cartMessage, cartMessageType } = useStorefront(slug, storeId, currency, true, showHero, themeMeta);

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
  const featured = products[0];
  const catChips = categories.length
    ? categories
    : [{ id: null, nameAr: t("storefront.all"), image: null }, { id: null, nameAr: t("storefront.trustedStore"), image: null }, { id: null, nameAr: t("storefront.originalProducts"), image: null }];

  const trustStrip = [
    { icon: <ShieldIcon size={26} />, title: t("storefront.warranty"), text: t("storefront.securePayment") },
    { icon: <CreditCardIcon size={26} />, title: t("storefront.securePayment"), text: t("storefront.trustedStore") },
    { icon: <TruckIcon size={26} />, title: t("storefront.fastShipping"), text: t("storefront.easyReturns") },
  ];

  const quickFeatures = [t("storefront.fastShipping"), t("storefront.originalProducts"), t("storefront.warranty")];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="font-sans" style={{ fontFamily: "'Segoe UI', 'Tajawal', system-ui, sans-serif", background: "#FFFFFF" }}>
      <div style={{ background: colors.headerColor, color: "#fff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-end h-9 text-[12px] font-semibold">
  <div className="hidden sm:flex items-center gap-6">
            <a href={`/store/${slug}/track-order`} className="inline-flex items-center gap-1.5 hover:opacity-75"><TruckIcon size={14} />{t("storefront.trackOrder")}</a>
            <span className="inline-flex items-center gap-1.5"><ShieldIcon size={14} />{t("storefront.warranty")}</span>
            <span className="inline-flex items-center gap-1.5"><HeadsetIcon size={14} />{t("storefront.support24h")}</span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4 h-16">
          <button className="md:hidden p-1.5 -ml-1.5" onClick={() => setMobileOpen(!mobileOpen)} style={{ color: "#374151" }}>{mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}</button>
          <a href={`/store/${slug}`} className="flex items-center gap-2.5 shrink-0 min-w-0">
            {logo && <img src={logo} alt={storeName} className="w-9 h-9 rounded-full object-cover" />}
            <span className="font-extrabold text-lg truncate" style={{ color: colors.headerColor }}>{storeName}</span>
          </a>
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 justify-center">
            <div className="relative w-full max-w-lg">
              <span className="absolute inset-y-0 inline-flex items-center ps-3 pointer-events-none" style={{ color: "#9CA3AF" }}><SearchIcon size={17} /></span>
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder={t("storefront.searchPlaceholder")} className="w-full rounded-full outline-none text-[14px] ps-10 pe-4 py-2.5" style={{ background: "#F3F4F6", color: "#111827", border: "1px solid transparent", transition: "border 0.15s" }} onFocus={e => (e.currentTarget.style.border = `1px solid ${colors.accentColor}`)} onBlur={e => (e.currentTarget.style.border = "1px solid transparent")} />
            </div>
          </form>
          <div className="flex items-center gap-1 ms-auto shrink-0">
            <button className="md:hidden p-2 rounded-full" onClick={() => setSearchOpen(!searchOpen)} style={{ color: "#374151" }}><SearchIcon size={20} /></button>
            <QuickLoginButton slug={slug} />
            <a href={`/store/${slug}/wishlist`} className="relative p-2 rounded-full hover:bg-gray-100" style={{ color: "#374151" }} aria-label={t("storefront.wishlist")}>
              <HeartIcon size={20} />
              {wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ width: 16, height: 16, background: "#DC2626" }}>{wishlist.length}</span>}
            </a>
            <a href={`/store/${slug}/cart`} className="relative p-2 rounded-full hover:bg-gray-100" style={{ color: "#374151" }} aria-label={t("storefront.cart")}><BagIcon size={20} />
              {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ width: 16, height: 16, background: "#DC2626" }}>{cartCount}</span>}
            </a>
          </div>
        </div>
        {searchOpen && <div className="md:hidden px-4 pb-3"><form onSubmit={handleSearchSubmit}><div className="relative"><span className="absolute inset-y-0 inline-flex items-center ps-3" style={{ color: "#9CA3AF" }}><SearchIcon size={16} /></span><input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder={t("storefront.searchPlaceholder")} className="w-full rounded-full outline-none text-[14px] ps-9 pe-3 py-2" style={{ background: "#F3F4F6", color: "#111827" }} /></div></form></div>}
        {mobileOpen && <div className="md:hidden border-t" style={{ borderColor: "#F3F4F6", background: "#fff" }}><div className="px-4 py-2 space-y-1 text-[15px] font-semibold" style={{ color: "#374151" }}>
          <a href={`/store/${slug}`} className="block py-2">{t("storefront.home")}</a>
          <a href={`/store/${slug}#products`} className="block py-2">{t("storefront.products")}</a>
          <a href={`/store/${slug}/contact`} className="block py-2">{t("storefront.contactUs")}</a>
        </div></div>}
      </header>

      {!showHero && <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>}

      {showHero && <section className="w-full relative overflow-hidden" style={{ background: `linear-gradient(115deg, ${colors.heroFrom} 0%, ${colors.heroTo} 70%)`, color: "#fff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center" style={{ paddingTop: "64px", paddingBottom: "64px", minHeight: "480px" }}>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold" style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.3)" }}><SparklesIcon size={13} />{t("storefront.liveDeals")}</span>
            <h1 className="mt-4 font-extrabold leading-tight" style={{ fontSize: "clamp(34px, 5vw, 56px)", letterSpacing: "-0.02em" }}>{storeName}</h1>
            <p className="mt-4 text-[15px] max-w-md" style={{ color: "rgba(255,255,255,0.88)" }}>{t("storefront.heroWelcome")}</p>
            <a href="#products" onClick={(e) => { e.preventDefault(); document.getElementById("products")?.scrollIntoView?.({ behavior: "smooth" }); }} className="inline-block mt-7 px-9 py-3.5 font-extrabold text-sm rounded-lg" style={{ background: "#fff", color: colors.headerColor, boxShadow: "0 14px 30px rgba(0,0,0,0.2)" }}>
              {t("storefront.shopNow")}
            </a>
          </div>
          <div className="hidden lg:flex justify-center">
            {featured ? (
              <div className="w-full max-w-md rounded-2xl p-5 bg-white" style={{ boxShadow: "0 30px 60px rgba(0,0,0,0.28)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-extrabold uppercase tracking-wider" style={{ color: colors.accentColor }}>{t("storefront.featuredProduct")}</span>
                  {hasDiscount(featured) && <span className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: "#DC2626", color: "#fff" }}>-{getDiscount(featured)}%</span>}
                </div>
                <div className="mt-3 relative rounded-xl overflow-hidden" style={{ aspectRatio: "16/10", background: "#F3F4F6" }}>
                  {featured.primaryImageUrl
                    ? <img src={featured.primaryImageUrl} alt={featured.nameAr} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center" style={{ color: "#D1D5DB" }}><PackageIcon size={56} /></div>}
                </div>
                <h3 className="mt-3 font-extrabold text-[17px]" style={{ color: "#111827" }}>{featured.nameAr}</h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {quickFeatures.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: "#4B5563" }}><span style={{ color: colors.accentColor }}><CheckIcon size={13} strokeWidth={2.4} /></span>{f}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="font-extrabold text-2xl" style={{ color: colors.accentColor }}>{featured.discountPrice || featured.basePrice} {currencySymbol}</span>
                  {hasDiscount(featured) && <span className="text-sm line-through" style={{ color: "#9CA3AF" }}>{featured.basePrice} {currencySymbol}</span>}
                </div>
                <button type="button" onClick={() => handleAddToCart(featured.id)} className="mt-4 w-full py-3 rounded-lg font-extrabold text-sm" style={{ background: colors.buttonColor, color: "#fff" }}>
                  {t("storefront.addToCart")}
                </button>
              </div>
            ) : (
              <div className="w-full max-w-md rounded-2xl p-8 flex flex-col gap-4" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.28)" }}>
                {trustStrip.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span style={{ color: "#fff" }}>{item.icon}</span>
                    <div><div className="font-extrabold text-[14px]">{item.title}</div><div className="text-[12px]" style={{ color: "rgba(255,255,255,0.75)" }}>{item.text}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>}

      {!isSearchActive && showHero && <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ padding: "40px 0" }}>
        <h2 className="text-center font-extrabold text-xl" style={{ color: "#111827" }}>{t("storefront.shopByCategory")}</h2>
        <div className="mt-7 flex gap-7 overflow-x-auto pb-3 justify-start lg:justify-center">
          {catChips.map((cat, idx: number) => (
            <button key={idx} type="button" onClick={() => { if (cat.id !== null) setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id); }} className="flex flex-col items-center gap-2.5 shrink-0 group">
              <span className="rounded-full flex items-center justify-center transition-colors" style={{ width: 76, height: 76, border: `1.5px solid ${selectedCategoryId === cat.id ? colors.accentColor : "#D1D5DB"}`, background: selectedCategoryId === cat.id ? `${colors.accentColor}14` : "#fff", color: selectedCategoryId === cat.id ? colors.accentColor : "#9CA3AF" }}>
                {cat.image ? <img src={cat.image} alt={cat.nameAr} className="w-full h-full rounded-full object-cover" /> : <PackageIcon size={26} />}
              </span>
              <span className="text-[13px] font-bold" style={{ color: selectedCategoryId === cat.id ? colors.accentColor : "#4B5563" }}>{cat.nameAr}</span>
            </button>
          ))}
        </div>
      </section>}

      {showHero && <section id="products" style={{ background: "#F9FAFB", padding: "48px 0" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-7"><span style={{ width: "5px", height: "34px", background: colors.accentColor, borderRadius: "3px" }} /><h2 className="font-extrabold text-2xl" style={{ color: "#111827" }}>{t("storefront.featuredProducts")}</h2></div>
          {productsLoading && <p className="text-center py-12" style={{ color: "#6B7280" }}>{t("storefront.loadingProducts")}</p>}
          {!productsLoading && displayProducts.length === 0 && <div className="flex flex-col items-center gap-3 py-16"><span style={{ color: "#D1D5DB" }}><PackageIcon size={48} /></span><p style={{ color: "#6B7280" }}>{t("storefront.noProducts")}</p></div>}
          {!productsLoading && displayProducts.length > 0 && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {displayProducts.map(p => <ProductCard key={p.id} product={p} slug={slug} currencySymbol={currencySymbol} colors={colors} t={t} quickFeatures={quickFeatures} isWishlist={isWishlist} hasDiscount={hasDiscount} getDiscount={getDiscount} onWishlist={toggleWishlist} onAddToCart={handleAddToCart} />)}
          </div>}
          {!isSearchActive && !showAllProducts && products.length > 8 && <div className="mt-8 text-center"><button type="button" onClick={() => setShowAllProducts(true)} className="px-8 py-2.5 rounded-lg font-bold text-sm" style={{ border: `1px solid ${colors.accentColor}`, color: colors.accentColor }}>{t("storefront.viewAll")}</button></div>}
        </div>
      </section>}

      <Toast message={cartMessage} type={cartMessageType} />

      {showHero && <section style={{ background: "#EEF2FF", padding: "28px 0" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-3 gap-6">
          {trustStrip.map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 52, height: 52, background: "#fff", color: colors.accentColor, boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>{item.icon}</span>
              <div><div className="font-extrabold text-[14px]" style={{ color: "#111827" }}>{item.title}</div><div className="text-[12px]" style={{ color: "#6B7280" }}>{item.text}</div></div>
            </div>
          ))}
        </div>
      </section>}

      <footer style={{ background: colors.footerColor, paddingTop: "48px", paddingBottom: "48px" }}>
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1"><h4 className="text-white font-extrabold" style={{ fontSize: "18px" }}>{storeName}</h4><p className="mt-2 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>{t("storefront.footerTagline")}</p></div>
          <div>
            <h4 className="text-white font-extrabold" style={{ fontSize: "15px" }}>{t("storefront.footerLinks")}</h4>
            <ul className="mt-3 space-y-2 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
              <li><a href={`/store/${slug}`} className="hover:text-white">{t("storefront.home")}</a></li>
              <li><a href={`/store/${slug}#products`} className="hover:text-white">{t("storefront.products")}</a></li>
              <li><a href={`/store/${slug}/track-order`} className="hover:text-white">{t("storefront.trackOrder")}</a></li>
              <li><a href={`/store/${slug}/contact`} className="hover:text-white">{t("storefront.contactFooter")}</a></li>
              <li><a href={`/store/${slug}/return-policy`} className="hover:text-white">{t("storefront.returnPolicy")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-extrabold" style={{ fontSize: "15px" }}>{t("storefront.contactHeading")}</h4>
            <ul className="mt-3 space-y-2 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
              {contactEmail && <li className="flex items-center gap-2"><span><MailIcon size={14} /></span><span dir="ltr">{contactEmail}</span></li>}
              {contactPhone && <li className="flex items-center gap-2"><span><PhoneIcon size={14} /></span><span dir="ltr">{contactPhone}</span></li>}
              {contactAddress && <li className="flex items-start gap-2"><span><span className="mt-0.5 block"><MapPinIcon size={14} /></span></span><span>{contactAddress}</span></li>}
              {!contactEmail && !contactPhone && !contactAddress && <li>{t("storefront.noContact")}</li>}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-extrabold" style={{ fontSize: "15px" }}>{t("storefront.followUs")}</h4>
            <div className="mt-3 flex gap-3">
              <StoreSocialLinks
                urls={{ facebook: fbUrl, instagram: igUrl, whatsapp: waUrl, snapchat: scUrl, tiktok: tkUrl, telegram: tgUrl, linkedin: liUrl }}
                linkClassName="flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                linkStyle={{ width: 36, height: 36, background: "rgba(255,255,255,0.12)", color: "#fff" }}
                iconSize={17}
              />
            </div>
            {hasSocial && <p className="mt-2 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>{t("storefront.followUs")}</p>}
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-5 border-t" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>© {new Date().getFullYear()} {storeName}. {t("storefront.footerBy")}</p>
        </div>
      </footer>
    </div>
  );
}
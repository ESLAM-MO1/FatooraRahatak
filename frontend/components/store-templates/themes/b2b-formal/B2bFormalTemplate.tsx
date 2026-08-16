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
import { BagIcon, HeartIcon, HeartFilledIcon, MenuIcon, CloseIcon, MailIcon, PhoneIcon, PackageIcon, CheckIcon, BuildingIcon, HeadsetIcon, ScaleIcon } from "@/components/store-templates/icons";

interface TemplateProps extends StoreTemplateProps {
  themeMeta: StoreThemeMeta;
  colors: StoreColors;
}

export default function B2bFormalTemplate({
  children, storeName, slug, showHero = true, storeId, logo, currency = "SAR", coverImage = null,
  contactPhone, contactEmail, contactAddress, facebookUrl, instagramUrl, whatsappUrl, snapchatUrl, tiktokUrl, telegramUrl, linkedinUrl, trustBadges = [], themeMeta, colors,
}: TemplateProps) {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { categories, products, productsLoading, selectedCategoryId, setSelectedCategoryId, showAllProducts, setShowAllProducts,
    cartCount, wishlist, toggleWishlist, isSearchActive, searchResults, currencySymbol, isRtl, handleAddToCart, cartMessage, cartMessageType, quoteRequested, handleQuoteRequest } = useStorefront(slug, storeId, currency, false, showHero, themeMeta);

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

  const displayProducts = isSearchActive ? searchResults : products.slice(0, showAllProducts ? products.length : 8);
  const catChips = categories.length
    ? categories
    : [{ id: null, nameAr: t("storefront.all"), image: null }, { id: null, nameAr: t("storefront.featuredProducts"), image: null }];

  const trustGrid = [
    { icon: <ScaleIcon size={20} />, title: t("storefront.trustedPartners"), text: t("storefront.wholesaleOrders") },
    { icon: <BuildingIcon size={20} />, title: t("storefront.bulkPricing"), text: t("storefront.quantity") },
    { icon: <HeadsetIcon size={20} />, title: t("storefront.specializedSupport"), text: t("storefront.securePayment") },
  ];

  const badgeRow = [t("storefront.trustedPartners"), t("storefront.wholesaleOrders"), t("storefront.specializedSupport")];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="font-sans" style={{ fontFamily: "'Segoe UI', Arial, 'Tajawal', sans-serif", background: "#F4F5F7" }}>
      <div style={{ background: "#E8EAED", color: "#374151", borderBottom: "1px solid #D9DCE1" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-9 text-[12px] font-medium">
          <div className="flex items-center gap-5">
            {contactPhone && <span className="inline-flex items-center gap-1.5"><PhoneIcon size={13} /><span dir="ltr">{contactPhone}</span></span>}
            {contactEmail && <span className="inline-flex items-center gap-1.5 hidden sm:inline-flex"><MailIcon size={13} /><span dir="ltr">{contactEmail}</span></span>}
          </div>
          <span className="hidden md:inline-flex items-center gap-1.5 text-[12px] font-bold" style={{ color: colors.headerColor }}><CheckIcon size={13} />{t("storefront.trustedStore")}</span>
        </div>
      </div>

      <header className="sticky top-0 z-40" style={{ background: "#FFFFFF", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <button className="md:hidden p-1.5 -ml-1.5" onClick={() => setMobileOpen(!mobileOpen)} style={{ color: "#111827" }}>{mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}</button>
          <a href={`/store/${slug}`} className="flex items-center gap-2.5 shrink-0 min-w-0">
            {logo && <img src={logo} alt={storeName} className="w-8 h-8 object-contain" />}
            <span className="font-extrabold text-lg truncate" style={{ color: colors.headerColor }}>{storeName}</span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-[14px] font-semibold" style={{ color: "#374151" }}>
            <a href={`/store/${slug}`} className="hover:text-black">{t("storefront.home")}</a>
            <a href={`/store/${slug}#catalog`} className="hover:text-black">{t("storefront.products")}</a>
            <a href={`/store/${slug}/contact`} className="hover:text-black">{t("storefront.contactUs")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <QuickLoginButton slug={slug} />
            <a href={`/store/${slug}/wishlist`} className="relative p-2 rounded" style={{ color: "#374151" }} aria-label={t("storefront.wishlist")}><HeartIcon size={19} />{wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ width: 16, height: 16, background: "#DC2626" }}>{wishlist.length}</span>}</a>
            <a href={`/store/${slug}/cart`} className="relative p-2 rounded" style={{ color: "#374151" }} aria-label={t("storefront.cart")}><BagIcon size={19} />{cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ width: 16, height: 16, background: "#DC2626" }}>{cartCount}</span>}</a>
            <a href={`/store/${slug}/contact`} className="hidden sm:inline-block px-5 py-2.5 text-[13px] font-bold rounded" style={{ background: colors.buttonColor, color: "#fff" }}>{t("storefront.requestQuote")}</a>
          </div>
        </div>
        {mobileOpen && <div className="md:hidden px-4 pb-4 space-y-2 text-[15px] font-semibold" style={{ color: "#111827" }}>
          <a href={`/store/${slug}`} className="block">{t("storefront.home")}</a>
          <a href={`/store/${slug}#catalog`} className="block">{t("storefront.products")}</a>
          <a href={`/store/${slug}/contact`} className="block">{t("storefront.contactUs")}</a>
          <a href={`/store/${slug}/contact`} className="inline-block px-5 py-2.5 text-[13px] font-bold rounded" style={{ background: colors.buttonColor, color: "#fff" }}>{t("storefront.requestQuote")}</a>
        </div>}
      </header>

      {!showHero && <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>}

      {showHero && <section className="w-full" style={{ background: colors.headerColor, color: "#fff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <span className="inline-block text-[12px] font-bold tracking-[0.2em] uppercase px-4 py-1.5" style={{ border: "1px solid rgba(255,255,255,0.35)", color: "#fff" }}>{t("storefront.heroWelcomeB2B")}</span>
          <h1 className="mt-5 font-extrabold" style={{ fontSize: "clamp(32px, 5vw, 46px)" }}>{storeName}</h1>
          <p className="mt-3 max-w-2xl mx-auto text-[14px]" style={{ color: "rgba(255,255,255,0.8)" }}>{t("storefront.heroWelcome")}</p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {trustGrid.map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 px-4 py-5" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)" }}>
                <span style={{ color: colors.accentColor }}>{item.icon}</span>
                <span className="font-bold text-[14px]">{item.title}</span>
                <span className="text-[12px] text-center" style={{ color: "rgba(255,255,255,0.7)" }}>{item.text}</span>
              </div>
            ))}
          </div>
          <a href="#catalog" onClick={(e) => { e.preventDefault(); document.getElementById("catalog")?.scrollIntoView?.({ behavior: "smooth" }); }} className="inline-block mt-8 px-10 py-3 font-bold text-sm rounded" style={{ background: colors.buttonColor, color: "#fff" }}>{t("storefront.wholesaleOrders")}</a>
        </div>
      </section>}

      {!isSearchActive && showHero && <section style={{ padding: "20px 0" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 overflow-x-auto">
          {catChips.map((cat, idx: number) => (
            <button key={idx} type="button" onClick={() => { if (cat.id !== null) setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id); }} className="shrink-0 px-4 py-2 text-[13px] font-semibold rounded" style={{ background: selectedCategoryId === cat.id ? colors.accentColor : "#fff", color: selectedCategoryId === cat.id ? "#fff" : "#374151", border: "1px solid #D9DCE1" }}>{cat.nameAr}</button>
          ))}
        </div>
      </section>}

      {showHero && <section id="catalog" style={{ padding: "32px 0 56px" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-extrabold text-xl" style={{ color: colors.headerColor }}>{t("storefront.featuredProducts")}</h2>
          {productsLoading && <p className="text-center py-12" style={{ color: "#6B7280" }}>{t("storefront.loadingProducts")}</p>}
          {!productsLoading && displayProducts.length === 0 && <div className="flex flex-col items-center gap-3 py-16"><span style={{ color: "#D1D5DB" }}><PackageIcon size={48} /></span><p style={{ color: "#6B7280" }}>{t("storefront.noProducts")}</p></div>}
          {!productsLoading && displayProducts.length > 0 && (
            <div className="mt-5 bg-white rounded-lg overflow-hidden" style={{ border: "1px solid #D9DCE1" }}>
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[12px] font-extrabold tracking-wide uppercase text-white" style={{ background: colors.headerColor }}>
                <div className="col-span-6">{t("storefront.product")}</div>
                <div className="col-span-3">{t("storefront.unitPrice")}</div>
                <div className="col-span-3 text-end">{t("storefront.action")}</div>
              </div>
              {displayProducts.map(p => (
                <div key={p.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center border-t" style={{ borderColor: "#EDEFF2" }}>
                  <div className="col-span-12 md:col-span-6 flex items-center gap-4">
                    <a href={`/store/${slug}/products/${p.id}`} className="block shrink-0"><div className="w-12 h-12 rounded flex items-center justify-center overflow-hidden" style={{ background: "#F3F4F6" }}>{p.primaryImageUrl ? <img src={p.primaryImageUrl} alt={p.nameAr} className="w-full h-full object-cover" /> : <span style={{ color: "#D1D5DB" }}><PackageIcon size={22} /></span>}</div></a>
                    <a href={`/store/${slug}/products/${p.id}`} className="block"><h3 className="font-bold text-[15px]" style={{ color: "#111827" }}>{p.nameAr}</h3></a>
                    {(p.ratingCount ?? 0) > 0 && (<div className="mt-1"><ProductRating rating={p.averageRating} count={p.ratingCount} size={12} /></div>)}
                  </div>
                  <div className="col-span-6 md:col-span-3 flex items-baseline gap-2">
                    <span className="font-bold text-[15px]" style={{ color: colors.accentColor }}>{p.discountPrice || p.basePrice} {currencySymbol}</span>
                    <span className="text-[11px]" style={{ color: "#9CA3AF" }}>{t("storefront.perUnit")}</span>
                    {hasDiscount(p) && <span className="text-[11px] line-through" style={{ color: "#9CA3AF" }}>{p.basePrice}</span>}
                  </div>
                  <div className="col-span-6 md:col-span-3 flex gap-2 justify-end">
                    <button type="button" onClick={() => handleQuoteRequest(p.id)} className="px-4 py-2 text-[12px] font-bold rounded" style={{ background: quoteRequested === p.id ? "#22C55E" : "transparent", border: `1px solid ${colors.accentColor}`, color: quoteRequested === p.id ? "#fff" : colors.accentColor }}>{quoteRequested === p.id ? t("storefront.quoteSentDone") : t("storefront.requestQuote")}</button>
                    <button type="button" onClick={() => handleAddToCart(p.id)} className="px-4 py-2 text-[12px] font-bold rounded" style={{ background: colors.buttonColor, color: "#fff" }}>{t("storefront.addToCart")}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isSearchActive && !showAllProducts && products.length > 8 && <div className="mt-8 text-center"><button type="button" onClick={() => setShowAllProducts(true)} className="px-8 py-2.5 font-bold text-sm rounded" style={{ border: `1px solid ${colors.accentColor}`, color: colors.accentColor }}>{t("storefront.viewAll")}</button></div>}
        </div>
      </section>}

      <Toast message={cartMessage} type={cartMessageType} />

      {showHero && <section style={{ background: "#E8EAED", padding: "24px 0" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-center gap-6">
          {badgeRow.map((b, i) => <span key={i} className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: "#374151" }}><span style={{ color: colors.accentColor }}><CheckIcon size={14} /></span>{b}</span>)}
        </div>
      </section>}

      <footer style={{ background: colors.footerColor, padding: "48px 0 32px" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-10">
          <div>
            <h4 className="text-white font-extrabold text-lg">{storeName}</h4>
            <p className="mt-2 text-[13px] max-w-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{t("storefront.footerTagline")}</p>
            <ul className="mt-4 space-y-2 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
              {contactEmail && <li className="flex items-center gap-2"><MailIcon size={14} /><span dir="ltr">{contactEmail}</span></li>}
              {contactPhone && <li className="flex items-center gap-2"><PhoneIcon size={14} /><span dir="ltr">{contactPhone}</span></li>}
              {contactAddress && <li className="flex items-start gap-2"><span className="mt-0.5"><span><PackageIcon size={14} /></span></span><span>{contactAddress}</span></li>}
              {!contactEmail && !contactPhone && !contactAddress && <li>{t("storefront.noContact")}</li>}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-extrabold text-[14px] uppercase tracking-wider">{t("storefront.footerLinks")}</h4>
            <ul className="mt-3 space-y-2 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
              <li><a href={`/store/${slug}`} className="hover:text-white">{t("storefront.home")}</a></li>
              <li><a href={`/store/${slug}#catalog`} className="hover:text-white">{t("storefront.products")}</a></li>
              <li><a href={`/store/${slug}/track-order`} className="hover:text-white">{t("storefront.trackOrder")}</a></li>
              <li><a href={`/store/${slug}/contact`} className="hover:text-white">{t("storefront.contactFooter")}</a></li>
              <li><a href={`/store/${slug}/return-policy`} className="hover:text-white">{t("storefront.returnPolicy")}</a></li>
            </ul>
            <div className="mt-4 flex gap-3">
              <StoreSocialLinks
                urls={{ facebook: fbUrl, instagram: igUrl, whatsapp: waUrl, snapchat: scUrl, tiktok: tkUrl, telegram: tgUrl, linkedin: liUrl }}
                linkClassName="flex items-center justify-center rounded transition-opacity hover:opacity-70"
                linkStyle={{ width: 32, height: 32, background: "rgba(255,255,255,0.12)", color: "#fff" }}
                iconSize={15}
              />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-5 border-t text-center" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>© {new Date().getFullYear()} {storeName}. {t("storefront.footerBy")}</p>
        </div>
      </footer>
    </div>
  );
}
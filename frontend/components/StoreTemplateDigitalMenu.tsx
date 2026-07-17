"use client";
import React, { useState, useEffect } from 'react';
import type { StoreTemplateProps } from '@/app/store/[slug]/layout';

export default function StoreTemplateDigitalMenu({
  children, primaryColor, storeName, coverImage, slug, showHero = true,
  contactPhone, facebookUrl, instagramUrl, whatsappUrl,
}: StoreTemplateProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 340);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const initial = storeName.charAt(0);
  const hasSocial = facebookUrl || instagramUrl || whatsappUrl;

  return (
    <div dir="rtl" className="font-sans" style={{ fontFamily: "'Segoe UI', 'Tajawal', sans-serif" }}>
      <style>{`
        .store-list-item {
          display: flex;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .store-list-item-img {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          object-fit: cover;
        }
        .store-add-btn {
          background: ${primaryColor};
          color: white;
          border-radius: 999px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          flex-shrink: 0;
        }
        .store-price {
          color: ${primaryColor};
          font-weight: 700;
          font-size: 16px;
        }
        .store-product-name {
          font-weight: 700;
          font-size: 15px;
        }
      `}</style>

      <div className="relative">
        {showHero && (
          <div
            className="w-full relative overflow-hidden"
            style={{ height: '400px', background: coverImage ? 'transparent' : primaryColor }}
          >
            {coverImage && (
              <img src={coverImage} alt="" className="w-full h-full object-cover absolute inset-0" />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7))' }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div
                className="rounded-full flex items-center justify-center text-4xl font-bold shadow-lg"
                style={{ width: '100px', height: '100px', background: 'white', color: primaryColor }}
              >
                {initial}
              </div>
              <h1
                className="text-white font-bold mt-4"
                style={{ fontSize: '28px', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
              >
                {storeName}
              </h1>
              <p className="text-white mt-1" style={{ opacity: 0.8 }}>تصفح قائمة المنتجات</p>
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="text-white mt-2 text-sm underline" style={{ opacity: 0.9 }} dir="ltr">
                  {contactPhone}
                </a>
              )}
            </div>
          </div>
        )}

        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
          }`}
          style={{ background: primaryColor, height: '56px' }}
        >
          <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
            <span className="text-white font-bold">{storeName}</span>
            <button className="relative p-2" aria-label="Cart">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
            </button>
          </div>
        </header>
      </div>

      <div className="sticky top-0 z-40 bg-gray-100 py-3 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 flex gap-2">
          {['الكل', 'مقبلات', 'مشروبات', 'حلويات'].map((cat) => (
            <button
              key={cat}
              className="flex-shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors"
              style={
                cat === 'الكل'
                  ? { background: primaryColor, color: 'white' }
                  : { background: 'white', color: '#4b5563' }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="py-12" style={{ background: primaryColor }}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-white font-bold text-xl mb-2">{storeName}</h3>
          {contactPhone && (
            <p className="text-white text-sm mb-1" style={{ opacity: 0.85 }} dir="ltr">{contactPhone}</p>
          )}
          <p className="text-white text-sm mb-4" style={{ opacity: 0.75 }}>
            &copy; {new Date().getFullYear()} {storeName}. جميع الحقوق محفوظة.
          </p>
          {hasSocial && (
            <div className="flex justify-center gap-4">
              {facebookUrl && (
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-opacity" aria-label="Facebook">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642l.358-4h-4V6.333c0-.955.192-1.333 1.115-1.333H18V0h-3.808C10.596 0 9 1.583 9 4.615V8z" /></svg>
                </a>
              )}
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-opacity" aria-label="Instagram">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.11 2.525c.636-.247 1.363-.416 2.427-.465C8.83 2.013 9.165 2 12.315 2z" /></svg>
                </a>
              )}
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-opacity" aria-label="WhatsApp">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.85.5 3.58 1.36 5.08L2 22l5.25-1.38c1.45.79 3.1 1.24 4.79 1.24 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm4.4 12.02c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28z" /></svg>
                </a>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
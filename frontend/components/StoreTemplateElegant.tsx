import React from 'react';
import type { StoreTemplateProps } from '@/app/store/[slug]/layout';

export default function StoreTemplateElegant({
  children, primaryColor, storeName, slug, showHero = true,
  contactEmail, contactPhone, facebookUrl, instagramUrl, whatsappUrl,
}: StoreTemplateProps) {
  const hasSocial = facebookUrl || instagramUrl || whatsappUrl;

  return (
    <div dir="rtl" className="font-sans" style={{ fontFamily: "'Segoe UI', 'Tajawal', sans-serif" }}>
      <style>{`
        .store-card {
          background: transparent;
          padding: 0;
          margin-bottom: 40px;
        }
        .store-product-name {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #4b5563;
        }
        .store-price {
          color: #1f2937;
          font-weight: 500;
          font-size: 15px;
        }
        .store-btn {
          background: transparent;
          color: ${primaryColor};
          border: 1px solid ${primaryColor};
          padding: 12px 32px;
          font-weight: 400;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.2s;
        }
        .store-btn:hover {
          background: ${primaryColor};
          color: white;
        }
        .store-accent-line {
          width: 40px;
          height: 1px;
          background: ${primaryColor};
          margin: 12px 0;
        }
      `}</style>

      <header className="bg-white" style={{ height: '80px', borderBottom: '1px solid rgba(229,231,235,0.5)' }}>
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex-1" />
          <span className="text-center" style={{ fontSize: '22px', fontWeight: 300, letterSpacing: '0.15em', color: '#1f2937' }}>
            {storeName}
          </span>
          <nav className="flex-1 flex justify-end items-center gap-8 text-xs text-gray-500 font-medium" style={{ letterSpacing: '0.1em' }}>
            <a href={`/${slug}`} className="hover:text-gray-800 transition-colors">الرئيسية</a>
            <a href={`/${slug}/categories`} className="hover:text-gray-800 transition-colors">التصنيفات</a>
            <a href={`/${slug}/contact`} className="hover:text-gray-800 transition-colors">تواصل معنا</a>
            <button className="p-2" aria-label="Cart">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
            </button>
          </nav>
        </div>
      </header>

      {showHero && (
        <section className="bg-white py-20">
          <div className="max-w-3xl mx-auto text-center px-4">
            <h1 className="font-light mb-4" style={{ fontSize: '48px', color: '#1f2937' }}>{storeName}</h1>
            <div className="flex justify-center mb-4">
              <div className="store-accent-line" />
            </div>
            <p className="text-gray-500 mb-8 text-lg" style={{ fontWeight: 300 }}>
              مرحبًا بك في متجرنا
            </p>
            <button className="store-btn">تسوق الآن</button>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-center gap-3 mb-10">
          <h2 className="text-sm font-medium" style={{ color: '#1f2937', letterSpacing: '0.15em' }}>اقتني منتجاتنا</h2>
          <div className="store-accent-line" style={{ margin: 0 }} />
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-100 py-6 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-400 text-xs">&copy; {new Date().getFullYear()} {storeName}. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4 text-gray-400 text-xs" dir="ltr">
            {contactEmail && <span>{contactEmail}</span>}
            {contactPhone && <span>{contactPhone}</span>}
          </div>
          {hasSocial && (
            <div className="flex gap-4">
              {facebookUrl && (
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Facebook">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642l.358-4h-4V6.333c0-.955.192-1.333 1.115-1.333H18V0h-3.808C10.596 0 9 1.583 9 4.615V8z" /></svg>
                </a>
              )}
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Instagram">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.11 2.525c.636-.247 1.363-.416 2.427-.465C8.83 2.013 9.165 2 12.315 2z" /></svg>
                </a>
              )}
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="WhatsApp">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.85.5 3.58 1.36 5.08L2 22l5.25-1.38c1.45.79 3.1 1.24 4.79 1.24 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm4.4 12.02c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28z" /></svg>
                </a>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
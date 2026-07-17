import React from 'react';
import type { StoreTemplateProps } from '@/app/store/[slug]/layout';

const shippingLabels: Record<string, string> = {
  PickupFromStore: 'استلام من المحل',
  DeliveryToAddress: 'توصيل للعنوان',
};

export default function StoreTemplateColorful({
  children, primaryColor, storeName, slug, showHero = true,
  contactPhone, contactEmail, contactAddress,
  facebookUrl, instagramUrl, whatsappUrl,
  shippingMethods, paymentMethods,
}: StoreTemplateProps) {
  const hasSocial = facebookUrl || instagramUrl || whatsappUrl;

  const badgeLabels = [
    ...(shippingMethods.some((m) => m.type === 'DeliveryToAddress') ? ['توصيل سريع 🚀'] : []),
    ...(paymentMethods.length > 0 ? ['دفع آمن 🔒'] : []),
    ...(contactPhone || whatsappUrl ? ['دعم متواصل 💬'] : []),
  ];

  return (
    <div dir="rtl" className="font-sans" style={{ fontFamily: "'Segoe UI', 'Tajawal', sans-serif" }}>
      <style>{`
        .store-card {
          background: white;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          overflow: hidden;
        }
        .store-card:nth-child(even) {
          background: color-mix(in srgb, ${primaryColor} 5%, white);
        }
        .store-price {
          background: linear-gradient(135deg, ${primaryColor}, #8B5CF6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 800;
          font-size: 18px;
        }
        .store-btn {
          background: linear-gradient(135deg, ${primaryColor}, #8B5CF6);
          color: white;
          border-radius: 999px;
          padding: 12px 32px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 15px ${primaryColor}4D;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .store-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px ${primaryColor}66;
        }
        .store-badge {
          background: color-mix(in srgb, ${primaryColor} 12%, white);
          color: ${primaryColor};
          border-radius: 999px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }
        .store-product-name {
          font-weight: 700;
          font-size: 14px;
        }
        .store-social-icon {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.08);
          color: white;
          transition: background 0.2s;
        }
        .store-social-icon:hover {
          background: rgba(255,255,255,0.18);
        }
      `}</style>

      <header className="sticky top-0 z-50 backdrop-blur-md" style={{ height: '64px', background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)`, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <a href={`/${slug}`} className="font-bold text-lg text-white">{storeName}</a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
            <a href={`/${slug}`} className="hover:text-white transition-colors">الرئيسية</a>
            <a href={`/${slug}/categories`} className="hover:text-white transition-colors">التصنيفات</a>
            <a href={`/${slug}/contact`} className="hover:text-white transition-colors">تواصل معنا</a>
          </nav>
          <button className="relative p-2" aria-label="Cart">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          </button>
        </div>
      </header>

      {showHero && (
        <section
          className="w-full relative overflow-hidden flex items-center"
          style={{
            height: '350px',
            background: `linear-gradient(135deg, ${primaryColor}, color-mix(in srgb, ${primaryColor} 60%, #8B5CF6))`,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex relative z-10">
            <div className="w-3/5 flex flex-col justify-center">
              <h1 className="text-white font-bold mb-3" style={{ fontSize: '36px' }}>{storeName}</h1>
              <p className="text-white mb-6" style={{ opacity: 0.8 }}>مرحبًا بك في متجرنا</p>
              <button
                className="store-btn self-start"
                style={{ background: 'white', color: primaryColor, WebkitBackgroundClip: undefined, WebkitTextFillColor: undefined }}
              >
                تسوق الآن
              </button>
            </div>
            <div className="w-2/5 relative flex items-center justify-center">
              <div
                className="absolute rounded-full"
                style={{ width: '200px', height: '200px', border: '2px solid rgba(255,255,255,0.1)' }}
              />
              <div
                className="absolute"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.08)',
                  transform: 'rotate(25deg)',
                  top: '20px',
                  right: '20px',
                }}
              />
            </div>
          </div>
        </section>
      )}

      {badgeLabels.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 mb-6">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {badgeLabels.map((label) => (
              <span key={label} className="store-badge flex items-center gap-1 py-2 px-4 text-sm">{label}</span>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <footer
        className="mt-16"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${primaryColor} 80%, black), #1a1a2e)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
            <div>
              <h4 className="font-bold text-lg mb-4">{storeName}</h4>
              <p className="text-sm" style={{ opacity: 0.7 }}>متجر إلكتروني يقدم أفضل المنتجات بأفضل الأسعار. تسوق بثقة وأمان.</p>
              {hasSocial && (
                <div className="flex gap-2 mt-4">
                  {facebookUrl && (
                    <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="store-social-icon" aria-label="Facebook">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642l.358-4h-4V6.333c0-.955.192-1.333 1.115-1.333H18V0h-3.808C10.596 0 9 1.583 9 4.615V8z" /></svg>
                    </a>
                  )}
                  {instagramUrl && (
                    <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="store-social-icon" aria-label="Instagram">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.11 2.525c.636-.247 1.363-.416 2.427-.465C8.83 2.013 9.165 2 12.315 2z" /></svg>
                    </a>
                  )}
                  {whatsappUrl && (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="store-social-icon" aria-label="WhatsApp">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.85.5 3.58 1.36 5.08L2 22l5.25-1.38c1.45.79 3.1 1.24 4.79 1.24 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm4.4 12.02c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28z" /></svg>
                    </a>
                  )}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">روابط سريعة</h4>
              <ul className="space-y-2 text-sm" style={{ opacity: 0.7 }}>
                <li><a href={`/${slug}`} className="hover:opacity-100 transition-opacity">الرئيسية</a></li>
                <li><a href={`/${slug}/categories`} className="hover:opacity-100 transition-opacity">التصنيفات</a></li>
                <li><a href={`/${slug}/contact`} className="hover:opacity-100 transition-opacity">تواصل معنا</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">تواصل معنا</h4>
              <ul className="space-y-2 text-sm" style={{ opacity: 0.7 }}>
                {contactPhone && <li dir="ltr" className="text-right">{contactPhone}</li>}
                {contactEmail && <li dir="ltr" className="text-right">{contactEmail}</li>}
                {contactAddress && <li>{contactAddress}</li>}
                {!contactPhone && !contactEmail && !contactAddress && <li style={{ opacity: 0.5 }}>لا توجد بيانات تواصل بعد</li>}
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-4">
          <p className="text-center text-white text-xs" style={{ opacity: 0.5 }}>
            &copy; {new Date().getFullYear()} {storeName}. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}
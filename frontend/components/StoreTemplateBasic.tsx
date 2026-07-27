import React from 'react';
import type { StoreTemplateProps } from '@/app/store/[slug]/layout';

const shippingLabels: Record<string, string> = {
  PickupFromStore: 'استلام من المحل',
  DeliveryToAddress: 'توصيل للعنوان',
};

const paymentLabels: Record<string, string> = {
  CashOnDelivery: 'الدفع عند الاستلام',
  CreditCard: 'بطاقات ائتمان',
  PayPal: 'باي بال',
  BankTransfer: 'حوالة بنكية',
};

export default function StoreTemplateBasic({
  children, primaryColor, storeName, slug, showHero = true,
  contactPhone, contactEmail, contactAddress,
  facebookUrl, instagramUrl, whatsappUrl,
  shippingMethods, paymentMethods,
}: StoreTemplateProps) {
  const hasSocial = facebookUrl || instagramUrl || whatsappUrl;
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div dir="rtl" className="font-sans" style={{ fontFamily: "'Segoe UI', 'Tajawal', sans-serif" }}>
      <style>{`
        .store-btn {
          background: ${primaryColor};
          color: white;
          border-radius: 999px;
          padding: 10px 28px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .store-btn:hover { opacity: 0.9; }
        .store-card {
          background: white;
          border-radius: 14px;
          border: 1px solid #eef0f3;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .store-price {
          color: ${primaryColor};
          font-weight: 700;
        }
        .store-social-icon {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #6b7280;
          transition: background 0.2s, color 0.2s;
        }
        .store-social-icon:hover {
          background: ${primaryColor};
          color: white;
        }
      `}</style>

      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100" style={{ height: '72px' }}>
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <a href={`/${slug}`} className="font-bold text-lg" style={{ color: primaryColor }}>{storeName}</a>
          <nav className="hidden md:flex items-center gap-8 text-gray-700 text-sm font-medium">
            <a href={`/${slug}`} className="hover:text-gray-900 transition-colors">الرئيسية</a>
            <a href={`/${slug}/categories`} className="hover:text-gray-900 transition-colors">التصنيفات</a>
            <a href={`/${slug}/contact`} className="hover:text-gray-900 transition-colors">تواصل معنا</a>
          </nav>
          <div className="flex items-center gap-2">
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="القائمة">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 18h16" /></>
                )}
              </svg>
            </button>
            <button className="relative p-2" aria-label="Cart">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white shadow-md">
            <div className="px-4 py-3 space-y-1">
              <a href={`/${slug}`} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setMobileMenuOpen(false)}>الرئيسية</a>
              <a href={`/${slug}/categories`} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setMobileMenuOpen(false)}>التصنيفات</a>
              <a href={`/${slug}/contact`} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setMobileMenuOpen(false)}>تواصل معنا</a>
            </div>
          </div>
        )}
      </header>

      {showHero && (
        <section className="w-full flex items-center justify-center" style={{ height: '280px', backgroundColor: primaryColor }}>
          <div className="text-center px-4">
            <h1 className="text-white font-bold mb-3" style={{ fontSize: '32px' }}>{storeName}</h1>
            <p className="text-white mb-6" style={{ opacity: 0.7 }}>مرحبًا بك في متجرنا</p>
            <button className="store-btn" style={{ background: 'white', color: primaryColor }}>تسوق الآن</button>
          </div>
        </section>
      )}

      {(shippingMethods.length > 0 || paymentMethods.length > 0) && (
        <div className="border-b border-gray-100 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-gray-500">
            {shippingMethods.map((m) => (
              <span key={m.type} className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m10-9h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V17a1 1 0 01-1 1h-1m-14 0a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                {shippingLabels[m.type] || m.type}
              </span>
            ))}
            {paymentMethods.map((m) => (
              <span key={m.type} className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-9-9h16a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1z" /></svg>
                {paymentLabels[m.type] || m.type}
              </span>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="font-bold text-gray-800 mb-4">روابط</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href={`/${slug}`} className="hover:text-gray-700">الرئيسية</a></li>
              <li><a href={`/${slug}/categories`} className="hover:text-gray-700">التصنيفات</a></li>
              <li><a href={`/${slug}/contact`} className="hover:text-gray-700">تواصل معنا</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-800 mb-4">تواصل معنا</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              {contactPhone && <li dir="ltr" className="text-right">{contactPhone}</li>}
              {contactEmail && <li dir="ltr" className="text-right">{contactEmail}</li>}
              {contactAddress && <li>{contactAddress}</li>}
              {!contactPhone && !contactEmail && !contactAddress && <li className="text-gray-300">لا توجد بيانات تواصل بعد</li>}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-800 mb-4">حقوق النشر</h4>
            <p className="text-sm text-gray-500 mb-4">&copy; {new Date().getFullYear()} {storeName}. جميع الحقوق محفوظة.</p>
            {hasSocial && (
              <div className="flex gap-2">
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
        </div>
      </footer>
    </div>
  );
}
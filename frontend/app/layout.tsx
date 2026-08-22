import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./theme.css";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import I18nProviderWrapper from "@/lib/i18n/I18nProviderWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ⚠️ فرض تخطيط الـ Desktop Site على كل الأجهزة (بما فيها الموبايل):
// - عرض نافذة العرض = 1024px بدل 1280 حتى لا يتقلص المحتوى كثيرًا على الموبايل
//   (كل الـ media queries للموبايل أصغر من 1024: 480/640/900 فلا تُفعَّل،
//    وجميع breakpoints الـ desktop md/lg نشطة — الشريط الجانبي والجداول تظهر كاملة).
// - initial-scale = 0.7: الصفحة تفتح أقرب (ملء الشاشة بشكل مقروء) بدل ما تفتح
//   مصغّرة جدًا — ويمكن للمستخدم الزوم للداخل (حتى 300%) أو للخارج لعرض كامل الصفحة.
export const viewport: Viewport = {
  width: 1024,
  initialScale: 0.7,
  maximumScale: 3,
};

export async function generateMetadata(): Promise<Metadata> {
  let title = "فاتورة راحتك";
  let description = "منصة إدارة المتاجر";
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";
    const res = await fetch(`${apiUrl}/site/landing-page`, { next: { revalidate: 60 } });
    if (res.ok) {
      const json = await res.json();
      const data = json.data || json;
      if (data.siteName) title = data.siteName;
      if (data.siteDescription) description = data.siteDescription;
    }
  } catch {}
  return { title, description };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){try{var m=document.querySelector('meta[name=\"viewport\"]');if(m){m.setAttribute('content','width=1024, initial-scale=0.7, maximum-scale=3');}else{var n=document.createElement('meta');n.name='viewport';n.content='width=1024, initial-scale=0.7, maximum-scale=3';document.head.appendChild(n);}}catch(e){console.warn('viewport guard',e);}})();",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProviderWrapper>
          <ConfirmProvider>{children}</ConfirmProvider>
        </I18nProviderWrapper>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./theme.css";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import I18nProviderWrapper from "@/lib/i18n/I18nProviderWrapper";
import GlobalFormValidation from "@/components/GlobalFormValidation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// تخطيط متجاوب: يتكيف تلقائيًا مع عرض الشاشة (موبايل / تابلت / سطح مكتب).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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

const GOOGLE_TAG_INIT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-27SY8BQQC7');
gtag('config', 'G-QFWCXMF97W');
gtag('event', 'conversion', {'send_to': 'AW-11127647850/8JLjCKqY75MYEOrcibop'});
`;

const STORE_TAGS: Record<string, string> = {
  "rafahrahatak.com": "G-JJ0R67Q8X0",
  "faturatrahatik.sa": "G-MF3WPZT92C",
  "ramzrahatk.com": "G-9JSZ5KS7SG",
};

function storeTagInit(id: string) {
  return `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', '${id}');
`;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const rawHost = h.get("x-forwarded-host") || h.get("host") || "";
  const hostname = rawHost.split(",")[0].split(":")[0].trim().toLowerCase().replace(/^www\./, "");
  const storeTag = STORE_TAGS[hostname];

  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" href="/favicon.png" sizes="64x64" />
        <link rel="apple-touch-icon" type="image/png" href="/favicon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-27SY8BQQC7"></script>
        <script dangerouslySetInnerHTML={{ __html: GOOGLE_TAG_INIT }} />
        {storeTag && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${storeTag}`}></script>
            <script dangerouslySetInnerHTML={{ __html: storeTagInit(storeTag) }} />
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <GlobalFormValidation />
        <I18nProviderWrapper>
          <ConfirmProvider>{children}</ConfirmProvider>
        </I18nProviderWrapper>
      </body>
    </html>
  );
}

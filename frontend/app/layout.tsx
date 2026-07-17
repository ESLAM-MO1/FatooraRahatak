import type { Metadata } from "next";
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
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProviderWrapper>
          <ConfirmProvider>{children}</ConfirmProvider>
        </I18nProviderWrapper>
      </body>
    </html>
  );
}

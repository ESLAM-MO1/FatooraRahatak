import Script from "next/script";
import { headers } from "next/headers";

const CONTAINERS: Record<string, string> = {
  "rahtk.sa": "GTM-PMHRNB79",
  "rahtkm.sa": "GTM-5FVZZG3D",
  "thqah.net": "GTM-PRWJV4PH",
  "wudrahatk.com": "GTM-WV95DH5F",
  "ruknrahatk.com": "GTM-5CLLLD6R",
  "faturatrahatik.sa": "GTM-TQ5BN4WB",
  "ramzrahatk.com": "GTM-WDP7VLMP",
  "rafahrahatak.com": "GTM-P3S2R3H8",
};

async function getContainerId() {
  const h = await headers();
  const raw = h.get("x-forwarded-host") || h.get("host") || "";
  const host = raw.split(",")[0].trim().toLowerCase().split(":")[0];
  const bare = host.startsWith("www.") ? host.slice(4) : host;
  return CONTAINERS[bare] || null;
}

export async function GtmHead() {
  const id = await getContainerId();
  if (!id) return null;
  return (
    <Script
      id="gtm-script"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`,
      }}
    />
  );
}

export async function GtmBody() {
  const id = await getContainerId();
  if (!id) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${id}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      ></iframe>
    </noscript>
  );
}

// أكواد جوجل الخاصة بالمنصة فقط، لا تُحمَّل على متاجر العملاء.
const PLATFORM_HOSTS = ["rahtk.sa"];

const PLATFORM_GTAG_INIT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-27SY8BQQC7');
gtag('config', 'G-QFWCXMF97W');
gtag('event', 'conversion', {'send_to': 'AW-11127647850/8JLjCKqY75MYEOrcibop'});
`;

export async function PlatformGoogleTags() {
  const h = await headers();
  const raw = h.get("x-forwarded-host") || h.get("host") || "";
  const host = raw.split(",")[0].trim().toLowerCase().split(":")[0];
  const bare = host.startsWith("www.") ? host.slice(4) : host;
  if (!PLATFORM_HOSTS.includes(bare)) return null;
  return (
    <>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-27SY8BQQC7" strategy="afterInteractive" />
      <Script id="platform-gtag-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: PLATFORM_GTAG_INIT }} />
    </>
  );
}

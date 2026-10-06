"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORE_HOSTS = [
  "rahtkm.sa", "rrahtkm.com", "rahatk.sa", "thqah.net", "wudrahatk.com",
  "ruknrahatk.com", "rafahrahatak.com", "faturatrahatik.sa", "ramzrahatk.com",
];
const MAIN_HOST = "rahtk.sa";
const MAIN_HOST_STORE_PATHS = ["/store/zahbe"];

const B = "https://rahtk.sa/store-trust";
const BADGES = [
  { f: "vat", alt: "ضريبة القيمة المضافة" },
  { f: "tm", alt: "علامة تجارية مسجلة" },
  { f: "moc", alt: "وزارة التجارة" },
];
const PAYMENTS = [
  { f: "bank", alt: "تحويل بنكي" },
  { f: "mada", alt: "mada" },
  { f: "mastercard", alt: "Mastercard" },
  { f: "visa", alt: "Visa" },
  { f: "applepay", alt: "Apple Pay" },
  { f: "gpay", alt: "Google Pay" },
  { f: "paypal", alt: "PayPal" },
  { f: "tabby", alt: "Tabby" },
  { f: "tamara", alt: "Tamara" },
];

export default function StoreTrustBanner() {
  const pathname = usePathname() || "";
  const [show, setShow] = useState(false);
  const [bg, setBg] = useState<string | null>(null);

  useEffect(() => {
    const host = window.location.hostname.toLowerCase().replace(/^www\./, "");
    if (host === MAIN_HOST) {
      setShow(MAIN_HOST_STORE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")));
    } else {
      setShow(STORE_HOSTS.includes(host));
    }
    const sync = () => {
      const f = document.querySelector("footer");
      if (!f) return;
      const c = getComputedStyle(f).backgroundColor;
      if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") setBg(c);
    };
    sync();
    const t1 = setTimeout(sync, 300);
    const t2 = setTimeout(sync, 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pathname]);

  if (!show) return null;

  return (
    <section className="stb" dir="rtl" aria-label="الثقة وطرق الدفع" style={bg ? { background: bg } : undefined}>
      <div className="stb-in">
        <div className="stb-main">
          <div className="stb-badges">
            {BADGES.map((b) => (
              <img key={b.f} src={`${B}/${b.f}.png`} alt={b.alt} loading="lazy" decoding="async" />
            ))}
          </div>
          <div className="stb-pay">
            {PAYMENTS.map((p) => (
              <img key={p.f} src={`${B}/${p.f}.png`} alt={p.alt} loading="lazy" decoding="async" />
            ))}
          </div>
        </div>
        <img className="stb-logo" src={`${B}/logo.png`} alt="فاتورة راحتك" loading="lazy" decoding="async" />
      </div>
      <style>{`
        .stb{background:linear-gradient(135deg,#0b5a73,#12708b);padding:24px 16px;width:100%;box-sizing:border-box}
        .stb-in{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:clamp(16px,4vw,48px);flex-wrap:wrap}
        .stb-main{display:flex;flex-direction:column;align-items:center;gap:16px;min-width:0;max-width:100%}
        .stb-badges,.stb-pay{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;max-width:100%}
        .stb-badges{gap:12px clamp(16px,3vw,40px)}
        .stb-pay{gap:10px clamp(8px,1.5vw,16px)}
        .stb-badges img{height:clamp(30px,5vw,56px);width:auto;max-width:100%;object-fit:contain}
        .stb-pay img{height:clamp(26px,3.6vw,44px);width:auto;max-width:100%;object-fit:contain}
        .stb-logo{height:clamp(80px,14vw,150px);width:auto;max-width:100%;object-fit:contain}
        @media(max-width:600px){.stb-in{flex-direction:column}.stb-pay img{height:28px}}
      `}</style>
    </section>
  );
}

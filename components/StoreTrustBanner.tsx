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
        .stb{background:linear-gradient(135deg,#0b5a73,#12708b);padding:clamp(20px,4vw,56px) clamp(12px,3vw,40px);width:100%;box-sizing:border-box}
        .stb-in{max-width:1500px;margin:0 auto;display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:clamp(10px,3vw,48px)}
        .stb-main{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:stretch;gap:clamp(10px,2.4vw,36px)}
        .stb-badges{display:flex;flex-wrap:nowrap;align-items:center;justify-content:space-between;gap:clamp(6px,2vw,32px)}
        .stb-pay{display:flex;flex-wrap:nowrap;align-items:center;justify-content:space-between;gap:clamp(3px,1vw,14px)}
        .stb-badges img{flex:0 1 auto;min-width:0;max-width:33%;width:auto;height:clamp(40px,7.4vw,112px);object-fit:contain}
        .stb-pay img{flex:1 1 0;min-width:0;max-width:100%;height:clamp(22px,3.4vw,52px);object-fit:contain}
        .stb-logo{flex:0 0 auto;height:clamp(90px,16vw,230px);width:auto;max-width:30%;object-fit:contain}
        @media(max-width:700px){
          .stb{padding:16px 10px}
          .stb-in{flex-direction:row;gap:8px}
          .stb-logo{order:0;height:auto;width:30%;max-width:30%}
          .stb-main{gap:8px}
          .stb-badges{display:grid;grid-template-columns:1fr 1fr;gap:6px 4px;justify-items:center}
          .stb-badges img{max-width:100%;height:clamp(28px,8vw,40px);width:auto}
          .stb-pay img{height:clamp(14px,4.2vw,22px)}
        }
      `}</style>
    </section>
  );
}

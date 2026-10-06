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
        .stb{background:linear-gradient(135deg,#0b5a73,#12708b);padding:clamp(24px,5vw,64px) 16px;width:100%;box-sizing:border-box}
        .stb-in{max-width:1500px;margin:0 auto;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:clamp(20px,5vw,70px)}
        .stb-main{display:flex;flex-direction:column;align-items:center;gap:clamp(14px,2.2vw,28px);min-width:0}
        .stb-badges{display:flex;flex-wrap:nowrap;align-items:center;justify-content:center;gap:clamp(14px,3vw,48px)}
        .stb-pay{display:flex;flex-wrap:nowrap;align-items:center;justify-content:center;gap:clamp(5px,1vw,14px)}
        .stb-badges img{height:clamp(30px,5.2vw,72px);width:auto;max-width:none;object-fit:contain}
        .stb-pay img{height:clamp(24px,3.8vw,56px);width:auto;max-width:none;object-fit:contain}
        .stb-logo{height:clamp(110px,17vw,220px);width:auto;object-fit:contain;flex-shrink:0}
        @media(max-width:700px){
          .stb-in{flex-direction:column;gap:20px}
          .stb-logo{order:-1;height:120px}
          .stb-main{gap:16px;width:100%}
          .stb-badges{flex-wrap:wrap;gap:12px 22px}
          .stb-badges img{height:34px}
          .stb-pay{flex-wrap:wrap;gap:10px 12px}
          .stb-pay img{height:28px}
        }
      `}</style>
    </section>
  );
}

"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORE_HOSTS = [
  "rahtkm.sa", "rrahtkm.com", "rahatk.sa", "thqah.net", "wudrahatk.com",
  "ruknrahatk.com", "rafahrahatak.com", "faturatrahatik.sa", "ramzrahatk.com",
];
const MAIN_HOST = "rahtk.sa";
const MAIN_HOST_STORE_PATHS = ["/store/zahbe"];

const IMG: Record<string, string> = {
  vat: "https://res.cloudinary.com/vlfmzisv/image/upload/f_auto,q_auto/v1793976672/White_VAT_Number_with_Saudi_Badge_1.png",
  logo: "https://res.cloudinary.com/vlfmzisv/image/upload/f_auto,q_auto/v1793975278/3D_Arabic_Delivery_Services_Logo_1.png",
  tm: "https://res.cloudinary.com/vlfmzisv/image/upload/f_auto,q_auto/v1793975267/TM-01-00-38510-26_Logo_1.png",
  moc: "https://res.cloudinary.com/vlfmzisv/image/upload/f_auto,q_auto/v1793975273/Saudi_Ministry_of_Commerce_Logo_and_Number_1.png",
  paypal: "https://res.cloudinary.com/vlfmzisv/image/upload/f_auto,q_auto/v1793975282/PayPal_Logo_on_Transparent_Background_1.png",
  gpay: "https://res.cloudinary.com/vlfmzisv/image/upload/f_auto,q_auto/v1793975286/Google_Pay_Rounded_Badge_1.png",
  applepay: "https://res.cloudinary.com/vlfmzisv/image/upload/f_auto,q_auto/v1793975265/Apple_Pay_Button_on_Transparent_Background_1.png",
  tamara: "https://res.cloudinary.com/vlfmzisv/image/upload/f_auto,q_auto/v1793975280/Pastel_Gradient_%D8%AA%D9%85%D8%A7%D8%B1%D8%A7_Badge_1.png",
  tabby: "https://res.cloudinary.com/vlfmzisv/image/upload/f_auto,q_auto/v1793975285/Mint_Tabby_Logo_Badge_1.png",
  visa: "https://res.cloudinary.com/vlfmzisv/image/upload/f_auto,q_auto/v1793975270/Classic_Blue_and_Gold_Visa_Wordmark_1.png",
  mada: "https://res.cloudinary.com/vlfmzisv/image/upload/f_auto,q_auto/v1793975268/Mada_Logo_Badge_on_Transparent_Canvas_1.png",
  bank: "https://res.cloudinary.com/vlfmzisv/image/upload/f_auto,q_auto/v1793976672/%D8%AA%D8%AD%D9%88%D9%8A%D9%84_%D8%A8%D9%86%D9%83%D9%8A_%D9%88%D8%B4%D8%B9%D8%A7%D8%B1_%D8%A7%D9%84%D8%A8%D9%86%D9%83.png",
  mastercard: "https://res.cloudinary.com/vlfmzisv/image/upload/f_auto,q_auto/v1793975274/Classic_MasterCard_Logo_on_Transparent_Background_1.png",
};
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
              <img key={b.f} src={IMG[b.f]} alt={b.alt} loading="lazy" decoding="async" />
            ))}
          </div>
          <div className="stb-pay">
            {PAYMENTS.map((p) => (
              <img key={p.f} src={IMG[p.f]} alt={p.alt} loading="lazy" decoding="async" />
            ))}
          </div>
        </div>
        <img className="stb-logo" src={IMG.logo} alt="فاتورة راحتك" loading="lazy" decoding="async" />
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
          .stb{padding:16px 8px}
          .stb-in{flex-direction:row;gap:6px;align-items:center}
          .stb-logo{order:0;height:auto;width:34%;max-width:34%;flex:0 0 34%}
          .stb-main{gap:10px;flex:1 1 0;min-width:0}
          .stb-badges{display:flex;flex-wrap:nowrap;justify-content:space-between;align-items:center;gap:2px}
          .stb-badges img{flex:1 1 0;min-width:0;max-width:33.33%;width:auto;height:clamp(34px,10vw,54px);object-fit:contain}
          .stb-pay{flex-wrap:wrap;justify-content:center;gap:8px 6px}
          .stb-pay img{flex:0 0 auto;width:auto;max-width:none;height:clamp(18px,5.4vw,28px)}
        }
      `}</style>
    </section>
  );
}

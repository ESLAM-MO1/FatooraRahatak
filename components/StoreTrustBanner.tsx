"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORE_HOSTS = [
  "rahtkm.sa", "rrahtkm.com", "rahatk.sa", "thqah.net", "wudrahatk.com",
  "ruknrahatk.com", "rafahrahatak.com", "faturatrahatik.sa", "ramzrahatk.com",
];
const MAIN_HOST = "rahtk.sa";
const MAIN_HOST_STORE_PATHS = ["/store/zahbe"];

const CDN = "https://res.cloudinary.com/dshkk2l2h/image/upload/f_auto,q_auto";
const IMG: Record<string, string> = {
  vat: `${CDN}/v1791306848/White_VAT_Number_with_Saudi_Badge_rujvfk.png`,
  logo: `${CDN}/v1791306855/3D_Arabic_Delivery_Services_Logo_shjnvt.png`,
  tm: `${CDN}/v1791306860/TM-01-00-38510-26_Logo_mc6u9f.png`,
  moc: `${CDN}/v1791306861/Saudi_Ministry_of_Commerce_Logo_and_Number_xfbfib.png`,
  paypal: `${CDN}/v1791306865/PayPal_Logo_on_Transparent_Background_vbeswl.png`,
  gpay: `${CDN}/v1791306865/Google_Pay_Rounded_Badge_jy6qek.png`,
  applepay: `${CDN}/v1791306866/Apple_Pay_Button_on_Transparent_Background_lbj6al.png`,
  tamara: `${CDN}/v1791306868/Pastel_Gradient_%D8%AA%D9%85%D8%A7%D8%B1%D8%A7_Badge_mq42xb.png`,
  tabby: `${CDN}/v1791306869/Mint_Tabby_Logo_Badge_rw92qg.png`,
  visa: `${CDN}/v1791306870/Classic_Blue_and_Gold_Visa_Wordmark_qjav80.png`,
  mada: `${CDN}/v1791306871/Mada_Logo_Badge_on_Transparent_Canvas_wroh8j.png`,
  bank: `${CDN}/v1791306873/Arabic_Bank_Transfer_Badge_hapnos.png`,
  mastercard: `${CDN}/v1791306877/Classic_MasterCard_Logo_on_Transparent_Background_lr1tlu.png`,
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

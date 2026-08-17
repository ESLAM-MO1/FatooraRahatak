"use client";
import { useTranslation } from "react-i18next";
import Hero from "@/components/Hero";
import LoadingState from "@/components/LoadingState";
import { useEffect, useState } from "react";
import {
  PhoneIcon,
  MailIcon,
  WhatsAppIcon,
  FacebookIcon,
  InstagramIcon,
  SnapchatIcon,
  TikTokIcon,
  TelegramIcon,
  LinkedInIcon,
} from "@/components/store-templates/icons";

interface HelpTeam {
  title: string;
  desc: string;
  phone: string;
  whatsapp: string;
  email: string;
  accent: string;
}

export default function HelpCenter() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 60);
    return () => clearTimeout(id);
  }, []);

  const teams: HelpTeam[] = [
    {
      title: t("helpCenter.supportSection"),
      desc: t("helpCenter.supportDesc"),
      phone: t("helpCenter.supportPhone"),
      whatsapp: "https://wa.me/966531118224",
      email: t("helpCenter.emailAddress"),
      accent: "#2563eb",
    },
    {
      title: t("helpCenter.salesSection"),
      desc: t("helpCenter.salesDesc"),
      phone: t("helpCenter.salesPhone"),
      whatsapp: "https://wa.me/966531158477",
      email: t("helpCenter.emailAddress"),
      accent: "#16a34a",
    },
  ];

  const socials: { label: string; href: string; color: string; Icon: (p: { size?: number }) => React.ReactNode }[] = [
    { label: "Instagram", href: "https://instagram.com/faturatrahatik", color: "#E1306C", Icon: InstagramIcon },
    { label: "Snapchat", href: "https://snapchat.com/faturatrahatik", color: "#FFFC00", Icon: SnapchatIcon },
    { label: "Facebook", href: "https://facebook.com/faturatrahatik", color: "#1877F2", Icon: FacebookIcon },
    { label: "WhatsApp", href: "https://wa.me/966531118224", color: "#25D366", Icon: WhatsAppIcon },
    { label: "Telegram", href: "https://t.me/faturatrahatik", color: "#229ED9", Icon: TelegramIcon },
    { label: "LinkedIn", href: "https://linkedin.com/in/faturatrahatik", color: "#0A66C2", Icon: LinkedInIcon },
    { label: "TikTok", href: "https://tiktok.com/@faturatrahatik", color: "#FE2C55", Icon: TikTokIcon },
  ];

  const phoneDigits = (p: string) => p.replace(/[^\d+]/g, "");

  return (
    <div>
      <Hero title={t("page.helpCenter")} subtitle={t("common.help")} />

      {loading ? (
        <LoadingState />
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {teams.map((team) => (
              <div
                key={team.title}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="px-6 pt-6 pb-5" style={{ background: `linear-gradient(135deg, ${team.accent}14, ${team.accent}05)` }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="flex items-center justify-center rounded-xl text-white"
                      style={{ width: 44, height: 44, background: team.accent, boxShadow: `0 6px 16px ${team.accent}44` }}
                    >
                      <PhoneIcon size={20} />
                    </span>
                    <div>
                      <h2 className="text-[17px] font-extrabold text-gray-900">{team.title}</h2>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-0.5">
                        <svg width="8" height="8" viewBox="0 0 8 8" className="animate-pulse"><circle cx="4" cy="4" r="4" fill="#16a34a" /></svg>
                        {t("helpCenter.available247")}
                      </span>
                    </div>
                  </div>
                  <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">{team.desc}</p>
                </div>

                <div className="px-6 py-5 space-y-3">
                  <a
                    href={`tel:${phoneDigits(team.phone)}`}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors hover:border-blue-200 hover:bg-blue-50"
                    style={{ borderColor: "var(--border)", direction: "ltr" }}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex items-center justify-center rounded-lg text-blue-600 bg-blue-50" style={{ width: 34, height: 34 }}><PhoneIcon size={16} /></span>
                      <span>
                        <span className="block text-[11px] text-gray-400 text-right">{t("helpCenter.call")}</span>
                        <span className="block text-[14px] font-bold text-gray-800">{team.phone}</span>
                      </span>
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
                  </a>

                  <a
                    href={team.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors hover:border-green-200 hover:bg-green-50"
                    style={{ borderColor: "var(--border)", direction: "ltr" }}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex items-center justify-center rounded-lg text-white bg-[#25D366]" style={{ width: 34, height: 34 }}><WhatsAppIcon size={16} /></span>
                      <span>
                        <span className="block text-[11px] text-gray-400 text-right">{t("helpCenter.whatsapp")}</span>
                        <span className="block text-[14px] font-bold text-gray-800" dir="ltr">WhatsApp</span>
                      </span>
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
                  </a>

                  <a
                    href={`mailto:${team.email}`}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors hover:border-orange-200 hover:bg-orange-50"
                    style={{ borderColor: "var(--border)", direction: "ltr" }}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex items-center justify-center rounded-lg text-white bg-orange-500" style={{ width: 34, height: 34 }}><MailIcon size={16} /></span>
                      <span className="min-w-0">
                        <span className="block text-[11px] text-gray-400 text-right">{t("helpCenter.email")}</span>
                        <span className="block text-[14px] font-bold text-gray-800 truncate">{team.email}</span>
                      </span>
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 text-center">
            <h2 className="text-[18px] font-extrabold text-gray-900 mb-1">{t("helpCenter.followUs")}</h2>
            <p className="text-[13px] text-gray-500 mb-6">{t("helpCenter.followDesc")}</p>
            <div className="flex flex-wrap items-center justify-center gap-3" dir="ltr">
              {socials.map(({ label, href, color, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="flex items-center justify-center rounded-full text-white transition-all hover:scale-110 hover:shadow-lg"
                  style={{ width: 48, height: 48, background: color, boxShadow: `0 4px 14px ${color}55` }}
                >
                  {typeof Icon === "function" ? <Icon size={20} /> : null}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
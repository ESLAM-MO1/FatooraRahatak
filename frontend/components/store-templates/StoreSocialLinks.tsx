import React from "react";
import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
  SnapchatIcon,
  TikTokIcon,
  TelegramIcon,
  LinkedInIcon,
  TwitterIcon,
  YouTubeIcon,
  PinterestIcon,
} from "@/components/store-templates/icons";

export interface SocialLinksInputs {
  facebook?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  snapchat?: string | null;
  tiktok?: string | null;
  telegram?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  pinterest?: string | null;
}

// بيرجع true لو فيه رابط سوشيال واحد على الأقل هيتعرض فعليًا بعد الفلترة
export function hasVisibleSocial(urls: SocialLinksInputs): boolean {
  return !!(
    urls.whatsapp || urls.facebook || urls.instagram || urls.snapchat ||
    urls.tiktok || urls.telegram || urls.linkedin || urls.twitter ||
    urls.youtube || urls.pinterest
  );
}

interface StoreSocialLinksProps {
  urls: SocialLinksInputs;
  containerClassName?: string;
  linkClassName?: string;
  linkStyle?: React.CSSProperties;
  iconSize?: number;
}

export default function StoreSocialLinks({
  urls,
  containerClassName = "mt-3 flex gap-3",
  linkClassName = "",
  linkStyle,
  iconSize = 17,
}: StoreSocialLinksProps) {
  const items: { url: string | null | undefined; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { url: urls.whatsapp, label: "WhatsApp", Icon: WhatsAppIcon },
    { url: urls.facebook, label: "Facebook", Icon: FacebookIcon },
    { url: urls.instagram, label: "Instagram", Icon: InstagramIcon },
    { url: urls.snapchat, label: "Snapchat", Icon: SnapchatIcon },
    { url: urls.tiktok, label: "TikTok", Icon: TikTokIcon },
    { url: urls.telegram, label: "Telegram", Icon: TelegramIcon },
    { url: urls.linkedin, label: "LinkedIn", Icon: LinkedInIcon },
    { url: urls.twitter, label: "X (Twitter)", Icon: TwitterIcon },
    { url: urls.youtube, label: "YouTube", Icon: YouTubeIcon },
    { url: urls.pinterest, label: "Pinterest", Icon: PinterestIcon },
  ];

  return (
    <div className={containerClassName} dir="ltr">
      {items.map(({ url, label, Icon }) =>
        url ? (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={linkClassName}
            style={linkStyle}
          >
            <Icon size={iconSize} />
          </a>
        ) : null
      )}
    </div>
  );
}
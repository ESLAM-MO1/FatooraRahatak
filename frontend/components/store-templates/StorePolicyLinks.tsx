"use client";
import { useTranslation } from "react-i18next";
import { POLICY_LINKS } from "@/lib/storePages";

interface StorePolicyLinksProps {
  slug: string;
  title?: string;
  titleClassName?: string;
  titleStyle?: React.CSSProperties;
  linkClassName?: string;
  linkStyle?: React.CSSProperties;
  listClassName?: string;
  listStyle?: React.CSSProperties;
}

// قسم "سياسات المتجر" في تذييل الموقع — يرتب الروابط الخمسة دائمًا
// مع الاحتفاظ بتصميم كل ثيم عبر الخصائص المرنة (الألوان والخطوط والمسافات).
export default function StorePolicyLinks({
  slug,
  title,
  titleClassName,
  titleStyle,
  linkClassName,
  linkStyle,
  listClassName,
  listStyle,
}: StorePolicyLinksProps) {
  const { t } = useTranslation();
  const links = POLICY_LINKS;

  const heading = title || t("storefront.storePolicies");

  return (
    <div>
      <h4 className={titleClassName} style={titleStyle}>
        {heading}
      </h4>
      <ul className={listClassName} style={listStyle}>
        {links.map((link) => (
          <li key={link.id}>
            <a href={link.href(slug)} className={linkClassName} style={linkStyle}>
              {t(link.labelKey)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
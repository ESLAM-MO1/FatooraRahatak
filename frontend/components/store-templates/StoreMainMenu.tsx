"use client";
import { useTranslation } from "react-i18next";
import { MENU_ITEMS } from "@/lib/storePages";

interface StoreMainMenuProps {
  slug: string;
  mobile?: boolean;
  linkClassName?: string;
  linkStyle?: React.CSSProperties;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}

// القائمة الرئيسية للمتجر — تُعرض في الهيدر (سطح المكتب) وداخل القائمة المنبثقة (الموبايل)
// كل عناصر القائمة العشرة تظهر دائمًا، ويُتحكم في محتوى صفحاتها من صفحة إعدادات المتجر.
export default function StoreMainMenu({
  slug,
  mobile = false,
  linkClassName,
  linkStyle,
  containerClassName,
  containerStyle,
}: StoreMainMenuProps) {
  const { t } = useTranslation();
  const items = MENU_ITEMS;

  if (mobile) {
    return (
      <div className={containerClassName} style={containerStyle}>
        {items.map((item) => (
          <a
            key={item.id}
            href={item.href(slug)}
            className={linkClassName}
            style={linkStyle}
          >
            {t(item.labelKey)}
          </a>
        ))}
      </div>
    );
  }

  return (
    <nav className={containerClassName} style={containerStyle}>
      {items.map((item) => (
        <a
          key={item.id}
          href={item.href(slug)}
          className={linkClassName}
          style={linkStyle}
        >
          {t(item.labelKey)}
        </a>
      ))}
    </nav>
  );
}

// يساعد على معرفة مدى طول القائمة الافتراضية (عدد العناصر) لأي منطق يحتاجه الثيم
export { MENU_ITEMS };
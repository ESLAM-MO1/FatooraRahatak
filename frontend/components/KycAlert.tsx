"use client";

import Link from "next/link";

interface KycAlertLink {
  label: string;
  href: string;
}

interface KycAlertProps {
  message: string;
  links?: KycAlertLink[];
  className?: string;
}

/**
 * تنبيه "اعتماد حساب التاجر / مستندات التوثيق" الموحّد الذي يظهر في أكثر من صفحة
 * (التسويات، الصفحة الرئيسية، حساب التاجر، مستندات التوثيق).
 * تصميم موحّد متناسق مع هوية المنصة (نفس اللون الأساسي والحواف والمسافات).
 */
export default function KycAlert({ message, links = [], className = "" }: KycAlertProps) {
  return (
    <div className={`card p-4 sm:p-5 ${className}`}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[var(--blue-50)] flex items-center justify-center shrink-0 mt-0.5">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--blue)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4.5" />
            <path d="M12 16h.01" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] sm:text-[13.5px] text-[var(--ink)] leading-relaxed">{message}</p>

          {links.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {links.map((link, i) => (
                <Link
                  key={i}
                  href={link.href}
                  className="btn btn-outline btn-sm"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

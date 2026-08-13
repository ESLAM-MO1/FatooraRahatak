import React from "react";

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const base = (p: IconProps) => ({
  width: p.size ?? 20,
  height: p.size ?? 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: p.strokeWidth ?? 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: p.className,
});

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
);

export const UserIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
);

export const BagIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 8h12l1 13H5L6 8z" /><path d="M9 10V6a3 3 0 016 0v4" /></svg>
);

export const HeartIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 20s-7-4.4-9.2-8.4C1.3 9 2.4 5.6 5.6 5.1 7.4 4.8 9 5.7 12 8c3-2.3 4.6-3.2 6.4-2.9 3.2.5 4.3 3.9 2.8 6.5C19 15.6 12 20 12 20z" /></svg>
);

export const HeartFilledIcon = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M12 20s-7-4.4-9.2-8.4C1.3 9 2.4 5.6 5.6 5.1 7.4 4.8 9 5.7 12 8c3-2.3 4.6-3.2 6.4-2.9 3.2.5 4.3 3.9 2.8 6.5C19 15.6 12 20 12 20z" /></svg>
);

export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);

export const TruckIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17" r="1.6" /><circle cx="17.5" cy="17" r="1.6" /></svg>
);

export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
);

export const HeadsetIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 13v-1a8 8 0 0116 0v1" /><path d="M4 13a2 2 0 012-2h1a1 1 0 011 1v4a1 1 0 01-1 1H6a2 2 0 01-2-2v-2zm16 0a2 2 0 00-2-2h-1a1 1 0 00-1 1v4a1 1 0 001 1h1a2 2 0 002-2v-2zM18 19v0a4 4 0 01-4 4h-2" /></svg>
);

export const CreditCardIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></svg>
);

export const RefreshIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 10a8 8 0 0114.5-2M20 14a8 8 0 01-14.5 2" /><path d="M20 4v4h-4M4 20v-4h4" /></svg>
);

export const PhoneIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 4h4l1.5 4L8 10c.7 1.7 2 3 3.7 3.7l2-2.5L17.5 13v4a2 2 0 01-2.2 2A15.6 15.6 0 013 6.2 2 2 0 015 4z" /></svg>
);

export const MailIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
);

export const MapPinIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
);

export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

export const FacebookIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M14 8h2V5h-2.5A3.5 3.5 0 0010 8.5V11H8v3h2v6h3v-6h2.2l.6-3H13V8.5a.5.5 0 01.5-.5z" /></svg>
);

export const InstagramIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.4" /><circle cx="16.6" cy="7.4" r="0.8" fill="currentColor" stroke="none" /></svg>
);

export const WhatsAppIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 4a8 8 0 00-6.9 12l-1 3.6 3.7-1A8 8 0 1012 4z" /><path d="M9 9.5c.5 2.5 3 5 5.5 5.5l1-2-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2-2 1z" /></svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 9l6 6 6-6" /></svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M15 6l-6 6 6 6" /></svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export const StarIcon = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.6l1-6L3.3 9.4l6-.9L12 3z" /></svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 13l4 4 10-10" /></svg>
);

export const CheckCircleIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 5-5" /></svg>
);

export const SparklesIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16z" /></svg>
);

export const LeafIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 19C5 9 12 4 20 4c0 8-5 15-15 15z" /><path d="M5 19c2-6 6-10 11-12" /></svg>
);

export const CrossIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4z" /></svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);

export const PackageIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v8" /></svg>
);

export const QuoteIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M7 7H4v6h5V7H7z" transform="translate(0 0)" /><path d="M4 7h3v6H4zM14 7h-3v6h5V7h-2z" /><path d="M11 7h3v6h-3z" /></svg>
);

export const BuildingIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M3 21h18M14 8h3v3h-3M10 8h.01M10 12h.01M10 16h.01M14 16h.01M14 12h.01" /></svg>
);

export const ScaleIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3v18M5 6h14M7 6l-3 6a3 3 0 006 0L7 6zM17 6l-3 6a3 3 0 006 0l-3-6zM3 21h18" /></svg>
);

export const HelpCircleIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 114.9.8c-.4 1-1.4 1.2-1.4 2.2M12 16h.01" /></svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>
);
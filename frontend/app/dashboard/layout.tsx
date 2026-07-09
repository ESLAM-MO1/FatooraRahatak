"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, getUserType, logout } from "@/lib/auth";

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="18" height="18">
      <path d={path} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const icons = {
  home: "M4 11.5 12 4l8 7.5M6 10v9h12v-9",
  box: "M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9ZM12 21v-9M3.5 7.5 12 12l8.5-4.5",
  tag: "M20 12.5 12.5 20 3 10.5V3h7.5L20 12.5ZM7.5 7.5h.01",
  warehouse: "M3 21V9l9-6 9 6v12H3ZM9 21v-7h6v7",
  layers: "M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 8v9M21 8v9",
  clipboard: "M9 3h6v3H9V3ZM6 6h12v15H6V6Zm3 6h6M9 15h6",
  users: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a5 5 0 0 1 10 0M17 11a3 3 0 1 0 0-6M15 14a5 5 0 0 1 6 6H17",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2",
  calendarOff: "M3 5h18v16H3V5Zm0 5h18M8 3v4M16 3v4",
  wallet: "M3 7h15a3 3 0 0 1 3 3v8a1 1 0 0 1-1 1H6a3 3 0 0 1-3-3V7Zm0 0a2 2 0 0 1 2-2h11M16 13h2",
  crown: "M4 18h16l-1-9-4 3-3-6-3 6-4-3-1 9Z",
  store: "M4 9h16l-1-5H5L4 9Zm0 0v10h16V9M9 21v-6h6v6",
  package: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9V7m0 4-3.5-2M12 12l3.5-2",
  userGroup: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 9a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M15 14a5 5 0 0 1 6 6H17",
  chart: "M4 21V9M10 21V4M16 21v-7M22 21H2",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.14-1.44l2.02-1.57-2-3.46-2.38.96a7.5 7.5 0 0 0-2.5-1.44L14 2h-4l-.4 2.55a7.5 7.5 0 0 0-2.5 1.44l-2.38-.96-2 3.46 2.02 1.57a7.4 7.4 0 0 0 0 2.88L2.72 14.5l2 3.46 2.38-.96a7.5 7.5 0 0 0 2.5 1.44L10 22h4l.4-2.55a7.5 7.5 0 0 0 2.5-1.44l2.38.96 2-3.46-2.02-1.57c.09-.47.14-.95.14-1.44Z",
  receipt:
    "M6 2h12v20l-3-2-3 2-3-2-3 2V2Zm3 5h6M9 11h6M9 15h4",
};

const sidebarTogglePath = "M4 6h16M4 12h16M4 18h16";
const crownSmallPath = "M4 18h16l-1-9-4 3-3-6-3 6-4-3-1 9Z";

type NavItem = { href: string; label: string; icon: keyof typeof icons };
type NavGroup = { title?: string; items: NavItem[] };

const ownerNav: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "الرئيسية", icon: "home" }] },
  {
    title: "المتجر",
    items: [
      { href: "/dashboard/products", label: "المنتجات", icon: "box" },
      { href: "/dashboard/categories", label: "التصنيفات", icon: "tag" },
      { href: "/dashboard/store-settings", label: "إعدادات المتجر", icon: "settings" },
    ],
  },
  {
    title: "المبيعات",
    items: [
      { href: "/dashboard/orders", label: "الطلبات", icon: "receipt" },
      { href: "/dashboard/customers", label: "العملاء", icon: "userGroup" },
      { href: "/dashboard/statistics", label: "الإحصائيات", icon: "chart" },
    ],
  },
  {
    title: "المخزون",
    items: [
      { href: "/dashboard/warehouses", label: "المخازن", icon: "warehouse" },
      { href: "/dashboard/inventory", label: "المخزون", icon: "layers" },
      { href: "/dashboard/stock-counts", label: "الجرد الدوري", icon: "clipboard" },
    ],
  },
  {
    title: "الموارد البشرية",
    items: [
      { href: "/dashboard/employees", label: "الموظفون", icon: "users" },
      { href: "/dashboard/attendance", label: "الحضور والانصراف", icon: "clock" },
      { href: "/dashboard/leave-requests", label: "طلبات الإجازات", icon: "calendarOff" },
      { href: "/dashboard/payroll", label: "الرواتب", icon: "wallet" },
    ],
  },
  {
    title: "الحساب",
    items: [{ href: "/dashboard/subscription", label: "الباقة والاشتراك", icon: "crown" }],
  },
];

const superAdminNav: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "الرئيسية", icon: "home" }] },
  {
    title: "إدارة المنصة",
    items: [
      { href: "/dashboard/stores", label: "المتاجر", icon: "store" },
      { href: "/dashboard/packages", label: "الباقات", icon: "package" },
      { href: "/dashboard/users", label: "المستخدمون", icon: "userGroup" },
    ],
  },
  {
    title: "النظام",
    items: [
      { href: "/dashboard/reports", label: "التقارير", icon: "chart" },
      { href: "/dashboard/settings", label: "الإعدادات", icon: "settings" },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userType, setUserType] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [fullName, setFullName] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    setUserType(getUserType());
    setFullName(localStorage.getItem("fullName") || "");
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-[var(--sub)]">
          <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
          جارٍ التحميل...
        </div>
      </div>
    );
  }

  const isSuperAdmin = userType === "SuperAdmin";
  const groups = isSuperAdmin ? superAdminNav : ownerNav;

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(href);

  return (
    <div className="min-h-screen flex bg-white" dir="rtl">
      <div className="brand-strip" />

      <aside
        className={`shrink-0 bg-[var(--blue-deep)] flex flex-col transition-all duration-200 ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="h-20 px-5 flex items-center gap-3 border-b border-white/10">
        <div className="brand-logo-frame on-dark" style={{ width: 46, height: 46 }}>
            <img src="/logo.png" alt="فاتورة راحتك" className="brand-logo" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-[15px] font-bold text-white tracking-tight">فاتورة راحتك</p>
              <p className="text-[10.5px] text-[#BFE6F3] mt-0.5 tracking-wide">FATURAT RAHATIK</p>
              <p className="text-[11px] text-[#9FCBDD] mt-1">
                {isSuperAdmin ? "لوحة الإدارة" : "لوحة المتجر"}
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-6">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.title && !collapsed && (
                <p className="px-2 mb-2 text-[10.5px] font-bold text-[var(--gold)] tracking-[0.12em]">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] transition-colors border-r-2 ${
                        collapsed ? "justify-center px-0" : ""
                      } ${
                        active
                          ? "bg-white/[0.14] text-white font-bold border-[var(--gold)]"
                          : "text-[#B9DCE9] hover:bg-white/[0.06] hover:text-white border-transparent"
                      }`}
                    >
                      <Icon
                        path={icons[item.icon]}
                        className={active ? "text-[var(--gold)]" : "text-[#7FB4C9]"}
                      />
                      {!collapsed && item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-dashed border-white/15">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-1 mb-3">
              <div className="w-9 h-9 rounded-full bg-[var(--gold)] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {fullName ? fullName.trim().charAt(0) : "؟"}
              </div>
              <p className="text-[13px] text-[#E4F1F7] truncate">{fullName || "المستخدم"}</p>
            </div>
          )}
          <button
            onClick={logout}
            title={collapsed ? "تسجيل الخروج" : undefined}
            className={`btn-ghost-danger w-full flex items-center justify-center gap-2 text-[13px] py-2.5`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 17v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1M10 12h10m0 0-3-3m3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {!collapsed && "تسجيل الخروج"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 shrink-0 border-b border-gray-100 flex items-center justify-between px-5 bg-white">
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "توسيع الشريط الجانبي" : "طي الشريط الجانبي"}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--sub)] hover:bg-gray-100 hover:text-[var(--ink)] transition-colors"
          >
            <Icon path={sidebarTogglePath} />
          </button>

          {!isSuperAdmin && (
            <Link
              href="/dashboard/subscription"
              className="flex items-center gap-1.5 bg-[var(--gold)] text-white text-[12.5px] font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Icon path={crownSmallPath} className="text-white" />
              ترقية
            </Link>
          )}
        </div>

        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
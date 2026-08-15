"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, getUserType, logout } from "@/lib/auth";
import { loadPermissions, savePermissions } from "@/lib/permissions";
import GlobalSearch from "@/components/GlobalSearch";
import Icon, { ICONS } from "@/components/Icon";
import QuickAddManager, { QuickAddType } from "@/components/QuickAdd";
import UpgradeModal from "@/components/UpgradeModal";

import api from "@/lib/api";
import { useTranslation } from "react-i18next";
import LangSwitch from "@/components/LangSwitch";
import "@/lib/i18n/config";
type NavItem = { href: string; label: string; icon: keyof typeof ICONS; quickAdd?: QuickAddType };
type NavGroup = { title?: string; items: NavItem[] };

type NavItemKey = { href: string; labelKey: string; icon: keyof typeof ICONS; quickAdd?: QuickAddType; perm?: string };
type NavGroupKey = { titleKey?: string; items: NavItemKey[] };

const ownerNavKeys: NavGroupKey[] = [
  { items: [{ href: "/dashboard", labelKey: "nav.dashboard", icon: "home" as const, perm: "Dashboard.View" }] },
  {
    titleKey: "nav.store",
    items: [
      { href: "/dashboard/products", labelKey: "nav.products", icon: "box", quickAdd: "products", perm: "Products.View" },
      { href: "/dashboard/categories", labelKey: "nav.categories", icon: "tag", perm: "Categories.View" },
      { href: "/dashboard/coupons", labelKey: "nav.coupons", icon: "tag", perm: "Coupons.View" },
      { href: "/dashboard/store-settings", labelKey: "nav.storeSettings", icon: "settings", perm: "StoreSettings.View" },
    ],
  },
  {
    titleKey: "nav.sales",
    items: [
      { href: "/dashboard/pos", labelKey: "nav.pos", icon: "cashier", perm: "POS.View" },
      { href: "/dashboard/orders", labelKey: "nav.orders", icon: "receipt", perm: "Orders.View" },
      { href: "/dashboard/orders/returns", labelKey: "nav.returns", icon: "receipt", perm: "Orders.View" },
      { href: "/dashboard/shipping", labelKey: "nav.shipping", icon: "truck", perm: "ShippingCompanies.View" },
      { href: "/dashboard/customers", labelKey: "nav.customers", icon: "userGroup", perm: "Customers.View" },
      { href: "/dashboard/statistics", labelKey: "nav.statistics", icon: "chart", perm: "Statistics.View" },
    ],
  },
  {
    titleKey: "nav.inventory",
    items: [
      { href: "/dashboard/warehouses", labelKey: "nav.warehouses", icon: "warehouse", quickAdd: "warehouses", perm: "Warehouses.View" },
      { href: "/dashboard/inventory", labelKey: "nav.inventory", icon: "layers", perm: "Inventory.View" },
      { href: "/dashboard/stock-counts", labelKey: "nav.stockCounts", icon: "clipboard", perm: "StockCounts.View" },
      { href: "/dashboard/transfers", labelKey: "nav.transfers", icon: "layers", perm: "StockTransfer.View" },
      { href: "/dashboard/damages", labelKey: "nav.damages", icon: "alert", perm: "DamagedStock.View" },
    ],
  },
  {
    titleKey: "nav.accounting",
    items: [
      { href: "/dashboard/accounting/accounts", labelKey: "nav.accounts", icon: "ledger", perm: "ChartOfAccounts.View" },
      { href: "/dashboard/accounting/journal-entries", labelKey: "nav.journalEntries", icon: "journal", perm: "JournalEntries.View" },
      { href: "/dashboard/accounting/ledger", labelKey: "nav.ledger", icon: "book", perm: "Ledger.View" },
      { href: "/dashboard/accounting/invoices", labelKey: "nav.invoices", icon: "receipt", perm: "Invoices.View" },
      { href: "/dashboard/accounting/vouchers", labelKey: "nav.vouchers", icon: "wallet", perm: "Vouchers.View" },
      { href: "/dashboard/accounting/fixed-assets", labelKey: "nav.fixedAssets", icon: "fixedAsset", perm: "FixedAssets.View" },
      { href: "/dashboard/accounting/reports", labelKey: "nav.reports", icon: "chart", perm: "FinancialReports.View" },
      { href: "/dashboard/business-reports", labelKey: "nav.businessReports", icon: "chart", perm: "Orders.View" },
    ],
  },
  {
    titleKey: "nav.hr",
    items: [
      { href: "/dashboard/employees", labelKey: "nav.employees", icon: "users", quickAdd: "employees", perm: "EmployeeManagement.View" },
      { href: "/dashboard/attendance", labelKey: "nav.attendance", icon: "clock", perm: "Attendance.View" },
      { href: "/dashboard/leave-requests", labelKey: "nav.leaveRequests", icon: "calendarOff", perm: "LeaveRequests.View" },
      { href: "/dashboard/payroll", labelKey: "nav.payroll", icon: "wallet", perm: "Payroll.View" },
    ],
  },
  {
    titleKey: "nav.account",
    items: [
      { href: "/dashboard/subscription", labelKey: "nav.subscription", icon: "crown", perm: "SubscriptionPackage.View" },
      { href: "/dashboard/transactions", labelKey: "nav.transactions", icon: "card", perm: "Payments.View" },
      { href: "/dashboard/payment-account", labelKey: "nav.paymentAccount", icon: "wallet", perm: "Payments.View" },
      { href: "/dashboard/settlements", labelKey: "nav.settlements", icon: "wallet", perm: "Payments.View" },
      { href: "/dashboard/referrals", labelKey: "nav.referrals", icon: "share", perm: "Referrals.View" },
    ],
  },
];

const employeeNavKeys: NavGroupKey[] = [
  { items: [{ href: "/dashboard", labelKey: "nav.dashboard", icon: "home", perm: "Dashboard.View" }] },
  {
    titleKey: "nav.sales",
    items: [
      { href: "/dashboard/pos", labelKey: "nav.pos", icon: "cashier", perm: "POS.View" },
      { href: "/dashboard/orders", labelKey: "nav.orders", icon: "receipt", perm: "Orders.View" },
      { href: "/dashboard/orders/returns", labelKey: "nav.returns", icon: "receipt", perm: "Orders.View" },
      { href: "/dashboard/customers", labelKey: "nav.customers", icon: "userGroup", perm: "Customers.View" },
      { href: "/dashboard/statistics", labelKey: "nav.statistics", icon: "chart", perm: "Statistics.View" },
    ],
  },
  {
    titleKey: "nav.accounting",
    items: [
      { href: "/dashboard/accounting/accounts", labelKey: "nav.accounts", icon: "ledger", perm: "ChartOfAccounts.View" },
      { href: "/dashboard/accounting/journal-entries", labelKey: "nav.journalEntries", icon: "journal", perm: "JournalEntries.View" },
      { href: "/dashboard/accounting/ledger", labelKey: "nav.ledger", icon: "book", perm: "Ledger.View" },
      { href: "/dashboard/accounting/invoices", labelKey: "nav.invoices", icon: "receipt", perm: "Invoices.View" },
      { href: "/dashboard/accounting/vouchers", labelKey: "nav.vouchers", icon: "wallet", perm: "Vouchers.View" },
      { href: "/dashboard/accounting/fixed-assets", labelKey: "nav.fixedAssets", icon: "fixedAsset", perm: "FixedAssets.View" },
      { href: "/dashboard/accounting/reports", labelKey: "nav.reports", icon: "chart", perm: "FinancialReports.View" },
      { href: "/dashboard/business-reports", labelKey: "nav.businessReports", icon: "chart", perm: "Orders.View" },
    ],
  },
];

const superAdminNavKeys: NavGroupKey[] = [
  { items: [{ href: "/dashboard", labelKey: "nav.dashboard", icon: "home" }] },
  {
    titleKey: "nav.platform",
    items: [
      { href: "/dashboard/stores", labelKey: "nav.stores", icon: "store" },
      { href: "/dashboard/packages", labelKey: "nav.packages", icon: "package" },
      { href: "/dashboard/themes", labelKey: "nav.themes", icon: "layers" },
      { href: "/dashboard/users", labelKey: "nav.users", icon: "userGroup" },
    ],
  },
  {
    titleKey: "nav.system",
    items: [
      { href: "/dashboard/reports", labelKey: "nav.reports", icon: "chart" },
      { href: "/dashboard/kpis",    labelKey: "nav.kpis",    icon: "chart" },
      { href: "/dashboard/domains", labelKey: "nav.domains", icon: "settings" },
      { href: "/dashboard/admin-referrals", labelKey: "nav.referrals", icon: "share" },
      { href: "/dashboard/admin-settlements", labelKey: "nav.settlements", icon: "wallet" },
      { href: "/dashboard/settings",labelKey: "nav.settings", icon: "settings" },
    ],
  },
  {
    titleKey: "nav.siteContent",
    items: [
      { href: "/dashboard/site-content", labelKey: "nav.siteContent", icon: "settings" },
      { href: "/dashboard/blog", labelKey: "nav.blog", icon: "edit" },
    ],
  },
];
interface AppNotification {
  id: number;
  titleAr: string;
  titleEn?: string;
  messageAr: string;
  messageEn?: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [userType, setUserType] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [permissions, setPermissions] = useState<string[]>(() => loadPermissions());
  const [quickAddType, setQuickAddType] = useState<QuickAddType>(null);
  const [actionSuccess, setActionSuccess] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const prevUnreadRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setHelpOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const playNotificationSound = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
  };

  const fetchNotifications = () => {
    api
      .get("/notifications")
      .then((res) => {
        const data = res.data.data;
        const newUnread = data.unreadCount || 0;
        if (prevUnreadRef.current !== null && newUnread > prevUnreadRef.current) {
          playNotificationSound();
        }
        prevUnreadRef.current = newUnread;
        setNotifications(data.notifications || []);
        setUnreadCount(newUnread);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    setUserType(getUserType());
    setFullName(localStorage.getItem("fullName") || "");
    setEmail(localStorage.getItem("email") || "");
    setProfileImage(
      localStorage.getItem("profileImage_" + (localStorage.getItem("userId") || "")) ||
        localStorage.getItem("profileImage") ||
        ""
    );
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    api.get("/auth/profile").then((res) => {
      const d = res.data.data;
      if (d.profileImage) {
        const uid = localStorage.getItem("userId") || "";
        localStorage.setItem("profileImage_" + uid, d.profileImage);
        setProfileImage(d.profileImage);
      }
      if (Array.isArray(d.permissions)) {
        savePermissions(d.permissions);
        setPermissions(d.permissions);
      }
    }).catch(() => {});
  }, [ready]);

  useEffect(() => {
const handler = () => {
      setFullName(localStorage.getItem("fullName") || "");
      setEmail(localStorage.getItem("email") || "");
      setProfileImage(localStorage.getItem("profileImage_" + (localStorage.getItem("userId") || "")) || localStorage.getItem("profileImage") || "");
    };
    window.addEventListener("profileUpdated", handler);
    return () => window.removeEventListener("profileUpdated", handler);
  }, []);

  useEffect(() => {
    if (!ready) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [ready]);

  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileSidebarOpen]);

  const isSuperAdmin = userType === "SuperAdmin";
  const isEmployee = userType === "Employee";
  const hasPerm = (code: string | undefined) => {
    if (!code) return true;
    if (isSuperAdmin) return true;
    if (!isEmployee && !isSuperAdmin) return true;
    return permissions.includes(code);
  };
  const permByHref = new Map<string, string>();
  [...ownerNavKeys, ...employeeNavKeys].forEach((g) =>
    g.items.forEach((it) => it.perm && permByHref.set(it.href, it.perm))
  );
  const routePerm = pathname ? [...permByHref.entries()]
    .filter(([href]) => href !== "/dashboard" && pathname.startsWith(href))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] : undefined;
  const routeDenied = isEmployee && routePerm ? !permissions.includes(routePerm) : false;

  useEffect(() => {
    if (!ready || !routeDenied) return;
    router.replace("/dashboard");
  }, [ready, routeDenied, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-[var(--sub)]">
          <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
          {t("common.loading")}
        </div>
      </div>
    );
  }

  const resolveGroups = (navKeys: NavGroupKey[]): NavGroup[] =>
    navKeys
      .map((g) => ({
        title: g.titleKey ? t(g.titleKey) : undefined,
        items: g.items
          .filter((item) => hasPerm(item.perm))
          .map((item) => ({ href: item.href, label: t(item.labelKey), icon: item.icon, quickAdd: item.quickAdd })),
      }))
      .filter((g) => g.items.length > 0);
  const groups = resolveGroups(isSuperAdmin ? superAdminNavKeys : isEmployee ? employeeNavKeys : ownerNavKeys);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(href);

  const searchLower = searchQuery.trim().toLowerCase();
  const isSearching = searchLower.length > 0;
  const filteredGroups = isSearching
    ? groups
        .map(g => ({ ...g, items: g.items.filter(item => item.label.toLowerCase().includes(searchLower)) }))
        .filter(g => (g.title?.toLowerCase().includes(searchLower) ?? false) || g.items.length > 0)
    : groups;

  const handleNotifClick = async (n: AppNotification) => {
    if (!n.isRead) {
      try {
        await api.put(`/notifications/${n.id}/read`);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
        );
        setUnreadCount((c) => {
          const next = Math.max(0, c - 1);
          prevUnreadRef.current = next;
          return next;
        });
      } catch {}
    }
    setNotifOpen(false);
    if (n.link) router.push(n.link);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
      prevUnreadRef.current = 0;
    } catch {}
  };

  const toggleNotifOpen = () => {
    setNotifOpen((o) => {
      const next = !o;
      if (next && unreadCount > 0) {
        handleMarkAllRead();
      }
      return next;
    });
  };

  const renderSidebarContent = () => (
    <>
      <div
        className="h-[4px] shrink-0"
        style={{
          background:
            "linear-gradient(90deg, var(--blue) 0%, var(--blue) 33.33%, var(--gold) 33.33%, var(--gold) 66.66%, var(--green) 66.66%, var(--green) 100%)",
        }}
      />

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-12 shrink-0 border-b border-[#1a3a4f]">
        <div className="brand-logo-frame" style={{ width: 38, height: 38 }}>
          <img src="/logo.png" alt={t("brand.name")} className="brand-logo" />
        </div>
        <div className="leading-tight">
          <p className="text-[12px] font-bold text-[#F5F5F5] tracking-tight">{t("brand.name")}</p>
          <p className="text-[9px] text-[#9ca3af] mt-0.5">
            {isSuperAdmin ? t("nav.dashboard") : isEmployee ? t("nav.dashboard") : t("nav.store")}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative px-3 pt-3 pb-1 shrink-0">
        <svg
          className="absolute right-5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none"
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t("common.search")}
          className="w-full bg-[#1a3a4f] text-[#F5F5F5] text-[12px] rounded-lg py-1.5 pr-8 pl-2 outline-none placeholder:text-[#6b8a9e] border border-[#1a3a4f] focus:border-[#C9A227]/50 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#F5F5F5] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {isSearching && filteredGroups.length === 0 && (
          <div className="text-center py-8 px-4">
            <p className="text-[#9ca3af] text-[13px]">{t("common.noResults")}</p>
          </div>
        )}
        {(isSearching ? filteredGroups : groups).map((group, gi) => {
          const hasTitle = !!group.title;

          return (
            <div key={gi} className={hasTitle ? "mb-1" : ""}>
              {hasTitle && (
                <div className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-[#C9A227] uppercase tracking-wider font-bold">
                  <span className="flex-1 text-right">{group.title}</span>
                </div>
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <div key={item.href} className="flex items-center gap-1">
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-all duration-150 border-r-3 border-r-transparent flex-1 ${
                          active
                            ? "font-bold text-[#C9A227] border-r-[#C9A227]"
                            : "text-[#FFFFFF] hover:bg-[#1EC8C8]/[0.15]"
                        }`}
                        style={
                          active
                            ? { backgroundColor: "rgba(138, 123, 31, 0.2)", borderRightWidth: "3px" }
                            : {}
                        }
                      >
                        <Icon
                          name={item.icon}
                          size={18}
                          variant="outline"
                          className={active ? "text-[#C9A227]" : "text-[#FFFFFF]/90"}
                        />
                        <span>{item.label}</span>
                      </Link>
                      {item.quickAdd && (
                        <button
                          onClick={() => setQuickAddType(item.quickAdd!)}
                          title={t("common.add")}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[#C9A227] hover:bg-[#C9A227]/20 transition-colors shrink-0"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Help section pinned at bottom */}
      <div className="relative shrink-0 border-t border-[#1a3a4f]" ref={helpRef}>
        <button
          onClick={() => setHelpOpen(!helpOpen)}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-[#FFFFFF] hover:bg-[#1EC8C8]/[0.15] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#FFFFFF]/70">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
          <span className="flex-1 text-right">{t("nav.help")}</span>
          <svg className={`transition-transform duration-200 ${helpOpen ? "rotate-90" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {helpOpen && (
          <div className="border-t border-[#1a3a4f] bg-[#0a2535] py-1">
            <a
              href="/faq"
              className="flex items-center gap-3 px-3 py-2 text-[13px] text-[#FFFFFF] hover:bg-[#1EC8C8]/[0.15] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#9ca3af]">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
              <span>{t("page.faq")}</span>
            </a>
            <a
              href="/contact"
              className="flex items-center gap-3 px-3 py-2 text-[13px] text-[#FFFFFF] hover:bg-[#1EC8C8]/[0.15] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#9ca3af]">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{t("nav.contact")}</span>
            </a>
            <a
              href="/help-center"
              className="flex items-center gap-3 px-3 py-2 text-[13px] text-[#FFFFFF] hover:bg-[#1EC8C8]/[0.15] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#9ca3af]">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>{t("page.helpCenter")}</span>
            </a>
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="shrink-0 border-t border-[#1a3a4f]">
        <button
          onClick={() => {
            logout();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-[#EF4444] hover:bg-[#EF4444]/[0.15] transition-colors"
        >
          <Icon name="logOut" size={18} className="shrink-0 text-[#EF4444]/80" />
          <span className="flex-1 text-right">{t("dashboard.logout")}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: "var(--bg)" }} dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      <div className="brand-strip" />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex shrink-0 bg-[#0D2B3E] flex-col w-[260px] border-r border-[#1a3a4f]">
        {renderSidebarContent()}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="absolute top-0 right-0 bottom-0 w-[280px] bg-[#0D2B3E] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-[#1a3a4f]">
              <div className="flex items-center gap-2.5">
                <div className="brand-logo-frame" style={{ width: 44, height: 44 }}>
                  <img src="/logo.png" alt={t("brand.name")} className="brand-logo" />
                </div>
                <div className="leading-tight">
                  <p className="text-[13px] font-bold text-[#F5F5F5] tracking-tight">{t("brand.name")}</p>
                  <p className="text-[9px] text-[#9ca3af] mt-0.5">
                    {isSuperAdmin ? t("nav.dashboard") : isEmployee ? t("nav.dashboard") : t("nav.store")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9ca3af] hover:text-[#F5F5F5] hover:bg-white/10 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="sidebar-scroll flex-1 overflow-y-auto py-2 px-2 space-y-1">
              {searchQuery.trim().length > 0 && filteredGroups.length === 0 && (
                <div className="text-center py-8 px-4">
                  <p className="text-[#9ca3af] text-[13px]">{t("common.noResults")}</p>
                </div>
              )}
              {(searchQuery.trim().length > 0 ? filteredGroups : groups).map((group, gi) => {
                const hasTitle = !!group.title;
                return (
                  <div key={gi} className={hasTitle ? "mb-1" : ""}>
                    {hasTitle && (
                      <div className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-[#C9A227] uppercase tracking-wider font-bold">
                        <span className="flex-1 text-right">{group.title}</span>
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileSidebarOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-all duration-150 border-r-3 border-r-transparent ${
                              active
                                ? "font-bold text-[#C9A227] border-r-[#C9A227]"
                                : "text-[#FFFFFF] hover:bg-[#1EC8C8]/[0.15]"
                            }`}
                            style={
                              active
                                ? { backgroundColor: "rgba(138, 123, 31, 0.2)", borderRightWidth: "3px" }
                                : {}
                            }
                          >
                            <Icon
                              name={item.icon}
                              size={18}
                              variant="outline"
                              className={active ? "text-[#C9A227]" : "text-[#FFFFFF]/90"}
                            />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="shrink-0 border-t border-[#1a3a4f]">
              <div className="flex flex-col">
                <a href="/faq" onClick={() => setMobileSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[13px] text-[#FFFFFF] hover:bg-[#1EC8C8]/[0.15] transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#9ca3af]">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <path d="M12 17h.01" />
                  </svg>
                  <span>{t("page.faq")}</span>
                </a>
                <a href="/contact" onClick={() => setMobileSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[13px] text-[#FFFFFF] hover:bg-[#1EC8C8]/[0.15] transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#9ca3af]">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>{t("nav.contact")}</span>
                </a>
                <a href="/help-center" onClick={() => setMobileSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[13px] text-[#FFFFFF] hover:bg-[#1EC8C8]/[0.15] transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#9ca3af]">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>{t("page.helpCenter")}</span>
                </a>
              </div>
            </div>
            <div className="shrink-0 border-t border-[#1a3a4f]">
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-[#EF4444] hover:bg-[#EF4444]/[0.15] transition-colors"
              >
                <Icon name="logOut" size={18} className="shrink-0 text-[#EF4444]/80" />
                <span className="flex-1 text-right">{t("dashboard.logout")}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-y-auto">
          {actionSuccess && (
            <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-green-800 bg-green-100 border-b border-green-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="flex-1">{actionSuccess}</span>
              <button onClick={() => setActionSuccess("")} className="text-green-600 hover:text-green-900">✕</button>
            </div>
          )}
        <div
          className="sticky top-0 z-30 h-[60px] shrink-0 border-b border-[var(--border)] flex items-center justify-between px-4 gap-3"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <div className="flex items-center gap-2 flex-1">
            {/* Mobile hamburger */}
            <button
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[var(--sub)] hover:bg-gray-100 hover:text-[var(--ink)] transition-colors shrink-0"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label={t("common.open")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
              </svg>
            </button>
            <div className="hidden md:block flex-1 max-w-xl">
              <GlobalSearch />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <LangSwitch />
            {!isSuperAdmin && (
              <Link
                href="/dashboard/subscription"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-bold text-white"
                style={{ backgroundColor: "var(--gold)" }}
              >
                <Icon name="crown" size={14} />
                {t("dashboard.upgradeBtn")}
              </Link>
            )}

            <div className="relative">
              <button
                onClick={toggleNotifOpen}
                title={t("dashboard.notifications")}
                className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[var(--sub)] hover:bg-gray-100 hover:text-[var(--ink)] transition-colors"
              >
                <Icon name="bell" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -left-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9.5px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                    <p className="text-[13px] font-bold text-[var(--ink)]">{t("dashboard.notifications")}</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11.5px] text-[var(--blue)] hover:underline"
                      >
                        {t("dashboard.markAllRead")}
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-[12.5px] text-[var(--sub)] py-8">
                        {t("dashboard.noNotifications")}
                      </p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`w-full text-right px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                            !n.isRead ? "bg-[var(--blue)]/[0.04]" : ""
                          }`}
                        >
                          <p className="text-[12.5px] font-bold text-[var(--ink)] flex items-center gap-1.5">
                            {!n.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--blue)] shrink-0" />
                            )}
                            {i18n.language === "en" && n.titleEn ? n.titleEn : n.titleAr}
                          </p>
                          <p className="text-[11.5px] text-[var(--sub)] mt-0.5 line-clamp-2">
                            {i18n.language === "en" && n.messageEn ? n.messageEn : n.messageAr}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full overflow-hidden shrink-0"
                >
                  {profileImage ? (
                    <img src={profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-[13px] font-bold text-white"
                      style={{ backgroundColor: "var(--blue)" }}
                    >
                      {fullName ? fullName.trim().charAt(0) : "؟"}
                    </div>
                  )}
                </div>
                <span className="text-[13px] text-[var(--ink)] font-medium max-w-[100px] truncate">
                  {fullName || t("common.profile")}
                </span>
              </button>

              {userMenuOpen && (
                <div className="absolute left-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-[13px] font-bold text-[var(--ink)] truncate">{fullName}</p>
                    <p className="text-[11.5px] text-[var(--sub)] truncate mt-0.5">{email || ""}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[var(--ink)] hover:bg-gray-50 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      {t("dashboard.mySettings")}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 p-3 md:p-8 overflow-auto">{children}</main>
      </div>

      <QuickAddManager
        type={quickAddType}
        onClose={() => setQuickAddType(null)}
        onSuccess={(msg) => {
          setActionSuccess(msg);
          setTimeout(() => setActionSuccess(""), 4000);
        }}
      />

      <UpgradeModal />
    </div>
  );
}
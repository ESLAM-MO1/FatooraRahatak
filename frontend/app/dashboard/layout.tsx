"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, getUserType, logout } from "@/lib/auth";
import GlobalSearch from "@/components/GlobalSearch";
import Icon, { ICONS } from "@/components/Icon";

import api from "@/lib/api";
import { useTranslation } from "react-i18next";
import LangSwitch from "@/components/LangSwitch";
import "@/lib/i18n/config";
type NavItem = { href: string; label: string; icon: keyof typeof ICONS };
type NavGroup = { title?: string; items: NavItem[] };

type NavItemKey = { href: string; labelKey: string; icon: keyof typeof ICONS };
type NavGroupKey = { titleKey?: string; items: NavItemKey[] };

const ownerNavKeys: NavGroupKey[] = [
  { items: [{ href: "/dashboard", labelKey: "nav.dashboard", icon: "home" as const }] },
  {
    titleKey: "nav.store",
    items: [
      { href: "/dashboard/products", labelKey: "nav.products", icon: "box" },
      { href: "/dashboard/categories", labelKey: "nav.categories", icon: "tag" },
      { href: "/dashboard/store-settings", labelKey: "nav.storeSettings", icon: "settings" },
    ],
  },
  {
    titleKey: "nav.sales",
    items: [
      { href: "/dashboard/pos", labelKey: "nav.pos", icon: "cashier" },
      { href: "/dashboard/orders", labelKey: "nav.orders", icon: "receipt" },
      { href: "/dashboard/customers", labelKey: "nav.customers", icon: "userGroup" },
      { href: "/dashboard/statistics", labelKey: "nav.statistics", icon: "chart" },
    ],
  },
  {
    titleKey: "nav.inventory",
    items: [
      { href: "/dashboard/warehouses", labelKey: "nav.warehouses", icon: "warehouse" },
      { href: "/dashboard/inventory", labelKey: "nav.inventory", icon: "layers" },
      { href: "/dashboard/stock-counts", labelKey: "nav.stockCounts", icon: "clipboard" },
    ],
  },
  {
    titleKey: "nav.accounting",
    items: [
      { href: "/dashboard/accounting/accounts", labelKey: "nav.accounts", icon: "ledger" },
      { href: "/dashboard/accounting/journal-entries", labelKey: "nav.journalEntries", icon: "journal" },
      { href: "/dashboard/accounting/ledger", labelKey: "nav.ledger", icon: "book" },
      { href: "/dashboard/accounting/invoices", labelKey: "nav.invoices", icon: "receipt" },
      { href: "/dashboard/accounting/vouchers", labelKey: "nav.vouchers", icon: "wallet" },
      { href: "/dashboard/accounting/fixed-assets", labelKey: "nav.fixedAssets", icon: "fixedAsset" },
      { href: "/dashboard/accounting/reports", labelKey: "nav.reports", icon: "chart" },
    ],
  },
  {
    titleKey: "nav.hr",
    items: [
      { href: "/dashboard/employees", labelKey: "nav.employees", icon: "users" },
      { href: "/dashboard/attendance", labelKey: "nav.attendance", icon: "clock" },
      { href: "/dashboard/leave-requests", labelKey: "nav.leaveRequests", icon: "calendarOff" },
      { href: "/dashboard/payroll", labelKey: "nav.payroll", icon: "wallet" },
    ],
  },
  {
    titleKey: "nav.account",
    items: [{ href: "/dashboard/subscription", labelKey: "nav.subscription", icon: "crown" }],
  },
];

const employeeNavKeys: NavGroupKey[] = [
  { items: [{ href: "/dashboard", labelKey: "nav.dashboard", icon: "home" }] },
  {
    titleKey: "nav.sales",
    items: [
      { href: "/dashboard/pos", labelKey: "nav.pos", icon: "cashier" },
      { href: "/dashboard/orders", labelKey: "nav.orders", icon: "receipt" },
      { href: "/dashboard/customers", labelKey: "nav.customers", icon: "userGroup" },
      { href: "/dashboard/statistics", labelKey: "nav.statistics", icon: "chart" },
    ],
  },
  {
    titleKey: "nav.accounting",
    items: [
      { href: "/dashboard/accounting/accounts", labelKey: "nav.accounts", icon: "ledger" },
      { href: "/dashboard/accounting/journal-entries", labelKey: "nav.journalEntries", icon: "journal" },
      { href: "/dashboard/accounting/ledger", labelKey: "nav.ledger", icon: "book" },
      { href: "/dashboard/accounting/invoices", labelKey: "nav.invoices", icon: "receipt" },
      { href: "/dashboard/accounting/vouchers", labelKey: "nav.vouchers", icon: "wallet" },
      { href: "/dashboard/accounting/fixed-assets", labelKey: "nav.fixedAssets", icon: "fixedAsset" },
      { href: "/dashboard/accounting/reports", labelKey: "nav.reports", icon: "chart" },
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
      { href: "/dashboard/users", labelKey: "nav.users", icon: "userGroup" },
    ],
  },
  {
    titleKey: "nav.system",
    items: [
      { href: "/dashboard/reports", labelKey: "nav.reports", icon: "chart" },
      { href: "/dashboard/settings", labelKey: "nav.settings", icon: "settings" },
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
  messageAr: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [userType, setUserType] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
  const prevUnreadRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
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
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [ready]);

  useEffect(() => {
    if (ready && groups.length > 0) {
      setOpenGroups({ 0: true });
    }
  }, [ready, userType]);

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

  const isSuperAdmin = userType === "SuperAdmin";
  const isEmployee = userType === "Employee";
  const resolveGroups = (navKeys: NavGroupKey[]): NavGroup[] =>
    navKeys.map((g) => ({
      title: g.titleKey ? t(g.titleKey) : undefined,
      items: g.items.map((item) => ({ href: item.href, label: t(item.labelKey), icon: item.icon })),
    }));
  const groups = resolveGroups(isSuperAdmin ? superAdminNavKeys : isEmployee ? employeeNavKeys : ownerNavKeys);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(href);

  const toggleGroup = (index: number) => {
    setOpenGroups((prev) => ({ ...prev, [index]: !prev[index] }));
  };

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

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }} dir="rtl">
      <div className="brand-strip" />

      <aside
        className={`shrink-0 bg-white flex flex-col transition-all duration-200 border-l border-[var(--border)] ${
          collapsed ? "w-16" : "w-[260px]"
        }`}
      >
        <div
          className="h-[4px] shrink-0"
          style={{
            background:
              "linear-gradient(90deg, var(--blue) 0%, var(--blue) 33.33%, var(--gold) 33.33%, var(--gold) 66.66%, var(--green) 66.66%, var(--green) 100%)",
          }}
        />

        <div className={`flex items-center gap-2.5 px-4 h-14 shrink-0 border-b border-[var(--border)] ${collapsed ? "justify-center px-0" : ""}`}>
          <div className="brand-logo-frame" style={{ width: 34, height: 34 }}>
            <img src="/logo.png" alt={t("brand.name")} className="brand-logo" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-[var(--ink)] tracking-tight">{t("brand.name")}</p>
              <p className="text-[9px] text-[var(--sub)] mt-0.5">
                {isSuperAdmin ? t("nav.dashboard") : isEmployee ? t("nav.dashboard") : t("nav.store")}
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {groups.map((group, gi) => {
            const hasTitle = !!group.title;
            const isOpen = openGroups[gi];

            return (
              <div key={gi} className={hasTitle ? "mb-1" : ""}>
                {hasTitle && (
                  <button
                    onClick={() => toggleGroup(gi)}
                    className={`w-full flex items-center gap-1 px-3 py-1.5 text-[11px] text-[var(--sub)] uppercase tracking-wider font-bold hover:text-[var(--ink)] transition-colors ${
                      collapsed ? "justify-center" : ""
                    }`}
                  >
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-right">{group.title}</span>
                        <svg
                          className={`transition-transform duration-200 ${
                            isOpen ? "rotate-90" : ""
                          }`}
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </>
                    )}
                  </button>
                )}

                {(isOpen || !hasTitle) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={collapsed ? item.label : undefined}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-all duration-150 border-r-3 border-r-transparent ${
                            collapsed ? "justify-center px-0 mx-1" : ""
                          } ${
                            active
                              ? "font-bold text-[var(--blue)] border-r-[var(--blue)]"
                              : "text-[var(--ink)] hover:bg-gray-50"
                          }`}
                          style={
                            active
                              ? { backgroundColor: "var(--blue-50)", borderRightWidth: "3px" }
                              : {}
                          }
                        >
                          <Icon
                            name={item.icon}
                            size={18}
                            className={active ? "text-[var(--blue)]" : "text-[var(--sub-light)]"}
                          />
                          {!collapsed && <span>{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          className="h-[60px] shrink-0 border-b border-[var(--border)] flex items-center justify-between px-4 gap-3"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? t("common.open") : t("common.close")}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--sub)] hover:bg-gray-100 hover:text-[var(--ink)] transition-colors shrink-0"
            >
              <Icon name="sidebarToggle" />
            </button>
            <div className="hidden md:block flex-1 max-w-2xl">
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
                onClick={() => setNotifOpen((o) => !o)}
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
                            {n.titleAr}
                          </p>
                          <p className="text-[11.5px] text-[var(--sub)] mt-0.5 line-clamp-2">
                            {n.messageAr}
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
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                  style={{ backgroundColor: "var(--blue)" }}
                >
                  {fullName ? fullName.trim().charAt(0) : "؟"}
                </div>
                {!collapsed && (
                  <span className="text-[13px] text-[var(--ink)] font-medium max-w-[100px] truncate">
                    {fullName || t("common.profile")}
                  </span>
                )}
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
                    <Link
                      href="/help-center"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[var(--ink)] hover:bg-gray-50 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <path d="M12 17h.01" />
                      </svg>
                      {t("dashboard.help")}
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Icon name="logOut" size={16} />
                      {t("dashboard.logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { getUserType } from "@/lib/auth";
import Icon from "@/components/Icon";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

function getGreeting(t: (key: string) => string) {
  const hour = new Date().getHours();
  if (hour < 5) return t("dashboard.greetingNight");
  if (hour < 12) return t("dashboard.greetingMorning");
  if (hour < 17) return t("dashboard.greetingAfternoon");
  return t("dashboard.greetingEvening");
}

function SealBadge({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="seal-badge w-[126px] h-[126px] shrink-0 rotate-[-4deg]">
      <div className="seal-inner">
        <p className="text-[8.5px] font-bold tracking-[0.08em] text-[var(--gold)]">{eyebrow}</p>
        <p className="text-[13px] font-bold mt-1.5 leading-tight text-[var(--blue-deep)]">{title}</p>
        {sub && <p className="text-[8.5px] mt-1.5 text-[var(--gold)]">{sub}</p>}
      </div>
    </div>
  );
}

function UsageBar({ current, max }: { current: number; max: number | null }) {
  const { t } = useTranslation();
  if (max === null) {
    return (
      <span className="badge-unlimited mt-3">
        <span className="dot" />
        {t("dashboard.unlimited")}
      </span>
    );
  }
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 100;
  const danger = pct >= 100;
  const warn = pct >= 80 && pct < 100;
  const barColor = danger ? "#9B2C2C" : warn ? "var(--gold)" : "var(--blue)";

  return (
    <div className="mt-4">
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <p className="text-[11px] text-[var(--sub)] mt-2" style={{ direction: "ltr", textAlign: "right" }}>
        {current} / {max} · {pct}%
      </p>
    </div>
  );
}

function StatCard({ label, current, max, icon }: { label: string; current: number; max: number | null; icon: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div className="w-11 h-11 rounded-xl bg-[var(--gold-soft)] text-[var(--gold)] flex items-center justify-center">
          <Icon name={icon as any} size={20} />
        </div>
        <span className="text-[28px] font-bold text-[var(--blue-deep)]">{current}</span>
      </div>
      <p className="text-[14px] text-[var(--sub)] mt-3">{label}</p>
      <UsageBar current={current} max={max} />
    </div>
  );
}

function QuickLink({ href, label, desc, icon }: { href: string; label: string; desc: string; icon: string }) {
  return (
    <Link href={href} className="stat-card flex items-center gap-4 group">
      <div className="w-12 h-12 rounded-xl bg-[var(--blue-deep)] text-[var(--blue-bright)] flex items-center justify-center shrink-0">
        <Icon name={icon as any} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-[var(--blue-deep)]">{label}</p>
        <p className="text-[12px] text-[var(--sub)] mt-0.5">{desc}</p>
      </div>
      <Icon name="arrowLeft" className="text-[#D5D9DE] group-hover:text-[var(--gold)] group-hover:-translate-x-1 transition-all shrink-0 rotate-180" />
    </Link>
  );
}

export default function DashboardHome() {
  const { t } = useTranslation();
  const [userType, setUserType] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const type = getUserType();
    setUserType(type);

    if (type !== "SuperAdmin") {
      api
        .get("/subscriptions/status")
        .then((res) => setSubscriptionStatus(res.data.data))
        .catch((err) => setError(err.response?.data?.message || t("common.error")))
        .finally(() => setLoading(false));

      api
        .get("/owner/dashboard/stats", { params: { period: "monthly" } })
        .then((res) => setStats(res.data.data))
        .catch(() => {})
        .finally(() => setStatsLoading(false));
    } else {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [t]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="w-7 h-7 rounded-full border-[3px] border-[var(--blue)] border-t-transparent animate-spin" />
          <p className="text-[14px] text-[var(--sub)]">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  const greeting = getGreeting(t);

  return (
    <div>
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--blue-deep)] p-8 md:p-10 mb-8">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 14% 25%, rgba(138,122,30,0.25), transparent 45%)",
          }}
        />

        <div className="relative flex items-center justify-between gap-8">
          <div className="min-w-0">
            <p className="text-[var(--gold)] text-[13px] font-bold mb-2" style={{ color: "#D9C878" }}>
              {greeting}
            </p>
            <h1 className="text-[24px] md:text-[29px] font-bold text-white leading-tight">
              {userType === "SuperAdmin" ? t("dashboard.adminWelcome") : userType === "Employee" ? t("dashboard.employeeWelcome") : t("dashboard.ownerWelcome")}
            </h1>
            <p className="text-[13.5px] text-[#BFE6F3] mt-3 max-w-md">
              {userType === "SuperAdmin"
                ? t("dashboard.adminDesc")
                : userType === "Employee"
                ? t("dashboard.employeeDesc")
                : t("dashboard.ownerDesc")}
            </p>
          </div>
          <div className="hidden sm:block">
            <SealBadge eyebrow={t("dashboard.sealEyebrow")} title="FATURAT RAHATIK" />
          </div>
        </div>
      </div>

      {userType === "SuperAdmin" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <QuickLink href="/dashboard/stores" label={t("dashboard.manageStores")} desc={t("dashboard.manageStoresDesc")} icon="store" />
          <QuickLink href="/dashboard/packages" label={t("dashboard.managePackages")} desc={t("dashboard.managePackagesDesc")} icon="package" />
          <QuickLink href="/dashboard/users" label={t("dashboard.manageUsers")} desc={t("dashboard.manageUsersDesc")} icon="userGroup" />
        </div>
      ) : (
        <>
          {error && (
            <div className="alert alert--warning mb-6">
              <Icon name="alert" size={16} className="shrink-0 mt-0.5 text-[var(--gold)]" />
              <span>
                {error}
                {error.toLowerCase().includes("no store") && (
                  <Link href="/dashboard/create-store" className="btn-primary inline-flex mr-3 px-4 py-2 text-sm">
                    {t("dashboard.createStore")}
                  </Link>
                )}
              </span>
            </div>
          )}

          {subscriptionStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="stat-card flex flex-col items-center justify-center text-center">
                <SealBadge eyebrow={t("dashboard.currentPackage")} title={subscriptionStatus.currentPackage} sub={t("dashboard.active")} />
              </div>

              <StatCard
                label={t("dashboard.products")}
                current={subscriptionStatus.currentProductsCount}
                max={subscriptionStatus.maxProducts}
                icon="box"
              />

              <StatCard
                label={t("dashboard.employees")}
                current={subscriptionStatus.currentEmployeesCount}
                max={subscriptionStatus.maxEmployees}
                icon="users"
              />
            </div>
          )}

          {stats && !statsLoading && (
            <div className="stat-card p-5 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] font-bold text-[var(--ink)]">{t("dashboard.salesSummary")}</h2>
                <Link href="/dashboard/statistics" className="text-[12.5px] font-bold text-[var(--blue)] hover:underline">{t("dashboard.viewDetails")}</Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-[11px] text-[var(--sub)]">{t("dashboard.totalSales")}</p>
                  <p className="text-[18px] font-bold text-[var(--blue-deep)]">{stats.totalSales.toLocaleString("ar-SA")} {t("common.currency")}</p>
                </div>
                {stats.ordersCountByStatus?.map((s: any) => (
                  <div key={s.status}>
                    <p className="text-[11px] text-[var(--sub)]">{s.status === "New" ? t("order.statusNew") : s.status === "Processing" ? t("order.statusProcessing") : s.status === "Shipped" ? t("order.statusShipped") : s.status === "Delivered" ? t("order.statusDelivered") : s.status === "Returned" ? t("order.statusReturned") : s.status}</p>
                    <p className="text-[18px] font-bold text-[var(--ink)]">{s.count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

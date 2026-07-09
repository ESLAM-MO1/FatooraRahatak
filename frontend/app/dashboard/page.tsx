"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { getUserType } from "@/lib/auth";

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="20" height="20">
      <path d={path} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const boxPath = "M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9ZM12 21v-9M3.5 7.5 12 12l8.5-4.5";
const usersPath =
  "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a5 5 0 0 1 10 0M17 11a3 3 0 1 0 0-6M15 14a5 5 0 0 1 6 6H17";
const storePath = "M4 9h16l-1-5H5L4 9Zm0 0v10h16V9M9 21v-6h6v6";
const packagePath = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9V7m0 4-3.5-2M12 12l3.5-2";
const userGroupPath =
  "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 9a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M15 14a5 5 0 0 1 6 6H17";
const alertPath = "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";
const arrowPath = "M15 5 8 12l7 7";

const GREETINGS = [
  { h: 5, text: "تصبح على خير" },
  { h: 12, text: "صباح الخير" },
  { h: 17, text: "نهارك سعيد" },
  { h: 24, text: "مساء الخير" },
];
function getGreeting() {
  const hour = new Date().getHours();
  return (GREETINGS.find((g) => hour < g.h) || GREETINGS[GREETINGS.length - 1]).text;
}

function SealBadge({
  eyebrow,
  title,
  sub,
  tone = "light",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  tone?: "light" | "dark";
}) {
  const titleColor = tone === "dark" ? "text-[var(--blue-deep)]" : "text-[var(--blue-deep)]";
  const accentColor = "text-[var(--gold)]";

  return (
    <div className="seal-badge w-[126px] h-[126px] shrink-0 rotate-[-4deg]">
      <div className="seal-inner">
        <p className={`text-[8.5px] font-bold tracking-[0.08em] ${accentColor}`}>{eyebrow}</p>
        <p className={`text-[13px] font-bold mt-1.5 leading-tight ${titleColor}`}>{title}</p>
        {sub && <p className={`text-[8.5px] mt-1.5 ${accentColor}`}>{sub}</p>}
      </div>
    </div>
  );
}

function UsageBar({ current, max }: { current: number; max: number | null }) {
  if (max === null) {
    return (
      <span className="badge-unlimited mt-3">
        <span className="dot" />
        غير محدود
      </span>
    );
  }
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 100;
  const danger = pct >= 100;
  const warn = pct >= 80 && pct < 100;
  const barColor = danger ? "#9B2C2C" : warn ? "var(--gold)" : "var(--blue)";

  return (
    <div className="mt-4">
      <div className="relative h-2 w-full rounded-full overflow-hidden bg-[#ECEEF1]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0 1px, transparent 1px 10px)",
          }}
        />
      </div>
      <p className="text-[11px] text-[var(--sub)] mt-2" style={{ direction: "ltr", textAlign: "right" }}>
        {current} / {max} · {pct}%
      </p>
    </div>
  );
}

function StatCard({
  label,
  current,
  max,
  icon,
}: {
  label: string;
  current: number;
  max: number | null;
  icon: string;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-lg bg-[var(--gold-soft)] text-[var(--gold)] flex items-center justify-center">
          <Icon path={icon} />
        </div>
        <span className="text-[28px] font-bold text-[var(--blue-deep)]">{current}</span>
      </div>
      <p className="text-[13.5px] text-[var(--sub)] mt-3">{label}</p>
      <UsageBar current={current} max={max} />
    </div>
  );
}

function QuickLink({ href, label, desc, icon }: { href: string; label: string; desc: string; icon: string }) {
  return (
    <Link href={href} className="card p-6 flex items-center gap-4 group">
      <div className="w-11 h-11 rounded-lg bg-[var(--blue-deep)] text-[var(--blue-bright)] flex items-center justify-center shrink-0">
        <Icon path={icon} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-[var(--blue-deep)]">{label}</p>
        <p className="text-[12px] text-[var(--sub)] mt-0.5">{desc}</p>
      </div>
      <Icon
        path={arrowPath}
        className="text-[#D5D9DE] group-hover:text-[var(--gold)] group-hover:-translate-x-1 transition-all shrink-0 rotate-180"
      />
    </Link>
  );
}

export default function DashboardHome() {
  const [userType, setUserType] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const type = getUserType();
    setUserType(type);

    if (type !== "SuperAdmin") {
      api
        .get("/subscriptions/status")
        .then((res) => setSubscriptionStatus(res.data.data))
        .catch((err) => setError(err.response?.data?.message || "حدث خطأ"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--sub)]">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
        جارٍ التحميل...
      </div>
    );
  }

  const greeting = getGreeting();

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-[var(--blue-deep)] p-8 md:p-10 mb-8">
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
              {userType === "SuperAdmin" ? "مرحبًا بك في لوحة الإدارة" : "مرحبًا بك في لوحة تحكم متجرك"}
            </h1>
            <p className="text-[13.5px] text-[#BFE6F3] mt-3 max-w-md">
              {userType === "SuperAdmin"
                ? "يمكنك استخدام الروابط أدناه للوصول السريع إلى أهم أقسام المنصة"
                : "نظرة سريعة على أداء متجرك والمساحة المتاحة ضمن باقتك الحالية"}
            </p>
          </div>
          <div className="hidden sm:block">
            <SealBadge eyebrow="فاتورة راحتك" title="FATURAT RAHATIK" tone="dark" />
          </div>
        </div>
      </div>

      {userType === "SuperAdmin" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <QuickLink href="/dashboard/stores" label="إدارة المتاجر" desc="عرض المتاجر وتعليقها وتفعيلها" icon={storePath} />
          <QuickLink href="/dashboard/packages" label="إدارة الباقات" desc="تعديل حدود الباقات ومزاياها" icon={packagePath} />
          <QuickLink href="/dashboard/users" label="إدارة المستخدمين" desc="تفعيل الحسابات وتعطيلها" icon={userGroupPath} />
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-[var(--gold-soft)] border border-[#E3D9AD] text-[var(--gold-deep)] rounded-2xl p-5 mb-6 flex items-start gap-3 text-sm">
              <Icon path={alertPath} className="shrink-0 mt-0.5 text-[var(--gold)]" />
              <div>
                <p>{error}</p>
                {error.includes("لا يوجد متجر") && (
                  <Link href="/dashboard/create-store" className="btn-primary inline-flex mt-3 px-4 py-2 text-sm">
                    أنشئ متجرك الآن
                  </Link>
                )}
              </div>
            </div>
          )}

          {subscriptionStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="card p-6 flex flex-col items-center justify-center text-center">
                <SealBadge eyebrow="الباقة الحالية" title={subscriptionStatus.currentPackage} sub="سارية" tone="light" />
              </div>

              <StatCard
                label="المنتجات"
                current={subscriptionStatus.currentProductsCount}
                max={subscriptionStatus.maxProducts}
                icon={boxPath}
              />

              <StatCard
                label="الموظفون"
                current={subscriptionStatus.currentEmployeesCount}
                max={subscriptionStatus.maxEmployees}
                icon={usersPath}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { isAuthenticated, getUserType } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import Toast from "@/components/Toast";
import Icon, { ICONS } from "@/components/Icon";
import { useConfirm } from "@/components/ConfirmDialog";
import "@/lib/i18n/config";

interface DashboardLink {
  labelAr: string;
  labelEn: string;
  href: string;
  icon: string;
  perm: string | null;
}

interface DashboardSection {
  id: number;
  key: string;
  titleAr: string;
  titleEn: string;
  icon: string;
  role: string;
  sortOrder: number;
  isActive: boolean;
  links: DashboardLink[];
}

type FormState = {
  titleAr: string;
  titleEn: string;
  icon: string;
  role: string;
  sortOrder: number;
  isActive: boolean;
};

interface Permission {
  id: number;
  moduleName: string;
  actionType: string;
  permissionCode: string;
}

const ROLES = ["SuperAdmin", "Owner", "Employee"] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABEL_KEYS: Record<Role, string> = {
  SuperAdmin: "users.superAdmin",
  Owner: "users.storeOwners",
  Employee: "users.employees",
};

const ICON_OPTIONS = ["home", "box", "tag", "receipt", "wallet", "crown", "chart", "store", "package", "users", "userGroup", "settings", "layers", "share", "edit", "lock", "clock", "ledger", "clipboard", "warehouse", "truck", "book", "journal", "cashier", "card", "fixedAsset"] as const;
type IconName = (typeof ICON_OPTIONS)[number];

const ICON_LABEL_KEYS: Record<IconName, string> = {
  home: "dashboardSections.icon.home",
  box: "dashboardSections.icon.box",
  tag: "dashboardSections.icon.tag",
  receipt: "dashboardSections.icon.receipt",
  wallet: "dashboardSections.icon.wallet",
  crown: "dashboardSections.icon.crown",
  chart: "dashboardSections.icon.chart",
  store: "dashboardSections.icon.store",
  package: "dashboardSections.icon.package",
  users: "dashboardSections.icon.users",
  userGroup: "dashboardSections.icon.userGroup",
  settings: "dashboardSections.icon.settings",
  layers: "dashboardSections.icon.layers",
  share: "dashboardSections.icon.share",
  edit: "dashboardSections.icon.edit",
  lock: "dashboardSections.icon.lock",
  clock: "dashboardSections.icon.clock",
  ledger: "dashboardSections.icon.ledger",
  clipboard: "dashboardSections.icon.clipboard",
  warehouse: "dashboardSections.icon.warehouse",
  truck: "dashboardSections.icon.truck",
  book: "dashboardSections.icon.book",
  journal: "dashboardSections.icon.journal",
  cashier: "dashboardSections.icon.cashier",
  card: "dashboardSections.icon.card",
  fixedAsset: "dashboardSections.icon.fixedAsset",
};

interface PageOption {
  href: string;
  labelKey?: string;
  icon?: string;
}

const PAGE_OPTIONS: PageOption[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: "home" },
  { href: "/dashboard/products", labelKey: "nav.products", icon: "box" },
  { href: "/dashboard/categories", labelKey: "nav.categories", icon: "tag" },
  { href: "/dashboard/coupons", labelKey: "nav.coupons", icon: "tag" },
  { href: "/dashboard/store-settings", labelKey: "nav.storeSettings", icon: "settings" },
  { href: "/dashboard/marketing", labelKey: "nav.marketing", icon: "share" },
  { href: "/dashboard/pos", labelKey: "nav.pos", icon: "cashier" },
  { href: "/dashboard/orders", labelKey: "nav.orders", icon: "receipt" },
  { href: "/dashboard/orders/returns", labelKey: "nav.returns", icon: "receipt" },
  { href: "/dashboard/shipping", labelKey: "nav.shipping", icon: "truck" },
  { href: "/dashboard/customers", labelKey: "nav.customers", icon: "userGroup" },
  { href: "/dashboard/statistics", labelKey: "nav.statistics", icon: "chart" },
  { href: "/dashboard/warehouses", labelKey: "nav.warehouses", icon: "warehouse" },
  { href: "/dashboard/inventory", labelKey: "nav.inventory", icon: "layers" },
  { href: "/dashboard/stock-counts", labelKey: "nav.stockCounts", icon: "clipboard" },
  { href: "/dashboard/transfers", labelKey: "nav.transfers", icon: "layers" },
  { href: "/dashboard/damages", labelKey: "nav.damages", icon: "alert" },
  { href: "/dashboard/accounting/accounts", labelKey: "nav.accounts", icon: "ledger" },
  { href: "/dashboard/accounting/journal-entries", labelKey: "nav.journalEntries", icon: "journal" },
  { href: "/dashboard/accounting/ledger", labelKey: "nav.ledger", icon: "book" },
  { href: "/dashboard/accounting/invoices", labelKey: "nav.invoices", icon: "receipt" },
  { href: "/dashboard/accounting/vouchers", labelKey: "nav.vouchers", icon: "wallet" },
  { href: "/dashboard/accounting/fixed-assets", labelKey: "nav.fixedAssets", icon: "fixedAsset" },
  { href: "/dashboard/accounting/reports", labelKey: "nav.reports", icon: "chart" },
  { href: "/dashboard/business-reports", labelKey: "nav.businessReports", icon: "chart" },
  { href: "/dashboard/employees", labelKey: "nav.employees", icon: "users" },
  { href: "/dashboard/attendance", labelKey: "nav.attendance", icon: "clock" },
  { href: "/dashboard/leave-requests", labelKey: "nav.leaveRequests", icon: "calendarOff" },
  { href: "/dashboard/payroll", labelKey: "nav.payroll", icon: "wallet" },
  { href: "/dashboard/subscription", labelKey: "nav.subscription", icon: "crown" },
  { href: "/dashboard/transactions", labelKey: "nav.transactions", icon: "card" },
  { href: "/dashboard/settlements", labelKey: "nav.settlements", icon: "wallet" },
  { href: "/dashboard/referrals", labelKey: "nav.referrals", icon: "share" },
  { href: "/dashboard/merchant-account", labelKey: "nav.merchantAccount", icon: "user" },
  { href: "/dashboard/merchant-verification", labelKey: "nav.verification", icon: "user" },
  { href: "/dashboard/stores", labelKey: "nav.stores", icon: "store" },
  { href: "/dashboard/packages", labelKey: "nav.packages", icon: "package" },
  { href: "/dashboard/themes", labelKey: "nav.themes", icon: "palette" },
  { href: "/dashboard/users", labelKey: "nav.users", icon: "userGroup" },
  { href: "/dashboard/reports", labelKey: "nav.reports", icon: "chart" },
  { href: "/dashboard/report-schedules", labelKey: "nav.reportSchedules", icon: "chart" },
  { href: "/dashboard/kpis", labelKey: "nav.kpis", icon: "chart" },
  { href: "/dashboard/domains", labelKey: "nav.domains", icon: "settings" },
  { href: "/dashboard/admin-referrals", labelKey: "nav.referrals", icon: "share" },
  { href: "/dashboard/admin-verifications", labelKey: "nav.adminVerifications", icon: "clipboard" },
  { href: "/dashboard/admin-merchant-accounts", labelKey: "nav.adminMerchantAccounts", icon: "store" },
  { href: "/dashboard/admin-settlements", labelKey: "nav.settlements", icon: "wallet" },
  { href: "/dashboard/settings", labelKey: "nav.settings", icon: "settings" },
  { href: "/dashboard/site-content", labelKey: "nav.siteContent", icon: "settings" },
  { href: "/dashboard/site-menus", labelKey: "nav.siteMenus", icon: "layers" },
  { href: "/dashboard/blog", labelKey: "nav.blog", icon: "edit" },
  { href: "/dashboard/careers", labelKey: "nav.careers", icon: "users" },
  { href: "/dashboard/academy", labelKey: "nav.academy", icon: "star" },
  { href: "/dashboard/design-requests", labelKey: "nav.designRequests", icon: "palette" },
  { href: "/dashboard/store-faq", labelKey: "nav.storeFaq", icon: "book" },
  { href: "/dashboard/store-blog", labelKey: "nav.storeBlog", icon: "edit" },
  { href: "/dashboard/profile", labelKey: "nav.profile", icon: "user" },
];

const EMPTY_FORM: FormState = { titleAr: "", titleEn: "", icon: "settings", role: "SuperAdmin", sortOrder: 1, isActive: true };

// ---------- Reusable pickers ----------

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
}

function isIconName(v: string | null | undefined): v is IconName {
  return !!v && v in ICONS;
}

function IconPicker({ value, onChange, compact = false }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useOutsideClose(() => setOpen(false));

  const filtered = ICON_OPTIONS.filter((i) =>
    i.startsWith(q.toLowerCase()) || t(ICON_LABEL_KEYS[i]).includes(q)
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="field-shell w-full justify-between cursor-pointer"
        style={{ textAlign: "start" }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="shrink-0" style={{ color: "var(--blue)" }}>
            <Icon name={isIconName(value) ? value : "settings"} size={compact ? 16 : 18} />
          </span>
          <span className="truncate text-[13px]">
            {isIconName(value) ? t(ICON_LABEL_KEYS[value]) : value}
          </span>
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--sub)]">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full start-0 z-30 mt-1 rounded-xl border border-[var(--border)] shadow-lg bg-white p-2 w-[min(340px,calc(100vw-2rem))] min-w-full">
          <div className="field-shell mb-2 py-1 px-3">
            <Icon name="search" size={14} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("dashboardSections.searchIcon")}
              className="!text-[12.5px]"
            />
          </div>
          <div className="grid grid-cols-1 max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-center text-[12px] py-3 text-[var(--sub)]">{t("dashboardSections.noResults")}</p>
            )}
            {filtered.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => { onChange(i); setOpen(false); }}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] cursor-pointer transition-colors whitespace-nowrap"
                style={value === i ? { backgroundColor: "var(--blue-50)", color: "var(--blue)", fontWeight: 700 } : { color: "var(--ink)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = value === i ? "var(--blue-50)" : "transparent"; }}
              >
                <span className="shrink-0" style={{ color: "var(--blue)" }}>
                  <Icon name={i} size={16} />
                </span>
                <span>{t(ICON_LABEL_KEYS[i])}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useOutsideClose(() => setOpen(false));

  const label = (p: PageOption) => (p.labelKey ? t(p.labelKey) : p.href);
  const matches = PAGE_OPTIONS.filter((p) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return p.href.toLowerCase().includes(s) || label(p).toLowerCase().includes(s);
  });

  return (
    <div ref={ref} className="relative">
      <div className="field-shell">
        <span className="shrink-0 text-[var(--sub)]">
          <Icon name="link" size={14} />
        </span>
        <input
          dir="ltr"
          value={value}
          onChange={(e) => { onChange(e.target.value); setQ(e.target.value); }}
          onFocus={() => { setQ(value); setOpen(true); }}
          onClick={() => setOpen(true)}
          placeholder="/dashboard/..." 
        />
      </div>
      {open && (
        <div className="mt-1 rounded-xl border border-[var(--border)] shadow-lg bg-white p-2">
          <div className="field-shell mb-2 py-1 px-3">
            <Icon name="search" size={14} />
            <input
              dir="ltr"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("dashboardSections.searchPage")}
              className="!text-[12.5px]"
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {matches.length === 0 && (
              <p className="text-center text-[12px] py-3 text-[var(--sub)]">{t("dashboardSections.noResults")}</p>
            )}
            {matches.slice(0, 30).map((p) => (
              <button
                key={p.href}
                type="button"
                onClick={() => { onChange(p.href); setOpen(false); }}
                className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] cursor-pointer transition-colors"
                style={value === p.href ? { backgroundColor: "var(--blue-50)", color: "var(--blue)", fontWeight: 700 } : { color: "var(--ink)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = value === p.href ? "var(--blue-50)" : "transparent"; }}
              >
                <span className="shrink-0" style={{ color: "var(--blue)" }}>
                  <Icon name={isIconName(p.icon) ? p.icon : "settings"} size={15} />
                </span>
                <span className="truncate">{label(p)}</span>
                <span dir="ltr" className="ms-auto shrink-0 text-[11px] text-[var(--sub)]">{p.href}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { t } = useTranslation();
  const [perms, setPerms] = useState<Permission[]>([]);

  useEffect(() => {
    api.get("/roles/permissions")
      .then((r) => setPerms((r.data?.data) || []))
      .catch(() => {});
  }, []);

  const grouped = useMemo(() => {
    const acc: Record<string, Permission[]> = {};
    perms.forEach((p) => {
      if (!acc[p.moduleName]) acc[p.moduleName] = [];
      acc[p.moduleName].push(p);
    });
    return acc;
  }, [perms]);

  return (
    <div className="field-shell">
      <span className="shrink-0 text-[var(--sub)]">
        <Icon name="lock" size={14} />
      </span>
      <select
        dir="ltr"
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{t("dashboardSections.permNone")}</option>
        {Object.entries(grouped).map(([mod, list]) => (
          <optgroup key={mod} label={t(`employee.module.${mod}`, mod)}>
            {list.map((p) => (
              <option key={p.permissionCode} value={p.permissionCode}>
                {t(`employee.module.${p.moduleName}`, p.moduleName)} — {t(`employee.action.${p.actionType}`, p.actionType)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

// ---------- Main page ----------

export default function DashboardSectionsPage() {
  const { t, i18n } = useTranslation();
  const confirm = useConfirm();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [ready, setReady] = useState(false);
  const [sections, setSections] = useState<DashboardSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [links, setLinks] = useState<DashboardLink[]>([{ labelAr: "", labelEn: "", href: "", icon: "settings", perm: null }]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated() || getUserType() !== "SuperAdmin") {
      router.push("/dashboard");
      return;
    }
    setAuthorized(true);
    setReady(true);
  }, [router]);

  const load = useCallback(async () => {
    const res = await api.get("/admin/dashboard-sections");
    setSections(res.data.data || []);
  }, []);

  useEffect(() => {
    if (!ready) return;
    load().catch(() => setMessage({ type: "error", text: t("error.serverError") })).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, load]);

  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setLinks([{ labelAr: "", labelEn: "", href: "", icon: "settings", perm: null }]);
    setModalOpen(true);
  };

  const openEdit = (s: DashboardSection) => {
    setEditingId(s.id);
    setForm({ titleAr: s.titleAr, titleEn: s.titleEn, icon: s.icon, role: s.role, sortOrder: s.sortOrder, isActive: s.isActive });
    setLinks(s.links.length > 0 ? [...s.links] : [{ labelAr: "", labelEn: "", href: "", icon: "settings", perm: null }]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setLinks([{ labelAr: "", labelEn: "", href: "", icon: "settings", perm: null }]);
  };

  const updateLink = (i: number, patch: Partial<DashboardLink>) => {
    setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  };

  const submit = async () => {
    if (!form.titleAr.trim() && !form.titleEn.trim()) {
      setMessage({ type: "error", text: t("dashboardSections.titleAr") + " / " + t("dashboardSections.titleEn") });
      return;
    }
    const validLinks = links.filter(l => (l.labelAr.trim() || l.labelEn.trim()) && l.href.trim());
    setSaving(true);
    setMessage(null);
    const payload = {
      titleAr: form.titleAr.trim(),
      titleEn: form.titleEn.trim(),
      icon: form.icon.trim() || "settings",
      role: form.role,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
      links: validLinks.map(l => ({
        labelAr: l.labelAr.trim(), labelEn: l.labelEn.trim(),
        href: l.href.trim(), icon: l.icon.trim() || "settings",
        perm: l.perm?.trim() || null,
      })),
    };
    try {
      if (editingId) {
        await api.put(`/admin/dashboard-sections/${editingId}`, payload);
      } else {
        await api.post("/admin/dashboard-sections", payload);
      }
      await load();
      setMessage({ type: "success", text: t("dashboardSections.saveSuccess") });
      closeModal();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (s: DashboardSection) => {
    try {
      await api.put(`/admin/dashboard-sections/${s.id}/toggle`);
      await load();
    } catch {
      setMessage({ type: "error", text: t("error.serverError") });
    }
  };

  const remove = async (s: DashboardSection) => {
    if (!(await confirm(t("common.confirmDelete")))) return;
    try {
      await api.delete(`/admin/dashboard-sections/${s.id}`);
      await load();
      setMessage({ type: "success", text: t("dashboardSections.deleteSuccess") });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: e?.response?.data?.message || t("error.serverError") });
    }
  };

  if (!ready) return <LoadingState />;
  if (!authorized) return null;

  const sorted = [...sections].sort((a, b) => a.role.localeCompare(b.role) || a.sortOrder - b.sortOrder || a.id - b.id);

  const roleLabel = (role: string) => (role in ROLE_LABEL_KEYS ? t(ROLE_LABEL_KEYS[role as Role]) : role);

  const permLabel = (code: string) => {
    const parts = code.split(".");
    if (parts.length >= 2) {
      return t(`employee.module.${parts[0]}`, parts[0]) + " — " + t(`employee.action.${parts[1]}`, parts[1]);
    }
    return code;
  };

  return (
    <div>
      <PageHeader icon="layout" title={t("admin.dashboardSections")} />
      <p className="mb-5 max-w-[680px] text-[13px] leading-relaxed" style={{ color: "var(--sub)" }}>
        {t("dashboardSections.pageIntro")}
      </p>

      {message && <Toast message={message.text} type={message.type} fixed />}

      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px]" style={{ color: "var(--sub)" }}>{t("dashboardSections.count", { count: sections.length })}</span>
        <button className="btn btn-primary" onClick={openCreate}>+ {t("dashboardSections.add")}</button>
      </div>

      {loading ? (
        <LoadingState />
      ) : sorted.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-[13.5px]" style={{ color: "var(--sub)" }}>{t("common.noData")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(s => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--blue-50)", color: "var(--blue)" }}>
                  <Icon name={isIconName(s.icon) ? s.icon : "settings"} size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold truncate" style={{ color: "var(--ink)" }}>
                    {i18nText(s.titleAr, s.titleEn)}
                    {s.links.length > 0 && <span className="ms-2 text-[11px] font-bold" style={{ color: "var(--sub)" }}>({s.links.length})</span>}
                  </p>
                  <p className="text-[11.5px] text-[var(--sub)] truncate">
                    {t("dashboardSections.role")}: {roleLabel(s.role)} · {t("dashboardSections.sortOrder")}: {s.sortOrder}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${s.isActive ? "bg-green-50" : "bg-gray-100"}`} style={{ color: s.isActive ? "var(--green)" : "var(--sub)" }}>
                  {s.isActive ? t("dashboardSections.visible") : t("dashboardSections.hidden")}
                </span>
                <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => openEdit(s)}>
                  {t("dashboardSections.edit")}
                </button>
                <button className="btn btn-outline !px-2 !py-1 !text-[11px]" onClick={() => toggle(s)}>
                  {s.isActive ? t("dashboardSections.hide") : t("dashboardSections.show")}
                </button>
                <button className="btn btn-outline !px-2 !py-1 !text-[11px] !text-red-600" onClick={() => remove(s)}>
                  {t("dashboardSections.delete")}
                </button>
              </div>
              {s.links.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1.5">
                  {s.links.map((l, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--sub)" }}>
                      <span className="shrink-0" style={{ color: "var(--blue)" }}>
                        <Icon name={isIconName(l.icon) ? l.icon : "link"} size={14} />
                      </span>
                      <span className="font-bold min-w-0 truncate" style={{ color: "var(--ink)" }}>{i18nText(l.labelAr, l.labelEn)}</span>
                      <span dir="ltr" className="min-w-0 truncate">{l.href}</span>
                      {l.perm && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-[var(--blue-50)] text-[10.5px] font-bold" style={{ color: "var(--blue)" }}>{permLabel(l.perm)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-[18px] font-bold text-[var(--blue-deep)]">
                  {editingId ? t("dashboardSections.editSection") : t("dashboardSections.add")}
                </h2>
                <p className="mt-1 text-[12px]" style={{ color: "var(--sub)" }}>{t("dashboardSections.modalIntro")}</p>
              </div>
              <button type="button" onClick={closeModal} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors shrink-0" aria-label={t("common.close")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("dashboardSections.titleAr")}</label>
                  <div className="field-shell"><input type="text" value={form.titleAr} onChange={e => setForm({ ...form, titleAr: e.target.value })} /></div>
                  <p className="mt-1 text-[11px]" style={{ color: "var(--sub)" }}>{t("dashboardSections.titleHint")}</p>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("dashboardSections.titleEn")}</label>
                  <div className="field-shell"><input type="text" dir="ltr" value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} /></div>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("dashboardSections.icon")}</label>
                <IconPicker value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} />
                <p className="mt-1 text-[11px]" style={{ color: "var(--sub)" }}>{t("dashboardSections.iconHint")}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("dashboardSections.role")}</label>
                  <div className="field-shell">
                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                      {ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                    </select>
                  </div>
                  <p className="mt-1 text-[11px]" style={{ color: "var(--sub)" }}>{t("dashboardSections.roleHint")}</p>
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold mb-1 text-[var(--ink)]">{t("dashboardSections.sortOrder")}</label>
                  <div className="field-shell"><input type="number" min={0} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value === "" ? 0 : Number(e.target.value) })} /></div>
                  <p className="mt-1 text-[11px]" style={{ color: "var(--sub)" }}>{t("dashboardSections.sortOrderHint")}</p>
                </div>
              </div>

              <label className="flex items-center gap-2 text-[13px] font-bold cursor-pointer text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-[var(--blue)]"
                />
                {form.isActive ? t("dashboardSections.visible") : t("dashboardSections.hidden")}
              </label>
              <p className="-mt-2 text-[11px]" style={{ color: "var(--sub)" }}>{t("dashboardSections.activeHint")}</p>

              <div className="pt-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] font-bold text-[var(--ink)]">{t("dashboardSections.links")}</p>
                  <button className="btn btn-outline !text-[12.5px]" onClick={() => setLinks(prev => [...prev, { labelAr: "", labelEn: "", href: "", icon: "settings", perm: null }])}>
                    + {t("dashboardSections.addLink")}
                  </button>
                </div>
                <p className="mt-1 mb-3 text-[11px]" style={{ color: "var(--sub)" }}>{t("dashboardSections.linksHint")}</p>

                <div className="space-y-3">
                  {links.map((l, i) => (
                    <div key={i} className="p-3 rounded-xl border border-[var(--border)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11.5px] font-bold" style={{ color: "var(--sub)" }}>{t("dashboardSections.link")} {i + 1}</span>
                        <button
                          type="button"
                          className="text-[11px] font-bold transition-colors"
                          style={{ color: "var(--red, #dc2626)" }}
                          onClick={() => setLinks(prev => prev.filter((_, idx) => idx !== i))}
                          disabled={links.length === 1}
                        >
                          {t("dashboardSections.removeLink")}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="field-shell">
                          <input value={l.labelAr} onChange={e => updateLink(i, { labelAr: e.target.value })} placeholder={t("dashboardSections.labelAr")} />
                        </div>
                        <div className="field-shell">
                          <input dir="ltr" value={l.labelEn} onChange={e => updateLink(i, { labelEn: e.target.value })} placeholder={t("dashboardSections.labelEn")} />
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-[11.5px] font-bold mb-1 text-[var(--ink)]">{t("dashboardSections.href")}</label>
                        <PagePicker value={l.href} onChange={(v) => updateLink(i, { href: v })} />
                        <p className="mt-1 text-[11px]" style={{ color: "var(--sub)" }}>{t("dashboardSections.hrefHint")}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="block text-[11.5px] font-bold mb-1 text-[var(--ink)]">{t("dashboardSections.icon")}</label>
                          <IconPicker compact value={l.icon} onChange={(v) => updateLink(i, { icon: v })} />
                        </div>
                        <div>
                          <label className="block text-[11.5px] font-bold mb-1 text-[var(--ink)]">{t("dashboardSections.perm")}</label>
                          <PermissionPicker value={l.perm} onChange={(v) => updateLink(i, { perm: v })} />
                          <p className="mt-1 text-[11px]" style={{ color: "var(--sub)" }}>{t("dashboardSections.permHint")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button disabled={saving} className="btn btn-primary flex-1 disabled:opacity-60" onClick={submit}>
                {saving ? t("common.loading") : t("common.save")}
              </button>
              <button className="btn btn-outline" onClick={closeModal}>{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function i18nText(ar: string, en: string) {
    return i18n.language === "ar" ? (ar || en) : (en || ar);
  }
}
"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import ToggleSwitch from "@/components/ToggleSwitch";
import { STORE_THEMES, getDefaultColors } from "@/components/store-templates/configs";
import type { StoreThemeMeta, StoreColors } from "@/components/store-templates/configs";

interface AdminTheme {
  id: number;
  themeKey: string;
  isEnabled: boolean;
  displayOrder: number;
}

const THEME_GROUPS: { key: string; labelKey: string; icon: string; items: StoreThemeMeta[] }[] = [
  { key: "b2c", labelKey: "themes.groupB2C", icon: "📦", items: STORE_THEMES.filter((t) => t.group === "b2c") },
  { key: "b2b", labelKey: "themes.groupB2B", icon: "🏢", items: STORE_THEMES.filter((t) => t.group === "b2b") },
  { key: "special", labelKey: "themes.groupSpecial", icon: "🎯", items: STORE_THEMES.filter((t) => t.group === "special") },
];

function ThemePreviewMock({ colors }: { colors: StoreColors }) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200" style={{ background: colors.footerColor, height: 92 }}>
      <div className="flex items-center justify-between px-2.5 py-1.5" style={{ background: colors.headerColor }}>
        <div className="flex gap-1">
          <span className="rounded-full" style={{ width: 5, height: 5, background: "#fff" }} />
          <span className="rounded-full bg-white/30" style={{ width: 5, height: 5 }} />
          <span className="rounded-full bg-white/30" style={{ width: 5, height: 5 }} />
        </div>
        <span className="rounded-sm bg-white/25" style={{ width: 24, height: 5 }} />
      </div>
      <div className="p-2 flex gap-2">
        <div className="flex-1 rounded-md bg-white p-1.5 shadow-sm">
          <div className="rounded" style={{ height: 22, background: `linear-gradient(135deg, ${colors.heroFrom}, ${colors.heroTo})` }} />
          <div className="mt-1 rounded bg-gray-200" style={{ height: 4, width: "70%" }} />
          <div className="mt-1.5 rounded" style={{ height: 12, background: colors.buttonColor }} />
        </div>
        <div className="flex-1 rounded-md bg-white p-1.5 shadow-sm">
          <div className="rounded" style={{ height: 22, background: `linear-gradient(135deg, ${colors.heroFrom}, ${colors.heroTo})` }} />
          <div className="mt-1 rounded bg-gray-200" style={{ height: 4, width: "55%" }} />
          <div className="mt-1.5 rounded" style={{ height: 12, background: colors.accentColor }} />
        </div>
      </div>
    </div>
  );
}

export default function ThemesPage() {
  const { t } = useTranslation();
  const [themes, setThemes] = useState<Record<string, AdminTheme>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadThemes = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/themes");
      const map: Record<string, AdminTheme> = {};
      res.data.data.forEach((th: AdminTheme) => { map[th.themeKey] = th; });
      setThemes(map);
    } catch (err: any) {
      setError(err.response?.data?.message || t("themes.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadThemes(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = async (theme: StoreThemeMeta) => {
    const item = themes[theme.id];
    if (!item) return;
    const next = !item.isEnabled;
    setSavingKey(theme.id);
    setError("");
    setSuccess("");
    try {
      await api.put(`/admin/themes/${item.id}`, { isEnabled: next });
      setThemes((prev) => ({ ...prev, [theme.id]: { ...item, isEnabled: next } }));
      setSuccess(t("themes.saveSuccess"));
    } catch (err: any) {
      setError(err.response?.data?.message || t("themes.saveError"));
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader icon="settings" title={t("themes.title")}>
        <p className="text-[12px] text-[var(--sub)]">{t("themes.subtitle")}</p>
      </PageHeader>

      {error && <div className="alert alert--danger">{error}</div>}
      <SuccessToast message={success} fixed className="mb-4" />

      <div className="space-y-6">
        {THEME_GROUPS.map((group) => (
          <div key={group.key} className="card p-6">
            <p className="text-[13px] font-bold text-[var(--ink)] mb-3">
              {group.icon} {t(group.labelKey)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.items.map((theme) => {
                const item = themes[theme.id];
                const enabled = item?.isEnabled ?? true;
                return (
                  <div
                    key={theme.id}
                    className={`rounded-2xl border-2 p-3 transition-all ${enabled ? "border-gray-200" : "border-gray-200 bg-gray-50 opacity-80"}`}
                  >
                    <ThemePreviewMock colors={getDefaultColors(theme.id)} />
                    <div className="flex items-center justify-between mt-2.5">
                      <div>
                        <p className="text-[13px] font-bold text-[var(--ink)]">{t(theme.nameKey)}</p>
                        <p className="text-[11px] text-[var(--sub)] mt-0.5">{t(theme.descKey)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-bold ${enabled ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                          {enabled ? t("themes.enabled") : t("themes.disabled")}
                        </span>
                        <ToggleSwitch
                          enabled={enabled}
                          onToggle={() => handleToggle(theme)}
                          disabled={savingKey === theme.id}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

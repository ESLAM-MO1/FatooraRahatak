"use client";

import { useCallback, useEffect, Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { getUserType, getStaffRole } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { useConfirm } from "@/components/ConfirmDialog";

interface StoreCountByPackage {
  packageName: string;
  count: number;
}

interface ReportsOverview {
  totalStores: number;
  activeStores: number;
  suspendedStores: number;
  pendingStores: number;
  totalUsers: number;
  totalProductsAcrossPlatform: number;
  totalOrders: number;
  totalRevenue: number;
  totalReferrals: number;
  pendingReferralCommissions: number;
  storesByPackage: StoreCountByPackage[];
}

interface ReportSchedule {
  id: number;
  name: string;
  frequency: string;
  reportScope: string;
  kpis: string[];
  recipients: string[];
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
  createdAt: string;
}

interface ReportConfig {
  selectedKpis: string[];
  availableKpis: string[];
}

const emptyForm = {
  name: "",
  frequency: "Weekly",
  reportScope: "Business",
  kpis: [] as string[],
  recipientsText: "",
  isActive: true,
};

function downloadBlob(data: BlobPart, filename: string) {
  const blob = new Blob([data]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function OverviewTab() {
  const { t } = useTranslation();
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/admin/reports/overview");
        setData(res.data.data);
        setGeneratedAt(new Date());
      } catch (err: any) {
        setError(err.response?.data?.message || t("reports.loadError"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const exportCsv = () => {
    if (!data) return;
    const header = `${t("reports.package")},${t("reports.storeCount")},${t("reports.share")}`;
    const total = data.storesByPackage.reduce((s, r) => s + r.count, 0) || 1;
    const rows = data.storesByPackage.map((r) => {
      const share = ((r.count / total) * 100).toFixed(1);
      return `${r.packageName},${r.count},${share}%`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportFile = async (format: "excel" | "pdf") => {
    setExporting(format);
    try {
      const res = await api.get("/admin/reports/export", {
        params: { scope: "Platform", format },
        responseType: "blob",
      });
      const ext = format === "excel" ? "xlsx" : "pdf";
      downloadBlob(res.data, `reports-overview-${new Date().toISOString().slice(0, 10)}.${ext}`);
    } catch {
      setError(t("reportManage.exportError"));
    } finally {
      setExporting("");
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <div className="alert alert--danger">{error}</div>;
  }

  if (!data) return null;

  const cards = [
    { label: t("reports.totalStores"), value: data.totalStores },
    { label: t("reports.activeStores"), value: data.activeStores },
    { label: t("reports.suspendedStores"), value: data.suspendedStores },
    { label: t("reports.pendingStores"), value: data.pendingStores },
    { label: t("reports.totalUsers"), value: data.totalUsers },
    { label: t("reports.totalProducts"), value: data.totalProductsAcrossPlatform },
    { label: t("reports.totalOrders"), value: data.totalOrders },
    { label: t("reports.totalRevenue"), value: `${data.totalRevenue.toLocaleString("ar-SA-u-nu-latn")} ${t("reports.sar")}` },
    { label: t("reports.totalReferrals"), value: data.totalReferrals },
    { label: t("reports.pendingCommissions"), value: `${data.pendingReferralCommissions.toLocaleString("ar-SA-u-nu-latn")} ${t("reports.sar")}` },
  ];

  const packageTotal = data.storesByPackage.reduce((s, r) => s + r.count, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap justify-end">
        {generatedAt && (
          <p className="text-[12px] text-[var(--sub)]">
            {t("reports.generatedAt")}: {generatedAt.toLocaleString("ar-SA-u-nu-latn")}
          </p>
        )}
        <button type="button" onClick={exportCsv} className="btn btn-outline btn-sm">
          {t("reports.exportCsv")}
        </button>
        <button type="button" disabled={!!exporting} onClick={() => exportFile("excel")} className="btn btn-outline btn-sm">
          {exporting === "excel" ? "..." : t("reportManage.exportExcel")}
        </button>
        <button type="button" disabled={!!exporting} onClick={() => exportFile("pdf")} className="btn btn-outline btn-sm">
          {exporting === "pdf" ? "..." : t("reportManage.exportPdf")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <p className="text-[12.5px] text-[var(--sub)] mb-1">{card.label}</p>
            <p className="text-[22px] font-bold text-[var(--blue-deep)] leading-tight">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-[var(--blue-deep)] mb-4">{t("reports.storeDistributionByPackage")}</h2>
        {data.storesByPackage.length === 0 ? (
          <p className="text-[var(--sub)] text-sm">{t("reports.noData")}</p>
        ) : (
          <div className="table-wrap">
            <table className="hidden md:table">
              <thead>
                <tr>
                  <th>{t("reports.package")}</th>
                  <th>{t("reports.storeCount")}</th>
                  <th>{t("reports.share")}</th>
                </tr>
              </thead>
              <tbody>
                {data.storesByPackage.map((row) => {
                  const share = ((row.count / packageTotal) * 100).toFixed(1);
                  return (
                    <tr key={row.packageName}>
                      <td className="font-bold">{row.packageName}</td>
                      <td className="text-[var(--sub)]">{row.count}</td>
                      <td className="min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: "var(--blue)" }} />
                          </div>
                          <span className="text-[12px] text-[var(--sub)] whitespace-nowrap">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="md:hidden space-y-3">
              {data.storesByPackage.map((row) => {
                const share = ((row.count / packageTotal) * 100).toFixed(1);
                return (
                  <div key={row.packageName} className="card p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] font-bold text-[var(--sub)]">{t("reports.package")}</p>
                        <p className="text-[12px] text-[var(--ink)] font-bold">{row.packageName}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[var(--sub)]">{t("reports.storeCount")}</p>
                        <p className="text-[12px] text-[var(--sub)]">{row.count}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[11px] font-bold text-[var(--sub)]">{t("reports.share")}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: "var(--blue)" }} />
                          </div>
                          <span className="text-[12px] text-[var(--sub)] whitespace-nowrap">{share}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-[var(--blue-deep)] mb-4">{t("reports.quickLinks")}</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/stores" className="btn btn-outline btn-sm">{t("reports.allStores")}</Link>
          <Link href="/dashboard/users" className="btn btn-outline btn-sm">{t("reports.allUsers")}</Link>
          <Link href="/dashboard/admin-referrals" className="btn btn-outline btn-sm">{t("reports.adminReferrals")}</Link>
          <Link href="/dashboard/admin-verifications" className="btn btn-outline btn-sm">{t("reports.adminVerifications")}</Link>
        </div>
      </div>
    </div>
  );
}

function SchedulesTab({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [config, setConfig] = useState<ReportConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [exportingId, setExportingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [schedulesRes, configRes] = await Promise.all([
        api.get("/admin/reports/schedules"),
        api.get("/admin/reports/config"),
      ]);
      setSchedules(schedulesRes.data.data);
      setConfig(configRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("reportManage.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSelectedKpi = (kpi: string) => {
    if (!config) return;
    const selected = config.selectedKpis.includes(kpi)
      ? config.selectedKpis.filter((k) => k !== kpi)
      : [...config.selectedKpis, kpi];
    setConfig({ ...config, selectedKpis: selected });
  };

  const saveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    try {
      await api.put("/admin/reports/config", { selectedKpis: config.selectedKpis });
      setSuccess(t("reportManage.configSaved"));
    } catch {
      setError(t("reportManage.saveError"));
    } finally {
      setSavingConfig(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (schedule: ReportSchedule) => {
    setEditingId(schedule.id);
    setForm({
      name: schedule.name,
      frequency: schedule.frequency,
      reportScope: schedule.reportScope,
      kpis: schedule.kpis,
      recipientsText: schedule.recipients.join(", "),
      isActive: schedule.isActive,
    });
    setModalOpen(true);
  };

  const toggleFormKpi = (kpi: string) => {
    setForm((f) => ({
      ...f,
      kpis: f.kpis.includes(kpi) ? f.kpis.filter((k) => k !== kpi) : [...f.kpis, kpi],
    }));
  };

  const submitForm = async () => {
    if (!form.name.trim()) {
      setError(t("reportManage.nameRequired"));
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      name: form.name.trim(),
      frequency: form.frequency,
      reportScope: form.reportScope,
      kpis: form.kpis,
      recipients: form.recipientsText
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
      isActive: form.isActive,
    };
    try {
      if (editingId) {
        await api.put(`/admin/reports/schedules/${editingId}`, payload);
        setSuccess(t("reportManage.updated"));
      } else {
        await api.post("/admin/reports/schedules", payload);
        setSuccess(t("reportManage.created"));
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || t("reportManage.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (schedule: ReportSchedule) => {
    try {
      await api.put(`/admin/reports/schedules/${schedule.id}/toggle`);
      setSuccess(t("reportManage.toggled"));
      load();
    } catch {
      setError(t("reportManage.saveError"));
    }
  };

  const deleteSchedule = async (schedule: ReportSchedule) => {
    const ok = await confirm({
      title: t("reportManage.deleteTitle"),
      message: schedule.name,
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/reports/schedules/${schedule.id}`);
      setSuccess(t("reportManage.deleted"));
      load();
    } catch {
      setError(t("reportManage.saveError"));
    }
  };

  const exportSchedule = async (schedule: ReportSchedule, format: "excel" | "pdf" | "csv") => {
    setExportingId(schedule.id);
    try {
      const res = await api.get(`/admin/reports/schedules/${schedule.id}/export`, {
        params: { format },
        responseType: "blob",
      });
      const ext = format === "excel" ? "xlsx" : format;
      downloadBlob(res.data, `report-schedule-${schedule.id}.${ext}`);
    } catch {
      setError(t("reportManage.exportError"));
    } finally {
      setExportingId(null);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <SuccessToast message={success} onClose={() => setSuccess(null)} />
      {error && <div className="alert alert--danger">{error}</div>}

      {!canEdit && (
        <div className="alert">{t("reportManage.viewOnlyBanner")}</div>
      )}

      {config && (
        <div className="card p-5">
          <h2 className="font-bold text-[var(--blue-deep)] mb-1">{t("reportManage.kpiSelection")}</h2>
          <p className="text-[12.5px] text-[var(--sub)] mb-4">{t("reportManage.kpiSelectionDesc")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {config.availableKpis.map((kpi) => (
              <label key={kpi} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={config.selectedKpis.includes(kpi)}
                  onChange={() => toggleSelectedKpi(kpi)}
                />
                {t(`reportManage.kpi.${kpi}`)}
              </label>
            ))}
          </div>
          {canEdit && (
            <div className="mt-4">
              <button type="button" disabled={savingConfig} onClick={saveConfig} className="btn btn-primary btn-sm">
                {savingConfig ? "..." : t("common.save")}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-bold text-[var(--blue-deep)]">{t("reportManage.schedulesTitle")}</h2>
          {canEdit && (
            <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
              {t("reportManage.addSchedule")}
            </button>
          )}
        </div>

        {schedules.length === 0 ? (
          <p className="text-[var(--sub)] text-sm">{t("reportManage.noSchedules")}</p>
        ) : (
          <div className="table-wrap">
            <table className="hidden lg:table">
              <thead>
                <tr>
                  <th>{t("reportManage.name")}</th>
                  <th>{t("reportManage.frequency")}</th>
                  <th>{t("reportManage.scope")}</th>
                  <th>{t("reportManage.status")}</th>
                  <th>{t("reportManage.lastRun")}</th>
                  <th>{t("reportManage.nextRun")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td className="font-bold">{schedule.name}</td>
                    <td className="text-[var(--sub)]">{t(`reportManage.freq.${schedule.frequency}`)}</td>
                    <td className="text-[var(--sub)]">{t(`reportManage.scope.${schedule.reportScope}`)}</td>
                    <td>
                      <span className={`badge ${schedule.isActive ? "badge--green" : "badge--gray"}`}>
                        {schedule.isActive ? t("reportManage.active") : t("reportManage.inactive")}
                      </span>
                    </td>
                    <td className="text-[var(--sub)]">
                      {schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString("ar-SA-u-nu-latn") : "-"}
                    </td>
                    <td className="text-[var(--sub)]">{new Date(schedule.nextRunAt).toLocaleString("ar-SA-u-nu-latn")}</td>
                    <td>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button
                          type="button"
                          disabled={exportingId === schedule.id}
                          onClick={() => exportSchedule(schedule, "excel")}
                          className="btn btn-outline btn-sm"
                        >
                          {t("reportManage.exportExcel")}
                        </button>
                        <button
                          type="button"
                          disabled={exportingId === schedule.id}
                          onClick={() => exportSchedule(schedule, "pdf")}
                          className="btn btn-outline btn-sm"
                        >
                          {t("reportManage.exportPdf")}
                        </button>
                        {canEdit && (
                          <>
                            <button type="button" onClick={() => toggleActive(schedule)} className="btn btn-outline btn-sm">
                              {schedule.isActive ? t("reportManage.pause") : t("reportManage.resume")}
                            </button>
                            <button type="button" onClick={() => openEdit(schedule)} className="btn btn-outline btn-sm">
                              {t("common.edit")}
                            </button>
                            <button type="button" onClick={() => deleteSchedule(schedule)} className="btn btn-danger btn-sm">
                              {t("common.delete")}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="lg:hidden space-y-3">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="card p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("reportManage.name")}</p>
                      <p className="text-[12px] text-[var(--ink)] font-bold">{schedule.name}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("reportManage.status")}</p>
                      <span className={`badge ${schedule.isActive ? "badge--green" : "badge--gray"}`}>
                        {schedule.isActive ? t("reportManage.active") : t("reportManage.inactive")}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("reportManage.frequency")}</p>
                      <p className="text-[12px] text-[var(--sub)]">{t(`reportManage.freq.${schedule.frequency}`)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("reportManage.scope")}</p>
                      <p className="text-[12px] text-[var(--sub)]">{t(`reportManage.scope.${schedule.reportScope}`)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("reportManage.lastRun")}</p>
                      <p className="text-[12px] text-[var(--sub)]">
                        {schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString("ar-SA-u-nu-latn") : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("reportManage.nextRun")}</p>
                      <p className="text-[12px] text-[var(--sub)]">{new Date(schedule.nextRunAt).toLocaleString("ar-SA-u-nu-latn")}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      disabled={exportingId === schedule.id}
                      onClick={() => exportSchedule(schedule, "excel")}
                      className="btn btn-outline btn-sm"
                    >
                      {t("reportManage.exportExcel")}
                    </button>
                    <button
                      type="button"
                      disabled={exportingId === schedule.id}
                      onClick={() => exportSchedule(schedule, "pdf")}
                      className="btn btn-outline btn-sm"
                    >
                      {t("reportManage.exportPdf")}
                    </button>
                    {canEdit && (
                      <>
                        <button type="button" onClick={() => toggleActive(schedule)} className="btn btn-outline btn-sm">
                          {schedule.isActive ? t("reportManage.pause") : t("reportManage.resume")}
                        </button>
                        <button type="button" onClick={() => openEdit(schedule)} className="btn btn-outline btn-sm">
                          {t("common.edit")}
                        </button>
                        <button type="button" onClick={() => deleteSchedule(schedule)} className="btn btn-danger btn-sm">
                          {t("common.delete")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[var(--blue-deep)]">
                {editingId ? t("reportManage.editSchedule") : t("reportManage.addSchedule")}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[12.5px] text-[var(--sub)] block mb-1">{t("reportManage.name")}</label>
                <input
                  type="text"
                  className="input w-full"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[12.5px] text-[var(--sub)] block mb-1">{t("reportManage.frequency")}</label>
                  <select
                    className="input w-full"
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  >
                    <option value="Daily">{t("reportManage.freq.Daily")}</option>
                    <option value="Weekly">{t("reportManage.freq.Weekly")}</option>
                    <option value="Monthly">{t("reportManage.freq.Monthly")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12.5px] text-[var(--sub)] block mb-1">{t("reportManage.scope")}</label>
                  <select
                    className="input w-full"
                    value={form.reportScope}
                    onChange={(e) => setForm({ ...form, reportScope: e.target.value })}
                  >
                    <option value="Business">{t("reportManage.scope.Business")}</option>
                    <option value="Platform">{t("reportManage.scope.Platform")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[12.5px] text-[var(--sub)] block mb-1">{t("reportManage.includedKpis")}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(config?.availableKpis || []).map((kpi) => (
                    <label key={kpi} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.kpis.includes(kpi)} onChange={() => toggleFormKpi(kpi)} />
                      {t(`reportManage.kpi.${kpi}`)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12.5px] text-[var(--sub)] block mb-1">{t("reportManage.recipients")}</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder={t("reportManage.recipientsPlaceholder")}
                  value={form.recipientsText}
                  onChange={(e) => setForm({ ...form, recipientsText: e.target.value })}
                />
                <p className="text-[11.5px] text-[var(--sub)] mt-1">{t("reportManage.recipientsHint")}</p>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                {t("reportManage.enabled")}
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline btn-sm">
                {t("common.cancel")}
              </button>
              <button type="button" disabled={saving} onClick={submitForm} className="btn btn-primary btn-sm">
                {saving ? "..." : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "schedules" ? "schedules" : "overview";
  const canEdit = getUserType() !== "SupportStaff" || getStaffRole() === "Admin";

  const setTab = (next: "overview" | "schedules") => {
    router.replace(next === "schedules" ? "/dashboard/reports?tab=schedules" : "/dashboard/reports");
  };

  return (
    <div className="space-y-6">
      <PageHeader icon="chart" title={t("reports.title")} />

      <div className="flex items-center gap-2 border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => setTab("overview")}
          className={`px-4 py-2 text-sm font-bold ${tab === "overview" ? "text-[var(--blue-deep)] border-b-2 border-[var(--blue)]" : "text-[var(--sub)]"}`}
        >
          {t("reports.title")}
        </button>
        <button
          type="button"
          onClick={() => setTab("schedules")}
          className={`px-4 py-2 text-sm font-bold ${tab === "schedules" ? "text-[var(--blue-deep)] border-b-2 border-[var(--blue)]" : "text-[var(--sub)]"}`}
        >
          {t("reportManage.schedulesTab")}
        </button>
      </div>

      {tab === "overview" ? <OverviewTab /> : <SchedulesTab canEdit={canEdit} />}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReportsPageContent />
    </Suspense>
  );
}
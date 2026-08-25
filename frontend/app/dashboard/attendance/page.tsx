"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import Can from "@/components/Can";
import { useConfirm } from "@/components/ConfirmDialog";

interface Employee {
  id: number;
  fullName: string;
  status: string;
}

interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  method: string;
  createdByName: string | null;
  deviceName: string | null;
}

interface AttendanceDevice {
  id: number;
  deviceName: string;
  deviceIp: string;
  port: number;
  method: string;
  location: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
}

const DEVICE_METHODS = ["Fingerprint", "NFC", "Face"];

export default function AttendancePage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const [devices, setDevices] = useState<AttendanceDevice[]>([]);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [deviceForm, setDeviceForm] = useState({ deviceName: "", deviceIp: "", port: "4370", method: "Fingerprint", location: "", isActive: true });
  const [deviceSaving, setDeviceSaving] = useState(false);
  const [syncingDeviceId, setSyncingDeviceId] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importDeviceId, setImportDeviceId] = useState("");

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get("/employees", { params: { page: 1, pageSize: 500 } });
      setEmployees(
        (res.data.data.items || res.data.data || []).filter((e: Employee) => e.status === "Active")
      );
    } catch (err: any) {
      setError(err.response?.data?.message || t("attendance.loadEmployeesError"));
    }
  }, [t]);

  const fetchAttendance = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterEmployeeId) params.employeeId = filterEmployeeId;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const res = await api.get("/attendance", { params });
      setRecords(res.data.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || t("attendance.loadRecordsError")
      );
    } finally {
      setRecordsLoading(false);
    }
  }, [filterEmployeeId, filterFrom, filterTo, t]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchEmployees();
      setLoading(false);
    };
    init();
  }, [fetchEmployees]);

  useEffect(() => {
    if (!loading) fetchAttendance();
  }, [loading, fetchAttendance]);

  const handleCheckIn = async () => {
    if (!selectedEmployeeId) {
      setActionError(t("attendance.selectEmployeeFirst"));
      return;
    }
    setActionError("");
    setActionSuccess("");
    setCheckingIn(true);
    try {
      await api.post("/attendance/check-in", {
        employeeId: Number(selectedEmployeeId),
      });
      setActionSuccess(t("attendance.checkInSuccess"));
      await fetchAttendance();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("attendance.checkInError")
      );
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selectedEmployeeId) {
      setActionError(t("attendance.selectEmployeeFirst"));
      return;
    }
    setActionError("");
    setActionSuccess("");
    setCheckingOut(true);
    try {
      await api.post("/attendance/check-out", {
        employeeId: Number(selectedEmployeeId),
      });
      setActionSuccess(t("attendance.checkOutSuccess"));
      await fetchAttendance();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("attendance.checkOutError")
      );
    } finally {
      setCheckingOut(false);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return "—";
    return time.substring(0, 5);
  };

  const fetchDevices = useCallback(async () => {
    try {
      const res = await api.get("/attendance/devices");
      setDevices(res.data.data || []);
    } catch {
      // تجاهل
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const methodLabel = (m: string) => t(`attendance.method.${m}`, m);

  const saveDevice = async () => {
    setDeviceSaving(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await api.post("/attendance/devices", {
        deviceName: deviceForm.deviceName.trim(),
        deviceIp: deviceForm.deviceIp.trim(),
        port: parseInt(deviceForm.port) || 4370,
        method: deviceForm.method,
        location: deviceForm.location.trim() || null,
        isActive: deviceForm.isActive,
      });
      setActionSuccess(res.data.message || t("attendance.deviceSaved"));
      setShowDeviceModal(false);
      setDeviceForm({ deviceName: "", deviceIp: "", port: "4370", method: "Fingerprint", location: "", isActive: true });
      await fetchDevices();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("attendance.deviceSaveError"));
    } finally {
      setDeviceSaving(false);
    }
  };

  const deleteDevice = async (device: AttendanceDevice) => {
    if (!(await confirm(`${t("attendance.confirmDeleteDevice")} "${device.deviceName}"؟`))) return;
    setActionError("");
    setActionSuccess("");
    try {
      await api.delete(`/attendance/devices/${device.id}`);
      setActionSuccess(t("attendance.deviceDeleted"));
      await fetchDevices();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("attendance.deviceDeleteError"));
    }
  };

  const syncDevice = async (device: AttendanceDevice) => {
    setSyncingDeviceId(device.id);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await api.post(`/attendance/devices/${device.id}/sync`);
      setActionSuccess(res.data.message || t("attendance.deviceSynced"));
      await fetchDevices();
      await fetchAttendance();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("attendance.deviceSyncError"));
    } finally {
      setSyncingDeviceId(null);
    }
  };

  const handleImport = async () => {
    const records = parseImportText(importText);
    if (records.length === 0) {
      setActionError(t("attendance.importEmpty"));
      return;
    }
    setImporting(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await api.post("/attendance/import", {
        deviceId: importDeviceId ? Number(importDeviceId) : null,
        records,
      });
      setActionSuccess(res.data.message || t("attendance.importDone"));
      setShowImportModal(false);
      setImportText("");
      await fetchAttendance();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("attendance.importError"));
    } finally {
      setImporting(false);
    }
  };

  const parseImportText = (text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const records: { deviceUserId: string; timestamp: string; isCheckIn: boolean }[] = [];
    for (const line of lines) {
      const parts = line.split(/[,\t;|]/).map((p) => p.trim());
      if (parts.length < 2) continue;
      const userId = parts[0];
      const timeStr = parts[1];
      const t = new Date(timeStr.replace(" ", "T"));
      if (isNaN(t.getTime())) continue;
      const type = (parts[2] || "in").toLowerCase();
      records.push({
        deviceUserId: userId,
        timestamp: t.toISOString(),
        isCheckIn: type.startsWith("in") || type.startsWith("دخول") || type === "1",
      });
    }
    return records;
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader icon="clock" title={t("attendance.title")} />

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <div className="card p-6 mb-6">
        <h2 className="text-[13.5px] font-bold text-[var(--ink)] mb-3">
          {t("attendance.record")}
        </h2>

        {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}

        <SuccessToast message={actionSuccess} fixed className="mb-4" />

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
              {t("attendance.employee")}
            </label>
            <div className="field-shell">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">{t("attendance.selectEmployee")}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Can code="Attendance.Add">
            <button onClick={handleCheckIn} disabled={checkingIn} className="btn btn-primary disabled:opacity-60">
              {checkingIn ? t("attendance.checkingIn") : t("attendance.checkIn")}
            </button>
            <button onClick={handleCheckOut} disabled={checkingOut} className="btn btn-secondary disabled:opacity-60">
              {checkingOut ? t("attendance.checkingOut") : t("attendance.checkOut")}
            </button>
          </Can>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-[13.5px] font-bold text-[var(--ink)]">{t("attendance.devices")}</h2>
          <Can code="Attendance.Add">
            <div className="flex items-center gap-2">
              <button onClick={() => { setImportDeviceId(""); setImportText(""); setShowImportModal(true); }} className="btn btn-outline btn-sm">
                {t("attendance.import")}
              </button>
              <button onClick={() => { setDeviceForm({ deviceName: "", deviceIp: "", port: "4370", method: "Fingerprint", location: "", isActive: true }); setShowDeviceModal(true); }} className="btn btn-primary btn-sm">
                + {t("attendance.addDevice")}
              </button>
            </div>
          </Can>
        </div>
        {devices.length === 0 ? (
          <p className="text-[13px] text-[var(--sub)]">{t("attendance.noDevices")}</p>
        ) : (
          <div className="space-y-3">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/40" style={{ opacity: d.isActive ? 1 : 0.55 }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-bold text-[var(--ink)]">{d.deviceName}</p>
                    <span className="badge badge--gray text-[10.5px]">{methodLabel(d.method)}</span>
                    <span className="text-[11px] text-[var(--sub)]" dir="ltr">{d.deviceIp}:{d.port}</span>
                    {d.location && <span className="text-[11px] text-[var(--sub)]">📍 {d.location}</span>}
                    <span className={`badge ${d.isActive ? "badge--green" : "badge--gray"}`}>{d.isActive ? t("attendance.active") : t("attendance.inactive")}</span>
                  </div>
                  {d.lastSyncedAt && <p className="text-[11px] text-[var(--sub)] mt-0.5">{t("attendance.lastSync")}: {new Date(d.lastSyncedAt).toLocaleString()}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Can code="Attendance.Add">
                    <button onClick={() => syncDevice(d)} disabled={syncingDeviceId === d.id} className="btn btn-outline btn-sm">
                      {syncingDeviceId === d.id ? t("common.loading") : t("attendance.sync")}
                    </button>
                    <button onClick={() => deleteDevice(d)} className="btn btn-danger btn-sm">{t("common.delete")}</button>
                  </Can>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-[13.5px] font-bold text-[var(--ink)] mb-3">{t("attendance.attendanceLog")}</h2>

        <div className="flex flex-wrap gap-3 mb-4">
          <div>
            <label className="block text-[11.5px] text-[var(--sub)] mb-1">{t("attendance.employee")}</label>
            <div className="field-shell">
              <select
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
              >
                <option value="">{t("common.all")}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11.5px] text-[var(--sub)] mb-1">{t("attendance.from")}</label>
            <div className="field-shell">
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-[11.5px] text-[var(--sub)] mb-1">{t("attendance.to")}</label>
            <div className="field-shell">
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={fetchAttendance} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px] py-2">
              {t("attendance.applyFilter")}
            </button>
          </div>
        </div>

        {recordsLoading ? (
          <p className="text-[var(--sub)] text-sm">{t("common.loading")}</p>
        ) : records.length === 0 ? (
          <p className="text-[var(--sub)] text-sm">{t("attendance.noRecords")}</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm hidden md:table">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("attendance.employee")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("attendance.date")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("attendance.timeIn")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("attendance.timeOut")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("attendance.method")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium">{record.employeeName}</td>
                    <td className="p-4 text-[var(--sub)]">{record.date}</td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">{formatTime(record.checkInTime)}</td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">{formatTime(record.checkOutTime)}</td>
                    <td className="p-4">
                      <span className={`badge ${record.method === "Manual" ? "badge--gray" : "badge--blue"}`}>
                        {methodLabel(record.method)}
                      </span>
                      {record.deviceName && <span className="text-[11px] text-[var(--sub)] block mt-0.5">{record.deviceName}</span>}
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {records.map((record) => (
                <div key={record.id} className="card p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("attendance.employee")}</p>
                      <p className="text-[12px] text-[var(--ink)] font-medium">{record.employeeName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("attendance.date")}</p>
                      <p className="text-[12px] text-[var(--sub)]">{record.date}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("attendance.timeIn")}</p>
                      <p className="text-[12px] text-[var(--sub)]" dir="ltr">{formatTime(record.checkInTime)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("attendance.timeOut")}</p>
                      <p className="text-[12px] text-[var(--sub)]" dir="ltr">{formatTime(record.checkOutTime)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>

        {showDeviceModal && (
          <div className="modal-overlay" onClick={() => setShowDeviceModal(false)}>
            <div className="modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[17px] font-bold text-[var(--blue-deep)]">{t("attendance.addDevice")}</h2>
                <button onClick={() => setShowDeviceModal(false)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
              </div>
              {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
              <div className="space-y-4">
                <div>
                  <label>{t("attendance.deviceName")}</label>
                  <div className="field-shell mt-1"><input type="text" value={deviceForm.deviceName} onChange={(e) => setDeviceForm({ ...deviceForm, deviceName: e.target.value })} placeholder={t("attendance.deviceNamePlaceholder")} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label>{t("attendance.deviceIp")}</label>
                    <div className="field-shell mt-1"><input type="text" dir="ltr" value={deviceForm.deviceIp} onChange={(e) => setDeviceForm({ ...deviceForm, deviceIp: e.target.value })} placeholder="192.168.1.100" /></div>
                  </div>
                  <div>
                    <label>{t("attendance.devicePort")}</label>
                    <div className="field-shell mt-1"><input type="number" dir="ltr" value={deviceForm.port} onChange={(e) => setDeviceForm({ ...deviceForm, port: e.target.value })} /></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label>{t("attendance.deviceMethod")}</label>
                    <div className="field-shell mt-1">
                      <select value={deviceForm.method} onChange={(e) => setDeviceForm({ ...deviceForm, method: e.target.value })}>
                        {DEVICE_METHODS.map((m) => <option key={m} value={m}>{methodLabel(m)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label>{t("attendance.deviceLocation")}</label>
                    <div className="field-shell mt-1"><input type="text" value={deviceForm.location} onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })} placeholder={t("attendance.deviceLocationPlaceholder")} /></div>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={deviceForm.isActive} onChange={(e) => setDeviceForm({ ...deviceForm, isActive: e.target.checked })} />
                  <span className="text-[13px] font-bold text-[var(--ink)]">{t("attendance.active")}</span>
                </label>
                <div className="flex gap-3">
                  <button onClick={() => setShowDeviceModal(false)} className="btn btn-outline flex-1">{t("common.cancel")}</button>
                  <button onClick={saveDevice} disabled={deviceSaving} className="btn btn-primary flex-1">{deviceSaving ? t("common.saving") : t("common.save")}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
            <div className="modal-card max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[17px] font-bold text-[var(--blue-deep)]">{t("attendance.import")}</h2>
                <button onClick={() => setShowImportModal(false)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
              </div>
              {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
              <div className="space-y-4">
                <div>
                  <label>{t("attendance.importDevice")}</label>
                  <div className="field-shell mt-1">
                    <select value={importDeviceId} onChange={(e) => setImportDeviceId(e.target.value)}>
                      <option value="">{t("attendance.importNoDevice")}</option>
                      {devices.map((d) => <option key={d.id} value={d.id}>{d.deviceName}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label>{t("attendance.importHint")}</label>
                  <div className="field-shell mt-1">
                    <textarea rows={8} dir="ltr" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={t("attendance.importPlaceholder")} className="font-mono text-[12px]" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowImportModal(false)} className="btn btn-outline flex-1">{t("common.cancel")}</button>
                  <button onClick={handleImport} disabled={importing} className="btn btn-primary flex-1">{importing ? t("common.loading") : t("attendance.import")}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

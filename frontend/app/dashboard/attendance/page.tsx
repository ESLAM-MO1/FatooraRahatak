"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

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
}

export default function AttendancePage() {
  const { t } = useTranslation();
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

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get("/employees");
      setEmployees(
        res.data.data.filter((e: Employee) => e.status === "Active")
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

        {actionSuccess && <div className="alert alert--success mb-4">{actionSuccess}</div>}

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
          <button onClick={handleCheckIn} disabled={checkingIn} className="btn btn-primary disabled:opacity-60">
            {checkingIn ? t("attendance.checkingIn") : t("attendance.checkIn")}
          </button>
          <button onClick={handleCheckOut} disabled={checkingOut} className="btn btn-secondary disabled:opacity-60">
            {checkingOut ? t("attendance.checkingOut") : t("attendance.checkOut")}
          </button>
        </div>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("attendance.employee")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("attendance.date")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("attendance.timeIn")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("attendance.timeOut")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium">{record.employeeName}</td>
                    <td className="p-4 text-[var(--sub)]">{record.date}</td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">{formatTime(record.checkInTime)}</td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">{formatTime(record.checkOutTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

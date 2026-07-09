"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

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

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="18" height="18">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const alertPath = "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";
const checkPath = "M20 6 9 17l-5-5";

export default function AttendancePage() {
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
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل الموظفين");
    }
  }, []);

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
        err.response?.data?.message || "حدث خطأ أثناء تحميل سجل الحضور"
      );
    } finally {
      setRecordsLoading(false);
    }
  }, [filterEmployeeId, filterFrom, filterTo]);

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
      setActionError("اختر موظفًا أولاً");
      return;
    }
    setActionError("");
    setActionSuccess("");
    setCheckingIn(true);
    try {
      await api.post("/attendance/check-in", {
        employeeId: Number(selectedEmployeeId),
      });
      setActionSuccess("تم تسجيل الحضور بنجاح");
      await fetchAttendance();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء تسجيل الحضور"
      );
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selectedEmployeeId) {
      setActionError("اختر موظفًا أولاً");
      return;
    }
    setActionError("");
    setActionSuccess("");
    setCheckingOut(true);
    try {
      await api.post("/attendance/check-out", {
        employeeId: Number(selectedEmployeeId),
      });
      setActionSuccess("تم تسجيل الانصراف بنجاح");
      await fetchAttendance();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء تسجيل الانصراف"
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
    return (
      <div className="flex items-center gap-3 text-[var(--sub)]">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
        جاري التحميل...
      </div>
    );
  }

  return (
    <div dir="rtl">
      <h1 className="text-[22px] font-bold text-[var(--blue-deep)] mb-6">
        الحضور والانصراف
      </h1>

      {error && (
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="card p-6 mb-6">
        <h2 className="text-[13.5px] font-bold text-[var(--ink)] mb-3">
          تسجيل حضور / انصراف
        </h2>

        {actionError && (
          <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
            <Icon path={alertPath} className="shrink-0 mt-0.5" />
            {actionError}
          </div>
        )}

        {actionSuccess && (
          <div className="bg-[var(--green-soft)] text-[var(--green)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
            <Icon path={checkPath} className="shrink-0 mt-0.5" />
            {actionSuccess}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
              الموظف
            </label>
            <div className="field-shell">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">اختر الموظف</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={handleCheckIn} disabled={checkingIn} className="btn-primary disabled:opacity-60">
            {checkingIn ? "جاري التسجيل..." : "تسجيل حضور"}
          </button>
          <button onClick={handleCheckOut} disabled={checkingOut} className="btn-secondary disabled:opacity-60">
            {checkingOut ? "جاري التسجيل..." : "تسجيل انصراف"}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-[13.5px] font-bold text-[var(--ink)] mb-3">سجل الحضور</h2>

        <div className="flex flex-wrap gap-3 mb-4">
          <div>
            <label className="block text-[11.5px] text-[var(--sub)] mb-1">الموظف</label>
            <div className="field-shell">
              <select
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
              >
                <option value="">الكل</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11.5px] text-[var(--sub)] mb-1">من</label>
            <div className="field-shell">
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-[11.5px] text-[var(--sub)] mb-1">إلى</label>
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
              تطبيق الفلتر
            </button>
          </div>
        </div>

        {recordsLoading ? (
          <p className="text-[var(--sub)] text-sm">جاري التحميل...</p>
        ) : records.length === 0 ? (
          <p className="text-[var(--sub)] text-sm">لا توجد سجلات حضور.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الموظف</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">التاريخ</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">وقت الحضور</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">وقت الانصراف</th>
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
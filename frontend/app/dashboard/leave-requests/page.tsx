"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

interface Employee {
  id: number;
  fullName: string;
  status: string;
}

interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
}

const LEAVE_TYPES = [
  { value: "Annual", label: "سنوية" },
  { value: "Sick", label: "مرضية" },
  { value: "Emergency", label: "طارئة" },
  { value: "Unpaid", label: "بدون راتب" },
];

const STATUS_LABELS: Record<string, string> = {
  Pending: "قيد الانتظار",
  Approved: "معتمد",
  Rejected: "مرفوض",
};

const emptyForm = {
  employeeId: "",
  leaveType: "",
  startDate: "",
  endDate: "",
  reason: "",
};

const leaveTypeLabel = (type: string) =>
  LEAVE_TYPES.find((t) => t.value === type)?.label ?? type;

const statusLabel = (status: string) => STATUS_LABELS[status] ?? status;

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="18" height="18">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const plusPath = "M12 5v14M5 12h14";
const alertPath = "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";

export default function LeaveRequestsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

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

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (filterEmployeeId) params.employeeId = filterEmployeeId;
      const res = await api.get("/leave-requests", { params });
      setRequests(res.data.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "حدث خطأ أثناء تحميل طلبات الإجازة"
      );
    } finally {
      setRequestsLoading(false);
    }
  }, [filterEmployeeId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchEmployees();
      setLoading(false);
    };
    init();
  }, [fetchEmployees]);

  useEffect(() => {
    if (!loading) fetchRequests();
  }, [loading, fetchRequests]);

  const openModal = () => {
    setForm(emptyForm);
    setActionError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(emptyForm);
    setActionError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setSubmitting(true);

    try {
      await api.post("/leave-requests", {
        employeeId: Number(form.employeeId),
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim() || null,
      });
      closeModal();
      await fetchRequests();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء تقديم طلب الإجازة"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (request: LeaveRequest) => {
    if (!confirm(`هل تريد اعتماد طلب إجازة ${request.employeeName}؟`)) return;

    setActionError("");
    setProcessingId(request.id);
    try {
      await api.put(`/leave-requests/${request.id}/approve`);
      await fetchRequests();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء اعتماد الطلب"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: LeaveRequest) => {
    if (!confirm(`هل تريد رفض طلب إجازة ${request.employeeName}؟`)) return;

    setActionError("");
    setProcessingId(request.id);
    try {
      await api.put(`/leave-requests/${request.id}/reject`);
      await fetchRequests();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء رفض الطلب"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const statusClass = (status: string) => {
    switch (status) {
      case "Approved":
        return "text-[var(--green)] bg-[var(--green-soft)]";
      case "Rejected":
        return "text-[var(--danger)] bg-[var(--danger-soft)]";
      default:
        return "text-[var(--gold-deep)] bg-[var(--gold-soft)]";
    }
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]">طلبات الإجازات</h1>
        <button onClick={openModal} className="btn-primary">
          <Icon path={plusPath} />
          تقديم طلب إجازة
        </button>
      </div>

      {error && (
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {actionError && (
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {actionError}
        </div>
      )}

      <div className="card p-6">
        <div className="flex flex-wrap items-end gap-3 mb-4">
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
          <button onClick={fetchRequests} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px] py-2">
            تطبيق الفلتر
          </button>
        </div>

        {requestsLoading ? (
          <p className="text-[var(--sub)] text-sm">جاري التحميل...</p>
        ) : requests.length === 0 ? (
          <p className="text-[var(--sub)] text-sm">لا توجد طلبات إجازة.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الموظف</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">نوع الإجازة</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">من</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">إلى</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">السبب</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الحالة</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium">{request.employeeName}</td>
                    <td className="p-4 text-[var(--sub)]">{leaveTypeLabel(request.leaveType)}</td>
                    <td className="p-4 text-[var(--sub)]">{request.startDate}</td>
                    <td className="p-4 text-[var(--sub)]">{request.endDate}</td>
                    <td className="p-4 text-[var(--sub)]">{request.reason || "—"}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${statusClass(request.status)}`}>
                        {statusLabel(request.status)}
                      </span>
                    </td>
                    <td className="p-4">
                      {request.status === "Pending" && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(request)}
                            disabled={processingId === request.id}
                            className="text-[var(--green)] hover:opacity-80 font-medium text-[13px] disabled:opacity-50"
                          >
                            {processingId === request.id ? "جاري..." : "اعتماد"}
                          </button>
                          <button
                            onClick={() => handleReject(request)}
                            disabled={processingId === request.id}
                            className="text-[var(--danger)] hover:opacity-80 font-medium text-[13px] disabled:opacity-50"
                          >
                            رفض
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[var(--blue-deep)]/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-[18px] font-bold text-[var(--blue-deep)] mb-4">
              تقديم طلب إجازة
            </h2>

            {actionError && (
              <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الموظف</label>
                <div className="field-shell">
                  <select
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    required
                  >
                    <option value="">اختر الموظف</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">نوع الإجازة</label>
                <div className="field-shell">
                  <select
                    value={form.leaveType}
                    onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                    required
                  >
                    <option value="">اختر نوع الإجازة</option>
                    {LEAVE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">تاريخ البداية</label>
                <div className="field-shell">
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">تاريخ النهاية</label>
                <div className="field-shell">
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">السبب (اختياري)</label>
                <div className="field-shell items-start">
                  <textarea
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-60">
                  {submitting ? "جاري الإرسال..." : "تقديم الطلب"}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
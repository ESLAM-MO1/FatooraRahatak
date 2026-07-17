"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import "@/lib/i18n/config";

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
  { value: "Annual", labelKey: "leaveRequest.annual" },
  { value: "Sick", labelKey: "leaveRequest.sick" },
  { value: "Emergency", labelKey: "leaveRequest.emergency" },
  { value: "Unpaid", labelKey: "leaveRequest.unpaid" },
];

const STATUS_LABELS: Record<string, string> = {
  Pending: "leaveRequest.pending",
  Approved: "leaveRequest.approved",
  Rejected: "leaveRequest.rejected",
};

const emptyForm = {
  employeeId: "",
  leaveType: "",
  startDate: "",
  endDate: "",
  reason: "",
};

const leaveTypeLabel = (type: string) =>
  LEAVE_TYPES.find((t) => t.value === type)?.labelKey ?? type;

const statusLabel = (status: string) => STATUS_LABELS[status] ?? status;

export default function LeaveRequestsPage() {
  const { t } = useTranslation();
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
      setError(err.response?.data?.message || t("leaveRequest.loadEmployeesError"));
    }
  }, [t]);

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
        err.response?.data?.message || t("leaveRequest.loadRequestsError")
      );
    } finally {
      setRequestsLoading(false);
    }
  }, [filterEmployeeId, t]);

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
        err.response?.data?.message || t("leaveRequest.submitError")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (request: LeaveRequest) => {
    if (!confirm(t("leaveRequest.confirmApprove", { name: request.employeeName }))) return;

    setActionError("");
    setProcessingId(request.id);
    try {
      await api.put(`/leave-requests/${request.id}/approve`);
      await fetchRequests();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("leaveRequest.approveError")
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: LeaveRequest) => {
    if (!confirm(t("leaveRequest.confirmReject", { name: request.employeeName }))) return;

    setActionError("");
    setProcessingId(request.id);
    try {
      await api.put(`/leave-requests/${request.id}/reject`);
      await fetchRequests();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("leaveRequest.rejectError")
      );
    } finally {
      setProcessingId(null);
    }
  };

  const statusClass = (status: string) => {
    switch (status) {
      case "Approved":
        return "badge badge--green";
      case "Rejected":
        return "badge badge--red";
      default:
        return "badge badge--yellow";
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader icon="calendarOff" title={t("leaveRequest.title")}>
        <button onClick={openModal} className="btn btn-primary">
          <Icon name="plus" />
          {t("leaveRequest.newRequest")}
        </button>
      </PageHeader>

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}

      <div className="card p-6">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-[11.5px] text-[var(--sub)] mb-1">{t("leaveRequest.employee")}</label>
            <div className="field-shell">
              <select
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
              >
                <option value="">{t("leaveRequest.all")}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={fetchRequests} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px] py-2">
            {t("leaveRequest.applyFilter")}
          </button>
        </div>

        {requestsLoading ? (
          <p className="text-[var(--sub)] text-sm">{t("leaveRequest.loading")}</p>
        ) : requests.length === 0 ? (
          <p className="text-[var(--sub)] text-sm">{t("leaveRequest.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("leaveRequest.employee")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("leaveRequest.leaveType")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("leaveRequest.from")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("leaveRequest.to")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("leaveRequest.reason")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("leaveRequest.status")}</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("leaveRequest.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium">{request.employeeName}</td>
                    <td className="p-4 text-[var(--sub)]">{t(leaveTypeLabel(request.leaveType))}</td>
                    <td className="p-4 text-[var(--sub)]">{request.startDate}</td>
                    <td className="p-4 text-[var(--sub)]">{request.endDate}</td>
                    <td className="p-4 text-[var(--sub)]">{request.reason || "—"}</td>
                    <td className="p-4">
                      <span className={statusClass(request.status)}>
                        {t(statusLabel(request.status))}
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
                            {processingId === request.id ? t("leaveRequest.processing") : t("leaveRequest.approve")}
                          </button>
                          <button
                            onClick={() => handleReject(request)}
                            disabled={processingId === request.id}
                            className="text-[var(--danger)] hover:opacity-80 font-medium text-[13px] disabled:opacity-50"
                          >
                            {t("leaveRequest.reject")}
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
        <div className="modal-overlay">
          <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-[18px] font-bold text-[var(--blue-deep)] mb-4">
              {t("leaveRequest.modalTitle")}
            </h2>

            {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("leaveRequest.employee")}</label>
                <div className="field-shell">
                  <select
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    required
                  >
                    <option value="">{t("leaveRequest.selectEmployee")}</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("leaveRequest.leaveType")}</label>
                <div className="field-shell">
                  <select
                    value={form.leaveType}
                    onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                    required
                  >
                    <option value="">{t("leaveRequest.selectLeaveType")}</option>
                    {LEAVE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{t(type.labelKey)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("leaveRequest.startDate")}</label>
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
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("leaveRequest.endDate")}</label>
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
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("leaveRequest.reasonOptional")}</label>
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
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1 disabled:opacity-60">
                  {submitting ? t("leaveRequest.submitting") : t("leaveRequest.submit")}
                </button>
                <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">
                  {t("leaveRequest.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

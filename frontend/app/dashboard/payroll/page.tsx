"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

interface Payroll {
  id: number;
  employeeId: number;
  employeeName: string;
  periodMonth: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  commission: number;
  netSalary: number;
  status: "Draft" | "Approved" | "Paid";
}

const emptyEditForm = {
  allowances: "",
  deductions: "",
  commission: "",
};

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="18" height="18">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const alertPath = "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [generating, setGenerating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);

  const fetchPayrolls = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/payroll", {
        params: { year, month },
      });
      setPayrolls(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل الرواتب");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  const handleGenerate = async () => {
    setActionError("");
    setGenerating(true);

    try {
      await api.post("/payroll/generate", { year, month });
      await fetchPayrolls();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء إنشاء الرواتب"
      );
    } finally {
      setGenerating(false);
    }
  };

  const openEditModal = (payroll: Payroll) => {
    setEditingPayroll(payroll);
    setEditForm({
      allowances: payroll.allowances.toString(),
      deductions: payroll.deductions.toString(),
      commission: payroll.commission.toString(),
    });
    setActionError("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingPayroll(null);
    setEditForm(emptyEditForm);
    setActionError("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayroll) return;

    setActionError("");
    setSubmittingEdit(true);

    try {
      await api.put(`/payroll/${editingPayroll.id}`, {
        allowances: parseFloat(editForm.allowances) || 0,
        deductions: parseFloat(editForm.deductions) || 0,
        commission: parseFloat(editForm.commission) || 0,
      });
      closeEditModal();
      await fetchPayrolls();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء تحديث الراتب"
      );
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleApprove = async (payroll: Payroll) => {
    if (
      !window.confirm(
        `هل أنت متأكد من اعتماد راتب "${payroll.employeeName}"؟`
      )
    ) {
      return;
    }

    setActionError("");
    setApprovingId(payroll.id);
    try {
      await api.put(`/payroll/${payroll.id}/approve`);
      await fetchPayrolls();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء اعتماد الراتب"
      );
    } finally {
      setApprovingId(null);
    }
  };

  const handleMarkPaid = async (payroll: Payroll) => {
    if (
      !window.confirm(
        `هل أنت متأكد من تسجيل صرف راتب "${payroll.employeeName}"؟`
      )
    ) {
      return;
    }

    setActionError("");
    setPayingId(payroll.id);
    try {
      await api.put(`/payroll/${payroll.id}/mark-paid`);
      await fetchPayrolls();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء تسجيل الصرف"
      );
    } finally {
      setPayingId(null);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "Draft":
        return "مسودة";
      case "Approved":
        return "معتمد";
      case "Paid":
        return "مصرف";
      default:
        return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "text-[var(--gold-deep)] bg-[var(--gold-soft)]";
      case "Approved":
        return "text-[var(--blue-deep)] bg-[var(--blue-50)]";
      case "Paid":
        return "text-[var(--green)] bg-[var(--green-soft)]";
      default:
        return "text-[var(--sub)] bg-[#F1F2F4]";
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
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]">الرواتب</h1>

        <div className="card p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">السنة</label>
              <div className="field-shell max-w-[150px]">
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                  min={2020}
                  max={2030}
                />
              </div>
            </div>
            <div>
              <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الشهر</label>
              <div className="field-shell max-w-[150px]">
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary whitespace-nowrap disabled:opacity-60"
            >
              {generating ? "جاري الإنشاء..." : "إنشاء رواتب الشهر"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 text-sm flex items-start gap-2">
            <Icon path={alertPath} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {actionError && !showEditModal && (
          <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 text-sm flex items-start gap-2">
            <Icon path={alertPath} className="shrink-0 mt-0.5" />
            {actionError}
          </div>
        )}

        <div className="card overflow-hidden">
          {payrolls.length === 0 ? (
            <p className="p-6 text-[var(--sub)] text-sm text-center">
              لا توجد رواتب لهذا الشهر. اضغط "إنشاء رواتب الشهر" لإنشاء رواتب لكل الموظفين النشطين.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                  <tr>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">اسم الموظف</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الراتب الأساسي</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">البدلات</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الخصومات</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">العمولة</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الصافي</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الحالة</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map((payroll) => (
                    <tr key={payroll.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                      <td className="p-4 text-[var(--ink)] font-bold">{payroll.employeeName}</td>
                      <td className="p-4 text-[var(--ink)]" dir="ltr">{payroll.basicSalary.toLocaleString("ar-SA")} ر.س</td>
                      <td className="p-4 text-[var(--ink)]" dir="ltr">{payroll.allowances.toLocaleString("ar-SA")} ر.س</td>
                      <td className="p-4 text-[var(--ink)]" dir="ltr">{payroll.deductions.toLocaleString("ar-SA")} ر.س</td>
                      <td className="p-4 text-[var(--ink)]" dir="ltr">{payroll.commission.toLocaleString("ar-SA")} ر.س</td>
                      <td className="p-4 text-[var(--blue-deep)] font-bold" dir="ltr">{payroll.netSalary.toLocaleString("ar-SA")} ر.س</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusColor(payroll.status)}`}>
                          {statusLabel(payroll.status)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {payroll.status === "Draft" && (
                            <>
                              <button onClick={() => openEditModal(payroll)} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]">
                                تعديل
                              </button>
                              <button
                                onClick={() => handleApprove(payroll)}
                                disabled={approvingId === payroll.id}
                                className="text-[var(--green)] hover:opacity-80 font-medium text-[13px] disabled:opacity-50"
                              >
                                {approvingId === payroll.id ? "جاري الاعتماد..." : "اعتماد"}
                              </button>
                            </>
                          )}
                          {payroll.status === "Approved" && (
                            <button
                              onClick={() => handleMarkPaid(payroll)}
                              disabled={payingId === payroll.id}
                              className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px] disabled:opacity-50"
                            >
                              {payingId === payroll.id ? "جاري التسجيل..." : "تسجيل الصرف"}
                            </button>
                          )}
                          {payroll.status === "Paid" && (
                            <span className="text-[var(--sub)] text-[13px]">تم الصرف</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showEditModal && editingPayroll && (
          <div className="fixed inset-0 bg-[var(--blue-deep)]/50 flex items-center justify-center z-50 p-4">
            <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-[18px] font-bold text-[var(--blue-deep)] mb-4">
                تعديل راتب {editingPayroll.employeeName}
              </h2>

              {actionError && (
                <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
                    الراتب الأساسي (للقراءة فقط)
                  </label>
                  <div className="field-shell bg-[#F7F8F9]">
                    <input
                      type="text"
                      value={editingPayroll.basicSalary.toLocaleString("ar-SA") + " ر.س"}
                      disabled
                      className="text-[var(--sub)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">البدلات</label>
                  <div className="field-shell">
                    <input
                      type="number"
                      value={editForm.allowances}
                      onChange={(e) => setEditForm({ ...editForm, allowances: e.target.value })}
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الخصومات</label>
                  <div className="field-shell">
                    <input
                      type="number"
                      value={editForm.deductions}
                      onChange={(e) => setEditForm({ ...editForm, deductions: e.target.value })}
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">العمولة</label>
                  <div className="field-shell">
                    <input
                      type="number"
                      value={editForm.commission}
                      onChange={(e) => setEditForm({ ...editForm, commission: e.target.value })}
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="bg-[var(--blue-50)] p-4 rounded-xl text-sm">
                  <p className="font-bold text-[var(--ink)]">
                    الصافي المتوقع:{" "}
                    <span className="text-[var(--blue-deep)]" dir="ltr">
                      {(
                        editingPayroll.basicSalary +
                        (parseFloat(editForm.allowances) || 0) +
                        (parseFloat(editForm.commission) || 0) -
                        (parseFloat(editForm.deductions) || 0)
                      ).toLocaleString("ar-SA")}
                    </span>{" "}
                    ر.س
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={submittingEdit} className="btn-primary flex-1 disabled:opacity-60">
                    {submittingEdit ? "جاري الحفظ..." : "حفظ"}
                  </button>
                  <button type="button" onClick={closeEditModal} className="btn-secondary flex-1">
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
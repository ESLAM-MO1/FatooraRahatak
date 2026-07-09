"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

interface Employee {
  id: number;
  fullName: string;
  email: string;
  roleName: string;
  salary: number;
  status: string;
  hireDate: string;
}

const ROLES = [
  { value: "Accountant", label: "محاسب" },
  { value: "Cashier", label: "كاشير" },
  { value: "InventoryManager", label: "مدير مخزون" },
  { value: "OrdersManager", label: "مسؤول طلبات" },
  { value: "Marketing", label: "تسويق" },
];

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  roleName: "",
  salary: "",
};

const roleLabel = (roleName: string) =>
  ROLES.find((r) => r.value === roleName)?.label ?? roleName;

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} width="18" height="18">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const plusPath = "M12 5v14M5 12h14";
const alertPath = "M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/employees");
      setEmployees(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل الموظفين");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const openAddModal = () => {
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
      await api.post("/employees", {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        roleName: form.roleName,
        salary: parseFloat(form.salary) || 0,
      });
      closeModal();
      await fetchEmployees();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء إضافة الموظف"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (employee: Employee) => {
    if (
      !window.confirm(
        `هل أنت متأكد من إنهاء خدمة "${employee.fullName}"؟`
      )
    ) {
      return;
    }

    setActionError("");
    setDeactivatingId(employee.id);
    try {
      await api.put(`/employees/${employee.id}/deactivate`);
      await fetchEmployees();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || "حدث خطأ أثناء إنهاء الخدمة"
      );
    } finally {
      setDeactivatingId(null);
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]">الموظفين</h1>
        <button onClick={openAddModal} className="btn-primary">
          <Icon path={plusPath} />
          إضافة موظف
        </button>
      </div>

      {error && (
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {actionError && !showModal && (
        <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm flex items-start gap-2">
          <Icon path={alertPath} className="shrink-0 mt-0.5" />
          {actionError}
        </div>
      )}

      <div className="card overflow-hidden">
        {employees.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">لا يوجد موظفون بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                <tr>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الاسم</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الإيميل</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الدور الوظيفي</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الراتب</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">الحالة</th>
                  <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                    <td className="p-4 text-[var(--ink)] font-medium">{employee.fullName}</td>
                    <td className="p-4 text-[var(--sub)]" dir="ltr">{employee.email}</td>
                    <td className="p-4 text-[var(--sub)]">{roleLabel(employee.roleName)}</td>
                    <td className="p-4 text-[var(--ink)]">{employee.salary.toLocaleString("ar-SA")} ر.س</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          employee.status === "Active"
                            ? "text-[var(--green)] bg-[var(--green-soft)]"
                            : "text-[var(--danger)] bg-[var(--danger-soft)]"
                        }`}
                      >
                        {employee.status === "Active" ? "نشط" : "منتهي الخدمة"}
                      </span>
                    </td>
                    <td className="p-4">
                      {employee.status === "Active" && (
                        <button
                          onClick={() => handleDeactivate(employee)}
                          disabled={deactivatingId === employee.id}
                          className="text-[var(--danger)] hover:opacity-80 font-medium text-[13px] disabled:opacity-50"
                        >
                          {deactivatingId === employee.id
                            ? "جاري التنفيذ..."
                            : "إنهاء الخدمة"}
                        </button>
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
              إضافة موظف
            </h2>

            {actionError && (
              <div className="bg-[var(--danger-soft)] text-[var(--danger)] rounded-xl p-4 mb-4 text-sm">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الاسم الكامل</label>
                <div className="field-shell">
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">البريد الإلكتروني</label>
                <div className="field-shell">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الجوال</label>
                <div className="field-shell">
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">كلمة المرور المبدئية</label>
                <div className="field-shell">
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الدور الوظيفي</label>
                <div className="field-shell">
                  <select
                    value={form.roleName}
                    onChange={(e) => setForm({ ...form, roleName: e.target.value })}
                    required
                  >
                    <option value="">اختر الدور</option>
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">الراتب</label>
                <div className="field-shell">
                  <input
                    type="number"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    required
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-60">
                  {submitting ? "جاري الحفظ..." : "حفظ"}
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
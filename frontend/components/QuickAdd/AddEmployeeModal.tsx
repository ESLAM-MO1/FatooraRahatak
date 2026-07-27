"use client";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

interface Props {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

interface Role {
  id: number;
  roleName: string;
  isSystemRole: boolean;
}

const emptyForm = { fullName: "", email: "", phone: "", password: "", roleName: "", salary: "" };

export default function AddEmployeeModal({ onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [roles, setRoles] = useState<Role[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    api.get("/roles").then(r => setRoles(r.data.data)).catch(() => {});
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setSubmitting(true);
    try {
      await api.post("/employees", { ...form, salary: parseFloat(form.salary) || 0 });
      onSuccess(t("employee.addSuccess"));
      onClose();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-[18px] font-bold text-[var(--blue-deep)] mb-4">{t("employee.add")}</h2>
        {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label>{t("employee.name")}</label><div className="field-shell"><input type="text" value={form.fullName} onChange={set("fullName")} required /></div></div>
          <div><label>{t("employee.email")}</label><div className="field-shell"><input type="email" value={form.email} onChange={set("email")} required /></div></div>
          <div><label>{t("employee.phone")}</label><div className="field-shell"><input type="text" value={form.phone} onChange={set("phone")} required /></div></div>
          <div><label>{t("employee.password")}</label><div className="field-shell"><input type="password" value={form.password} onChange={set("password")} required /></div></div>
          <div><label>{t("employee.jobRole")}</label><div className="field-shell">
            <select value={form.roleName} onChange={set("roleName")} required>
              <option value="">{t("common.select")}</option>
              {roles.filter(r => r.roleName !== "SuperAdmin" && r.roleName !== "SupportStaff" && r.roleName !== "Owner").map(r => <option key={r.id} value={r.roleName}>{r.roleName}</option>)}
            </select>
          </div></div>
          <div><label>{t("employee.salary")}</label><div className="field-shell"><input type="number" value={form.salary} onChange={set("salary")} /></div></div>
          <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? t("common.loading") : t("employee.submitAdd")}</button>
        </form>
      </div>
    </div>
  );
}

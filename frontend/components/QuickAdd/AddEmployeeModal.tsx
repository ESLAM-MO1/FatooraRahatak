"use client";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import EmployeeFormFields, { EmployeeFormValues, emptyEmployeeForm } from "@/components/EmployeeFormFields";

interface Props {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

interface Role {
  id: number;
  roleName: string;
  isSystemRole: boolean;
}

export default function AddEmployeeModal({ onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<EmployeeFormValues>(emptyEmployeeForm);
  const [roles, setRoles] = useState<Role[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const roleLabel = (name: string) => t(`role.${name}`, name);

  useEffect(() => {
    api.get("/roles").then(r => setRoles(r.data.data)).catch(() => {});
  }, []);

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
        nationalId: form.nationalId.trim() || null,
        nationalAddress: form.nationalAddress.trim() || null,
        birthDate: form.birthDate || null,
        hireDate: form.hireDate || null,
        deviceUserId: form.deviceUserId.trim() || null,
      });
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-bold text-[var(--blue-deep)]">{t("employee.add")}</h2>
          <button type="button" onClick={onClose} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
        </div>
        {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}
        <EmployeeFormFields
          form={form}
          setForm={setForm}
          roles={roles.filter(r => r.roleName !== "SuperAdmin" && r.roleName !== "SupportStaff" && r.roleName !== "Owner")}
          roleLabel={roleLabel}
          showCredentials
          submitting={submitting}
          submitLabel={t("employee.submitAdd")}
          cancelLabel={t("common.cancel")}
          onCancel={onClose}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

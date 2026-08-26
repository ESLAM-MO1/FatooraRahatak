"use client";

/**
 * الحقول المشتركة لفورم الموظف (إضافة / تعديل) — مصدر واحد للبنية والتصميم
 * والـ validation حتى لا يحدث انحراف بين الفورمين. الفرق الوحيد أن فورم
 * الإضافة يعرض أيضاً حقلَي email و password (ضروريان لإنشاء الحساب).
 */

import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

export interface EmployeeFormValues {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  roleName: string;
  salary: string;
  nationalId: string;
  nationalAddress: string;
  birthDate: string;
  hireDate: string;
  deviceUserId: string;
}

export interface EmployeeRole {
  id: number;
  roleName: string;
  permissionCodes?: string[];
}

export const emptyEmployeeForm: EmployeeFormValues = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  roleName: "",
  salary: "",
  nationalId: "",
  nationalAddress: "",
  birthDate: "",
  hireDate: "",
  deviceUserId: "",
};

interface Props {
  form: EmployeeFormValues;
  setForm: (updater: (prev: EmployeeFormValues) => EmployeeFormValues) => void;
  roles: EmployeeRole[];
  roleLabel?: (name: string) => string;
  roleHint?: (roleName: string) => string;
  showCredentials?: boolean; // فورم الإضافة فقط: email + password
  showActions?: boolean; // أزرار الحفظ/الإلغاء في نهاية الفورم
  submitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  onSubmit?: (e: React.FormEvent) => void;
}

export default function EmployeeFormFields({
  form,
  setForm,
  roles,
  roleLabel,
  roleHint,
  showCredentials = false,
  showActions = true,
  submitting = false,
  submitLabel,
  cancelLabel,
  onCancel,
  onSubmit,
}: Props) {
  const { t } = useTranslation();

  const set = (field: keyof EmployeeFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const label = roleLabel || ((name: string) => t(`role.${name}`, name));
  const hint = roleHint || (() => "");

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {showCredentials && (
        <>
          <div>
            <label>{t("employee.email")}</label>
            <div className="field-shell">
              <input type="email" value={form.email} onChange={set("email")} required dir="ltr" />
            </div>
          </div>
          <div>
            <label>{t("employee.password")}</label>
            <div className="field-shell">
              <input type="password" value={form.password} onChange={set("password")} required autoComplete="new-password" />
            </div>
          </div>
        </>
      )}

      <div>
        <label>{t("employee.name")}</label>
        <div className="field-shell">
          <input type="text" value={form.fullName} onChange={set("fullName")} required />
        </div>
      </div>

      <div>
        <label>{t("employee.phone")}</label>
        <div className="field-shell">
          <input type="text" value={form.phone} onChange={set("phone")} />
        </div>
      </div>

      <div>
        <label>{t("employee.jobRole")}</label>
        <div className="field-shell">
          <select value={form.roleName} onChange={set("roleName")} required>
            <option value="">{t("common.select")}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.roleName}>
                {label(r.roleName)}
              </option>
            ))}
          </select>
        </div>
        {form.roleName && hint(form.roleName) && (
          <p className="text-[11px] text-[var(--sub)] mt-1">{hint(form.roleName)}</p>
        )}
      </div>

      <div>
        <label>{t("employee.salary")}</label>
        <div className="field-shell">
          <input type="number" min="0" step="0.01" value={form.salary} onChange={set("salary")} />
        </div>
      </div>

      <div>
        <label>{t("employee.nationalId")}</label>
        <div className="field-shell">
          <input type="text" value={form.nationalId} onChange={set("nationalId")} placeholder={t("employee.nationalIdPlaceholder")} />
        </div>
      </div>

      <div>
        <label>{t("employee.nationalAddress")}</label>
        <div className="field-shell">
          <input type="text" value={form.nationalAddress} onChange={set("nationalAddress")} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label>{t("employee.birthDate")}</label>
          <div className="field-shell">
            <input type="date" value={form.birthDate} onChange={set("birthDate")} />
          </div>
        </div>
        <div>
          <label>{t("employee.hireDate")}</label>
          <div className="field-shell">
            <input type="date" value={form.hireDate} onChange={set("hireDate")} />
          </div>
        </div>
      </div>

      <div>
        <label>{t("employee.deviceUserId")}</label>
        <div className="field-shell">
          <input type="text" value={form.deviceUserId} onChange={set("deviceUserId")} placeholder={t("employee.deviceUserIdPlaceholder")} />
        </div>
      </div>

      {showActions && (
        <div className="flex justify-end gap-3 pt-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn btn-outline btn-sm">
              {cancelLabel || t("common.cancel")}
            </button>
          )}
          <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
            {submitting ? t("common.loading") : submitLabel || t("common.save")}
          </button>
        </div>
      )}
    </form>
  );
}

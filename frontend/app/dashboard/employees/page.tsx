"use client";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { getInvitations, createInvitation } from "@/lib/invitations";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";

interface Employee {
  id: number; fullName: string; email: string; roleName: string;
  salary: number; status: string; hireDate: string;
}
interface Invitation {
  id: number; email: string; status: string; roleName: string;
  token: string; createdAt: string; expiresAt: string;
}
interface Role {
  id: number; roleName: string; isSystemRole: boolean;
  permissionCodes: string[]; employeesCount: number;
}
interface Permission {
  id: number; moduleName: string; actionType: string; permissionCode: string;
}

const emptyForm = { fullName: "", email: "", phone: "", password: "", roleName: "", salary: "" };

export default function EmployeesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"employees" | "invitations" | "roles">("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showInvModal, setShowInvModal] = useState(false);
  const [invForm, setInvForm] = useState({ email: "", roleId: 0, salary: "" });
  const [invSubmitting, setInvSubmitting] = useState(false);

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [saving, setSaving] = useState(false);

  const roleLabel = (name: string) => roles.find((r) => r.roleName === name)?.roleName ?? name;

  const moduleLabel = (mod: string) => t(`employee.module.${mod}`, mod);
  const actionLabel = (action: string) => t(`employee.action.${action}`, action);

  const statusBadge = (status: string) => {
    switch (status) {
      case "Pending": return <span className="badge badge--yellow">{t("employee.invitationPending")}</span>;
      case "Accepted": return <span className="badge badge--green">{t("employee.invitationAccepted")}</span>;
      case "Expired": return <span className="badge badge--red">{t("employee.invitationExpired")}</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const groupedPermissions = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.moduleName]) acc[p.moduleName] = [];
    acc[p.moduleName].push(p);
    return acc;
  }, {});

  const openAddModal = () => { setShowModal(true); setForm(emptyForm); };
  const closeAddModal = () => { setShowModal(false); setForm(emptyForm); };

  const fetchEmployees = useCallback(async () => {
    try { const res = await api.get("/owner/employees"); setEmployees(res.data.data); }
    catch { }
  }, []);

  const fetchInvitationsCb = useCallback(async () => {
    try { const res = await getInvitations(); setInvitations(res.data.data); }
    catch { }
  }, []);

  const fetchRoles = useCallback(async () => {
    try { const res = await api.get("/roles"); setRoles(res.data.data); }
    catch { }
  }, []);

  useEffect(() => {
    Promise.all([fetchEmployees(), fetchInvitationsCb(), fetchRoles(), api.get("/roles/permissions").then(r => setPermissions(r.data.data)).catch(() => {})])
      .finally(() => setLoading(false));
  }, [fetchEmployees, fetchInvitationsCb, fetchRoles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setActionError(""); setSubmitting(true);
    try {
      await api.post("/owner/employees", { ...form, salary: parseFloat(form.salary) || 0 });
      closeAddModal(); setActionSuccess(t("employee.addSuccess")); await fetchEmployees();
    } catch (err: any) { setActionError(err.response?.data?.message || t("common.error")); }
    finally { setSubmitting(false); }
  };

  const handleDeactivate = async (employee: Employee) => {
    if (!window.confirm(t("employee.confirmDeactivate", { name: employee.fullName }))) return;
    setDeactivatingId(employee.id);
    try { await api.put(`/owner/employees/${employee.id}/deactivate`); await fetchEmployees(); }
    catch (err: any) { setActionError(err.response?.data?.message || t("common.error")); }
    finally { setDeactivatingId(null); }
  };

  const handleInvSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setActionError(""); setInvSubmitting(true);
    try {
      const res = await createInvitation({ email: invForm.email, roleId: invForm.roleId, salary: parseFloat(invForm.salary) || 0 });
      const link = `${window.location.origin}/register?token=${res.data.data.token}`;
      setActionSuccess(`${t("employee.inviteCreated")} ${link}`);
      setShowInvModal(false); await fetchInvitationsCb();
    } catch (err: any) { setActionError(err.response?.data?.message || t("common.error")); }
    finally { setInvSubmitting(false); }
  };

  const handleEditRole = (role: Role) => { setEditingRole(role); setSelectedCodes([...role.permissionCodes]); };
  const handleSavePermissions = async () => {
    if (!editingRole) return; setSaving(true); setActionError("");
    try {
      await api.put(`/roles/${editingRole.id}/permissions`, { permissionCodes: selectedCodes });
      setActionSuccess(t("employee.permissionsUpdated", { name: editingRole.roleName })); setEditingRole(null); await fetchRoles();
    } catch (err: any) { setActionError(err.response?.data?.message || t("common.error")); }
    finally { setSaving(false); }
  };
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) { setActionError(t("employee.roleNameRequired")); return; }
    setSaving(true); setActionError("");
    try {
      await api.post("/roles", { roleName: newRoleName.trim(), permissionCodes: selectedCodes });
      setActionSuccess(t("employee.roleCreated", { name: newRoleName.trim() })); setShowCreateModal(false); setNewRoleName(""); setSelectedCodes([]); await fetchRoles();
    } catch (err: any) { setActionError(err.response?.data?.message || t("common.error")); }
    finally { setSaving(false); }
  };
  const handleDeleteRole = async (role: Role) => {
    if (!window.confirm(t("employee.confirmDeleteRole", { name: role.roleName }))) return;
    try { await api.delete(`/roles/${role.id}`); setActionSuccess(t("employee.roleDeleted", { name: role.roleName })); await fetchRoles(); }
    catch (err: any) { setActionError(err.response?.data?.message || t("common.error")); }
  };
  const toggleCode = (code: string) => setSelectedCodes(p => p.includes(code) ? p.filter(c => c !== code) : [...p, code]);
  const selectAllModule = (perms: Permission[], add: boolean) => {
    const codes = perms.map(p => p.permissionCode);
    setSelectedCodes(p => add ? [...new Set([...p, ...codes])] : p.filter(c => !codes.includes(c)));
  };

  const PermissionEditor = () => (
    <div className="max-h-[50vh] overflow-y-auto space-y-3">
      {Object.entries(groupedPermissions).map(([mod, perms]) => {
        const codes = perms.map(p => p.permissionCode);
        const allSel = codes.every(c => selectedCodes.includes(c));
        return (
          <div key={mod} className="border border-[var(--border)] rounded-xl p-3">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" checked={allSel} onChange={() => selectAllModule(perms, !allSel)} className="w-4 h-4 accent-[var(--blue)]" />
              <span className="font-bold text-[13px] text-[var(--ink)]">{moduleLabel(mod)}</span>
            </label>
            <div className="flex gap-1.5 flex-wrap mr-6">
              {perms.map(perm => (
                <label key={perm.id} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] cursor-pointer transition ${selectedCodes.includes(perm.permissionCode) ? "bg-[var(--blue-50)] text-[var(--blue)] border border-[var(--blue)]/30" : "bg-gray-50 text-[var(--sub)] border border-transparent hover:bg-gray-100"}`}>
                  <input type="checkbox" checked={selectedCodes.includes(perm.permissionCode)} onChange={() => toggleCode(perm.permissionCode)} className="w-3 h-3 accent-[var(--blue)]" />
                  {actionLabel(perm.actionType)}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader icon="users" title={t("employee.title")}>
        {activeTab === "employees" && <><button onClick={openAddModal} className="btn btn-primary btn-sm"><Icon name="plus" /> {t("employee.add")}</button></>}
        {activeTab === "invitations" && <button onClick={() => { setShowInvModal(true); setInvForm({ email: "", roleId: 0, salary: "" }); }} className="btn btn-primary btn-sm"><Icon name="plus" /> {t("employee.invite")}</button>}
        {activeTab === "roles" && <button onClick={() => { setShowCreateModal(true); setSelectedCodes([]); setNewRoleName(""); }} className="btn btn-primary btn-sm"><Icon name="plus" /> {t("employee.addRole")}</button>}
      </PageHeader>

      {actionSuccess && <div className="alert alert--success mb-4">{actionSuccess}</div>}
      {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}

      <div className="tabs-bar">
        <button className={`tab-btn ${activeTab === "employees" ? "active" : ""}`} onClick={() => setActiveTab("employees")}>{t("employee.tabEmployees")}</button>
        <button className={`tab-btn ${activeTab === "invitations" ? "active" : ""}`} onClick={() => setActiveTab("invitations")}>{t("employee.tabInvitations")}</button>
        <button className={`tab-btn ${activeTab === "roles" ? "active" : ""}`} onClick={() => setActiveTab("roles")}>{t("employee.tabRoles")}</button>
      </div>

      {activeTab === "employees" && (
        <div className="table-wrap">
          {employees.length === 0 ? <p className="p-6 text-[var(--sub)] text-sm">{t("employee.noEmployees")}</p>
          : <table><thead><tr><th>{t("employee.name")}</th><th>{t("employee.email")}</th><th>{t("employee.role")}</th><th>{t("employee.salary")}</th><th>{t("employee.status")}</th><th>{t("employee.actions")}</th></tr></thead>
            <tbody>{employees.map(emp => (
              <tr key={emp.id}>
                <td className="font-medium text-[var(--ink)]">{emp.fullName}</td>
                <td className="text-[var(--sub)]" dir="ltr">{emp.email}</td>
                <td className="text-[var(--sub)]">{roleLabel(emp.roleName)}</td>
                <td>{emp.salary === 0 ? "—" : `${emp.salary} ${t("common.sar")}`}</td>
                <td>{emp.status === "Active" ? <span className="badge badge--green">{t("employee.statusActive")}</span> : <span className="badge badge--red">{t("employee.statusInactive")}</span>}</td>
                <td>{emp.status === "Active" && <button onClick={() => handleDeactivate(emp)} disabled={deactivatingId === emp.id} className="text-[12px] text-[var(--danger)] hover:underline">{t("employee.deactivate")}</button>}</td>
              </tr>
            ))}</tbody></table>}
        </div>
      )}

      {activeTab === "invitations" && (
        <div>
          <div className="table-wrap">
            {invitations.length === 0 ? <p className="p-6 text-[var(--sub)] text-sm">{t("employee.noInvitations")}</p>
            : <table><thead><tr><th>{t("employee.email")}</th><th>{t("employee.role")}</th><th>{t("employee.status")}</th><th>{t("employee.link")}</th><th>{t("employee.sentDate")}</th></tr></thead>
              <tbody>{invitations.map(inv => (
                <tr key={inv.id}>
                  <td className="text-[var(--sub)]" dir="ltr">{inv.email}</td>
                  <td className="text-[var(--sub)]">{inv.roleName}</td>
                  <td>{statusBadge(inv.status)}</td>
                  <td>{inv.status === "Pending" ? <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/register?token=${inv.token}`); setActionSuccess(t("employee.linkCopied")); setTimeout(() => setActionSuccess(""), 2000); }} className="text-[12px] font-bold text-[var(--blue)] hover:underline">{t("employee.copyLink")}</button> : <span className="text-[12px] text-[var(--sub)]">—</span>}</td>
                  <td className="text-[12px] text-[var(--sub)]">{new Date(inv.createdAt).toLocaleDateString("ar-SA")}</td>
                </tr>
              ))}</tbody></table>}
          </div>
        </div>
      )}

      {activeTab === "roles" && (
        <div>
          <div className="table-wrap">
            <table><thead><tr><th>{t("employee.jobTitle")}</th><th>{t("employee.employeeCount")}</th><th>{t("employee.type")}</th><th>{t("employee.permissions")}</th></tr></thead>
              <tbody>{roles.length === 0 ? <tr><td colSpan={4} className="text-center text-[var(--sub)] py-8">{t("employee.noRoles")}</td></tr>
                : roles.map(role => (
                  <tr key={role.id}>
                    <td className="font-bold text-[var(--ink)]">{role.roleName}</td>
                    <td>{role.employeesCount}</td>
                    <td>{role.isSystemRole ? <span className="badge badge--blue">{t("employee.systemRole")}</span> : <span className="badge badge--green">{t("employee.customRole")}</span>}</td>
                    <td><div className="flex gap-2"><button onClick={() => handleEditRole(role)} className="btn btn-outline btn-sm">{t("employee.editPermissions")}</button>{!role.isSystemRole && <button onClick={() => handleDeleteRole(role)} className="btn btn-danger btn-sm">{t("common.delete")}</button>}</div></td>
                  </tr>
                ))}</tbody></table>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showModal && <div className="modal-overlay" onClick={closeAddModal}><div className="modal-card max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-[18px] font-bold text-[var(--blue-deep)] mb-4">{t("employee.add")}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label>{t("employee.name")}</label><div className="field-shell"><input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required /></div></div>
          <div><label>{t("employee.email")}</label><div className="field-shell"><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div></div>
          <div><label>{t("employee.phone")}</label><div className="field-shell"><input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required /></div></div>
          <div><label>{t("employee.password")}</label><div className="field-shell"><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required /></div></div>
          <div><label>{t("employee.jobRole")}</label><div className="field-shell"><select value={form.roleName} onChange={e => setForm(f => ({ ...f, roleName: e.target.value }))} required>
            <option value="">{t("common.select")}</option>
            {roles.filter(r => r.roleName !== "SuperAdmin" && r.roleName !== "SupportStaff" && r.roleName !== "Owner").map(r => <option key={r.id} value={r.roleName}>{r.roleName}</option>)}
          </select></div></div>
          <div><label>{t("employee.salary")}</label><div className="field-shell"><input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} /></div></div>
          <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? t("common.loading") : t("employee.submitAdd")}</button>
        </form>
      </div></div>}

      {/* Invite Employee Modal */}
      {showInvModal && <div className="modal-overlay" onClick={() => setShowInvModal(false)}><div className="modal-card max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-[18px] font-bold text-[var(--blue-deep)] mb-4">{t("employee.inviteNew")}</h2>
        <form onSubmit={handleInvSubmit} className="space-y-4">
          <div><label>{t("employee.inviteEmail")}</label><div className="field-shell"><input type="email" value={invForm.email} onChange={e => setInvForm(f => ({ ...f, email: e.target.value }))} required placeholder="employee@example.com" /></div></div>
          <div><label>{t("employee.jobTitle")}</label><div className="field-shell"><select value={invForm.roleId} onChange={e => setInvForm(f => ({ ...f, roleId: parseInt(e.target.value) || 0 }))} required>
            <option value="">{t("common.select")}</option>
            {roles.filter(r => r.roleName !== "SuperAdmin" && r.roleName !== "SupportStaff" && r.roleName !== "Owner").map(r => <option key={r.id} value={r.id}>{r.roleName}</option>)}
          </select></div></div>
          <div><label>{t("employee.salary")}</label><div className="field-shell"><input type="number" value={invForm.salary} onChange={e => setInvForm(f => ({ ...f, salary: e.target.value }))} /></div></div>
          <button type="submit" disabled={invSubmitting} className="btn btn-primary">{invSubmitting ? t("common.loading") : t("employee.sendInvite")}</button>
        </form>
      </div></div>}

      {/* Edit Permissions Modal */}
      {editingRole && <div className="modal-overlay" onClick={() => setEditingRole(null)}><div className="modal-card max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-[18px] font-bold text-[var(--blue-deep)]">{t("employee.permissionsFor")} {editingRole.roleName}</h2><button onClick={() => setEditingRole(null)} className="text-[var(--sub)] hover:text-[var(--ink)]">✕</button></div>
        <PermissionEditor />
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--border)]">
          <button onClick={() => setEditingRole(null)} className="btn btn-outline btn-sm">{t("common.cancel")}</button>
          <button onClick={handleSavePermissions} disabled={saving} className="btn btn-primary btn-sm">{saving ? t("common.loading") : t("employee.savePermissions")}</button>
        </div>
      </div></div>}

      {/* Add Job Title Modal */}
      {showCreateModal && <div className="modal-overlay" onClick={() => setShowCreateModal(false)}><div className="modal-card max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-[18px] font-bold text-[var(--blue-deep)]">{t("employee.addRole")}</h2><button onClick={() => setShowCreateModal(false)} className="text-[var(--sub)] hover:text-[var(--ink)]">✕</button></div>
        <div className="mb-4"><label>{t("employee.name")}</label><div className="field-shell mt-1"><input type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder={t("employee.rolePlaceholder")} /></div></div>
        <p className="text-[13px] font-bold text-[var(--ink)] mb-3">{t("employee.permissionsLabel")}</p>
        <PermissionEditor />
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--border)]">
          <button onClick={() => setShowCreateModal(false)} className="btn btn-outline btn-sm">{t("common.cancel")}</button>
          <button onClick={handleCreateRole} disabled={saving} className="btn btn-primary btn-sm">{saving ? t("common.loading") : t("employee.create")}</button>
        </div>
      </div></div>}
    </div>
  );
}

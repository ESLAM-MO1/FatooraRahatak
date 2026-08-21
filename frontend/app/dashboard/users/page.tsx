"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import { useConfirm } from "@/components/ConfirmDialog";
import { getUserType } from "@/lib/auth";

interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  userType: string;
  isActive: boolean;
  createdAt: string;
}

interface OwnerUser {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  userType: string;
  isActive: boolean;
  createdAt: string;
}

interface StaffUser {
  id: number;
  fullName: string;
  email: string;
  roleType: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { value: "Admin", labelKey: "users.roleAdmin", descKey: "users.roleAdminDesc" },
  { value: "Support", labelKey: "users.roleSupport", descKey: "users.roleSupportDesc" },
  { value: "Finance", labelKey: "users.roleFinance", descKey: "users.roleFinanceDesc" },
  { value: "Technical", labelKey: "users.roleTechnical", descKey: "users.roleTechnicalDesc" },
];

export default function UsersManagementPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState("all");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [owners, setOwners] = useState<OwnerUser[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [editingUser, setEditingUser] = useState<AdminUser | OwnerUser | null>(null);
  const [userEditForm, setUserEditForm] = useState({ fullName: "", email: "", phone: "" });
  const [userEditSaving, setUserEditSaving] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [staffEditForm, setStaffEditForm] = useState({ fullName: "", email: "", roleType: "Support" });
  const [staffEditSaving, setStaffEditSaving] = useState(false);

  const [staffForm, setStaffForm] = useState({ fullName: "", email: "", password: "", roleType: "Support" });
  const [staffError, setStaffError] = useState("");
  const [staffSuccess, setStaffSuccess] = useState("");

  const [notifForm, setNotifForm] = useState({ recipientType: "All", storeId: "", type: "Update", title: "", message: "" });
  const [notifError, setNotifError] = useState("");
  const [notifSuccess, setNotifSuccess] = useState("");
  const [sending, setSending] = useState(false);

  const userTypeLabels: Record<string, string> = {
    Owner: t("users.storeOwners"),
    Employee: t("users.employees"),
    SuperAdmin: t("users.superAdmin"),
    SupportStaff: t("users.supportStaff"),
  };

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("users.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const loadOwners = async () => {
    try {
      const res = await api.get("/admin/users/owners");
      setOwners(res.data.data);
    } catch { }
  };

  const loadStaff = async () => {
    try {
      const res = await api.get("/admin/users/staff");
      setStaff(res.data.data);
    } catch { }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (activeTab === "owners") loadOwners();
    if (activeTab === "staff") loadStaff();
  }, [activeTab]);

  const handleToggleActive = async (user: AdminUser) => {
    setProcessingId(user.id);
    setError("");
    try {
      const endpoint = user.isActive
        ? `/admin/users/${user.id}/deactivate`
        : `/admin/users/${user.id}/activate`;
      await api.put(endpoint);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || t("users.updateError"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError("");
    setStaffSuccess("");
    try {
      await api.post("/admin/users/staff", staffForm);
      setStaffSuccess(t("users.staffAdded"));
      setStaffForm({ fullName: "", email: "", password: "", roleType: "Support" });
      loadStaff();
    } catch (err: any) {
      setStaffError(err.response?.data?.message || t("users.staffAddError"));
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setNotifError("");
    setNotifSuccess("");
    try {
      await api.post("/admin/notifications/send", {
        ...notifForm,
        storeId: notifForm.storeId ? parseInt(notifForm.storeId) : null,
      });
      setNotifSuccess(t("users.notifSent"));
      setNotifForm({ recipientType: "All", storeId: "", type: "Update", title: "", message: "" });
    } catch (err: any) {
      setNotifError(err.response?.data?.message || t("users.notifSendError"));
    } finally {
      setSending(false);
    }
  };

  const openEditUser = (user: AdminUser | OwnerUser) => {
    setEditingUser(user);
    setUserEditForm({ fullName: user.fullName, email: user.email, phone: user.phone || "" });
    setActionError("");
    setActionSuccess("");
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserEditSaving(true);
    setActionError("");
    try {
      await api.put(`/admin/users/${editingUser.id}`, userEditForm);
      setActionSuccess(t("users.userUpdated"));
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, fullName: userEditForm.fullName, email: userEditForm.email, phone: userEditForm.phone }
            : u
        )
      );
      setOwners((prev) =>
        prev.map((o) =>
          o.id === editingUser.id
            ? { ...o, fullName: userEditForm.fullName, email: userEditForm.email, phone: userEditForm.phone }
            : o
        )
      );
      setEditingUser(null);
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("users.userUpdateError"));
    } finally {
      setUserEditSaving(false);
    }
  };

  const openEditStaff = (s: StaffUser) => {
    setEditingStaff(s);
    setStaffEditForm({ fullName: s.fullName, email: s.email, roleType: s.roleType || "Support" });
    setActionError("");
    setActionSuccess("");
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setStaffEditSaving(true);
    setActionError("");
    try {
      await api.put(`/admin/users/staff/${editingStaff.id}`, staffEditForm);
      setActionSuccess(t("users.staffUpdated"));
      setStaff((prev) =>
        prev.map((s) =>
          s.id === editingStaff.id
            ? { ...s, fullName: staffEditForm.fullName, email: staffEditForm.email, roleType: staffEditForm.roleType }
            : s
        )
      );
      setEditingStaff(null);
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("users.staffUpdateError"));
    } finally {
      setStaffEditSaving(false);
    }
  };

  const handleDeleteStaff = async (s: StaffUser) => {
    if (!(await confirm({ message: t("users.confirmDeleteStaff"), confirmLabel: t("users.deleteStaff"), danger: true }))) return;
    setActionError("");
    setActionSuccess("");
    try {
      await api.delete(`/admin/users/staff/${s.id}`);
      setActionSuccess(t("users.staffDeleted"));
      loadStaff();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("users.staffDeleteError"));
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-SA-u-nu-latn", {
      year: "numeric", month: "long", day: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-SA-u-nu-latn", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const filteredUsers =
    filterType === "all" ? users : users.filter((u) => u.userType === filterType);

  // Creating/managing platform staff accounts is a SuperAdmin-only capability
  // on the backend (see AdminController) - hide the tab for anyone else so
  // support staff never hit a confusing 403 error.
  const isSuperAdmin = getUserType() === "SuperAdmin";
  const TABS = [
    { key: "all", label: t("users.allTypes") },
    { key: "owners", label: t("users.tabOwners") },
    ...(isSuperAdmin ? [{ key: "staff", label: t("users.tabStaff") }] : []),
    { key: "notifications", label: t("users.tabNotifications") },
  ];

  if (loading && activeTab === "all") {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <PageHeader icon="userGroup" title={t("users.managementTitle")} />

      <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-[13px] font-bold border-b-2 transition-colors shrink-0 whitespace-nowrap ${
              activeTab === tab.key
                ? "text-[var(--blue)] border-[var(--blue)]"
                : "text-[var(--sub)] border-transparent hover:text-[var(--ink)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="alert alert--danger">{error}</div>}
      <SuccessToast message={actionSuccess} fixed className="mb-4" />
      {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}

      {activeTab === "all" && (
        <>
          <div className="field-shell py-1.5 px-3 w-48">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">{t("users.allTypes")}</option>
              <option value="Owner">{t("users.storeOwners")}</option>
              <option value="Employee">{t("users.employees")}</option>
              <option value="SuperAdmin">{t("users.superAdmin")}</option>
              <option value="SupportStaff">{t("users.supportStaff")}</option>
            </select>
          </div>

          <div className="table-wrap">
            <table className="hidden md:table">
              <thead>
                <tr>
                  <th>{t("users.name")}</th>
                  <th>{t("users.email")}</th>
                  <th>{t("users.type")}</th>
                  <th>{t("users.registrationDate")}</th>
                  <th>{t("users.status")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="font-bold">{user.fullName}</td>
                    <td className="text-[var(--sub)]">{user.email}</td>
                    <td className="text-[var(--sub)]">
                      {userTypeLabels[user.userType] || user.userType}
                    </td>
                    <td className="text-[var(--sub)]">{formatDate(user.createdAt)}</td>
                    <td>
                      <span className={`badge ${user.isActive ? "badge--green" : "badge--red"}`}>
                        {user.isActive ? t("users.active") : t("users.inactive")}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditUser(user)}
                          className="btn btn-outline"
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={processingId === user.id}
                          className={user.isActive ? "btn btn-danger" : "btn btn-success"}
                        >
                          {processingId === user.id
                            ? t("users.updating")
                            : user.isActive
                            ? t("users.deactivate")
                            : t("users.activate")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="md:hidden space-y-3">
              {filteredUsers.map((user) => (
                <div key={user.id} className="card p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("users.name")}</p>
                      <p className="font-bold">{user.fullName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("users.email")}</p>
                      <p className="text-[var(--sub)]" dir="ltr">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("users.type")}</p>
                      <p className="text-[var(--sub)]">
                        {userTypeLabels[user.userType] || user.userType}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("users.registrationDate")}</p>
                      <p className="text-[var(--sub)]">{formatDate(user.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("users.status")}</p>
                      <span className={`badge ${user.isActive ? "badge--green" : "badge--red"}`}>
                        {user.isActive ? t("users.active") : t("users.inactive")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => openEditUser(user)}
                      className="btn btn-outline"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={processingId === user.id}
                      className={user.isActive ? "btn btn-danger" : "btn btn-success"}
                    >
                      {processingId === user.id
                        ? t("users.updating")
                        : user.isActive
                        ? t("users.deactivate")
                        : t("users.activate")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <p className="text-center text-[var(--sub)] py-8">{t("users.noMatching")}</p>
            )}
          </div>
        </>
      )}

      {activeTab === "owners" && (
        <div className="table-wrap">
          <table className="hidden md:table">
            <thead>
              <tr>
                <th>{t("users.name")}</th>
                <th>{t("users.email")}</th>
                <th>{t("users.registrationDate")}</th>
                <th>{t("users.status")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((owner) => (
                <tr key={owner.id}>
                  <td className="font-bold">{owner.fullName}</td>
                  <td className="text-[var(--sub)]">{owner.email}</td>
                  <td className="text-[var(--sub)]">{formatDate(owner.createdAt)}</td>
                  <td>
                    <span className={`badge ${owner.isActive ? "badge--green" : "badge--red"}`}>
                      {owner.isActive ? t("users.active") : t("users.inactive")}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => openEditUser(owner)}
                      className="btn btn-outline"
                    >
                      {t("common.edit")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="md:hidden space-y-3">
            {owners.map((owner) => (
              <div key={owner.id} className="card p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("users.name")}</p>
                    <p className="font-bold">{owner.fullName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("users.email")}</p>
                    <p className="text-[var(--sub)]" dir="ltr">{owner.email}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("users.registrationDate")}</p>
                    <p className="text-[var(--sub)]">{formatDate(owner.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--sub)]">{t("users.status")}</p>
                    <span className={`badge ${owner.isActive ? "badge--green" : "badge--red"}`}>
                      {owner.isActive ? t("users.active") : t("users.inactive")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => openEditUser(owner)}
                    className="btn btn-outline"
                  >
                    {t("common.edit")}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {owners.length === 0 && (
            <p className="text-center text-[var(--sub)] py-8">{t("users.noOwners")}</p>
          )}
        </div>
      )}

      {activeTab === "staff" && isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="text-[15px] font-bold text-[var(--ink)] mb-4">{t("users.addStaff")}</h3>

            {staffError && <div className="alert alert--danger mb-3">{staffError}</div>}
            <SuccessToast message={staffSuccess} fixed className="mb-3" />

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label>{t("users.name")}</label>
                <div className="field-shell">
                  <input
                    type="text"
                    value={staffForm.fullName}
                    onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label>{t("users.email")}</label>
                <div className="field-shell">
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label>{t("users.tempPassword")}</label>
                <div className="field-shell">
                  <input
                    type="password"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div>
                <label>{t("users.staffRole")}</label>
                <div className="field-shell">
                  <select
                    value={staffForm.roleType}
                    onChange={(e) => setStaffForm({ ...staffForm, roleType: e.target.value })}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {t(r.labelKey)} — {t(r.descKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">{t("users.addStaffBtn")}</button>
            </form>
          </div>

          <div className="table-wrap">
            <table className="hidden md:table">
              <thead>
                <tr>
                  <th>{t("users.name")}</th>
                  <th>{t("users.email")}</th>
                  <th>{t("users.staffRole")}</th>
                  <th>{t("users.status")}</th>
                  <th>{t("users.registrationDate")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td className="font-bold">{s.fullName}</td>
                    <td className="text-[var(--sub)]">{s.email}</td>
                    <td className="text-[var(--sub)]">
                      {ROLE_OPTIONS.find((r) => r.value === s.roleType)
                        ? t(ROLE_OPTIONS.find((r) => r.value === s.roleType)!.labelKey)
                        : s.roleType}
                    </td>
                    <td>
                      <span className={`badge ${s.isActive ? "badge--green" : "badge--red"}`}>
                        {s.isActive ? t("users.active") : t("users.inactive")}
                      </span>
                    </td>
                    <td className="text-[var(--sub)]">{formatDate(s.createdAt)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => openEditStaff(s)} className="btn btn-outline">
                          {t("common.edit")}
                        </button>
                        <button onClick={() => handleDeleteStaff(s)} className="btn btn-danger">
                          {t("users.deleteStaff")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="md:hidden space-y-3">
              {staff.map((s) => (
                <div key={s.id} className="card p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("users.name")}</p>
                      <p className="font-bold">{s.fullName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("users.email")}</p>
                      <p className="text-[var(--sub)]" dir="ltr">{s.email}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("users.staffRole")}</p>
                      <p className="text-[var(--sub)]">
                        {ROLE_OPTIONS.find((r) => r.value === s.roleType)
                          ? t(ROLE_OPTIONS.find((r) => r.value === s.roleType)!.labelKey)
                          : s.roleType}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("users.status")}</p>
                      <span className={`badge ${s.isActive ? "badge--green" : "badge--red"}`}>
                        {s.isActive ? t("users.active") : t("users.inactive")}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("users.registrationDate")}</p>
                      <p className="text-[var(--sub)]">{formatDate(s.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <button onClick={() => openEditStaff(s)} className="btn btn-outline">
                      {t("common.edit")}
                    </button>
                    <button onClick={() => handleDeleteStaff(s)} className="btn btn-danger">
                      {t("users.deleteStaff")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {staff.length === 0 && (
              <p className="text-center text-[var(--sub)] py-8">{t("users.noStaff")}</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="max-w-xl">
          <div className="card p-5">
            <h3 className="text-[15px] font-bold text-[var(--ink)] mb-4">{t("users.sendNotification")}</h3>

            {notifError && <div className="alert alert--danger mb-3">{notifError}</div>}
            <SuccessToast message={notifSuccess} fixed className="mb-3" />

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div>
                <label>{t("users.notifRecipient")}</label>
                <div className="field-shell">
                  <select
                    value={notifForm.recipientType}
                    onChange={(e) => setNotifForm({ ...notifForm, recipientType: e.target.value })}
                  >
                    <option value="All">{t("users.notifAll")}</option>
                    <option value="Specific">{t("users.notifSpecific")}</option>
                  </select>
                </div>
              </div>

              {notifForm.recipientType === "Specific" && (
                <div>
                  <label>{t("users.notifStoreId")}</label>
                  <div className="field-shell">
                    <input
                      type="number"
                      value={notifForm.storeId}
                      onChange={(e) => setNotifForm({ ...notifForm, storeId: e.target.value })}
                      placeholder="Store ID"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label>{t("users.notifType")}</label>
                <div className="field-shell">
                  <select
                    value={notifForm.type}
                    onChange={(e) => setNotifForm({ ...notifForm, type: e.target.value })}
                  >
                    <option value="Update">{t("users.notifUpdate")}</option>
                    <option value="Maintenance">{t("users.notifMaintenance")}</option>
                    <option value="Offer">{t("users.notifOffer")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label>{t("users.notifTitle")}</label>
                <div className="field-shell">
                  <input
                    type="text"
                    value={notifForm.title}
                    onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label>{t("users.notifMessage")}</label>
                <div className="field-shell">
                  <textarea
                    value={notifForm.message}
                    onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
                    rows={4}
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={sending} className="btn-primary w-full">
                {sending ? t("users.sending") : t("users.send")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal (All / Owners tabs) */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-[var(--blue-deep)]">{t("users.editUser")}</h2>
              <button onClick={() => setEditingUser(null)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label>{t("users.name")}</label>
                <div className="field-shell">
                  <input
                    type="text"
                    value={userEditForm.fullName}
                    onChange={(e) => setUserEditForm({ ...userEditForm, fullName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label>{t("users.email")}</label>
                <div className="field-shell">
                  <input
                    type="email"
                    value={userEditForm.email}
                    onChange={(e) => setUserEditForm({ ...userEditForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label>{t("users.phone")}</label>
                <div className="field-shell">
                  <input
                    type="text"
                    value={userEditForm.phone}
                    onChange={(e) => setUserEditForm({ ...userEditForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="btn btn-outline btn-sm">{t("common.cancel")}</button>
                <button type="submit" disabled={userEditSaving} className="btn btn-primary btn-sm">
                  {userEditSaving ? t("common.loading") : t("users.saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="modal-overlay" onClick={() => setEditingStaff(null)}>
          <div className="modal-card max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-[var(--blue-deep)]">{t("users.editStaff")}</h2>
              <button onClick={() => setEditingStaff(null)} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button>
            </div>
            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div>
                <label>{t("users.name")}</label>
                <div className="field-shell">
                  <input
                    type="text"
                    value={staffEditForm.fullName}
                    onChange={(e) => setStaffEditForm({ ...staffEditForm, fullName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label>{t("users.email")}</label>
                <div className="field-shell">
                  <input
                    type="email"
                    value={staffEditForm.email}
                    onChange={(e) => setStaffEditForm({ ...staffEditForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label>{t("users.staffRole")}</label>
                <div className="field-shell">
                  <select
                    value={staffEditForm.roleType}
                    onChange={(e) => setStaffEditForm({ ...staffEditForm, roleType: e.target.value })}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {t(r.labelKey)} — {t(r.descKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingStaff(null)} className="btn btn-outline btn-sm">{t("common.cancel")}</button>
                <button type="submit" disabled={staffEditSaving} className="btn btn-primary btn-sm">
                  {staffEditSaving ? t("common.loading") : t("users.saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
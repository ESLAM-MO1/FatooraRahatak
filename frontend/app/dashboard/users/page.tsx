"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";

interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  userType: string;
  isActive: boolean;
  createdAt: string;
}

interface OwnerUser {
  id: number;
  fullName: string;
  email: string;
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

interface AuditLogEntry {
  id: number;
  adminName: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_LABEL_KEYS: Record<string, string> = {
  SuspendStore: "logs.suspendStore",
  ActivateStore: "logs.activateStore",
  UpdatePackage: "logs.updatePackage",
  DeactivateUser: "logs.deactivateUser",
  ActivateUser: "logs.activateUser",
  Impersonate: "logs.impersonate",
  SendNotification: "logs.sendNotification",
};

const ROLE_OPTIONS = [
  { value: "Support", labelKey: "users.roleSupport" },
  { value: "Finance", labelKey: "users.roleFinance" },
  { value: "Technical", labelKey: "users.roleTechnical" },
];

export default function UsersManagementPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("all");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [owners, setOwners] = useState<OwnerUser[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const [impersonating, setImpersonating] = useState<number | null>(null);

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

  const loadAuditLogs = async () => {
    try {
      const res = await api.get("/admin/audit-logs");
      setAuditLogs(res.data.data);
    } catch { }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (activeTab === "owners") loadOwners();
    if (activeTab === "staff") loadStaff();
    if (activeTab === "audit") loadAuditLogs();
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

  const handleImpersonate = async (ownerId: number) => {
    setImpersonating(ownerId);
    try {
      const res = await api.post(`/admin/users/${ownerId}/impersonate`);
      const { accessToken, fullName, userType } = res.data.data;
      const originalToken = localStorage.getItem("accessToken");
      if (originalToken) localStorage.setItem("originalAccessToken", originalToken);
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userType", userType || "Owner");
      localStorage.setItem("fullName", fullName);
      localStorage.setItem("impersonatedBy", localStorage.getItem("fullName") || "");
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.response?.data?.message || t("users.impersonateFailed"));
    } finally {
      setImpersonating(null);
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

  const TABS = [
    { key: "all", label: t("users.allTypes") },
    { key: "owners", label: t("users.tabOwners") },
    { key: "staff", label: t("users.tabStaff") },
    { key: "audit", label: t("users.tabAudit") },
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
            <table>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <p className="text-center text-[var(--sub)] py-8">{t("users.noMatching")}</p>
            )}
          </div>
        </>
      )}

      {activeTab === "owners" && (
        <div className="table-wrap">
          <table>
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
                      onClick={() => handleImpersonate(owner.id)}
                      disabled={impersonating === owner.id}
                      className="btn btn-primary btn-sm"
                    >
                      {impersonating === owner.id ? t("users.impersonating") : t("users.impersonate")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {owners.length === 0 && (
            <p className="text-center text-[var(--sub)] py-8">{t("users.noOwners")}</p>
          )}
        </div>
      )}

      {activeTab === "staff" && (
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
                        {t(r.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">{t("users.addStaffBtn")}</button>
            </form>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("users.name")}</th>
                  <th>{t("users.email")}</th>
                  <th>{t("users.staffRole")}</th>
                  <th>{t("users.status")}</th>
                  <th>{t("users.registrationDate")}</th>
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
                  </tr>
                ))}
              </tbody>
            </table>

            {staff.length === 0 && (
              <p className="text-center text-[var(--sub)] py-8">{t("users.noStaff")}</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("users.auditAdmin")}</th>
                <th>{t("users.auditAction")}</th>
                <th>{t("users.auditTarget")}</th>
                <th>{t("users.auditDetails")}</th>
                <th>{t("users.auditIp")}</th>
                <th>{t("users.auditDate")}</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="font-bold">{log.adminName}</td>
                  <td>
                    <span className="badge badge--blue">
                      {t(ACTION_LABEL_KEYS[log.action] || log.action)}
                    </span>
                  </td>
                  <td className="text-[var(--sub)]">
                    {log.targetType ? `${log.targetType} #${log.targetId}` : "-"}
                  </td>
                  <td className="text-[var(--sub)] max-w-[200px] truncate">{log.details || "-"}</td>
                  <td className="text-[var(--sub)] font-mono text-[11px]" dir="ltr">{log.ipAddress || "-"}</td>
                  <td className="text-[var(--sub)]">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {auditLogs.length === 0 && (
            <p className="text-center text-[var(--sub)] py-8">{t("users.noAuditLogs")}</p>
          )}
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
    </div>
  );
}

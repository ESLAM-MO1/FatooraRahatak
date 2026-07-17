"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";

interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  userType: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersManagementPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

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

  useEffect(() => {
    loadUsers();
  }, []);

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const filteredUsers =
    filterType === "all" ? users : users.filter((u) => u.userType === filterType);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <PageHeader icon="userGroup" title={t("users.managementTitle")}>
        <div className="field-shell py-1.5 px-3 w-48">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">{t("users.allTypes")}</option>
            <option value="Owner">{t("users.storeOwners")}</option>
            <option value="Employee">{t("users.employees")}</option>
            <option value="SuperAdmin">{t("users.superAdmin")}</option>
            <option value="SupportStaff">{t("users.supportStaff")}</option>
          </select>
        </div>
      </PageHeader>

      {error && <div className="alert alert--danger">{error}</div>}

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
    </div>
  );
}

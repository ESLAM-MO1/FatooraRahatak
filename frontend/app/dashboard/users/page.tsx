"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  userType: string;
  isActive: boolean;
  createdAt: string;
}

const USER_TYPE_LABELS: Record<string, string> = {
  Owner: "صاحب متجر",
  Employee: "موظف",
  SuperAdmin: "سوبر أدمن",
  SupportStaff: "دعم فني",
};

export default function UsersManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل المستخدمين");
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
      setError(err.response?.data?.message || "حدث خطأ أثناء تحديث حالة المستخدم");
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
    return (
      <div className="flex items-center gap-3 text-[var(--sub)]">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
        جارٍ التحميل...
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--blue-deep)]">إدارة المستخدمين</h1>
        <div className="field-shell py-1.5 px-3 w-48">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">كل الأنواع</option>
            <option value="Owner">أصحاب المتاجر</option>
            <option value="Employee">الموظفين</option>
            <option value="SuperAdmin">سوبر أدمن</option>
            <option value="SupportStaff">دعم فني</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert--danger">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد الإلكتروني</th>
              <th>النوع</th>
              <th>تاريخ التسجيل</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="font-bold">{user.fullName}</td>
                <td className="text-[var(--sub)]">{user.email}</td>
                <td className="text-[var(--sub)]">
                  {USER_TYPE_LABELS[user.userType] || user.userType}
                </td>
                <td className="text-[var(--sub)]">{formatDate(user.createdAt)}</td>
                <td>
                  <span className={`status-badge ${user.isActive ? "status-badge--active" : "status-badge--suspended"}`}>
                    {user.isActive ? "نشط" : "معطّل"}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => handleToggleActive(user)}
                    disabled={processingId === user.id}
                    className={user.isActive ? "btn-danger" : "btn-success"}
                  >
                    {processingId === user.id
                      ? "جاري التحديث..."
                      : user.isActive
                      ? "تعطيل"
                      : "تفعيل"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <p className="text-center text-[var(--sub)] py-8">لا يوجد مستخدمون مطابقون</p>
        )}
      </div>
    </div>
  );
}
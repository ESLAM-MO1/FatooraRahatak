"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

interface Warehouse {
  id: number;
  warehouseName: string;
  address: string | null;
  isDefault: boolean;
  isActive: boolean;
}

const emptyForm = {
  warehouseName: "",
  address: "",
};

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/warehouses");
      setWarehouses(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل المخازن");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

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
      await api.post("/warehouses", {
        warehouseName: form.warehouseName,
        address: form.address || null,
      });
      closeModal();
      await fetchWarehouses();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "حدث خطأ أثناء إنشاء المخزن");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[var(--sub)]">
        <span className="w-4 h-4 rounded-full border-2 border-[var(--blue)] border-t-transparent animate-spin" />
        جارٍ التحميل...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]">المخازن</h1>
        <button onClick={openAddModal} className="btn-primary text-[13.5px]">
          إضافة مخزن
        </button>
      </div>

      {error && (
        <div className="bg-[var(--danger-soft)] border border-[#efc6c6] text-[var(--danger)] px-3.5 py-2.5 rounded-[10px] text-[13.5px] mb-4">
          {error}
        </div>
      )}

      {actionError && !showModal && (
        <div className="bg-[var(--danger-soft)] border border-[#efc6c6] text-[var(--danger)] px-3.5 py-2.5 rounded-[10px] text-[13.5px] mb-4">
          {actionError}
        </div>
      )}

      <div className="table-wrap">
        {warehouses.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-[13.5px]">لا توجد مخازن بعد.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>اسم المخزن</th>
                <th>العنوان</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((warehouse) => (
                <tr key={warehouse.id}>
                  <td>
                    <span className="flex items-center gap-2">
                      {warehouse.warehouseName}
                      {warehouse.isDefault && <span className="badge-info">افتراضي</span>}
                    </span>
                  </td>
                  <td className="text-[var(--sub)]">{warehouse.address || "—"}</td>
                  <td>
                    <span className={warehouse.isActive ? "text-[var(--green)] font-bold" : "text-[#A6AFB6]"}>
                      {warehouse.isActive ? "نشط" : "غير نشط"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 className="text-[17px] font-bold text-[var(--blue-deep)] mb-5">إضافة مخزن</h2>

            {actionError && (
              <div className="bg-[var(--danger-soft)] border border-[#efc6c6] text-[var(--danger)] px-3.5 py-2.5 rounded-[10px] text-[13.5px] mb-4">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="warehouseName" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                  اسم المخزن
                </label>
                <div className="field-shell">
                  <input
                    id="warehouseName"
                    type="text"
                    value={form.warehouseName}
                    onChange={(e) => setForm({ ...form, warehouseName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="address" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                  العنوان (اختياري)
                </label>
                <div className="field-shell">
                  <input
                    id="address"
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2.5">
                <button type="submit" disabled={submitting} className="btn-primary flex-1 py-2.5">
                  {submitting ? "جارٍ الحفظ..." : "حفظ"}
                </button>
                <button type="button" onClick={closeModal} className="btn-outline flex-1 py-2.5">
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
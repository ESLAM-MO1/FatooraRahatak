"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { customerApi } from "@/lib/customerApi";

export interface CustomerAddress {
  id: number;
  fullName: string;
  city: string;
  addressLine: string;
  landmark?: string | null;
  notes?: string | null;
  isDefault: boolean;
}

interface Props {
  slug: string;
  token: string;
  addresses: CustomerAddress[];
  loading: boolean;
  error: string;
  defaultFullName: string;
  onRefresh: () => Promise<void>;
  onMessage: (msg: string) => void;
}

export default function AddressesTab({
  slug,
  token,
  addresses,
  loading,
  error,
  defaultFullName,
  onRefresh,
  onMessage,
}: Props) {
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [form, setForm] = useState({ fullName: "", city: "", addressLine: "", landmark: "", notes: "", isDefault: false });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CustomerAddress | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openForm = (addr: CustomerAddress | null) => {
    setEditing(addr);
    setForm({
      fullName: addr?.fullName || defaultFullName || "",
      city: addr?.city || "",
      addressLine: addr?.addressLine || "",
      landmark: addr?.landmark || "",
      notes: addr?.notes || "",
      isDefault: addr?.isDefault || false,
    });
    setFormError("");
    setFormOpen(true);
  };

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.city.trim() || !form.addressLine.trim()) {
      setFormError(t("addresses.required"));
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        fullName: form.fullName.trim(),
        city: form.city.trim(),
        addressLine: form.addressLine.trim(),
        landmark: form.landmark.trim() || null,
        notes: form.notes.trim() || null,
        isDefault: form.isDefault,
      };
      if (editing) {
        await customerApi(`/public/stores/${slug}/customer/addresses/${editing.id}`, token, {
          method: "PUT",
          body: payload,
        });
        onMessage(t("addresses.updateSuccess"));
      } else {
        await customerApi(`/public/stores/${slug}/customer/addresses`, token, {
          method: "POST",
          body: payload,
        });
        onMessage(t("addresses.saveSuccess"));
      }
      setFormOpen(false);
      await onRefresh();
    } catch (err: any) {
      setFormError(err?.message || t("account.loadError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await customerApi(`/public/stores/${slug}/customer/addresses/${deleteTarget.id}`, token, {
        method: "DELETE",
      });
      onMessage(t("addresses.deleteSuccess"));
      setDeleteTarget(null);
      await onRefresh();
    } catch (err: any) {
      onMessage(err?.message || t("account.loadError"));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500 text-sm py-6 text-center">{t("common.loading")}</p>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>;
  }

  const inputCls =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-bold text-gray-900">{t("addresses.title")}</h2>
        <button
          type="button"
          onClick={() => openForm(null)}
          className="text-[13px] font-bold text-white bg-gray-900 rounded-lg px-3 py-2 hover:opacity-90"
        >
          + {t("addresses.addNew")}
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-100 p-8 text-center">
          <p className="text-gray-500 mb-2">{t("addresses.noAddresses")}</p>
          <p className="text-sm text-gray-400">{t("addresses.noAddressesHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-sm text-gray-900">{addr.fullName}</p>
                    {addr.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        {t("addresses.default")}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-gray-600">{addr.city} — {addr.addressLine}</p>
                  {addr.landmark && <p className="text-[12px] text-gray-400 mt-1">{addr.landmark}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openForm(addr)}
                    className="text-[12px] font-bold text-blue-600 hover:text-blue-700"
                  >
                    {t("addresses.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(addr)}
                    className="text-[12px] font-bold text-red-600 hover:text-red-700"
                  >
                    {t("addresses.delete")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.5)" }}
          onClick={() => setFormOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[16px] font-bold mb-4" style={{ color: "#0F172A" }}>
              {editing ? t("addresses.edit") : t("addresses.addNew")}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1">{t("addresses.fullName")}</label>
                <input className={inputCls} value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1">{t("addresses.city")}</label>
                <input className={inputCls} value={form.city} onChange={(e) => setField("city", e.target.value)} />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1">{t("addresses.addressLine")}</label>
                <input className={inputCls} value={form.addressLine} onChange={(e) => setField("addressLine", e.target.value)} />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1">{t("addresses.landmark")}</label>
                <input className={inputCls} value={form.landmark} onChange={(e) => setField("landmark", e.target.value)} />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1">{t("addresses.notes")}</label>
                <input className={inputCls} value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setField("isDefault", e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                {t("addresses.isDefault")}
              </label>
              {formError && <p className="text-[12px] text-red-600">{formError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg py-2.5 text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? t("addresses.saving") : t("addresses.save")}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 rounded-lg py-2.5 text-[13px] font-bold border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.5)" }}
          onClick={() => setDeleteTarget(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold mb-2" style={{ color: "#0F172A" }}>
              {t("addresses.deleteConfirm")}
            </h3>
            <p className="text-[13px] text-gray-500 mb-4">
              {deleteTarget.city} — {deleteTarget.addressLine}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 rounded-lg py-2.5 text-[13px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? t("common.loading") : t("addresses.delete")}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg py-2.5 text-[13px] font-bold border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

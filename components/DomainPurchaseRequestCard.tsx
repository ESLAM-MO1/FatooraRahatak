"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";

interface PurchaseRequest {
  id: number;
  preferredName: string;
  notes: string | null;
  status: string;
  assignedDomain: string | null;
  adminNote: string | null;
}

export default function DomainPurchaseRequestCard() {
  const { t } = useTranslation();
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferredName, setPreferredName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/domain-purchase-requests/my")
      .then((res) => setRequest(res.data.data ?? null))
      .catch(() => setRequest(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!preferredName.trim()) {
      setError(t("domainPurchase.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/domain-purchase-requests", {
        preferredName: preferredName.trim(),
        notes: notes.trim() || null,
      });
      setRequest(res.data.data);
      setPreferredName("");
      setNotes("");
    } catch (err: any) {
      setError(err.response?.data?.message || t("domainPurchase.submitError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const isPending = request?.status === "Pending";
  const isRejected = request?.status === "Rejected";

  return (
    <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--line, #eee)" }}>
      <h3 style={{ fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }} className="mb-1">
        {t("domainPurchase.title")}
      </h3>
      <p className="text-[12px] text-[var(--sub)] mb-4">{t("domainPurchase.desc")}</p>

      {isPending && request && (
        <div className="alert alert--warning mb-2">
          <span>
            {t("domainPurchase.pendingMessage")} <b dir="ltr">{request.preferredName}</b>
          </span>
        </div>
      )}

      {isRejected && request && (
        <div className="alert alert--warning mb-4">
          <span>
            {t("domainPurchase.rejectedMessage")}
            {request.adminNote ? ` ${t("domainPurchase.rejectedReason")} ${request.adminNote}` : ""}
          </span>
        </div>
      )}

      {error && (
        <div className="alert alert--warning mb-4">
          <span>{error}</span>
        </div>
      )}

      {!isPending && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>{t("domainPurchase.nameLabel")}</label>
            <div className="field-shell">
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                dir="ltr"
                maxLength={100}
                placeholder={t("domainPurchase.namePlaceholder")}
              />
            </div>
          </div>
          <div>
            <label>{t("domainPurchase.notesLabel")}</label>
            <div className="field-shell">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={t("domainPurchase.notesPlaceholder")}
              />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? t("domainPurchase.submitting") : t("domainPurchase.submit")}
          </button>
        </form>
      )}
    </div>
  );
}

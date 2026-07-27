"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import LoadingState from "@/components/LoadingState";

interface TicketReply {
  id: number;
  replyText: string;
  repliedByName: string;
  isAdminReply: boolean;
  createdAt: string;
}

interface TicketDetail {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  ticketNumber: string;
  createdAt: string;
  updatedAt: string;
  replies: TicketReply[];
}

const statusStyles: Record<string, string> = {
  New: "badge badge--blue",
  InProgress: "badge badge--yellow",
  Replied: "badge badge--gray",
  Closed: "badge badge--green",
};

export default function TicketDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id as string;

  const statusLabel = (status: string) => {
    switch (status) {
      case "New": return t("ticketDetail.statusNew");
      case "InProgress": return t("ticketDetail.statusInProgress");
      case "Replied": return t("ticketDetail.statusReplied");
      case "Closed": return t("ticketDetail.statusClosed");
      default: return status;
    }
  };

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/site/tickets/${id}`);
      setTicket(res.data.data);
    } catch (err: any) {
      if (err.response?.status === 401) return;
      setError(err.response?.data?.message || t("ticketDetail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    setError("");
    setSuccessMessage("");
    try {
      await api.post(`/site/tickets/${id}/replies`, { replyText: replyText.trim() });
      setSuccessMessage(t("ticketDetail.sendSuccess"));
      setReplyText("");
      await fetchTicket();
    } catch (err: any) {
      setError(err.response?.data?.message || t("ticketDetail.sendError"));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!ticket) {
    return (
      <div>
        <Link href="/dashboard" className="text-[var(--blue)] hover:underline text-sm">
          {t("ticketDetail.backToDashboard")}
        </Link>
        {error && <div className="alert alert--danger mt-4">{error}</div>}
      </div>
    );
  }

  const canReply = ticket.status !== "Closed";

  return (
    <div>
      <div className="mb-4">
        <Link href="/dashboard" className="text-[var(--blue)] hover:underline text-sm">
          {t("ticketDetail.backToDashboard")}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]" dir="ltr">
          {ticket.ticketNumber}
        </h1>
        <span className={statusStyles[ticket.status] ?? "badge badge--gray"}>
          {statusLabel(ticket.status)}
        </span>
      </div>

      {error && <div className="alert alert--danger mb-4">{error}</div>}
      {successMessage && <div className="alert alert--success mb-4">{successMessage}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">{t("ticketDetail.ticketDetails")}</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--sub)]">{t("ticketDetail.ticketNumber")}: </span>
              <span className="text-[var(--ink)] font-medium" dir="ltr">{ticket.ticketNumber}</span>
            </p>
            <p>
              <span className="text-[var(--sub)]">{t("ticketDetail.subject")}: </span>
              <span className="text-[var(--ink)] font-medium">{ticket.subject}</span>
            </p>
            <p>
              <span className="text-[var(--sub)]">{t("ticketDetail.date")}: </span>
              <span className="text-[var(--ink)]">
                {new Date(ticket.createdAt).toLocaleString("ar-SA")}
              </span>
            </p>
            <p>
              <span className="text-[var(--sub)]">{t("ticketDetail.status")}: </span>
              <span className={statusStyles[ticket.status] ?? "badge badge--gray"}>
                {statusLabel(ticket.status)}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">{t("ticketDetail.originalMessage")}</h2>
        <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
      </div>

      {ticket.replies.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">{t("ticketDetail.replies")}</h2>
          <div className="space-y-3">
            {ticket.replies.map((reply) => (
              <div
                key={reply.id}
                className={`card p-4 ${reply.isAdminReply ? "border-r-4 border-r-[var(--blue)]" : "border-r-4 border-r-[var(--gold)]"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[12px] font-bold ${reply.isAdminReply ? "text-[var(--blue)]" : "text-[var(--gold-deep)]"}`}>
                    <Icon name={reply.isAdminReply ? "headset" as any : "user" as any} size={14} className="inline ml-1" />
                    {reply.isAdminReply ? t("ticketDetail.adminReply") : t("ticketDetail.yourReply")}
                  </span>
                  <span className="text-[11px] text-[var(--sub)]">
                    {new Date(reply.createdAt).toLocaleString("ar-SA")}
                  </span>
                </div>
                <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap">{reply.replyText}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {canReply && (
        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">{t("ticketDetail.addReply")}</h2>
          <div className="field-shell mb-3">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={t("ticketDetail.writeReply")}
              rows={4}
            />
          </div>
          <button
            onClick={handleSendReply}
            disabled={sending || !replyText.trim()}
            className="btn btn-primary disabled:opacity-60"
          >
            {sending ? t("common.saving") : t("ticketDetail.send")}
          </button>
        </div>
      )}

      {!canReply && (
        <div className="card p-5">
          <p className="text-sm text-[var(--sub)] text-center">{t("ticketDetail.statusClosed")}</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import { usePackageFeature } from "@/lib/usePackageFeatures";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import RestrictedFeatureState from "@/components/RestrictedFeatureState";
import { useConfirm } from "@/components/ConfirmDialog";
import Can from "@/components/Can";

interface Payroll {
  id: number;
  employeeId: number;
  employeeName: string;
  periodMonth: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  commission: number;
  netSalary: number;
  status: "Draft" | "Approved" | "Paid";
  journalEntryId: number | null;
  journalEntryNumber: string | null;
}

const emptyEditForm = {
  allowances: "",
  deductions: "",
  commission: "",
};

export default function PayrollPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const gate = usePackageFeature("hasPayroll");
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [generating, setGenerating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);

  const fetchPayrolls = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/payroll", {
        params: { year, month },
      });
      setPayrolls(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("payroll.loadError"));
    } finally {
      setLoading(false);
    }
  }, [year, month, t]);

  useEffect(() => {
    if (!gate.ready || !gate.allowed) return;
    fetchPayrolls();
  }, [fetchPayrolls, gate.ready, gate.allowed]);

  if (!gate.ready) {
    return <LoadingState />;
  }

  if (!gate.allowed) {
    return <RestrictedFeatureState />;
  }

  const handleGenerate = async () => {
    setActionError("");
    setGenerating(true);

    try {
      await api.post("/payroll/generate", { year, month });
      await fetchPayrolls();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("payroll.generateError")
      );
    } finally {
      setGenerating(false);
    }
  };

  const openEditModal = (payroll: Payroll) => {
    setEditingPayroll(payroll);
    setEditForm({
      allowances: payroll.allowances.toString(),
      deductions: payroll.deductions.toString(),
      commission: payroll.commission.toString(),
    });
    setActionError("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingPayroll(null);
    setEditForm(emptyEditForm);
    setActionError("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayroll) return;

    setActionError("");
    setSubmittingEdit(true);

    try {
      await api.put(`/payroll/${editingPayroll.id}`, {
        allowances: parseFloat(editForm.allowances) || 0,
        deductions: parseFloat(editForm.deductions) || 0,
        commission: parseFloat(editForm.commission) || 0,
      });
      closeEditModal();
      await fetchPayrolls();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("payroll.updateError")
      );
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleApprove = async (payroll: Payroll) => {
    if (
      !(await confirm(
        t("payroll.confirmApprove", { employeeName: payroll.employeeName })
      ))
    ) {
      return;
    }

    setActionError("");
    setApprovingId(payroll.id);
    try {
      await api.put(`/payroll/${payroll.id}/approve`);
      await fetchPayrolls();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("payroll.approveError")
      );
    } finally {
      setApprovingId(null);
    }
  };

  const handleMarkPaid = async (payroll: Payroll) => {
    if (
      !(await confirm(
        t("payroll.confirmPaid", { employeeName: payroll.employeeName })
      ))
    ) {
      return;
    }

    setActionError("");
    setPayingId(payroll.id);
    try {
      await api.put(`/payroll/${payroll.id}/mark-paid`);
      await fetchPayrolls();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("payroll.markPaidError")
      );
    } finally {
      setPayingId(null);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "Draft":
        return t("payroll.statusDraft");
      case "Approved":
        return t("payroll.statusApproved");
      case "Paid":
        return t("payroll.statusPaid");
      default:
        return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "badge badge--yellow";
      case "Approved":
        return "badge badge--blue";
      case "Paid":
        return "badge badge--green";
      default:
        return "badge badge--gray";
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <PageHeader icon="wallet" title={t("payroll.title")} />

        <div className="card p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("payroll.year")}</label>
              <div className="field-shell max-w-[150px]">
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                  min={2020}
                  max={2030}
                />
              </div>
            </div>
            <div>
              <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("payroll.month")}</label>
              <div className="field-shell max-w-[150px]">
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <Can code="Payroll.Add">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn btn-primary whitespace-nowrap disabled:opacity-60"
              >
                {generating ? t("payroll.generating") : t("payroll.generate")}
              </button>
            </Can>
          </div>
        </div>

        {error && <div className="alert alert--danger mb-4">{error}</div>}

        {actionError && !showEditModal && <div className="alert alert--danger mb-4">{actionError}</div>}

        <div className="card overflow-hidden">
          {payrolls.length === 0 ? (
            <p className="p-6 text-[var(--sub)] text-sm text-center">
              {t("payroll.noPayrolls")}
            </p>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm hidden md:table">
                <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
                  <tr>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("payroll.employeeName")}</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("payroll.basic")}</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("payroll.allowances")}</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("payroll.deductions")}</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("payroll.commission")}</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("payroll.net")}</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("common.status")}</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("payroll.journalEntry")}</th>
                    <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map((payroll) => (
                    <tr key={payroll.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors">
                      <td className="p-4 text-[var(--ink)] font-bold">{payroll.employeeName}</td>
                      <td className="p-4 text-[var(--ink)]" dir="ltr">{payroll.basicSalary.toLocaleString("ar-SA")} {t("common.sar")}</td>
                      <td className="p-4 text-[var(--ink)]" dir="ltr">{payroll.allowances.toLocaleString("ar-SA")} {t("common.sar")}</td>
                      <td className="p-4 text-[var(--ink)]" dir="ltr">{payroll.deductions.toLocaleString("ar-SA")} {t("common.sar")}</td>
                      <td className="p-4 text-[var(--ink)]" dir="ltr">{payroll.commission.toLocaleString("ar-SA")} {t("common.sar")}</td>
                      <td className="p-4 text-[var(--blue-deep)] font-bold" dir="ltr">{payroll.netSalary.toLocaleString("ar-SA")} {t("common.sar")}</td>
                      <td className="p-4">
                        <span className={statusColor(payroll.status)}>
                          {statusLabel(payroll.status)}
                        </span>
                      </td>
                      <td className="p-4">
                        {payroll.journalEntryId ? (
                          <Link
                            href={`/dashboard/accounting/journal-entries/${payroll.journalEntryId}`}
                            className="inline-flex items-center gap-1.5 text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]"
                          >
                            <Icon name="journal" className="shrink-0" />
                            {payroll.journalEntryNumber || `#${payroll.journalEntryId}`}
                          </Link>
                        ) : (
                          <span className="text-[var(--sub)] text-[13px]">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {payroll.status === "Draft" && (
                            <>
                              <Can code="Payroll.Edit">
                                <button onClick={() => openEditModal(payroll)} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]">
                                  {t("common.edit")}
                                </button>
                              </Can>
                              <Can code="Payroll.Approve">
                                <button
                                  onClick={() => handleApprove(payroll)}
                                  disabled={approvingId === payroll.id}
                                  className="text-[var(--green)] hover:opacity-80 font-medium text-[13px] disabled:opacity-50"
                                >
                                  {approvingId === payroll.id ? t("payroll.approving") : t("payroll.approve")}
                                </button>
                              </Can>
                            </>
                          )}
                          {payroll.status === "Approved" && (
                            <Can code="Payroll.Edit">
                              <button
                                onClick={() => handleMarkPaid(payroll)}
                                disabled={payingId === payroll.id}
                                className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px] disabled:opacity-50"
                              >
                                {payingId === payroll.id ? t("payroll.markingPaid") : t("payroll.markPaid")}
                              </button>
                            </Can>
                          )}
                          {payroll.status === "Paid" && (
                            <span className="text-[var(--sub)] text-[13px]">{t("payroll.paid")}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {payrolls.map((payroll) => (
                <div key={payroll.id} className="card p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("payroll.employeeName")}</p>
                      <p className="text-[12px] text-[var(--ink)] font-bold">{payroll.employeeName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("common.status")}</p>
                      <span className={statusColor(payroll.status)}>
                        {statusLabel(payroll.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("payroll.basic")}</p>
                      <p className="text-[12px]" dir="ltr">{payroll.basicSalary.toLocaleString("ar-SA")} {t("common.sar")}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("payroll.allowances")}</p>
                      <p className="text-[12px]" dir="ltr">{payroll.allowances.toLocaleString("ar-SA")} {t("common.sar")}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("payroll.deductions")}</p>
                      <p className="text-[12px]" dir="ltr">{payroll.deductions.toLocaleString("ar-SA")} {t("common.sar")}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("payroll.commission")}</p>
                      <p className="text-[12px]" dir="ltr">{payroll.commission.toLocaleString("ar-SA")} {t("common.sar")}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("payroll.net")}</p>
                      <p className="text-[12px] text-[var(--blue-deep)] font-bold" dir="ltr">{payroll.netSalary.toLocaleString("ar-SA")} {t("common.sar")}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[var(--sub)]">{t("payroll.journalEntry")}</p>
                      {payroll.journalEntryId ? (
                        <Link
                          href={`/dashboard/accounting/journal-entries/${payroll.journalEntryId}`}
                          className="inline-flex items-center gap-1.5 text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[12px]"
                        >
                          <Icon name="journal" className="shrink-0" />
                          {payroll.journalEntryNumber || `#${payroll.journalEntryId}`}
                        </Link>
                      ) : (
                        <span className="text-[var(--sub)] text-[12px]">—</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    {payroll.status === "Draft" && (
                      <>
                        <Can code="Payroll.Edit">
                          <button onClick={() => openEditModal(payroll)} className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px]">
                            {t("common.edit")}
                          </button>
                        </Can>
                        <Can code="Payroll.Approve">
                          <button
                            onClick={() => handleApprove(payroll)}
                            disabled={approvingId === payroll.id}
                            className="text-[var(--green)] hover:opacity-80 font-medium text-[13px] disabled:opacity-50"
                          >
                            {approvingId === payroll.id ? t("payroll.approving") : t("payroll.approve")}
                          </button>
                        </Can>
                      </>
                    )}
                    {payroll.status === "Approved" && (
                      <Can code="Payroll.Edit">
                        <button
                          onClick={() => handleMarkPaid(payroll)}
                          disabled={payingId === payroll.id}
                          className="text-[var(--blue)] hover:text-[var(--blue-deep)] font-medium text-[13px] disabled:opacity-50"
                        >
                          {payingId === payroll.id ? t("payroll.markingPaid") : t("payroll.markPaid")}
                        </button>
                      </Can>
                    )}
                    {payroll.status === "Paid" && (
                      <span className="text-[var(--sub)] text-[13px]">{t("payroll.paid")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>

        {showEditModal && editingPayroll && (
          <div className="modal-overlay" onClick={closeEditModal}>
            <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4"><h2 className="text-[18px] font-bold text-[var(--blue-deep)]">
                {t("payroll.editSalary")} {editingPayroll.employeeName}
              </h2><button onClick={closeEditModal} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button></div>

              {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}

              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">
                    {t("payroll.readonlyBasic")}
                  </label>
                  <div className="field-shell bg-[#F7F8F9]">
                    <input
                      type="text"
                      value={editingPayroll.basicSalary.toLocaleString("ar-SA-u-nu-latn") + " " + t("common.sar")}
                      disabled
                      className="text-[var(--sub)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5 flex items-center gap-1.5">{t("payroll.allowances")}</label>
                  <div className="field-shell">
                    <input
                      type="number"
                      value={editForm.allowances}
                      onChange={(e) => setEditForm({ ...editForm, allowances: e.target.value })}
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5 flex items-center gap-1.5">{t("payroll.deductions")}</label>
                  <div className="field-shell">
                    <input
                      type="number"
                      value={editForm.deductions}
                      onChange={(e) => setEditForm({ ...editForm, deductions: e.target.value })}
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("payroll.commission")}</label>
                  <div className="field-shell">
                    <input
                      type="number"
                      value={editForm.commission}
                      onChange={(e) => setEditForm({ ...editForm, commission: e.target.value })}
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="bg-[var(--blue-50)] p-4 rounded-xl text-sm">
                  <p className="font-bold text-[var(--ink)]">
                    {t("payroll.expectedNet")}{" "}
                    <span className="text-[var(--blue-deep)]" dir="ltr">
                      {(
                        editingPayroll.basicSalary +
                        (parseFloat(editForm.allowances) || 0) +
                        (parseFloat(editForm.commission) || 0) -
                        (parseFloat(editForm.deductions) || 0)
                      ).toLocaleString("ar-SA-u-nu-latn")}
                    </span>{" "}
                    {t("common.sar")}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={submittingEdit} className="btn btn-primary flex-1 disabled:opacity-60">
                    {submittingEdit ? t("payroll.saving") : t("common.save")}
                  </button>
                  <button type="button" onClick={closeEditModal} className="btn btn-secondary flex-1">
                    {t("common.cancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

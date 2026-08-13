"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import InfoTooltip from "@/components/InfoTooltip";
import Can from "@/components/Can";

interface Account {
  id: number;
  code: string;
  nameAr: string;
  accountType: string;
  parentAccountId: number | null;
  isActive: boolean;
  isSystem: boolean;
  balance: number;
  children: Account[];
}

interface AccountForm {
  code: string;
  nameAr: string;
  accountType: string;
  parentAccountId: string;
}

const emptyForm: AccountForm = {
  code: "",
  nameAr: "",
  accountType: "Asset",
  parentAccountId: "",
};

const accountTypeLabels: Record<string, string> = {
  Asset: "accounts.typeAsset",
  Liability: "accounts.typeLiability",
  Equity: "accounts.typeEquity",
  Revenue: "accounts.typeRevenue",
  Expense: "accounts.typeExpense",
};

const accountTypeStyles: Record<string, string> = {
  Asset: "badge badge--blue",
  Liability: "badge badge--red",
  Equity: "badge badge--yellow",
  Revenue: "badge badge--green",
  Expense: "badge badge--gray",
};

function flattenAccounts(accounts: Account[], depth = 0): { account: Account; depth: number }[] {
  return accounts.flatMap((a) => [
    { account: a, depth },
    ...flattenAccounts(a.children || [], depth + 1),
  ]);
}

function collectDescendantIds(account: Account): number[] {
  return [account.id, ...(account.children || []).flatMap(collectDescendantIds)];
}

export default function AccountsPage() {
  const { t } = useTranslation();
  const [tree, setTree] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/accounts");
      setTree(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("accounts.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const flatList = flattenAccounts(tree);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAddModal = (parentId?: number) => {
    setEditingId(null);
    setForm({ ...emptyForm, parentAccountId: parentId ? String(parentId) : "" });
    setActionError("");
    setShowModal(true);
  };

  const openEditModal = (account: Account) => {
    setEditingId(account.id);
    setForm({
      code: account.code,
      nameAr: account.nameAr,
      accountType: account.accountType,
      parentAccountId: account.parentAccountId ? String(account.parentAccountId) : "",
    });
    setActionError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setActionError("");
  };

  const editingAccount = flatList.find((f) => f.account.id === editingId)?.account;
  const excludedIds = editingAccount ? collectDescendantIds(editingAccount) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setSubmitting(true);

    const payload = {
      code: form.code,
      nameAr: form.nameAr,
      accountType: form.accountType,
      parentAccountId: form.parentAccountId ? Number(form.parentAccountId) : null,
    };

    try {
      if (editingId) {
        await api.put(`/accounts/${editingId}`, payload);
        setSuccessMessage(t("accounts.updatedSuccess"));
      } else {
        await api.post("/accounts", payload);
        setSuccessMessage(t("accounts.createdSuccess"));
      }
      closeModal();
      await fetchData();
    } catch (err: any) {
      setActionError(err.response?.data?.message || t("accounts.saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  const renderNode = (account: Account, depth: number) => {
    const hasChildren = account.children && account.children.length > 0;
    const isOpen = expanded.has(account.id);

    return (
      <div key={account.id}>
        <div
          className="flex items-center justify-between py-2.5 px-3 border-b border-[var(--border)] hover:bg-[var(--blue-50)]/40 transition-colors"
          style={{ paddingRight: `${12 + depth * 22}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(account.id)}
                className="w-5 h-5 flex items-center justify-center text-[var(--sub)] shrink-0"
              >
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14" className={`transition-transform ${isOpen ? "rotate-90" : ""}`}>
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            <span className="text-[12px] text-[var(--sub)] shrink-0" dir="ltr">
              {account.code}
            </span>
            <span className="text-[13.5px] text-[var(--ink)] font-medium truncate">{account.nameAr}</span>
            {account.isSystem && (
              <span className="badge badge--gray">{t("accounts.defaultBadge")}</span>
            )}
            {!account.isActive && (
              <span className="badge badge--red">{t("accounts.inactiveBadge")}</span>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className={accountTypeStyles[account.accountType] ?? "badge badge--gray"}>
              {t(accountTypeLabels[account.accountType] ?? "common.noData")}
            </span>
            <span className="text-[13px] text-[var(--ink)] w-24 text-left" dir="ltr">
              {account.balance.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
            </span>
            <div className="flex items-center gap-2">
              <Can code="ChartOfAccounts.Add">
                <button
                  onClick={() => openAddModal(account.id)}
                  title={t("accounts.addSubAccount")}
                  className="text-[var(--blue)] hover:text-[var(--blue-deep)]"
                >
                  <Icon name="plus" />
                </button>
              </Can>
              <Can code="ChartOfAccounts.Edit">
                <button
                  onClick={() => openEditModal(account)}
                  title={t("common.edit")}
                  className="text-[var(--sub)] hover:text-[var(--ink)]"
                >
                  <Icon name="edit" />
                </button>
              </Can>
            </div>
          </div>
        </div>

        {hasChildren && isOpen && account.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div>
      <PageHeader icon="ledger" title={t("accounts.title")}>
        <Can code="ChartOfAccounts.Add">
          <button onClick={() => openAddModal()} className="btn btn-primary">
            <Icon name="plus" />
            {t("accounts.addAccount")}
          </button>
        </Can>
      </PageHeader>

      {error && <div className="alert alert--danger mb-4">{error}</div>}

      <SuccessToast message={successMessage} fixed className="mb-4" />

      {actionError && !showModal && <div className="alert alert--danger mb-4">{actionError}</div>}

      <div className="card overflow-hidden">
        {tree.length === 0 ? (
          <p className="p-6 text-[var(--sub)] text-sm">{t("accounts.noAccounts")}</p>
        ) : (
          <div>{tree.map((account) => renderNode(account, 0))}</div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-[18px] font-bold text-[var(--blue-deep)]">
              {editingId ? t("accounts.editAccount") : t("accounts.addAccount")}
            </h2><button onClick={closeModal} className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors" aria-label={t("common.close")}>✕</button></div>

            {actionError && <div className="alert alert--danger mb-4">{actionError}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5 flex items-center gap-1.5">{t("accounts.accountCode")}<InfoTooltip messageKey="accounts.accountCodeTooltip" /></label>
                <div className="field-shell">
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5">{t("accounts.accountName")}</label>
                <div className="field-shell">
                  <input
                    type="text"
                    value={form.nameAr}
                    onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5 flex items-center gap-1.5">{t("accounts.accountType")}<InfoTooltip messageKey="accounts.accountTypeTooltip" /></label>
                <div className="field-shell">
                  <select
                    value={form.accountType}
                    onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                  >
                    {Object.entries(accountTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {t(label)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[var(--ink)] mb-1.5 flex items-center gap-1.5">{t("accounts.parentAccount")}<InfoTooltip messageKey="accounts.parentAccountTooltip" /></label>
                <div className="field-shell">
                  <select
                    value={form.parentAccountId}
                    onChange={(e) => setForm({ ...form, parentAccountId: e.target.value })}
                  >
                    <option value="">{t("accounts.noParent")}</option>
                    {flatList
                      .filter((f) => !excludedIds.includes(f.account.id))
                      .map((f) => (
                        <option key={f.account.id} value={f.account.id}>
                          {"— ".repeat(f.depth)}
                          {f.account.code} - {f.account.nameAr}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1 disabled:opacity-60">
                  {submitting ? t("common.saving") : t("common.save")}
                </button>
                <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

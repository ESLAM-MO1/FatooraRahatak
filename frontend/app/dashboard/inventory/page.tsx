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

interface Warehouse {
  id: number;
  warehouseName: string;
}

interface StockItem {
  warehouseId: number;
  warehouseName: string;
  productId: number;
  productNameAr: string;
  quantityAvailable: number;
  quantityReserved: number;
  reorderLevel: number;
}

interface Product {
  id: number;
  nameAr: string;
}

interface TransferItemRow {
  productId: string;
  quantity: string;
}

type Tab = "stock" | "transfer" | "damage";

const emptyTransferItem: TransferItemRow = { productId: "", quantity: "" };

const emptyDamageForm = {
  warehouseId: "",
  productId: "",
  quantity: "",
  reason: "",
};

export default function InventoryPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("stock");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [error, setError] = useState("");

  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferItems, setTransferItems] = useState<TransferItemRow[]>([{ ...emptyTransferItem }]);
  const [transferError, setTransferError] = useState("");
  const [transferSuccess, setTransferSuccess] = useState("");
  const [pendingTransferId, setPendingTransferId] = useState<number | null>(null);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [approvingTransfer, setApprovingTransfer] = useState(false);

  const [damageForm, setDamageForm] = useState(emptyDamageForm);
  const [damageError, setDamageError] = useState("");
  const [damageSuccess, setDamageSuccess] = useState("");
  const [pendingDamageId, setPendingDamageId] = useState<number | null>(null);
  const [submittingDamage, setSubmittingDamage] = useState(false);
  const [approvingDamage, setApprovingDamage] = useState(false);

  const fetchStock = useCallback(async (warehouseId?: string) => {
    setStockLoading(true);
    try {
      const params: Record<string, string> = {};
      if (warehouseId) params.warehouseId = warehouseId;
      const res = await api.get("/inventory/stock", { params });
      setStock(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("inventory.stockLoadError"));
    } finally {
      setStockLoading(false);
    }
  }, [t]);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [warehousesRes, productsRes] = await Promise.all([
        api.get("/warehouses"),
        api.get("/products", { params: { page: 1, pageSize: 500 } }),
      ]);
      setWarehouses(warehousesRes.data.data);
      setProducts(productsRes.data.data.items || productsRes.data.data || []);
      await fetchStock();
    } catch (err: any) {
      setError(err.response?.data?.message || t("inventory.dataLoadError"));
    } finally {
      setLoading(false);
    }
  }, [fetchStock, t]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!loading) {
      fetchStock(warehouseFilter || undefined);
    }
  }, [warehouseFilter, loading, fetchStock]);

  const addTransferItem = () => {
    setTransferItems([...transferItems, { ...emptyTransferItem }]);
  };

  const updateTransferItem = (index: number, field: keyof TransferItemRow, value: string) => {
    const updated = [...transferItems];
    updated[index][field] = value;
    setTransferItems(updated);
  };

  const removeTransferItem = (index: number) => {
    if (transferItems.length <= 1) return;
    setTransferItems(transferItems.filter((_, i) => i !== index));
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError("");
    setTransferSuccess("");
    setPendingTransferId(null);
    setSubmittingTransfer(true);

    const validItems = transferItems
      .filter((item) => item.productId && item.quantity)
      .map((item) => ({
        productId: Number(item.productId),
        quantity: parseInt(item.quantity) || 0,
      }));

    if (validItems.length === 0) {
      setTransferError(t("inventory.addOneProduct"));
      setSubmittingTransfer(false);
      return;
    }

    try {
      const res = await api.post("/inventory/transfer", {
        fromWarehouseId: Number(transferFrom),
        toWarehouseId: Number(transferTo),
        items: validItems,
      });
      const transferId = res.data.data?.transferId;
      setPendingTransferId(transferId);
      setTransferSuccess(t("inventory.pendingApproval"));
      setTransferItems([{ ...emptyTransferItem }]);
    } catch (err: any) {
      setTransferError(err.response?.data?.message || t("inventory.transferCreateError"));
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const handleApproveTransfer = async () => {
    if (!pendingTransferId) return;
    setTransferError("");
    setApprovingTransfer(true);
    try {
      await api.put(`/inventory/transfer/${pendingTransferId}/approve`);
      setTransferSuccess(t("inventory.transferApproved"));
      setPendingTransferId(null);
      await fetchStock(warehouseFilter || undefined);
    } catch (err: any) {
      setTransferError(err.response?.data?.message || t("inventory.transferApproveError"));
    } finally {
      setApprovingTransfer(false);
    }
  };

  const handleReportDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    setDamageError("");
    setDamageSuccess("");
    setPendingDamageId(null);
    setSubmittingDamage(true);

    try {
      const res = await api.post("/inventory/damage", {
        warehouseId: Number(damageForm.warehouseId),
        productId: Number(damageForm.productId),
        quantity: parseInt(damageForm.quantity) || 0,
        reason: damageForm.reason,
      });
      const damageId = res.data.data?.damageId;
      setPendingDamageId(damageId);
      setDamageSuccess(t("inventory.damageRegistered"));
      setDamageForm(emptyDamageForm);
    } catch (err: any) {
      setDamageError(err.response?.data?.message || t("inventory.damageCreateError"));
    } finally {
      setSubmittingDamage(false);
    }
  };

  const handleApproveDamage = async () => {
    if (!pendingDamageId) return;
    setDamageError("");
    setApprovingDamage(true);
    try {
      await api.put(`/inventory/damage/${pendingDamageId}/approve`);
      setDamageSuccess(t("inventory.damageApproved"));
      setPendingDamageId(null);
      await fetchStock(warehouseFilter || undefined);
    } catch (err: any) {
      setDamageError(err.response?.data?.message || t("inventory.damageApproveError"));
    } finally {
      setApprovingDamage(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "stock", label: t("inventory.stockTab") },
    { id: "transfer", label: t("inventory.transferTab") },
    { id: "damage", label: t("inventory.damageTab") },
  ];

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader icon="layers" title={t("inventory.title")} />

      {error && <div className="alert alert--danger">{error}</div>}

      <div className="tabs-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "stock" && (
        <div className="card p-6">
          <div className="mb-5">
            <label htmlFor="warehouseFilter" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
              {t("inventory.filterByWarehouse")}
            </label>
            <div className="field-shell max-w-xs">
              <select id="warehouseFilter" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
                <option value="">{t("inventory.allWarehouses")}</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.warehouseName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {stockLoading ? (
            <p className="text-[var(--sub)] text-[13.5px]">{t("common.loading")}</p>
          ) : stock.length === 0 ? (
            <p className="text-[var(--sub)] text-[13.5px]">{t("inventory.noStock")}</p>
          ) : (
            <div className="table-wrap overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>{t("inventory.product")}</th>
                    <th>{t("inventory.warehouse")}</th>
                    <th>{t("inventory.availableQty")}</th>
                    <th>{t("inventory.reservedQty")}</th>
                    <th>{t("inventory.reorderLevel")} <span className="inline-flex align-middle"><InfoTooltip messageKey="inventory.reorderLevelTooltip" /></span></th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((item, index) => (
                    <tr key={`${item.warehouseId}-${item.productId}-${index}`}>
                      <td>{item.productNameAr}</td>
                      <td className="text-[var(--sub)]">{item.warehouseName}</td>
                      <td className="font-bold">{item.quantityAvailable}</td>
                      <td className="text-[var(--sub)]">{item.quantityReserved}</td>
                      <td className="text-[var(--sub)]">{item.reorderLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "transfer" && (
        <div className="card p-6">
          {transferError && <div className="alert alert--danger mb-4">{transferError}</div>}

          <SuccessToast message={transferSuccess} fixed className="mb-4" />
          {transferSuccess && pendingTransferId && (
            <div className="mb-4">
              <Can code="StockTransfer.Approve">
                <button onClick={handleApproveTransfer} disabled={approvingTransfer} className="btn btn-primary py-1.5 px-3 text-[12.5px]">
                  {approvingTransfer ? t("inventory.approving") : t("inventory.approveNow")}
                </button>
              </Can>
            </div>
          )}

          <form onSubmit={handleCreateTransfer}>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label htmlFor="transferFrom" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                  {t("inventory.fromWarehouse")}
                </label>
                <div className="field-shell">
                  <select id="transferFrom" value={transferFrom} onChange={(e) => setTransferFrom(e.target.value)} required>
                    <option value="">{t("inventory.selectWarehouse")}</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="transferTo" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                  {t("inventory.toWarehouse")}
                </label>
                <div className="field-shell">
                  <select id="transferTo" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} required>
                    <option value="">{t("inventory.selectWarehouse")}</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-[13.5px] font-bold text-[var(--ink)]">{t("inventory.products")}</label>
                <button type="button" onClick={addTransferItem} className="text-[var(--blue)] text-[13px] font-bold hover:underline">
                  {t("inventory.addProduct")}
                </button>
              </div>
              {transferItems.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <div className="field-shell flex-1">
                    <select value={item.productId} onChange={(e) => updateTransferItem(index, "productId", e.target.value)} required>
                      <option value="">{t("inventory.selectProduct")}</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-shell w-28 shrink-0">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateTransferItem(index, "quantity", e.target.value)}
                      required
                      min={1}
                      placeholder={t("inventory.quantity")}
                    />
                  </div>
                  {transferItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTransferItem(index)}
                      className="text-[var(--danger)] text-[13px] font-bold px-2 hover:underline"
                    >
                      {t("common.delete")}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <Can code="StockTransfer.Add">
              <button type="submit" disabled={submittingTransfer} className="btn btn-primary">
                {submittingTransfer ? t("inventory.submitting") : t("inventory.submitTransfer")}
              </button>
            </Can>
          </form>
        </div>
      )}

      {activeTab === "damage" && (
        <div className="card p-6">
          {damageError && <div className="alert alert--danger mb-4">{damageError}</div>}

          <SuccessToast message={damageSuccess} fixed className="mb-4" />

          <form onSubmit={handleReportDamage} className="max-w-lg">
            <div className="mb-5">
              <label htmlFor="damageWarehouse" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                {t("inventory.warehouse")}
              </label>
              <div className="field-shell">
                <select
                  id="damageWarehouse"
                  value={damageForm.warehouseId}
                  onChange={(e) => setDamageForm({ ...damageForm, warehouseId: e.target.value })}
                  required
                >
                  <option value="">{t("inventory.selectWarehouse")}</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouseName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-5">
              <label htmlFor="damageProduct" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                {t("inventory.product")}
              </label>
              <div className="field-shell">
                <select
                  id="damageProduct"
                  value={damageForm.productId}
                  onChange={(e) => setDamageForm({ ...damageForm, productId: e.target.value })}
                  required
                >
                  <option value="">{t("inventory.selectProduct")}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-5">
              <label htmlFor="damageQuantity" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                {t("inventory.quantity")}
              </label>
              <div className="field-shell">
                <input
                  id="damageQuantity"
                  type="number"
                  value={damageForm.quantity}
                  onChange={(e) => setDamageForm({ ...damageForm, quantity: e.target.value })}
                  required
                  min={1}
                />
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="damageReason" className="block text-[13.5px] font-bold text-[var(--ink)] mb-2">
                {t("inventory.reason")}
              </label>
              <div className="field-shell">
                <textarea
                  id="damageReason"
                  value={damageForm.reason}
                  onChange={(e) => setDamageForm({ ...damageForm, reason: e.target.value })}
                  required
                  rows={3}
                />
              </div>
            </div>

            <Can code="DamagedStock.Add">
              <button type="submit" disabled={submittingDamage} className="btn btn-primary">
                {submittingDamage ? t("inventory.registering") : t("inventory.registerDamage")}
              </button>
            </Can>
          </form>

          {pendingDamageId && (
            <div className="mt-5 pt-5 border-t border-[var(--border)]">
              <Can code="DamagedStock.Approve">
                <button onClick={handleApproveDamage} disabled={approvingDamage} className="btn btn-primary">
                  {approvingDamage ? t("inventory.approving") : t("inventory.approveDamage")}
                </button>
              </Can>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

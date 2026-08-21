"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import api from "@/lib/api";
import Icon from "@/components/Icon";
import LoadingState from "@/components/LoadingState";
import SuccessToast from "@/components/SuccessToast";
import Can from "@/components/Can";

interface OrderItem {
  productId: number;
  productNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
  lineTotal: number;
}

interface StatusHistoryItem {
  status: string;
  changedAt: string;
}

interface ShipmentEvent {
  id: number;
  eventCode: string;
  description: string;
  eventAt: string | null;
}

interface Shipment {
  id: number;
  orderId: number;
  shippingCompanyId: number | null;
  shippingCompanyName: string;
  shippingCompanyCode: string;
  awb: string;
  status: string;
  labelUrl: string | null;
  destinationCity: string;
  weight: number;
  codAmount: number | null;
  shippingCost: number;
  isSimulation: boolean;
  createdAt: string;
  lastSyncedAt: string | null;
  events: ShipmentEvent[];
}

interface OrderDetail {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  isGuest: boolean;
  shippingAddress: string;
  notes: string | null;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  bankTransfer: BankTransferInfo | null;
  subTotal: number;
  discountAmount: number;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  statusHistory: StatusHistoryItem[];
  shipments: Shipment[];
}

interface BankTransferInfo {
  bankName?: string | null;
  accountHolder?: string | null;
  iban?: string | null;
  receiptUrl?: string | null;
  transferReference?: string | null;
}

const statusStyles: Record<string, string> = {
  New: "badge badge--blue",
  PendingPayment: "badge badge--orange",
  Processing: "badge badge--yellow",
  Shipped: "badge badge--gray",
  Delivered: "badge badge--green",
  Returned: "badge badge--red",
  PendingRefund: "badge badge--orange",
};

const statusOptions = [
  "New",
  "Processing",
  "Shipped",
  "Delivered",
  "Returned",
];

export default function OrderDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id as string;

  const statusLabel = (status: string) => {
    switch (status) {
      case "New": return t("orderDetail.statusNew");
      case "PendingPayment": return t("orderDetail.statusPendingPayment");
      case "Processing": return t("orderDetail.statusProcessing");
      case "Shipped": return t("orderDetail.statusShipped");
      case "Delivered": return t("orderDetail.statusDelivered");
      case "Returned": return t("orderDetail.statusReturned");
      case "PendingRefund": return t("orderDetail.statusPendingRefund");
      default: return status;
    }
  };

  const shipmentStatusLabel = (status: string) => {
    switch (status) {
      case "Pending": return t("orderDetail.shipmentPending");
      case "Registered": return t("orderDetail.shipmentRegistered");
      case "PickedUp": return t("orderDetail.shipmentPickedUp");
      case "InTransit": return t("orderDetail.shipmentInTransit");
      case "OutForDelivery": return t("orderDetail.shipmentOutForDelivery");
      case "Delivered": return t("orderDetail.shipmentDelivered");
      case "Failed": return t("orderDetail.shipmentFailed");
      case "Cancelled": return t("orderDetail.shipmentCancelled");
      case "Returned": return t("orderDetail.shipmentReturned");
      default: return status;
    }
  };

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/owner/orders/${id}`);
      setOrder(res.data.data);
      setSelectedStatus(res.data.data.status);
    } catch (err: any) {
      setError(err.response?.data?.message || t("orderDetail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleSaveStatus = async () => {
    if (!order || selectedStatus === order.status) return;
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await api.put(`/owner/orders/${id}/status`, { newStatus: selectedStatus });
      setSuccessMessage(t("orderDetail.updateSuccess"));
      await fetchOrder();
    } catch (err: any) {
      setError(err.response?.data?.message || t("orderDetail.updateError"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!order || !confirm(t("orderDetail.cancelConfirm"))) return;
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await api.post(`/owner/orders/${id}/cancel`);
      setSuccessMessage(t("orderDetail.cancelSuccess"));
      await fetchOrder();
    } catch (err: any) {
      setError(err.response?.data?.message || t("orderDetail.cancelError"));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmBankTransfer = async () => {
    if (!order || !confirm(t("orderDetail.confirmBankTransferConfirm"))) return;
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await api.post(`/owner/orders/${id}/confirm-bank-transfer`);
      setSuccessMessage(t("orderDetail.confirmBankTransferSuccess"));
      await fetchOrder();
    } catch (err: any) {
      setError(err.response?.data?.message || t("orderDetail.confirmBankTransferError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!order) {
    return (
      <div>
        <Link href="/dashboard/orders" className="text-[var(--blue)] hover:underline text-sm">
          {t("orderDetail.backToList")}
        </Link>
        {error && <div className="alert alert--danger mt-4">{error}</div>}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/dashboard/orders" className="text-[var(--blue)] hover:underline text-sm">
          {t("orderDetail.backToList")}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-[var(--blue-deep)]" dir="ltr">
          {order.orderNumber}
        </h1>
        <span className={statusStyles[order.status] ?? "badge badge--gray"}>
          {statusLabel(order.status)}
        </span>
        {(order.status === "New" || order.status === "Processing" || order.status === "PendingPayment") && (
          <Can code="Orders.Edit">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="btn btn-outline btn-sm"
            >
              <Icon name="close" /> {t("orderDetail.cancelOrder")}
            </button>
          </Can>
        )}
      </div>

      {error && <div className="alert alert--danger mb-4">{error}</div>}
      <SuccessToast message={successMessage} fixed className="mb-4" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">{t("orderDetail.customerInfo")}</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--sub)]">{t("orderDetail.name")}: </span>
              <span className="text-[var(--ink)] font-medium">{order.customerName}</span>
              {order.isGuest && (
                <span className="mr-2 badge badge--yellow">{t("orderDetail.guest")}</span>
              )}
            </p>
            {order.customerPhone && (
              <p>
                <span className="text-[var(--sub)]">{t("orderDetail.phone")}: </span>
                <span className="text-[var(--ink)]" dir="ltr">{order.customerPhone}</span>
              </p>
            )}
            {order.customerEmail && (
              <p>
                <span className="text-[var(--sub)]">{t("orderDetail.email")}: </span>
                <span className="text-[var(--ink)]" dir="ltr">{order.customerEmail}</span>
              </p>
            )}
            <p>
              <span className="text-[var(--sub)]">{t("orderDetail.orderDate")}: </span>
              <span className="text-[var(--ink)]">
                {new Date(order.createdAt).toLocaleString("ar-SA-u-nu-latn")}
              </span>
            </p>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">{t("orderDetail.shippingNotes")}</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--sub)]">{t("orderDetail.shippingAddress")}: </span>
              <span className="text-[var(--ink)]">{order.shippingAddress}</span>
            </p>
            {order.notes && (
              <p>
                <span className="text-[var(--sub)]">{t("orderDetail.notes")}: </span>
                <span className="text-[var(--ink)]">{order.notes}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {order.shipments && order.shipments.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-4">{t("orderDetail.shipments")}</h2>
          <div className="space-y-4">
            {order.shipments.map((s) => (
              <div key={s.id} className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[var(--ink)] font-bold">
                      {s.shippingCompanyName || t("orderDetail.shipmentNoCompany")}
                      {s.isSimulation && (
                        <span className="mr-2 badge badge--yellow">{t("orderDetail.shipmentSimulation")}</span>
                      )}
                    </p>
                    {s.awb && (
                      <p className="text-[12px] text-[var(--sub)] mt-0.5" dir="ltr">
                        AWB: {s.awb}
                      </p>
                    )}
                  </div>
                  <span className="badge badge--blue">{shipmentStatusLabel(s.status)}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12.5px] mb-3">
                  {s.destinationCity && (
                    <div>
                      <span className="text-[var(--sub)]">{t("orderDetail.shipmentCity")}: </span>
                      <span className="text-[var(--ink)] font-medium">{s.destinationCity}</span>
                    </div>
                  )}
                  {s.weight > 0 && (
                    <div>
                      <span className="text-[var(--sub)]">{t("orderDetail.shipmentWeight")}: </span>
                      <span className="text-[var(--ink)] font-medium">{s.weight} {t("common.kg")}</span>
                    </div>
                  )}
                  {s.shippingCost > 0 && (
                    <div>
                      <span className="text-[var(--sub)]">{t("orderDetail.shipmentCost")}: </span>
                      <span className="text-[var(--ink)] font-medium">{s.shippingCost.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}</span>
                    </div>
                  )}
                  {s.lastSyncedAt && (
                    <div>
                      <span className="text-[var(--sub)]">{t("orderDetail.shipmentLastSync")}: </span>
                      <span className="text-[var(--ink)] font-medium">
                        {new Date(s.lastSyncedAt).toLocaleString("ar-SA-u-nu-latn")}
                      </span>
                    </div>
                  )}
                </div>

                {s.events.length > 0 ? (
                  <div className="space-y-1.5">
                    {s.events.map((evt, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[13px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--blue)] mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-[var(--ink)]">{evt.description || evt.eventCode}</p>
                          {evt.eventAt && (
                            <p className="text-[11.5px] text-[var(--sub)]">
                              {new Date(evt.eventAt).toLocaleString("ar-SA-u-nu-latn")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12.5px] text-[var(--sub)]">{t("orderDetail.shipmentNoEvents")}</p>
                )}

                <Link
                  href="/dashboard/shipping"
                  className="inline-block mt-3 text-[var(--blue)] hover:underline text-[12.5px] font-bold"
                >
                  {t("orderDetail.shipmentGoToShipping")}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {order.bankTransfer && order.paymentMethod === "BankTransfer" && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold text-[var(--blue-deep)]">{t("orderDetail.bankTransfer")}</h2>
            <span className="badge badge--blue">{t("orderDetail.paymentStatus")}: {order.paymentStatus}</span>
          </div>
          <div className="space-y-2 text-sm mb-4">
            {order.bankTransfer.bankName && (
              <p>
                <span className="text-[var(--sub)]">{t("orderDetail.bankName")}: </span>
                <span className="text-[var(--ink)] font-medium">{order.bankTransfer.bankName}</span>
              </p>
            )}
            {order.bankTransfer.accountHolder && (
              <p>
                <span className="text-[var(--sub)]">{t("orderDetail.bankAccountHolder")}: </span>
                <span className="text-[var(--ink)] font-medium">{order.bankTransfer.accountHolder}</span>
              </p>
            )}
            {order.bankTransfer.iban && (
              <p>
                <span className="text-[var(--sub)]">{t("orderDetail.bankIban")}: </span>
                <span className="text-[var(--ink)] font-medium break-all" dir="ltr">{order.bankTransfer.iban}</span>
              </p>
            )}
            {order.bankTransfer.transferReference && (
              <p>
                <span className="text-[var(--sub)]">{t("orderDetail.transferReference")}: </span>
                <span className="text-[var(--ink)] font-medium break-all" dir="ltr">{order.bankTransfer.transferReference}</span>
              </p>
            )}
          </div>

          {order.bankTransfer.receiptUrl ? (
            <div className="mb-4">
              <p className="text-[12.5px] font-bold text-[var(--sub)] mb-2">{t("orderDetail.receiptImage")}</p>
              <img
                src={order.bankTransfer.receiptUrl}
                alt="receipt"
                className="max-h-64 rounded-lg border border-[var(--border)]"
              />
            </div>
          ) : (
            <p className="text-[12.5px] text-[var(--sub)] mb-4">{t("orderDetail.noReceiptYet")}</p>
          )}

          {order.paymentStatus !== "Paid" && (
            <Can code="Orders.Edit">
              <button
                onClick={handleConfirmBankTransfer}
                disabled={saving}
                className="btn btn-primary disabled:opacity-60"
              >
                {saving ? t("common.saving") : t("orderDetail.confirmBankTransfer")}
              </button>
            </Can>
          )}
        </div>
      )}

      <div className="card overflow-hidden mb-6">
        <h2 className="text-[14px] font-bold text-[var(--blue-deep)] p-5 pb-0">{t("orderDetail.orderItems")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-3 hidden md:table">
            <thead className="bg-[var(--gold-soft)]/40 border-b border-[var(--border)]">
              <tr>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("orderDetail.productCol")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("orderDetail.qtyCol")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("orderDetail.unitPriceCol")}</th>
                <th className="text-right p-4 font-bold text-[var(--gold-deep)] text-[12.5px]">{t("orderDetail.totalCol")}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-[var(--border)]">
                  <td className="p-4 text-[var(--ink)] font-medium">{item.productNameSnapshot}</td>
                  <td className="p-4 text-[var(--sub)]">{item.quantity}</td>
                  <td className="p-4 text-[var(--sub)]">{item.unitPriceSnapshot.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}</td>
                  <td className="p-4 text-[var(--ink)] font-medium">{item.lineTotal.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden space-y-3">
          {order.items.map((item, idx) => (
            <div key={idx} className="card p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="col-span-2">
                  <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("orderDetail.productCol")}</p>
                  <p className="text-[var(--ink)] font-medium">{item.productNameSnapshot}</p>
                </div>
                <div>
                  <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("orderDetail.qtyCol")}</p>
                  <p className="text-[var(--sub)]">{item.quantity}</p>
                </div>
                <div>
                  <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("orderDetail.unitPriceCol")}</p>
                  <p className="text-[var(--sub)]">{item.unitPriceSnapshot.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[12.5px] text-[var(--sub)] mb-0.5">{t("orderDetail.totalCol")}</p>
                  <p className="text-[var(--ink)] font-medium">{item.lineTotal.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-5 space-y-1.5 border-t border-[var(--border)] max-w-xs mr-auto text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--sub)]">{t("orderDetail.subtotal")}</span>
            <span className="text-[var(--ink)]">{order.subTotal.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--sub)]">{t("orderDetail.discount")}</span>
              <span className="text-[var(--green)]">− {order.discountAmount.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border)]">
            <span className="text-[var(--ink)] font-bold">{t("orderDetail.total")}</span>
            <span className="text-[var(--blue-deep)] font-bold text-[16px]">
              {order.totalAmount.toLocaleString("ar-SA-u-nu-latn")} {t("common.sar")}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">{t("orderDetail.statusHistory")}</h2>
          <div className="space-y-3">
            {order.statusHistory.map((h, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className={statusStyles[h.status] ?? "badge badge--gray"}>
                  {statusLabel(h.status)}
                </span>
                <span className="text-[var(--sub)] text-[12.5px]">
                  {new Date(h.changedAt).toLocaleString("ar-SA-u-nu-latn")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-[14px] font-bold text-[var(--blue-deep)] mb-3">{t("orderDetail.changeStatus")}</h2>
          <div className="field-shell mb-3">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <Can code="Orders.Edit">
            <button
              onClick={handleSaveStatus}
              disabled={saving || selectedStatus === order.status}
              className="btn btn-primary w-full disabled:opacity-60"
            >
              {saving ? t("common.saving") : t("orderDetail.saveStatus")}
            </button>
          </Can>
        </div>
      </div>
    </div>
  );
}

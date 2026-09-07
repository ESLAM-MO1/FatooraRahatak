export interface InvoiceItemDetail {
  id: number;
  productId: number;
  variantId: number | null;
  productNameSnapshot: string;
  productCodeSnapshot?: string | null;
  productStatusSnapshot?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  discountAmount: number;
  lineAfterDiscount: number;
}

export interface InvoiceDetail {
  id: number;
  invoiceType: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: number | null;
  partyName: string | null;
  partyPhone?: string | null;
  partyCity?: string | null;
  notes?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  shippingCost?: number | null;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  costOfGoodsSold: number | null;
  journalEntryId: number | null;
  journalEntryNumber: string | null;
  items: InvoiceItemDetail[];
  storeName?: string;
  storeLogo?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactAddress?: string | null;
  branchName?: string | null;
  commercialRegistrationNumber?: string | null;
  vatNumber?: string | null;
  isVatRegistered?: boolean;
  vatRate?: number;
  qrBase64?: string | null;
}

export const invoiceTypeLabels: Record<string, string> = {
  Sales: "invoice.sales",
  Purchase: "invoice.purchase",
};

export const invoiceTypeStyles: Record<string, string> = {
  Sales: "badge badge--green",
  Purchase: "badge badge--blue",
};

export const invoicePaymentLabels: Record<string, string> = {
  Cash: "invoice.paymentCash",
  Credit: "invoice.paymentCredit",
  Mada: "invoice.paymentMada",
  BankTransfer: "invoice.paymentBankTransfer",
  Tabby: "invoice.paymentTabby",
  Tamara: "invoice.paymentTamara",
};

export const invoiceStatusLabels: Record<string, string> = {
  Paid: "invoice.statusPaid",
  Pending: "invoice.statusPending",
  Refunded: "invoice.statusRefunded",
};

export const invoiceStatusStyles: Record<string, string> = {
  Paid: "badge badge--green",
  Pending: "badge badge--yellow",
  Refunded: "badge badge--gray",
};

export const invoiceItemStatusLabels: Record<string, string> = {
  Active: "invoice.itemStatusActive",
  Draft: "invoice.itemStatusDraft",
  OutOfStock: "invoice.itemStatusOutOfStock",
  Archived: "invoice.itemStatusArchived",
};

const invFmt = (n: number) => n.toLocaleString("ar-SA-u-nu-latn");

export function buildInvoiceHtml(invoice: InvoiceDetail, t: (k: string) => string) {
  const isSales = invoice.invoiceType === "Sales";
  const statusKey = invoiceStatusLabels[invoice.paymentStatus] ?? "common.noData";
  const vatRateLabel = invoice.isVatRegistered && invoice.vatRate ? ` (${invoice.vatRate * 100}%)` : "";

  const rows = invoice.items
    .map(
      (item) => `
        <tr>
          <td class="c">${item.productCodeSnapshot || "—"}</td>
          <td>${item.productNameSnapshot}</td>
          <td class="c">${item.productStatusSnapshot ? t(invoiceItemStatusLabels[item.productStatusSnapshot] ?? "common.noData") : "—"}</td>
          <td class="c">${item.quantity}</td>
          <td class="c">${invFmt(item.unitPrice)}</td>
          <td class="c">${invFmt(item.lineTotal)}</td>
          <td class="c">${invFmt(item.discountAmount)}</td>
          <td class="c">${invFmt(item.lineAfterDiscount)}</td>
        </tr>`
    )
    .join("");

  const qrBlock =
    invoice.qrBase64 && invoice.isVatRegistered
      ? `<img class="qr-img" src="data:image/png;base64,${invoice.qrBase64}" alt="QR" />`
      : `<div class="qr-empty">—</div>`;

  const companyLogo = invoice.storeLogo
    ? `<img class="logo" src="${invoice.storeLogo}" alt="" />`
    : `<div class="logo-placeholder">${(invoice.storeName || "؟").charAt(0)}</div>`;

  const vatNumberBlock = invoice.isVatRegistered && invoice.vatNumber
    ? invoice.vatNumber
    : "—";

  const csPhoneBlock = invoice.contactPhone
    ? `<div class="cs-badge"><span class="cs-label">${t("invoice.customerService")}</span><span class="cs-value" dir="ltr">${invoice.contactPhone}</span></div>`
    : "";

  const netAfterDiscount = (invoice.subTotal || 0) - (invoice.discountAmount || 0);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${invoice.invoiceNumber}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #1c2733; background: #fff; padding: 22px 26px; font-size: 12.5px; }

  /* ── Header: logo/company (right) + QR/customer-service (left) ── */
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 3px solid #1c2733; padding-bottom: 12px; }
  .company { display: flex; gap: 12px; align-items: center; }
  .logo { width: 58px; height: 58px; object-fit: contain; border: 1px solid #dfe3e8; }
  .logo-placeholder { width: 58px; height: 58px; background: #1c2733; color: #fff; font-size: 28px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .company-name { font-size: 19px; font-weight: 800; }
  .company-detail { font-size: 11px; color: #55606b; margin-top: 2px; }

  .header-left { display: flex; align-items: flex-start; gap: 10px; }
  .qr-block { text-align: center; }
  .qr-block .qr-title { font-size: 10px; font-weight: 700; color: #55606b; margin-bottom: 4px; }
  .qr-img { width: 68px; height: 68px; border: 1px solid #d3d8de; }
  .qr-empty { width: 68px; height: 68px; border: 1px solid #d3d8de; display: flex; align-items: center; justify-content: center; color: #a4abb3; }
  .cs-badge { border: 1.5px solid #d1382c; border-radius: 16px; padding: 6px 14px; text-align: center; color: #d1382c; margin-top: 16px; }
  .cs-badge .cs-label { display: block; font-size: 9.5px; font-weight: 700; }
  .cs-badge .cs-value { display: block; font-size: 11.5px; font-weight: 800; margin-top: 1px; }

  /* ── Title band ── */
  .page-title { text-align: center; font-size: 15px; font-weight: 800; margin: 12px 0; border: 1px solid #1c2733; padding: 6px; background: #f4f5f6; }

  /* ── Info boxes ── */
  .info-row { display: flex; gap: 14px; margin-bottom: 14px; }
  .info-box { flex: 1; border: 1px solid #dfe3e8; }
  .info-box .box-title { font-weight: 800; font-size: 12px; background: #1c2733; color: #fff; padding: 6px 12px; }
  .info-box .box-body { padding: 8px 14px; }
  .info-line { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; padding: 4px 0; border-bottom: 1px dashed #eef1f3; }
  .info-line:last-child { border-bottom: none; }
  .info-line .k { color: #55606b; }
  .info-line .v { font-weight: 700; }

  /* ── Items table ── */
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .items-table th { background: #1c2733; color: #fff; border: 1px solid #1c2733; font-size: 11px; padding: 8px 6px; text-align: center; }
  .items-table td { border: 1px solid #dfe3e8; padding: 7px 6px; font-size: 11.5px; }
  .items-table td:nth-child(2) { text-align: right; }
  .items-table tbody tr:nth-child(even) { background: #f8f9fa; }
  .c { text-align: center; }

  /* ── Totals ── */
  .summary-wrap { display: flex; justify-content: flex-start; }
  .summary { width: 280px; border: 1px solid #dfe3e8; }
  .sum-row { display: flex; justify-content: space-between; padding: 7px 14px; font-size: 12px; border-bottom: 1px solid #eef1f3; }
  .sum-row b { font-weight: 800; }
  .sum-row.grand { background: #d1382c; color: #fff; font-weight: 800; font-size: 14px; border-bottom: none; padding: 10px 14px; }

  /* ── Notes ── */
  .notes { margin-top: 14px; border: 1px solid #dfe3e8; padding: 8px 14px; min-height: 44px; font-size: 11.5px; color: #55606b; }
  .notes .notes-title { font-weight: 800; color: #1c2733; margin-bottom: 4px; }

  /* ── Footer bar ── */
  .footer { margin-top: 18px; background: #1c2733; color: #fff; font-size: 10.5px; }
  .footer-row { display: flex; }
  .footer-row + .footer-row { border-top: 1px solid rgba(255,255,255,0.15); }
  .footer-cell { flex: 1; padding: 6px 12px; text-align: center; border-inline-start: 1px solid rgba(255,255,255,0.15); }
  .footer-cell:first-child { border-inline-start: none; }
  .footer-cell .fk { opacity: 0.7; }
  .footer-cell .fv { font-weight: 700; }
</style>
</head>
<body>

  <div class="header">
    <div class="company">
      ${companyLogo}
      <div>
        <div class="company-name">${invoice.storeName || ""}</div>
        ${invoice.contactAddress ? `<div class="company-detail">${invoice.contactAddress}</div>` : ""}
        ${invoice.contactEmail ? `<div class="company-detail">${invoice.contactEmail}</div>` : ""}
      </div>
    </div>
    <div class="header-left">
      <div class="qr-block">
        <div class="qr-title">${t("invoice.qrLabel")}</div>
        ${qrBlock}
      </div>
      ${csPhoneBlock}
    </div>
  </div>

  <div class="page-title">${t("invoice.taxInvoiceSimplified")}</div>

  <div class="info-row">
    <div class="info-box">
      <div class="box-title">${isSales ? t("invoice.customerInfo") : t("invoice.supplierInfo")}</div>
      <div class="box-body">
        <div class="info-line"><span class="k">${t("invoice.customerLabel")}</span><span class="v">${invoice.partyName || "—"}</span></div>
        <div class="info-line"><span class="k">${t("invoice.saleOrderNo")}</span><span class="v">${invoice.invoiceNumber}</span></div>
        <div class="info-line"><span class="k">${t("invoice.customerMobile")}</span><span class="v" dir="ltr">${invoice.partyPhone || "—"}</span></div>
        <div class="info-line"><span class="k">${t("invoice.customerAddress")}</span><span class="v">${invoice.partyCity || "—"}</span></div>
      </div>
    </div>
    <div class="info-box">
      <div class="box-title">${t("invoice.invoiceData")}</div>
      <div class="box-body">
        <div class="info-line"><span class="k">${t("invoice.dateLabel")}</span><span class="v">${invoice.invoiceDate}</span></div>
        <div class="info-line"><span class="k">${t("invoice.vatNumber")}</span><span class="v" dir="ltr">${vatNumberBlock}</span></div>
        <div class="info-line"><span class="k">${t("invoice.invoiceValue")}</span><span class="v">${invFmt(invoice.totalAmount)} ${t("common.sar")}</span></div>
        <div class="info-line"><span class="k">${t("invoice.paymentMethod")}</span><span class="v">${t(invoicePaymentLabels[invoice.paymentMethod] ?? "common.noData")}</span></div>
        <div class="info-line"><span class="k">${t("invoice.paymentStatus")}</span><span class="v">${t(statusKey)}</span></div>
        ${invoice.shippingCost != null ? `<div class="info-line"><span class="k">${t("invoice.shippingCost")}</span><span class="v">${invFmt(invoice.shippingCost)} ${t("common.sar")}</span></div>` : ""}
      </div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>${t("invoice.code")}</th>
        <th>${t("invoice.product")}</th>
        <th>${t("invoice.itemStatus")}</th>
        <th>${t("invoice.quantity")}</th>
        <th>${t("invoice.unitPrice")}</th>
        <th>${t("invoice.lineTotal")}</th>
        <th>${t("invoice.discount")}</th>
        <th>${t("invoice.lineAfterDiscount")}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="summary-wrap">
    <div class="summary">
      <div class="sum-row"><span>${t("invoice.lineTotal")}</span><span>${invFmt(invoice.subTotal)}</span></div>
      <div class="sum-row"><span>${t("invoice.totalDiscount")}</span><span>${invFmt(invoice.discountAmount || 0)}</span></div>
      <div class="sum-row"><span>${t("invoice.net")}</span><span>${invFmt(netAfterDiscount)}</span></div>
      <div class="sum-row"><span>${t("invoice.tax")}${vatRateLabel}</span><span>${invFmt(invoice.taxAmount)}</span></div>
      <div class="sum-row grand"><span>${t("invoice.grandTotal")}</span><span>${invFmt(invoice.totalAmount)} ${t("common.sar")}</span></div>
    </div>
  </div>

  <div class="notes">
    <div class="notes-title">${t("invoice.notes")}</div>
    <div>${invoice.notes || "—"}</div>
  </div>

  <div class="footer">
    <div class="footer-row">
      <div class="footer-cell"><span class="fv">${invoice.storeName || ""}</span></div>
      <div class="footer-cell"><span class="fk">${t("invoice.dateLabel")}: </span><span class="fv">${invoice.invoiceDate}</span></div>
      <div class="footer-cell"><span class="fk">${t("invoice.branch")}: </span><span class="fv">${invoice.branchName || "—"}</span></div>
    </div>
    ${invoice.contactAddress ? `<div class="footer-row"><div class="footer-cell" style="flex: 3;">${invoice.contactAddress}</div></div>` : ""}
    <div class="footer-row">
      ${invoice.contactPhone ? `<div class="footer-cell"><span class="fk">${t("invoice.phone")}: </span><span class="fv" dir="ltr">${invoice.contactPhone}</span></div>` : ""}
      ${invoice.contactEmail ? `<div class="footer-cell"><span class="fk">${t("invoice.email")}: </span><span class="fv" dir="ltr">${invoice.contactEmail}</span></div>` : ""}
      ${invoice.commercialRegistrationNumber ? `<div class="footer-cell"><span class="fk">${t("invoice.crNumber")}: </span><span class="fv" dir="ltr">${invoice.commercialRegistrationNumber}</span></div>` : ""}
    </div>
  </div>

  <script>window.onload = function(){ window.print(); window.close(); }<\/script>
</body>
</html>`;
}

export function printInvoice(invoice: InvoiceDetail, t: (k: string) => string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(buildInvoiceHtml(invoice, t));
  w.document.close();
}
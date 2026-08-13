namespace FatooraRahatak.Application.DTOs.Accounting;

public class InvoiceDto
{
    public long Id { get; set; }
    public string InvoiceType { get; set; } = string.Empty; // "Sales" | "Purchase"
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateOnly InvoiceDate { get; set; }
    public long? CustomerId { get; set; }
    public string? PartyName { get; set; }
    public string? PartyPhone { get; set; }
    public string? PartyCity { get; set; }
    public string? Notes { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal? CostOfGoodsSold { get; set; }
    public long? JournalEntryId { get; set; }
    public string? JournalEntryNumber { get; set; }
    public List<InvoiceItemDto> Items { get; set; } = new();

    // بيانات المتجر للفاتورة الإلكترونية (الطباعة + QR)
    public string? StoreName { get; set; }
    public string? StoreLogo { get; set; }
    public string? ContactPhone { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactAddress { get; set; }
    public string? VatNumber { get; set; }
    public bool IsVatRegistered { get; set; }
    public decimal VatRate { get; set; }
    public string? QrBase64 { get; set; }

    // حالة الفاتورة الإلكترونية ZATCA
    public string ZatcaStatus { get; set; } = "NotApplicable";
    public string? ZatcaUuid { get; set; }
    public string? ZatcaReportingStatus { get; set; }
    public string? ZatcaValidationResults { get; set; }
    public string? ZatcaHash { get; set; }
    public DateTime? ZatcaSubmissionDateTime { get; set; }
}

public class InvoiceItemDto
{
    public long Id { get; set; }
    public long ProductId { get; set; }
    public long? VariantId { get; set; }
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public string? ProductCodeSnapshot { get; set; }
    public string? ProductStatusSnapshot { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal LineAfterDiscount { get; set; }
}

public class CreateInvoiceItemDto
{
    public long ProductId { get; set; }
    public long? VariantId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; } // بدون ضريبة
    public decimal DiscountAmount { get; set; } // خصم على البند (اختياري)
}

public class CreateSalesInvoiceDto
{
    public DateOnly InvoiceDate { get; set; }
    public long? CustomerId { get; set; }
    public string? GuestName { get; set; }
    public string? GuestPhone { get; set; }
    public string? GuestCity { get; set; }
    public string? Notes { get; set; }
    public string PaymentMethod { get; set; } = "Cash"; // "Cash" | "Credit"
    public List<CreateInvoiceItemDto> Items { get; set; } = new();
}

public class CreatePurchaseInvoiceDto
{
    public DateOnly InvoiceDate { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string? SupplierPhone { get; set; }
    public string? SupplierCity { get; set; }
    public string? Notes { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
    public List<CreateInvoiceItemDto> Items { get; set; } = new();
}
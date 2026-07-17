namespace FatooraRahatak.Application.DTOs.Accounting;

public class InvoiceDto
{
    public long Id { get; set; }
    public string InvoiceType { get; set; } = string.Empty; // "Sales" | "Purchase"
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateOnly InvoiceDate { get; set; }
    public long? CustomerId { get; set; }
    public string? PartyName { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal? CostOfGoodsSold { get; set; }
    public long? JournalEntryId { get; set; }
    public string? JournalEntryNumber { get; set; }
    public List<InvoiceItemDto> Items { get; set; } = new();
}

public class InvoiceItemDto
{
    public long Id { get; set; }
    public long ProductId { get; set; }
    public long? VariantId { get; set; }
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public class CreateInvoiceItemDto
{
    public long ProductId { get; set; }
    public long? VariantId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; } // بدون ضريبة
}

public class CreateSalesInvoiceDto
{
    public DateOnly InvoiceDate { get; set; }
    public long? CustomerId { get; set; }
    public string? GuestName { get; set; }
    public string PaymentMethod { get; set; } = "Cash"; // "Cash" | "Credit"
    public List<CreateInvoiceItemDto> Items { get; set; } = new();
}

public class CreatePurchaseInvoiceDto
{
    public DateOnly InvoiceDate { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = "Cash";
    public List<CreateInvoiceItemDto> Items { get; set; } = new();
}
namespace FatooraRahatak.Application.DTOs.Reports;

public class SalesReportDto
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    public int OrdersCount { get; set; }
    public int ItemsSold { get; set; }
    public decimal GrossSales { get; set; }
    public decimal Discounts { get; set; }
    public decimal ShippingFees { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal NetSales { get; set; }
    public decimal TotalRevenue { get; set; }
    public List<DailySalesRowDto> DailyRows { get; set; } = new();
    public List<TopProductRowDto> TopProducts { get; set; } = new();
}

public class DailySalesRowDto
{
    public DateOnly Date { get; set; }
    public int OrdersCount { get; set; }
    public decimal Revenue { get; set; }
}

public class TopProductRowDto
{
    public long ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int UnitsSold { get; set; }
    public decimal Revenue { get; set; }
}

public class DiscountReportDto
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    public decimal TotalDiscountGiven { get; set; }
    public int CouponsUsed { get; set; }
    public List<DiscountRowDto> Rows { get; set; } = new();
}

public class DiscountRowDto
{
    public string CouponCode { get; set; } = string.Empty;
    public int TimesUsed { get; set; }
    public decimal TotalDiscount { get; set; }
}

public class TaxReportDto
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    public decimal VatCollected { get; set; }
    public int InvoicesCount { get; set; }
    public List<TaxRowDto> Rows { get; set; } = new();
}

public class TaxRowDto
{
    public long InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateOnly InvoiceDate { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
}

public class LowStockRowDto
{
    public long ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int Available { get; set; }
    public int Threshold { get; set; }
}

public class InventoryMovementRowDto
{
    public long Id { get; set; }
    public DateTime Date { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? VariantName { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string? ReferenceType { get; set; }
    public long? ReferenceId { get; set; }
}

public class InventoryValuationDto
{
    public int ItemsCount { get; set; }
    public decimal TotalUnits { get; set; }
    public decimal TotalCostValue { get; set; }
    public decimal TotalRetailValue { get; set; }
    public List<InventoryValuationRowDto> Rows { get; set; } = new();
}

public class InventoryValuationRowDto
{
    public long ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int Available { get; set; }
    public decimal CostPrice { get; set; }
    public decimal RetailPrice { get; set; }
    public decimal CostValue { get; set; }
    public decimal RetailValue { get; set; }
}

public class CustomerStatementDto
{
    public string? CustomerName { get; set; }
    public string? Phone { get; set; }
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal Balance { get; set; }
    public List<StatementLineDto> Lines { get; set; } = new();
}

public class StatementLineDto
{
    public DateTime Date { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
}

public class ARAgingDto
{
    public List<AgingBucketDto> Buckets { get; set; } = new();
    public decimal TotalOverdue { get; set; }
}

public class AgingBucketDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public int InvoicesCount { get; set; }
    public List<AgingInvoiceDto> Invoices { get; set; } = new();
}

public class AgingInvoiceDto
{
    public long InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateOnly InvoiceDate { get; set; }
    public string PartyName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public int DaysOverdue { get; set; }
}

namespace FatooraRahatak.Application.DTOs.Settlement;

public class MerchantBankDetailsDto
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    public string Iban { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class SaveMerchantBankDetailsDto
{
    public string BankName { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    public string Iban { get; set; } = string.Empty;
}

public class SettlementBatchDto
{
    public long Id { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal GrossAmount { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal ShippingDeductedAmount { get; set; }
    public decimal NetAmount { get; set; }
    public int OrdersCount { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int LinesCount { get; set; }
}

public class SettlementLineDto
{
    public long Id { get; set; }
    public long BatchId { get; set; }
    public long StoreId { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public decimal GrossAmount { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal ShippingDeductedAmount { get; set; }
    public decimal NetAmount { get; set; }
    public int OrdersCount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? PaymentReference { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? Iban { get; set; }
    public string? BankName { get; set; }
    public string? AccountHolderName { get; set; }
}

public class SettlementBatchDetailDto
{
    public long Id { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal GrossAmount { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal ShippingDeductedAmount { get; set; }
    public decimal NetAmount { get; set; }
    public int OrdersCount { get; set; }
    public DateTime? CompletedAt { get; set; }
    public List<SettlementLineDto> Lines { get; set; } = new();
}

public class MerchantSettlementSummaryDto
{
    public decimal PendingNetAmount { get; set; }
    public decimal SettledNetAmount { get; set; }
    public bool HasBankDetails { get; set; }
    public MerchantBankDetailsDto? BankDetails { get; set; }
    public List<SettlementBatchDto> Batches { get; set; } = new();
}

public class ConfirmSettlementDto
{
    public string? PaymentReference { get; set; }
}

public class GenerateSettlementBatchDto
{
    public DateTime? PeriodEnd { get; set; }
}

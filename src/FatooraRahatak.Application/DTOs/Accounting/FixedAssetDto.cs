namespace FatooraRahatak.Application.DTOs.Accounting;

public class CreateFixedAssetDto
{
    public string NameAr { get; set; } = string.Empty;
    public decimal PurchaseCost { get; set; }
    public DateOnly PurchaseDate { get; set; }
    public int UsefulLifeYears { get; set; }
}

public class FixedAssetDto
{
    public long Id { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public decimal PurchaseCost { get; set; }
    public DateOnly PurchaseDate { get; set; }
    public int UsefulLifeYears { get; set; }
    public string DepreciationMethod { get; set; } = string.Empty;
    public decimal AccumulatedDepreciation { get; set; }
    public decimal CurrentBookValue { get; set; }
    public bool IsFullyDepreciated { get; set; }
    public bool IsActive { get; set; }
    public decimal MonthlyDepreciationAmount { get; set; }
}

public class RunDepreciationDto
{
    // null = تشغيل الإهلاك لكل الأصول النشطة غير المستهلكة بالكامل في المتجر دفعة واحدة
    public long? FixedAssetId { get; set; }
}

public class DepreciationRunResultDto
{
    public long FixedAssetId { get; set; }
    public string FixedAssetNameAr { get; set; } = string.Empty;
    public decimal DepreciationAmount { get; set; }
    public decimal NewAccumulatedDepreciation { get; set; }
    public decimal NewBookValue { get; set; }
    public bool IsNowFullyDepreciated { get; set; }
    public long JournalEntryId { get; set; }
    public string JournalEntryNumber { get; set; } = string.Empty;
    public string PeriodMonth { get; set; } = string.Empty;
}
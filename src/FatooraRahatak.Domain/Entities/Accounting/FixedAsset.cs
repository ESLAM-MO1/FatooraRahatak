using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Users;

namespace FatooraRahatak.Domain.Entities.Accounting;

// أصل ثابت — يُهلَك بطريقة القسط الثابت على مدى عمره الإنتاجي
public class FixedAsset : BaseEntity
{
    public long StoreId { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public decimal PurchaseCost { get; set; }
    public DateOnly PurchaseDate { get; set; }
    public int UsefulLifeYears { get; set; }
    public DepreciationMethod DepreciationMethod { get; set; } = DepreciationMethod.StraightLine;

    // القيمة الدفترية الحالية = PurchaseCost - AccumulatedDepreciation (تُحسب عند العرض، لا تُخزَّن كحقل منفصل)
    public decimal AccumulatedDepreciation { get; set; } = 0m;
    public bool IsFullyDepreciated { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public long CreatedByUserId { get; set; }

    public Store Store { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
    public ICollection<DepreciationEntry> DepreciationEntries { get; set; } = new List<DepreciationEntry>();
}
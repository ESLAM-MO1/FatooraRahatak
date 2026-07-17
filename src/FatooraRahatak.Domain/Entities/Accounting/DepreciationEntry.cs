using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Users;

namespace FatooraRahatak.Domain.Entities.Accounting;

// سجل تشغيل إهلاك دوري واحد لأصل ثابت — مرتبط بقيد محاسبي معتمد تلقائيًا (Auto-Approved)
public class DepreciationEntry : BaseEntity
{
    public long FixedAssetId { get; set; }
    public string PeriodMonth { get; set; } = string.Empty; // صيغة "yyyy-MM" — يمنع تكرار الإهلاك لنفس الأصل في نفس الفترة
    public DateOnly DepreciationDate { get; set; }
    public decimal Amount { get; set; }
    public long JournalEntryId { get; set; }
    public long CreatedByUserId { get; set; }

    public FixedAsset FixedAsset { get; set; } = null!;
    public JournalEntry JournalEntry { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
}
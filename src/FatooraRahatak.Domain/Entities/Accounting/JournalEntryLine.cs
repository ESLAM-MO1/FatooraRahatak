using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Accounting;

// سطر واحد داخل قيد يومية — إما مدين أو دائن (وليس الاثنين معًا)
public class JournalEntryLine : BaseEntity
{
    public long JournalEntryId { get; set; }
    public long AccountId { get; set; }
    public decimal Debit { get; set; } = 0m;
    public decimal Credit { get; set; } = 0m;
    public string? LineDescription { get; set; }

    public JournalEntry JournalEntry { get; set; } = null!;
    public Account Account { get; set; } = null!;
}
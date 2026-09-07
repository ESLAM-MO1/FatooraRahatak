namespace FatooraRahatak.Application.DTOs.Accounting;

// حركة واحدة في دفتر الأستاذ لحساب معيّن (سطر قيد معتمد + الرصيد الجاري بعده)
public class LedgerMovementDto
{
    public long JournalEntryId { get; set; }
    public string EntryNumber { get; set; } = string.Empty;
    public DateOnly EntryDate { get; set; }
    public string? Description { get; set; }       // وصف القيد نفسه
    public string? LineDescription { get; set; }    // وصف السطر تحديدًا (لو موجود)
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal RunningBalance { get; set; }      // الرصيد الجاري بعد هذه الحركة
    public string? SourceType { get; set; }
}

// استجابة دفتر الأستاذ الكاملة لحساب واحد خلال فترة (أو منذ البداية لو الفترة مفتوحة)
public class LedgerDto
{
    public long AccountId { get; set; }
    public string AccountCode { get; set; } = string.Empty;
    public string AccountNameAr { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
    public decimal OpeningBalance { get; set; }   // رصيد الحساب قبل بداية الفترة (0 لو From غير محدد)
    public decimal ClosingBalance { get; set; }   // رصيد الحساب بنهاية الفترة/آخر حركة
    public List<LedgerMovementDto> Movements { get; set; } = new();
}
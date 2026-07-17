namespace FatooraRahatak.Application.DTOs.Accounting;

public class CreateJournalEntryLineDto
{
    public long AccountId { get; set; }
    public decimal Debit { get; set; } = 0m;
    public decimal Credit { get; set; } = 0m;
    public string? LineDescription { get; set; }
}

public class CreateJournalEntryDto
{
    public DateOnly EntryDate { get; set; }
    public string? Description { get; set; }
    public List<CreateJournalEntryLineDto> Lines { get; set; } = new();
}
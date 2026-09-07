namespace FatooraRahatak.Application.DTOs.Accounting;

public class VoucherDto
{
    public long Id { get; set; }
    public string VoucherType { get; set; } = string.Empty; // "Receipt" | "Payment"
    public string VoucherNumber { get; set; } = string.Empty;
    public DateOnly VoucherDate { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public long CounterpartAccountId { get; set; }
    public string CounterpartAccountNameAr { get; set; } = string.Empty;
    public string? PartyName { get; set; }
    public long? CustomerId { get; set; }
    public string? Description { get; set; }
    public long? JournalEntryId { get; set; }
    public string? JournalEntryNumber { get; set; }
}

public class CreateVoucherDto
{
    public DateOnly VoucherDate { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = "Cash"; // "Cash" | "Bank" | "Transfer" | "Cheque" | "Other"
    public long CounterpartAccountId { get; set; }
    public string? PartyName { get; set; }
    public long? CustomerId { get; set; }
    public string? Description { get; set; }
}
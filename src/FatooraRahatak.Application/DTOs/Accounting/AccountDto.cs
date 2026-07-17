namespace FatooraRahatak.Application.DTOs.Accounting;

public class AccountDto
{
    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public long? ParentAccountId { get; set; }
    public bool IsActive { get; set; }
    public bool IsSystem { get; set; }
    public decimal Balance { get; set; }

    public List<AccountDto> Children { get; set; } = new();
}
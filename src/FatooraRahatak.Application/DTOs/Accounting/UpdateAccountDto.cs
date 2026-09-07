using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Application.DTOs.Accounting;

public class UpdateAccountDto
{
    public string? Code { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public AccountType? AccountType { get; set; }
    public long? ParentAccountId { get; set; }
    public bool IsActive { get; set; } = true;
}
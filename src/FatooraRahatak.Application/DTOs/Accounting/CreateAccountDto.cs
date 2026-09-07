using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Application.DTOs.Accounting;

public class CreateAccountDto
{
    public string Code { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public AccountType AccountType { get; set; }
    public long? ParentAccountId { get; set; }
}
namespace FatooraRahatak.Application.DTOs.Stores;

public class StoreResponseDto
{
    public long Id { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string StoreSlug { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? CustomDomain { get; set; }
    public string CustomDomainStatus { get; set; } = string.Empty;
    public bool IsOnline { get; set; }
    public bool IsVatRegistered { get; set; }
}
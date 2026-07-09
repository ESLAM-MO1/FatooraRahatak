namespace FatooraRahatak.Application.DTOs.Admin;

public class AdminStoreDetailDto
{
    public long Id { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string StoreSlug { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int ProductsCount { get; set; }
    public int EmployeesCount { get; set; }
    public string? CustomDomain { get; set; }
    public string CustomDomainStatus { get; set; } = string.Empty;
}
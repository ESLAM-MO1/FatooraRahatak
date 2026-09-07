namespace FatooraRahatak.Application.DTOs.Admin;

public class AdminStoreListDto
{
    public long Id { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string StoreSlug { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public double PackageConsumptionPercent { get; set; }
}
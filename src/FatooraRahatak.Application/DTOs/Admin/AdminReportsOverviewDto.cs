namespace FatooraRahatak.Application.DTOs.Admin;

public class AdminReportsOverviewDto
{
    public int TotalStores { get; set; }
    public int ActiveStores { get; set; }
    public int SuspendedStores { get; set; }
    public int PendingStores { get; set; }
    public int TotalUsers { get; set; }
    public int TotalProductsAcrossPlatform { get; set; }
    public long TotalOrders { get; set; }
    public decimal TotalRevenue { get; set; }
    public int TotalReferrals { get; set; }
    public decimal PendingReferralCommissions { get; set; }
    public List<StoreCountByPackageDto> StoresByPackage { get; set; } = new();
}

public class StoreCountByPackageDto
{
    public string PackageName { get; set; } = string.Empty;
    public int Count { get; set; }
}
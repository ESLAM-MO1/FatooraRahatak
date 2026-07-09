namespace FatooraRahatak.Application.DTOs.Admin;

public class AdminReportsOverviewDto
{
    public int TotalStores { get; set; }
    public int ActiveStores { get; set; }
    public int SuspendedStores { get; set; }
    public int TotalUsers { get; set; }
    public int TotalProductsAcrossPlatform { get; set; }
    public List<StoreCountByPackageDto> StoresByPackage { get; set; } = new();
}

public class StoreCountByPackageDto
{
    public string PackageName { get; set; } = string.Empty;
    public int Count { get; set; }
}
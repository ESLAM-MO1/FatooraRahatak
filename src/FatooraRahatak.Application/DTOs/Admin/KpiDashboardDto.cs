namespace FatooraRahatak.Application.DTOs.Admin;

public class KpiDashboardDto
{
    public decimal Mrr { get; set; }
    public decimal Arr { get; set; }
    public int ActiveStoresCount { get; set; }
    public double TrialToPaidConversion { get; set; }
    public double ChurnRate { get; set; }
    public List<MonthlyGrowthPoint> MonthlyGrowth { get; set; } = new();
    public List<PackageDistItem> PackageDistribution { get; set; } = new();
    public List<TopRevenueStoreDto> TopRevenueStores { get; set; } = new();
    public List<AtRiskStoreDto> AtRiskStores { get; set; } = new();
}

public class MonthlyGrowthPoint
{
    public string Month { get; set; } = string.Empty;
    public int NewStores { get; set; }
    public int CancelledSubscriptions { get; set; }
}

public class PackageDistItem
{
    public string PackageName { get; set; } = string.Empty;
    public int StoreCount { get; set; }
}

public class TopRevenueStoreDto
{
    public long Id { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public decimal MonthlyRevenue { get; set; }
}

public class AtRiskStoreDto
{
    public long Id { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

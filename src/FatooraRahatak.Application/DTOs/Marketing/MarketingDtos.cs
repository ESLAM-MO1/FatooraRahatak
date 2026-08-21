namespace FatooraRahatak.Application.DTOs.Marketing;

public class MarketingIntegrationDto
{
    public long Id { get; set; }
    public string Channel { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? AdditionalCode { get; set; }
    public bool IsEnabled { get; set; } = true;

    // === تتبع التحويلات من السيرفر ===
    // القيمة بترجع مقنّعة (Masked) لأسباب أمنية، وما بترجعش فاضية إلا لو مفيش قيمة أصلًا
    public string? AccessTokenMasked { get; set; }
    public bool HasAccessToken { get; set; }
    public bool EnableServerSideTracking { get; set; } = false;
    public bool SupportsServerSideTracking { get; set; }
}

public class UpsertMarketingIntegrationDto
{
    public string Channel { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? AdditionalCode { get; set; }
    public bool IsEnabled { get; set; } = true;

    // لو اتسابت null هتفضل القيمة القديمة زي ما هي (عشان الفرونت مابيبعتش التوكن المقنّع تاني)
    // لو اتبعتت سترينج فاضية "" معناها مسح القيمة صراحةً
    public string? AccessToken { get; set; }
    public bool EnableServerSideTracking { get; set; } = false;
}

public class ConversionTestResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class MarketingCampaignDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public string? CouponCode { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}

public class CreateMarketingCampaignDto
{
    public string Name { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public string? CouponCode { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; } = true;
}

public class MarketingChannelPerformanceDto
{
    public string Channel { get; set; } = string.Empty;
    public int OrdersCount { get; set; }
    public decimal Revenue { get; set; }
    public int CustomersCount { get; set; }
    public decimal SharePct { get; set; }
}

public class MarketingPerformanceDto
{
    public int TotalTrackedOrders { get; set; }
    public decimal TotalTrackedRevenue { get; set; }
    public List<MarketingChannelPerformanceDto> Channels { get; set; } = new();
    public List<MarketingCampaignDto> Campaigns { get; set; } = new();
}

public class StorePublicScriptsDto
{
    public List<MarketingIntegrationDto> Integrations { get; set; } = new();
}
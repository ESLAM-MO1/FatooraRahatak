namespace FatooraRahatak.Application.DTOs.Public;

public class PublicStoreDto
{
    public long Id { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string StoreSlug { get; set; } = string.Empty;
    public string? Logo { get; set; }
    public string DefaultLanguage { get; set; } = "ar";
    public bool IsOnline { get; set; }
    public string ThemeName { get; set; } = "professional-blue";
    public string? ColorsJson { get; set; }
    public string? CoverImage { get; set; }
    public string? CustomCss { get; set; }
    public string Currency { get; set; } = "SAR";
    public decimal VatRate { get; set; } = 0;
    public decimal? FreeShippingThreshold { get; set; }
    public string? ContactPhone { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactAddress { get; set; }
    public string? BioLink { get; set; }
    public string? FacebookUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? WhatsappUrl { get; set; }
    public string? ReturnPolicyText { get; set; }
    public bool IsCouponsEnabled { get; set; }
    public bool IsSearchEnabled { get; set; } = true;
    public bool IsReviewsEnabled { get; set; } = false;
    public bool CustomerNotificationEmail { get; set; } = false;
    public bool CustomerNotificationWhatsapp { get; set; } = false;
    public bool IsCardPaymentsEnabled { get; set; } = false;
    public List<PublicTrustBadgeDto> TrustBadges { get; set; } = new();
    public List<PublicShippingMethodDto> ShippingMethods { get; set; } = new();
    public List<PublicPaymentMethodDto> PaymentMethods { get; set; } = new();
    public List<PublicShippingCompanyDto> ShippingCompanies { get; set; } = new();
}

public class PublicShippingCompanyDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
}

public class PublicTrustBadgeDto
{
    public string Icon { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
}

public class PublicShippingMethodDto
{
    public string Type { get; set; } = string.Empty;
}

public class PublicPaymentMethodDto
{
    public string Type { get; set; } = string.Empty;
}

public class PublicCategoryDto
{
    public long Id { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? Image { get; set; }
    public long? ParentCategoryId { get; set; }
}

// طلب معاينة تكلفة الشحن أثناء الدفع — قبل ما العميل يأكد الطلب
public class PublicShippingQuoteRequestDto
{
    public string SessionId { get; set; } = string.Empty;
    public string ShippingAddress { get; set; } = string.Empty;
}

public class PublicShippingQuoteResultDto
{
    public bool Available { get; set; }
    public decimal ShippingCost { get; set; }
    public string Currency { get; set; } = "SAR";
    public string CompanyName { get; set; } = string.Empty;
    public int EstimatedDeliveryDays { get; set; }
    public bool IsFreeShipping { get; set; }
    public string? Message { get; set; }
}
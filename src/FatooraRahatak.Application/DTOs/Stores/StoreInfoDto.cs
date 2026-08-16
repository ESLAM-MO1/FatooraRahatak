namespace FatooraRahatak.Application.DTOs.Stores;

public class StoreInfoDto
{
    public long Id { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string StoreSlug { get; set; } = string.Empty;
    public string? CustomDomain { get; set; }
    public string CustomDomainStatus { get; set; } = string.Empty;
    public string? ContactPhone { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactAddress { get; set; }
    public string? BioLink { get; set; }
    public string? FacebookUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? WhatsappUrl { get; set; }
    public string Currency { get; set; } = string.Empty;
    public bool IsVatRegistered { get; set; }
    public string? VatNumber { get; set; }
    public string? ReturnPolicyText { get; set; }
    public bool IsOnline { get; set; }
    public string DefaultLanguage { get; set; } = string.Empty;
    public string ThemeName { get; set; } = "professional-blue";
    public string? ColorsJson { get; set; }
    public string? Logo { get; set; }
    public string? CoverImage { get; set; }
    public string? CustomCss { get; set; }
    public int MaxThemes { get; set; } = 1;
    public bool IsSearchEnabled { get; set; }
    public bool IsReviewsEnabled { get; set; }
    public int? LowStockThreshold { get; set; }
    public bool IsCouponsEnabled { get; set; }
    public bool CustomerNotificationEmail { get; set; }
    public bool CustomerNotificationWhatsapp { get; set; }
    public string? TrustBadgesJson { get; set; }
    public int? ReturnPolicyDays { get; set; }
    public decimal? FreeShippingThreshold { get; set; }
    public decimal? ShippingDiscountPercent { get; set; }
    public List<ShippingMethodDto> ShippingMethods { get; set; } = new();
    public List<PaymentMethodDto> PaymentMethods { get; set; } = new();
}
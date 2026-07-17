namespace FatooraRahatak.Application.DTOs.Public;

public class PublicStoreDto
{
    public long Id { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string StoreSlug { get; set; } = string.Empty;
    public string? Logo { get; set; }
    public string DefaultLanguage { get; set; } = "ar";
    public bool IsOnline { get; set; }
    public string ThemeName { get; set; } = "basic";
    public string PrimaryColor { get; set; } = "#12a8db";
    public string? CoverImage { get; set; }
    public string Currency { get; set; } = "SAR";
    public string? ContactPhone { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactAddress { get; set; }
    public string? BioLink { get; set; }
    public string? FacebookUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? WhatsappUrl { get; set; }
    public string? ReturnPolicyText { get; set; }
    public List<PublicShippingMethodDto> ShippingMethods { get; set; } = new();
    public List<PublicPaymentMethodDto> PaymentMethods { get; set; } = new();
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
namespace FatooraRahatak.Application.DTOs.Apps;

// ── حزمة بيانات التطبيق (Bundle) ──
// تُغذّي مصمّم التطبيق والمعاينة الحيّة ببيانات متجر العميل الفعلية،
// بدلًا من البيانات الثابتة، مطابقةً لصانع تطبيقات سلة الذي يعرض منتجات المتجر الحقيقية.
public class MobileAppBundleDto
{
    public StoreBrandingDto Store { get; set; } = new();
    public List<AppCategoryDto> Categories { get; set; } = new();
    public List<AppProductDto> Products { get; set; } = new();
    public List<AppProductDto> FeaturedProducts { get; set; } = new();
    public List<AppProductDto> NewArrivals { get; set; } = new();
    public List<AppProductDto> Offers { get; set; } = new();
    public List<AppBannerDto> Banners { get; set; } = new();
    public AppContactDto Contact { get; set; } = new();
}

// هوية المتجر الحقيقية (الاسم، الشعار، الألوان، العملة).
public class StoreBrandingDto
{
    public long StoreId { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string StoreSlug { get; set; } = string.Empty;
    public string? Logo { get; set; }
    public string? CoverImage { get; set; }
    public string Currency { get; set; } = "SAR";
    public string ThemeName { get; set; } = "professional-blue";
    public string? ColorsJson { get; set; }
    public string? Bio { get; set; }
}

// قسم حقيقي من أقسام المتجر.
public class AppCategoryDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Image { get; set; }
    public int ProductCount { get; set; }
}

// منتج حقيقي من كتالوج المتجر.
public class AppProductDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    public decimal? DiscountPercent { get; set; }
    public string? ImageUrl { get; set; }
    public long? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public bool InStock { get; set; } = true;
    public string? ShortDescription { get; set; }
    public DateTime CreatedAt { get; set; }
}

// بانر من إعدادات واجهة المتجر (إن وجد).
public class AppBannerDto
{
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string? ImageUrl { get; set; }
}

// بيانات التواصل الفعلية للمتجر.
public class AppContactDto
{
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Whatsapp { get; set; }
    public string? Address { get; set; }
    public string? Instagram { get; set; }
    public string? Twitter { get; set; }
    public string? Facebook { get; set; }
}

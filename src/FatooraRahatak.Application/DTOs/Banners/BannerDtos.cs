namespace FatooraRahatak.Application.DTOs.Banners;

public class BannerDto
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string? LinkUrl { get; set; }
    public string Position { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateBannerDto
{
    public string Title { get; set; } = string.Empty;
    public string ImageBase64 { get; set; } = string.Empty;
    public string? LinkUrl { get; set; }
    public string Position { get; set; } = "HomeTop";
    public int SortOrder { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateBannerDto
{
    public string? Title { get; set; }
    public string? ImageBase64 { get; set; }
    public string? LinkUrl { get; set; }
    public string? Position { get; set; }
    public int? SortOrder { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool? IsActive { get; set; }
}

public class PublicBannerDto
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string? LinkUrl { get; set; }
    public string Position { get; set; } = string.Empty;
}

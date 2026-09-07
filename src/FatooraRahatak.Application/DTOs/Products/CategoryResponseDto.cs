namespace FatooraRahatak.Application.DTOs.Products;

public class CategoryResponseDto
{
    public long Id { get; set; }
    public long? ParentCategoryId { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
}
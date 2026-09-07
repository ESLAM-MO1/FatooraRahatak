namespace FatooraRahatak.Application.DTOs.Products;

public class CreateCategoryDto
{
    public long? ParentCategoryId { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public int SortOrder { get; set; } = 0;
}
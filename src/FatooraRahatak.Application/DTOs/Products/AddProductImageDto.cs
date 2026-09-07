namespace FatooraRahatak.Application.DTOs.Products;

public class AddProductImageDto
{
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsPrimary { get; set; } = false;
    public int SortOrder { get; set; } = 0;
}
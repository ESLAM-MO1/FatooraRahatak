namespace FatooraRahatak.Application.DTOs.Products;

public class ImportFromUrlRequest
{
    public string Url { get; set; } = string.Empty;
}

public class ProductUrlImportDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal? BasePrice { get; set; }
    public decimal? DiscountPrice { get; set; }
    public string? Currency { get; set; }
    public string? Sku { get; set; }
    public string? Category { get; set; }
    public List<string> Images { get; set; } = new();
    public string SourceDomain { get; set; } = string.Empty;
}

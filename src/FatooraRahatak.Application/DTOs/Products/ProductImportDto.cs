namespace FatooraRahatak.Application.DTOs.Products;

public class ProductImportErrorDto
{
    public int Row { get; set; }
    public string Code { get; set; } = string.Empty;
    public string? Field { get; set; }
    public string? Value { get; set; }
}

public class ProductImportResultDto
{
    public int TotalRows { get; set; }
    public int CreatedCount { get; set; }
    public int FailedCount { get; set; }
    public List<string> CreatedCategories { get; set; } = new();
    public List<string> IgnoredColumns { get; set; } = new();
    public List<ProductImportErrorDto> Errors { get; set; } = new();
    public bool ErrorsTruncated { get; set; }
}

public class ProductImportException : Exception
{
    public string Code { get; }
    public List<string> Details { get; }

    public ProductImportException(string code, params string[] details) : base(code)
    {
        Code = code;
        Details = details.ToList();
    }
}

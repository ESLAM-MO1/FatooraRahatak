namespace FatooraRahatak.Application.DTOs.Products;

public class CategoryImportResultDto
{
    public int TotalRows { get; set; }
    public int CreatedCount { get; set; }
    public int FailedCount { get; set; }
    public List<string> CreatedParents { get; set; } = new();
    public List<string> IgnoredColumns { get; set; } = new();
    public List<ProductImportErrorDto> Errors { get; set; } = new();
    public bool ErrorsTruncated { get; set; }
}

public class CategoryImportException : Exception
{
    public string Code { get; }
    public List<string> Details { get; }

    public CategoryImportException(string code, params string[] details) : base(code)
    {
        Code = code;
        Details = details.ToList();
    }
}

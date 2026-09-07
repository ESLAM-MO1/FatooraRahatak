namespace FatooraRahatak.Application.DTOs.Public;

public class PublicProductReviewDto
{
    public long Id { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateProductReviewDto
{
    public string CustomerName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public string? Phone { get; set; }
}

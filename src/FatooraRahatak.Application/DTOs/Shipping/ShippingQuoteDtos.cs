namespace FatooraRahatak.Application.DTOs.Shipping;

public class ShippingQuoteRequestDto
{
    public long ShippingCompanyId { get; set; }
    public string DestinationCity { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public decimal? CodAmount { get; set; }
}

public class ShippingQuoteDto
{
    public long ShippingCompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string CompanyCode { get; set; } = string.Empty;
    public decimal EstimatedCost { get; set; }
    public decimal? CodFee { get; set; }
    public string Currency { get; set; } = "SAR";
    public int EstimatedDeliveryDays { get; set; }
    public string? Message { get; set; }
}

public class ShippingQuoteResultDto
{
    public bool HasShipping { get; set; }
    public List<ShippingQuoteDto> Quotes { get; set; } = new();
}

namespace FatooraRahatak.Application.DTOs.Shipping;

public class ShippingCompanyDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public bool IsDefault { get; set; }
    public string? RateConfigJson { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateShippingCompanyDto
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = "Manual";
    public bool Enabled { get; set; } = true;
    public bool IsDefault { get; set; }
    public string? RateConfigJson { get; set; }
}

public class UpdateShippingCompanyDto
{
    public string? Name { get; set; }
    public bool? Enabled { get; set; }
    public bool? IsDefault { get; set; }
    public string? RateConfigJson { get; set; }
}

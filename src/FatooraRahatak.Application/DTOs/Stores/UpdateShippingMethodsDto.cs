namespace FatooraRahatak.Application.DTOs.Stores;

public class UpdateShippingMethodsDto
{
    public List<ShippingMethodUpdateItem> Methods { get; set; } = new();
}

public class ShippingMethodUpdateItem
{
    public string Type { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}
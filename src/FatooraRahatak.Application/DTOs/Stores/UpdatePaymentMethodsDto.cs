namespace FatooraRahatak.Application.DTOs.Stores;

public class UpdatePaymentMethodsDto
{
    public List<PaymentMethodUpdateItem> Methods { get; set; } = new();
}

public class PaymentMethodUpdateItem
{
    public string Type { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}
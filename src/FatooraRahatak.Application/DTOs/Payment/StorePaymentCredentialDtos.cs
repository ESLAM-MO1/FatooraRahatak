namespace FatooraRahatak.Application.DTOs.Payment;

public class SaveStorePaymentCredentialDto
{
    public string Provider { get; set; } = string.Empty;
    public string? PublicKey { get; set; }
    public string? SecretKey { get; set; }
    public string? MerchantCode { get; set; }
    public string? NotificationToken { get; set; }
    public bool IsEnabled { get; set; }
    public bool IsTestMode { get; set; }
}

public class StorePaymentCredentialStatusDto
{
    public string Provider { get; set; } = string.Empty;
    public string? PublicKey { get; set; }
    public string? MerchantCode { get; set; }
    public bool HasSecretKey { get; set; }
    public bool HasNotificationToken { get; set; }
    public bool IsEnabled { get; set; }
    public bool IsTestMode { get; set; }
    public bool IsConfigured { get; set; }
}

public class StorePaymentCredentialSecrets
{
    public string Provider { get; set; } = string.Empty;
    public string? PublicKey { get; set; }
    public string? SecretKey { get; set; }
    public string? MerchantCode { get; set; }
    public string? NotificationToken { get; set; }
    public bool IsEnabled { get; set; }
    public bool IsTestMode { get; set; }
}

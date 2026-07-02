namespace FatooraRahatak.Application.DTOs.Stores;

public class CreateStoreDto
{
    public string StoreName { get; set; } = string.Empty;
    public string StoreSlug { get; set; } = string.Empty;
    public string DefaultLanguage { get; set; } = "ar";
}
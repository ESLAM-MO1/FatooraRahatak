namespace FatooraRahatak.Application.DTOs.Stores;

public class CreateDomainPurchaseRequestDto
{
    public string PreferredName { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class CompleteDomainPurchaseRequestDto
{
    public string DomainName { get; set; } = string.Empty;
    public string? AdminNote { get; set; }
}

public class RejectDomainPurchaseRequestDto
{
    public string AdminNote { get; set; } = string.Empty;
}

public class DomainPurchaseRequestDto
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string PreferredName { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? AssignedDomain { get; set; }
    public string? AdminNote { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? HandledAt { get; set; }
}

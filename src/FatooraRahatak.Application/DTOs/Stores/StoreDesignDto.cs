namespace FatooraRahatak.Application.DTOs.Stores;

public class StoreDesignRequestDto
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string Status { get; set; } = "Open";
    public string? AppliedCss { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class StoreDesignMessageDto
{
    public long Id { get; set; }
    public string SenderType { get; set; } = "StoreOwner";
    public string SenderName { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? CssPayload { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SendStoreDesignMessageDto
{
    public string Body { get; set; } = string.Empty;
    public string? CssPayload { get; set; }
}

public class UpdateStoreDesignRequestStatusDto
{
    public string Status { get; set; } = "Open";
}

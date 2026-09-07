using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Stores;

public class StoreDesignRequest : BaseEntity
{
    public long StoreId { get; set; }
    public Store? Store { get; set; }
    public string Status { get; set; } = "Open";
    public string? AppliedCss { get; set; }
    public DateTime? LastMessageAt { get; set; }
}

public class StoreDesignMessage : BaseEntity
{
    public long RequestId { get; set; }
    public StoreDesignRequest? Request { get; set; }
    public string SenderType { get; set; } = "StoreOwner";
    public string SenderName { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? CssPayload { get; set; }
}

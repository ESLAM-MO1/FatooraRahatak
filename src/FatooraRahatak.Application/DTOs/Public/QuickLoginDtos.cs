namespace FatooraRahatak.Application.DTOs.Public;

public class QuickLoginRequestDto
{
    public string Phone { get; set; } = string.Empty;
}

public class QuickLoginVerifyDto
{
    public string Phone { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class QuickLoginSendResultDto
{
    public bool Sent { get; set; }
    public string? Channel { get; set; }
    public string? MaskedContact { get; set; }
    public bool CustomerFound { get; set; }
    public string? CustomerName { get; set; }
    public string? DevCode { get; set; }
}

public class QuickLoginCustomerDto
{
    public long? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? LastAddress { get; set; }
    public string? SessionToken { get; set; }
    public int OrderCount { get; set; }
    public List<QuickLoginOrderSummaryDto> RecentOrders { get; set; } = new();
}

public class QuickLoginOrderSummaryDto
{
    public long Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
}

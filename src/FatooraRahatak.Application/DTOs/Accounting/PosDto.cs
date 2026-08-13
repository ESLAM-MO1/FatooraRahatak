namespace FatooraRahatak.Application.DTOs.Accounting;

public class CreatePosSaleDto
{
    public string? GuestName { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
    public List<CreateInvoiceItemDto> Items { get; set; } = new();
}

public class PosShiftDto
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public string OpenedByName { get; set; } = string.Empty;
    public DateTime OpenedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public decimal StartingCash { get; set; }
    public decimal? EndingCash { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalCashSales { get; set; }
    public decimal TotalCardSales { get; set; }
    public decimal ExpectedCash { get; set; }
    public decimal Variance { get; set; }
    public bool IsOpen { get; set; }
}

public class OpenShiftDto
{
    public decimal StartingCash { get; set; }
}

public class CloseShiftDto
{
    public decimal EndingCash { get; set; }
}
namespace FatooraRahatak.Application.DTOs.Dashboard;

public class OwnerDashboardStatsDto
{
    public decimal TotalSales { get; set; }
    public decimal TotalPosSales { get; set; }
    public int InvoicesCount { get; set; }
    public int NewOrdersCount { get; set; }
    public List<OrderStatusCountDto> OrdersCountByStatus { get; set; } = new();
    public List<TopSellingProductDto> TopSellingProducts { get; set; } = new();
    public List<TopBuyingCustomerDto> TopBuyingCustomers { get; set; } = new();
}

public class OrderStatusCountDto
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class TopSellingProductDto
{
    public long ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int TotalQuantitySold { get; set; }
}

public class TopBuyingCustomerDto
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public decimal TotalSpent { get; set; }
    public int OrdersCount { get; set; }
}
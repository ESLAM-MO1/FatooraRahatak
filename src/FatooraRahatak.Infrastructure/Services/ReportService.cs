using Microsoft.EntityFrameworkCore;
using System.Text;
using FatooraRahatak.Application.DTOs.Reports;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class ReportService : IReportService
{
    private readonly AppDbContext _context;

    public ReportService(AppDbContext context)
    {
        _context = context;
    }

    private async Task<long> ResolveStoreIdAsync(long userId)
    {
        var ownedStore = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == userId);
        if (ownedStore != null)
            return ownedStore.Id;

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == userId && e.Status == "Active");
        if (employee != null)
            return employee.StoreId;

        throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك، أو حسابك غير نشط");
    }

    private static DateTime ToUtcStart(DateOnly? date) =>
        (date ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30))).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

    private static DateTime ToUtcEnd(DateOnly? date) =>
        (date ?? DateOnly.FromDateTime(DateTime.UtcNow)).ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

    public async Task<SalesReportDto> GetSalesReportAsync(long userId, DateOnly? from, DateOnly? to)
    {
        var storeId = await ResolveStoreIdAsync(userId);
        var start = ToUtcStart(from);
        var end = ToUtcEnd(to);

        // ⚠️ الطلبات الملغاة وطلبات "بانتظار الدفع" (بطاقة/PayPal لم يكتمل دفعها بعد) ليست
        // مبيعات فعلية — تضمينها كان يُضخّم الإيراد المعروض هنا عن الرقم المحاسبي الحقيقي.
        var orders = await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.StoreId == storeId && o.CreatedAt >= start && o.CreatedAt <= end
                && o.Status != OrderStatus.Cancelled && o.Status != OrderStatus.PendingPayment)
            .ToListAsync();

        var dto = new SalesReportDto
        {
            From = DateOnly.FromDateTime(start),
            To = DateOnly.FromDateTime(end),
            OrdersCount = orders.Count,
            ItemsSold = orders.Sum(o => o.Items.Sum(i => i.Quantity)),
            GrossSales = orders.Sum(o => o.SubTotal),
            Discounts = orders.Sum(o => o.DiscountAmount),
            ShippingFees = orders.Sum(o => o.ShippingCost),
            TotalRevenue = orders.Sum(o => o.TotalAmount)
        };
        dto.NetSales = dto.GrossSales - dto.Discounts;
        dto.TaxAmount = dto.TotalRevenue - dto.NetSales - dto.ShippingFees;

        dto.DailyRows = orders
            .GroupBy(o => DateOnly.FromDateTime(o.CreatedAt))
            .OrderBy(g => g.Key)
            .Select(g => new DailySalesRowDto
            {
                Date = g.Key,
                OrdersCount = g.Count(),
                Revenue = g.Sum(o => o.TotalAmount)
            })
            .ToList();

        dto.TopProducts = orders
            .SelectMany(o => o.Items)
            .GroupBy(i => new { i.ProductId, i.ProductNameSnapshot })
            .OrderByDescending(g => g.Sum(i => i.Quantity))
            .Take(10)
            .Select(g => new TopProductRowDto
            {
                ProductId = g.Key.ProductId,
                ProductName = g.Key.ProductNameSnapshot,
                UnitsSold = g.Sum(i => i.Quantity),
                Revenue = g.Sum(i => i.LineTotal)
            })
            .ToList();

        return dto;
    }

    public async Task<DiscountReportDto> GetDiscountsReportAsync(long userId, DateOnly? from, DateOnly? to)
    {
        var storeId = await ResolveStoreIdAsync(userId);
        var start = ToUtcStart(from);
        var end = ToUtcEnd(to);

        // ⚠️ نفس منطق تقرير المبيعات: خصم على طلب ملغى أو لم يُدفع بعد ليس خصمًا فعليًا مُنِح.
        var orders = await _context.Orders
            .Include(o => o.Coupon)
            .Where(o => o.StoreId == storeId && o.CouponId != null && o.CreatedAt >= start && o.CreatedAt <= end
                && o.Status != OrderStatus.Cancelled && o.Status != OrderStatus.PendingPayment)
            .ToListAsync();

        return new DiscountReportDto
        {
            From = DateOnly.FromDateTime(start),
            To = DateOnly.FromDateTime(end),
            CouponsUsed = orders.Count,
            TotalDiscountGiven = orders.Sum(o => o.DiscountAmount),
            Rows = orders
                .GroupBy(o => o.Coupon!.Code)
                .OrderByDescending(g => g.Sum(o => o.DiscountAmount))
                .Select(g => new DiscountRowDto
                {
                    CouponCode = g.Key,
                    TimesUsed = g.Count(),
                    TotalDiscount = g.Sum(o => o.DiscountAmount)
                })
                .ToList()
        };
    }

    public async Task<TaxReportDto> GetTaxReportAsync(long userId, DateOnly? from, DateOnly? to)
    {
        var storeId = await ResolveStoreIdAsync(userId);
        var start = from ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var end = to ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var invoices = await _context.Invoices
            .Where(i => i.StoreId == storeId && i.InvoiceDate >= start && i.InvoiceDate <= end)
            .ToListAsync();

        return new TaxReportDto
        {
            From = start,
            To = end,
            InvoicesCount = invoices.Count,
            VatCollected = invoices.Sum(i => i.TaxAmount),
            Rows = invoices
                .Where(i => i.TaxAmount > 0)
                .OrderByDescending(i => i.InvoiceDate)
                .Select(i => new TaxRowDto
                {
                    InvoiceId = i.Id,
                    InvoiceNumber = i.InvoiceNumber,
                    InvoiceDate = i.InvoiceDate,
                    SubTotal = i.SubTotal,
                    TaxAmount = i.TaxAmount,
                    TotalAmount = i.TotalAmount
                })
                .ToList()
        };
    }

    public async Task<List<LowStockRowDto>> GetLowStockAsync(long userId, int? threshold)
    {
        var storeId = await ResolveStoreIdAsync(userId);
        var store = await _context.Stores.AsNoTracking().FirstOrDefaultAsync(s => s.Id == storeId);
        var effThreshold = threshold ?? store?.LowStockThreshold ?? 5;

        var grouped = await _context.InventoryStocks
            .Include(s => s.Product)
            .Include(s => s.Warehouse)
            .Where(s => s.Warehouse.StoreId == storeId)
            .GroupBy(s => new { s.ProductId, s.Product.NameAr, s.Product.Sku })
            .Select(g => new LowStockRowDto
            {
                ProductId = g.Key.ProductId,
                ProductName = g.Key.NameAr,
                Sku = g.Key.Sku,
                Available = g.Sum(s => s.QuantityAvailable),
                Threshold = effThreshold
            })
            .ToListAsync();

        return grouped
            .Where(r => r.Available <= effThreshold)
            .OrderBy(r => r.Available)
            .ToList();
    }

    public async Task<List<InventoryMovementRowDto>> GetInventoryMovementsAsync(long userId, DateOnly? from, DateOnly? to, long? productId)
    {
        var storeId = await ResolveStoreIdAsync(userId);
        var start = from?.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc) ?? DateTime.MinValue;
        var end = to?.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc) ?? DateTime.MaxValue;

        var query = _context.InventoryTransactions
            .Include(t => t.Product)
            .Include(t => t.Variant)
            .Include(t => t.Warehouse)
            .Where(t => t.Warehouse.StoreId == storeId && t.CreatedAt >= start && t.CreatedAt <= end);

        if (productId.HasValue)
            query = query.Where(t => t.ProductId == productId.Value);

        return await query
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new InventoryMovementRowDto
            {
                Id = t.Id,
                Date = t.CreatedAt,
                ProductName = t.Product.NameAr,
                VariantName = t.Variant != null ? t.Variant.VariantName : null,
                WarehouseName = t.Warehouse.WarehouseName,
                Type = t.TransactionType.ToString(),
                Quantity = t.Quantity,
                ReferenceType = t.ReferenceType,
                ReferenceId = t.ReferenceId
            })
            .ToListAsync();
    }

    public async Task<InventoryValuationDto> GetInventoryValuationAsync(long userId)
    {
        var storeId = await ResolveStoreIdAsync(userId);

        var rows = await _context.InventoryStocks
            .Include(s => s.Product)
            .Include(s => s.Warehouse)
            .Where(s => s.Warehouse.StoreId == storeId && s.QuantityAvailable > 0)
            .GroupBy(s => new { s.ProductId, s.Product.NameAr, s.Product.Sku, s.Product.CostPrice, s.Product.BasePrice })
            .Select(g => new InventoryValuationRowDto
            {
                ProductId = g.Key.ProductId,
                ProductName = g.Key.NameAr,
                Sku = g.Key.Sku,
                Available = g.Sum(s => s.QuantityAvailable),
                CostPrice = g.Key.CostPrice,
                RetailPrice = g.Key.BasePrice,
                CostValue = g.Sum(s => s.QuantityAvailable) * g.Key.CostPrice,
                RetailValue = g.Sum(s => s.QuantityAvailable) * g.Key.BasePrice
            })
            .ToListAsync();

        return new InventoryValuationDto
        {
            ItemsCount = rows.Count,
            TotalUnits = rows.Sum(r => r.Available),
            TotalCostValue = rows.Sum(r => r.CostValue),
            TotalRetailValue = rows.Sum(r => r.RetailValue),
            Rows = rows.OrderBy(r => r.ProductName).ToList()
        };
    }

    public async Task<CustomerStatementDto> GetCustomerStatementAsync(long userId, long? customerId, string? phone, DateOnly? from, DateOnly? to)
    {
        var storeId = await ResolveStoreIdAsync(userId);
        var start = ToUtcStart(from);
        var end = ToUtcEnd(to);

        var dto = new CustomerStatementDto
        {
            From = DateOnly.FromDateTime(start),
            To = DateOnly.FromDateTime(end),
            Lines = new List<StatementLineDto>()
        };

        IQueryable<Order> ordersQuery = _context.Orders.Where(o => o.StoreId == storeId);
        if (customerId.HasValue)
        {
            var customer = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == customerId.Value);
            ordersQuery = ordersQuery.Where(o => o.CustomerId == customerId.Value);
            dto.Phone = customer?.Phone;
            dto.CustomerName = customer?.FullName;
        }
        else if (!string.IsNullOrWhiteSpace(phone))
        {
            ordersQuery = ordersQuery.Where(o => o.GuestPhone == phone);
            dto.Phone = phone;
        }
        else
        {
            throw new InvalidOperationException("حدد العميل (المعرف أو رقم الجوال)");
        }

        var orders = await ordersQuery
            .Where(o => o.CreatedAt >= start && o.CreatedAt <= end
                && o.Status != OrderStatus.Cancelled && o.Status != OrderStatus.PendingPayment)
            .OrderBy(o => o.CreatedAt)
            .ToListAsync();

        var orderIds = orders.Select(o => o.Id).ToList();

        foreach (var o in orders)
        {
            dto.Lines.Add(new StatementLineDto
            {
                Date = o.CreatedAt,
                Reference = o.OrderNumber,
                Type = "فاتورة بيع",
                Debit = o.TotalAmount,
                Credit = 0
            });
        }

        if (orderIds.Count > 0)
        {
            var payments = await _context.Payments
                .Where(p => p.OrderId != null && orderIds.Contains(p.OrderId.Value) && p.Status == PaymentStatus.Paid)
                .ToListAsync();

            foreach (var p in payments)
            {
                dto.Lines.Add(new StatementLineDto
                {
                    Date = p.PaidAt ?? p.CreatedAt,
                    Reference = p.PaymentReference,
                    Type = "دفعة",
                    Debit = 0,
                    Credit = p.Amount
                });
            }
        }

        dto.Lines = dto.Lines.OrderBy(l => l.Date).ToList();
        dto.TotalSales = dto.Lines.Sum(l => l.Debit);
        dto.TotalPaid = dto.Lines.Sum(l => l.Credit);
        dto.Balance = dto.TotalSales - dto.TotalPaid;

        return dto;
    }

    public async Task<ARAgingDto> GetARAgingAsync(long userId)
    {
        var storeId = await ResolveStoreIdAsync(userId);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var unpaid = await _context.Invoices
            .Include(i => i.Customer)
            .Where(i => i.StoreId == storeId
                && i.InvoiceType == InvoiceType.Sales
                && i.PaymentStatus == PaymentStatus.Pending)
            .ToListAsync();

        var dto = new ARAgingDto { Buckets = new List<AgingBucketDto>() };

        var buckets = new (string Name, int Min, int Max)[]
        {
            ("0-30 يوم", 0, 30),
            ("31-60 يوم", 31, 60),
            ("61-90 يوم", 61, 90),
            ("أكثر من 90 يوم", 91, int.MaxValue)
        };

        foreach (var (name, min, max) in buckets)
        {
            var invoices = unpaid
                .Where(i => (today.DayNumber - i.InvoiceDate.DayNumber) >= min
                            && (today.DayNumber - i.InvoiceDate.DayNumber) <= max)
                .ToList();

            dto.Buckets.Add(new AgingBucketDto
            {
                Name = name,
                Total = invoices.Sum(i => i.TotalAmount),
                InvoicesCount = invoices.Count,
                Invoices = invoices.Select(i => new AgingInvoiceDto
                {
                    InvoiceId = i.Id,
                    InvoiceNumber = i.InvoiceNumber,
                    InvoiceDate = i.InvoiceDate,
                    PartyName = i.CustomerId != null ? i.Customer!.FullName : (i.PartyName ?? "غير معروف"),
                    TotalAmount = i.TotalAmount,
                    DaysOverdue = today.DayNumber - i.InvoiceDate.DayNumber
                }).ToList()
            });
        }

        dto.TotalOverdue = dto.Buckets.Sum(b => b.Total);
        return dto;
    }

    // ---------- تصدير CSV ----------

    public async Task<byte[]> ExportSalesReportCsvAsync(long userId, DateOnly? from, DateOnly? to)
    {
        var report = await GetSalesReportAsync(userId, from, to);
        return CsvExport.ToBytes(
            new[] { "التاريخ", "عدد الطلبات", "الإيراد" },
            report.DailyRows.Select(r => new[]
            {
                r.Date.ToString("yyyy-MM-dd"),
                r.OrdersCount.ToString(),
                r.Revenue.ToString("0.00")
            }));
    }

    public async Task<byte[]> ExportDiscountsReportCsvAsync(long userId, DateOnly? from, DateOnly? to)
    {
        var report = await GetDiscountsReportAsync(userId, from, to);
        return CsvExport.ToBytes(
            new[] { "كود الكوبون", "عدد مرات الاستخدام", "إجمالي الخصم" },
            report.Rows.Select(r => new[]
            {
                r.CouponCode, r.TimesUsed.ToString(), r.TotalDiscount.ToString("0.00")
            }));
    }

    public async Task<byte[]> ExportTaxReportCsvAsync(long userId, DateOnly? from, DateOnly? to)
    {
        var report = await GetTaxReportAsync(userId, from, to);
        return CsvExport.ToBytes(
            new[] { "رقم الفاتورة", "التاريخ", "الضريبة" },
            report.Rows.Select(r => new[]
            {
                r.InvoiceNumber, r.InvoiceDate.ToString("yyyy-MM-dd"), r.TaxAmount.ToString("0.00")
            }));
    }

    public async Task<byte[]> ExportLowStockCsvAsync(long userId, int? threshold)
    {
        var rows = await GetLowStockAsync(userId, threshold);
        return CsvExport.ToBytes(
            new[] { "المنتج", "SKU", "المتوفر", "الحد الأدنى" },
            rows.Select(r => new[]
            {
                r.ProductName, r.Sku, r.Available.ToString(), r.Threshold.ToString()
            }));
    }

    public async Task<byte[]> ExportInventoryMovementsCsvAsync(long userId, DateOnly? from, DateOnly? to, long? productId)
    {
        var rows = await GetInventoryMovementsAsync(userId, from, to, productId);
        return CsvExport.ToBytes(
            new[] { "التاريخ", "المنتج", "المستودع", "النوع", "الكمية" },
            rows.Select(r => new[]
            {
                r.Date.ToString("yyyy-MM-dd HH:mm"), r.ProductName, r.WarehouseName, r.Type, r.Quantity.ToString()
            }));
    }

    public async Task<byte[]> ExportInventoryValuationCsvAsync(long userId)
    {
        var report = await GetInventoryValuationAsync(userId);
        return CsvExport.ToBytes(
            new[] { "المنتج", "SKU", "المتوفر", "قيمة التكلفة", "قيمة البيع" },
            report.Rows.Select(r => new[]
            {
                r.ProductName, r.Sku, r.Available.ToString(), r.CostValue.ToString("0.00"), r.RetailValue.ToString("0.00")
            }));
    }

    public async Task<byte[]> ExportCustomerStatementCsvAsync(long userId, long? customerId, string? phone, DateOnly? from, DateOnly? to)
    {
        var report = await GetCustomerStatementAsync(userId, customerId, phone, from, to);
        return CsvExport.ToBytes(
            new[] { "التاريخ", "المرجع", "النوع", "مدين", "دائن" },
            report.Lines.Select(r => new[]
            {
                r.Date.ToString("yyyy-MM-dd HH:mm"), r.Reference, r.Type, r.Debit.ToString("0.00"), r.Credit.ToString("0.00")
            }));
    }

    public async Task<byte[]> ExportARAgingCsvAsync(long userId)
    {
        var aging = await GetARAgingAsync(userId);
        var rows = aging.Buckets
            .SelectMany(b => b.Invoices.Select(i => new[]
            {
                b.Name, i.InvoiceNumber, i.InvoiceDate.ToString("yyyy-MM-dd"), i.PartyName,
                i.TotalAmount.ToString("0.00"), i.DaysOverdue.ToString()
            }));
        return CsvExport.ToBytes(
            new[] { "الشريحة", "رقم الفاتورة", "التاريخ", "العميل", "المبلغ", "أيام التأخير" }, rows);
    }
}

public static class CsvExport
{
    public static byte[] ToBytes(string[] headers, IEnumerable<string[]> rows)
    {
        var sb = new StringBuilder();
        sb.AppendLine(string.Join(",", headers.Select(Escape)));
        foreach (var row in rows)
            sb.AppendLine(string.Join(",", row.Select(Escape)));

        var preamble = Encoding.UTF8.GetPreamble();
        var body = Encoding.UTF8.GetBytes(sb.ToString());
        var result = new byte[preamble.Length + body.Length];
        Buffer.BlockCopy(preamble, 0, result, 0, preamble.Length);
        Buffer.BlockCopy(body, 0, result, preamble.Length, body.Length);
        return result;
    }

    private static string Escape(string? value)
    {
        if (value == null)
            return "";
        return "\"" + value.Replace("\"", "\"\"") + "\"";
    }
}
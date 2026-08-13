using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Settlement;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Entities.Settlement;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class SettlementService : ISettlementService
{
    private readonly AppDbContext _context;
    private readonly IAccountingService _accountingService;

    public SettlementService(AppDbContext context, IAccountingService accountingService)
    {
        _context = context;
        _accountingService = accountingService;
    }

    public async Task<MerchantBankDetailsDto> SaveMerchantBankDetailsAsync(long storeId, SaveMerchantBankDetailsDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Iban))
            throw new InvalidOperationException("رقم الآيبان (IBAN) مطلوب");
        if (string.IsNullOrWhiteSpace(dto.AccountHolderName))
            throw new InvalidOperationException("اسم صاحب الحساب مطلوب");
        if (string.IsNullOrWhiteSpace(dto.BankName))
            throw new InvalidOperationException("اسم البنك مطلوب");

        var storeExists = await _context.Stores.AnyAsync(s => s.Id == storeId);
        if (!storeExists)
            throw new InvalidOperationException("المتجر غير موجود");

        var existing = await _context.MerchantBankDetails.FirstOrDefaultAsync(m => m.StoreId == storeId);
        if (existing == null)
        {
            existing = new MerchantBankDetails { StoreId = storeId };
            _context.MerchantBankDetails.Add(existing);
        }

        existing.BankName = dto.BankName.Trim();
        existing.AccountHolderName = dto.AccountHolderName.Trim();
        existing.Iban = dto.Iban.Trim().ToUpperInvariant();
        existing.IsActive = true;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new MerchantBankDetailsDto
        {
            Id = existing.Id,
            StoreId = existing.StoreId,
            BankName = existing.BankName,
            AccountHolderName = existing.AccountHolderName,
            Iban = existing.Iban,
            IsActive = existing.IsActive
        };
    }

    public async Task<MerchantBankDetailsDto?> GetMerchantBankDetailsAsync(long storeId)
    {
        var bank = await _context.MerchantBankDetails.FirstOrDefaultAsync(m => m.StoreId == storeId && m.IsActive);
        if (bank == null) return null;

        return new MerchantBankDetailsDto
        {
            Id = bank.Id,
            StoreId = bank.StoreId,
            BankName = bank.BankName,
            AccountHolderName = bank.AccountHolderName,
            Iban = bank.Iban,
            IsActive = bank.IsActive
        };
    }

    // ⚠️ تجميع الطلبات المؤهلة للتسوية: مكتملة (Delivered) وغير مسترجعة خلال فترة السماح
    // وغير مُسوَّاة من قبل (SettledAt == null وليس لها دفعة معلقة SettlementBatchId == null).
    private async Task<List<(Order Order, long StoreId, decimal Gross, decimal Commission, decimal ShippingDeducted, decimal Net)>> GetEligibleOrdersAsync(DateTime periodEnd)
    {
        var eligible = new List<(Order, long, decimal, decimal, decimal, decimal)>();

        var deliveredHistories = await _context.OrderStatusHistories
            .Where(h => h.Status == OrderStatus.Delivered)
            .GroupBy(h => h.OrderId)
            .Select(g => new { OrderId = g.Key, DeliveredAt = g.Max(h => h.ChangedAt) })
            .ToDictionaryAsync(x => x.OrderId, x => x.DeliveredAt);

        if (deliveredHistories.Count == 0)
            return eligible;

        var orderIds = deliveredHistories.Keys.ToList();

        var approvedReturns = await _context.ReturnRequests
            .Where(r => r.Status == ReturnRequestStatus.Approved)
            .Select(r => r.OrderId)
            .ToListAsync();

        var approvedReturnSet = approvedReturns.ToHashSet();

        var orders = await _context.Orders
            .Where(o => o.Status == OrderStatus.Delivered
                && o.SettledAt == null
                && o.SettlementBatchId == null
                && orderIds.Contains(o.Id))
            .Include(o => o.Items)
            .ToListAsync();

        var storeIds = orders.Select(o => o.StoreId).Distinct().ToList();
        var stores = await _context.Stores
            .Include(s => s.Package)
            .Where(s => storeIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id);

        foreach (var order in orders)
        {
            if (approvedReturnSet.Contains(order.Id))
                continue;

            if (!deliveredHistories.TryGetValue(order.Id, out var deliveredAt))
                continue;

            var store = stores.TryGetValue(order.StoreId, out var s) ? s : null;
            var returnPolicyDays = store?.ReturnPolicyDays ?? 0;
            if (deliveredAt.AddDays(returnPolicyDays) > periodEnd)
                continue;

            if (order.PaymentStatus != PaymentStatus.Paid && order.PaymentMethodType != PaymentMethodType.CashOnDelivery)
                continue;

            var netGoods = order.SubTotal - order.DiscountAmount;
            var commission = 0m;
            if (store?.Package?.CommissionPercentage is > 0)
                commission = Math.Round(netGoods * store.Package.CommissionPercentage / 100m, 2);
            var shippingDeducted = store?.ShippingOnPlatformAccount == true ? order.ShippingCost : 0m;
            var net = Math.Max(0m, order.TotalAmount - commission - shippingDeducted);

            eligible.Add((order, order.StoreId, order.TotalAmount, commission, shippingDeducted, net));
        }

        return eligible;
    }

    public async Task<SettlementBatchDto> GenerateSettlementBatchAsync(DateTime? periodEnd = null)
    {
        var end = periodEnd ?? DateTime.UtcNow;
        var eligible = await GetEligibleOrdersAsync(end);

        if (eligible.Count == 0)
            throw new InvalidOperationException("لا توجد طلبات مؤهلة للتسوية حاليًا");

        var grouped = eligible
            .GroupBy(e => e.StoreId)
            .Select(g => new
            {
                StoreId = g.Key,
                Gross = g.Sum(x => x.Gross),
                Commission = g.Sum(x => x.Commission),
                ShippingDeducted = g.Sum(x => x.ShippingDeducted),
                Net = g.Sum(x => x.Net),
                OrdersCount = g.Count()
            })
            .ToList();

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var batchNumber = $"STL-{DateTime.UtcNow:yyyyMMddHHmmss}";
            var batch = new SettlementBatch
            {
                BatchNumber = batchNumber,
                PeriodStart = DateTime.UtcNow,
                PeriodEnd = end,
                Status = SettlementBatchStatus.Pending,
                GrossAmount = grouped.Sum(g => g.Gross),
                CommissionAmount = grouped.Sum(g => g.Commission),
                ShippingDeductedAmount = grouped.Sum(g => g.ShippingDeducted),
                NetAmount = grouped.Sum(g => g.Net),
                OrdersCount = grouped.Sum(g => g.OrdersCount)
            };
            _context.SettlementBatches.Add(batch);
            await _context.SaveChangesAsync();

            foreach (var g in grouped)
            {
                _context.SettlementLines.Add(new SettlementLine
                {
                    SettlementBatchId = batch.Id,
                    StoreId = g.StoreId,
                    GrossAmount = g.Gross,
                    CommissionAmount = g.Commission,
                    ShippingDeductedAmount = g.ShippingDeducted,
                    NetAmount = g.Net,
                    OrdersCount = g.OrdersCount,
                    Status = SettlementLineStatus.Pending
                });
            }

            var storeGroupIds = grouped.ToDictionary(g => g.StoreId, g => true);
            foreach (var entry in eligible)
            {
                entry.Order.SettlementBatchId = batch.Id;
                entry.Order.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return new SettlementBatchDto
            {
                Id = batch.Id,
                BatchNumber = batch.BatchNumber,
                PeriodStart = batch.PeriodStart,
                PeriodEnd = batch.PeriodEnd,
                Status = batch.Status.ToString(),
                GrossAmount = batch.GrossAmount,
                CommissionAmount = batch.CommissionAmount,
                ShippingDeductedAmount = batch.ShippingDeductedAmount,
                NetAmount = batch.NetAmount,
                OrdersCount = batch.OrdersCount,
                CompletedAt = batch.CompletedAt,
                LinesCount = grouped.Count
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<SettlementBatchDto>> GetSettlementBatchesAsync(string? status = null)
    {
        var query = _context.SettlementBatches.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<SettlementBatchStatus>(status, true, out var st))
            query = query.Where(b => b.Status == st);

        return await query
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new SettlementBatchDto
            {
                Id = b.Id,
                BatchNumber = b.BatchNumber,
                PeriodStart = b.PeriodStart,
                PeriodEnd = b.PeriodEnd,
                Status = b.Status.ToString(),
                GrossAmount = b.GrossAmount,
                CommissionAmount = b.CommissionAmount,
                ShippingDeductedAmount = b.ShippingDeductedAmount,
                NetAmount = b.NetAmount,
                OrdersCount = b.OrdersCount,
                CompletedAt = b.CompletedAt,
                LinesCount = b.Lines.Count
            })
            .ToListAsync();
    }

    public async Task<SettlementBatchDetailDto?> GetSettlementBatchDetailAsync(long batchId)
    {
        var batch = await _context.SettlementBatches
            .Include(b => b.Lines)
                .ThenInclude(l => l.Store)
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == batchId);
        if (batch == null) return null;

        var storeIds = batch.Lines.Select(l => l.StoreId).Distinct().ToList();
        var bankDetails = await _context.MerchantBankDetails
            .Where(m => storeIds.Contains(m.StoreId) && m.IsActive)
            .ToDictionaryAsync(m => m.StoreId);

        return new SettlementBatchDetailDto
        {
            Id = batch.Id,
            BatchNumber = batch.BatchNumber,
            PeriodStart = batch.PeriodStart,
            PeriodEnd = batch.PeriodEnd,
            Status = batch.Status.ToString(),
            GrossAmount = batch.GrossAmount,
            CommissionAmount = batch.CommissionAmount,
            ShippingDeductedAmount = batch.ShippingDeductedAmount,
            NetAmount = batch.NetAmount,
            OrdersCount = batch.OrdersCount,
            CompletedAt = batch.CompletedAt,
            Lines = batch.Lines
                .OrderBy(l => l.Store.StoreName)
                .Select(l => new SettlementLineDto
                {
                    Id = l.Id,
                    BatchId = l.SettlementBatchId,
                    StoreId = l.StoreId,
                    StoreName = l.Store.StoreName,
                    GrossAmount = l.GrossAmount,
                    CommissionAmount = l.CommissionAmount,
                    ShippingDeductedAmount = l.ShippingDeductedAmount,
                    NetAmount = l.NetAmount,
                    OrdersCount = l.OrdersCount,
                    Status = l.Status.ToString(),
                    PaymentReference = l.PaymentReference,
                    PaidAt = l.PaidAt,
                    Iban = bankDetails.TryGetValue(l.StoreId, out var b) ? b.Iban : null,
                    BankName = bankDetails.TryGetValue(l.StoreId, out var b2) ? b2.BankName : null,
                    AccountHolderName = bankDetails.TryGetValue(l.StoreId, out var b3) ? b3.AccountHolderName : null
                })
                .ToList()
        };
    }

    public async Task<MerchantSettlementSummaryDto> GetMerchantSettlementSummaryAsync(long storeId)
    {
        var bank = await GetMerchantBankDetailsAsync(storeId);

        var eligible = await GetEligibleOrdersAsync(DateTime.UtcNow);
        var pendingNet = eligible.Where(e => e.StoreId == storeId).Sum(e => e.Net);

        var pendingLines = await _context.SettlementLines
            .Include(l => l.SettlementBatch)
            .Where(l => l.StoreId == storeId && l.Status == SettlementLineStatus.Pending)
            .ToListAsync();
        var pendingInBatches = pendingLines.Sum(l => l.NetAmount);

        var batches = await _context.SettlementBatches
            .Where(b => b.Lines.Any(l => l.StoreId == storeId))
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new SettlementBatchDto
            {
                Id = b.Id,
                BatchNumber = b.BatchNumber,
                PeriodStart = b.PeriodStart,
                PeriodEnd = b.PeriodEnd,
                Status = b.Status.ToString(),
                GrossAmount = b.GrossAmount,
                CommissionAmount = b.CommissionAmount,
                ShippingDeductedAmount = b.ShippingDeductedAmount,
                NetAmount = b.NetAmount,
                OrdersCount = b.OrdersCount,
                CompletedAt = b.CompletedAt,
                LinesCount = b.Lines.Count
            })
            .ToListAsync();

        var settledNet = batches.Where(b => b.Status == "Completed").Sum(b => b.NetAmount);

        return new MerchantSettlementSummaryDto
        {
            PendingNetAmount = pendingNet + pendingInBatches,
            SettledNetAmount = settledNet,
            HasBankDetails = bank != null,
            BankDetails = bank,
            Batches = batches
        };
    }

    public async Task<SettlementBatchDetailDto?> ConfirmSettlementAsync(long batchId, long adminUserId, string? paymentReference)
    {
        var batch = await _context.SettlementBatches
            .Include(b => b.Lines)
                .ThenInclude(l => l.Store)
            .FirstOrDefaultAsync(b => b.Id == batchId);
        if (batch == null) return null;

        if (batch.Status == SettlementBatchStatus.Completed)
            throw new InvalidOperationException("تمت تسوية هذه الدفعة بالفعل");

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            foreach (var line in batch.Lines)
            {
                if (line.Status == SettlementLineStatus.Paid)
                    continue;

                await _accountingService.CreateSettlementPaymentEntryAsync(
                    line.StoreId, batch.BatchNumber, line.NetAmount, adminUserId);

                line.Status = SettlementLineStatus.Paid;
                line.PaymentReference = paymentReference;
                line.PaidAt = DateTime.UtcNow;
                line.UpdatedAt = DateTime.UtcNow;
            }

            var orderIds = await _context.Orders
                .Where(o => o.SettlementBatchId == batch.Id)
                .Select(o => o.Id)
                .ToListAsync();
            foreach (var id in orderIds)
            {
                var order = await _context.Orders.FindAsync(id);
                if (order != null)
                {
                    order.SettledAt = DateTime.UtcNow;
                    order.UpdatedAt = DateTime.UtcNow;
                }
            }

            batch.Status = SettlementBatchStatus.Completed;
            batch.CompletedByUserId = adminUserId;
            batch.CompletedAt = DateTime.UtcNow;
            batch.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        return await GetSettlementBatchDetailAsync(batchId);
    }
}

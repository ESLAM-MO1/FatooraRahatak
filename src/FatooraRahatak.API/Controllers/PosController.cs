using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Accounting;
using FatooraRahatak.Application.DTOs.Payment;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/pos")]
[Authorize]
[RequirePackageFeature("HasPos")]
public class PosController : ControllerBase
{
    private readonly IAccountingService _accountingService;
    private readonly IPermissionCheckService _permCheck;
    private readonly IPaymentService _paymentService;
    private readonly AppDbContext _context;

    public PosController(IAccountingService accountingService, IPermissionCheckService permCheck, IPaymentService paymentService, AppDbContext context)
    {
        _accountingService = accountingService;
        _permCheck = permCheck;
        _paymentService = paymentService;
        _context = context;
    }

    private long GetUserId() => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("POS.View")]
    [HttpGet("shifts/current")]
    public async Task<IActionResult> GetCurrentShift()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return Ok(new { success = true, data = (object?)null });
        var shift = await _context.Set<PosShift>()
            .Include(s => s.OpenedBy)
            .Where(s => s.StoreId == storeId && s.ClosedAt == null)
            .OrderByDescending(s => s.OpenedAt)
            .FirstOrDefaultAsync();
        if (shift == null) return Ok(new { success = true, data = (object?)null });
        return Ok(new { success = true, data = new PosShiftDto
        {
            Id = shift.Id, StoreId = shift.StoreId, OpenedByName = shift.OpenedBy.FullName,
            OpenedAt = shift.OpenedAt, ClosedAt = shift.ClosedAt, StartingCash = shift.StartingCash,
            EndingCash = shift.EndingCash, TotalSales = shift.TotalSales, TotalCashSales = shift.TotalCashSales,
            TotalCardSales = shift.TotalCardSales, ExpectedCash = shift.ExpectedCash,
            Variance = shift.Variance, IsOpen = shift.IsOpen
        }});
    }

    [RequirePermission("POS.View")]
    [HttpGet("shifts/history")]
    public async Task<IActionResult> GetShiftHistory()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return Ok(new { success = true, data = new List<PosShiftDto>() });
        var shifts = await _context.Set<PosShift>()
            .Include(s => s.OpenedBy)
            .Where(s => s.StoreId == storeId)
            .OrderByDescending(s => s.OpenedAt).Take(20)
            .Select(s => new PosShiftDto
            {
                Id = s.Id, StoreId = s.StoreId, OpenedByName = s.OpenedBy.FullName,
                OpenedAt = s.OpenedAt, ClosedAt = s.ClosedAt, StartingCash = s.StartingCash,
                EndingCash = s.EndingCash, TotalSales = s.TotalSales, TotalCashSales = s.TotalCashSales,
                TotalCardSales = s.TotalCardSales, ExpectedCash = s.ExpectedCash,
                Variance = s.Variance, IsOpen = s.IsOpen
            }).ToListAsync();
        return Ok(new { success = true, data = shifts });
    }

    [RequirePermission("POS.Add")]
    [HttpPost("shifts/open")]
    public async Task<IActionResult> OpenShift([FromBody] OpenShiftDto dto)
    {
        var userId = GetUserId();
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر" });

        // فرض حد الباقة: عدد الفروع/الكاشيرات المفتوحة (الورديات المفتوحة) لا يتجاوز MaxBranchesPOS
        var packageId = await _context.Stores.Where(s => s.Id == storeId.Value).Select(s => s.PackageId).FirstOrDefaultAsync();
        var package = await _context.Packages.FindAsync(packageId);
        if (package?.MaxBranchesPOS > 0)
        {
            var openCount = await _context.Set<PosShift>().CountAsync(s => s.StoreId == storeId.Value && s.ClosedAt == null);
            if (openCount >= package.MaxBranchesPOS)
                return BadRequest(new { success = false, message = $"باقتك الحالية تسمح بـ {package.MaxBranchesPOS} كاشير/فرع مفتوح فقط. قم بإغلاق أحدها أو ترقية باقتك." });
        }

        var openShift = await _context.Set<PosShift>().AnyAsync(s => s.StoreId == storeId && s.ClosedAt == null);
        if (openShift) return BadRequest(new { success = false, message = "يوجد وردية مفتوحة بالفعل" });

        var shift = new PosShift { StoreId = storeId.Value, OpenedByUserId = userId, StartingCash = dto.StartingCash };
        _context.Set<PosShift>().Add(shift);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = new PosShiftDto { Id = shift.Id, StoreId = shift.StoreId, OpenedByName = (await _context.Users.FindAsync(userId))?.FullName ?? "", OpenedAt = shift.OpenedAt, StartingCash = shift.StartingCash, TotalSales = 0, TotalCashSales = 0, TotalCardSales = 0, ExpectedCash = 0, Variance = 0, IsOpen = true }, message = "تم فتح الوردية" });
    }

    [RequirePermission("POS.Add")]
    [HttpPost("shifts/{id}/close")]
    public async Task<IActionResult> CloseShift(long id, [FromBody] CloseShiftDto dto)
    {
        var userId = GetUserId();
        var shift = await _context.Set<PosShift>().FindAsync(id);
        if (shift == null || shift.ClosedAt != null)
            return BadRequest(new { success = false, message = "الوردية غير موجودة أو مغلقة بالفعل" });

        var storeId = await GetStoreIdAsync();
        if (storeId == null || shift.StoreId != storeId)
            return BadRequest(new { success = false, message = "لا يوجد متجر" });

        if (dto.EndingCash < 0)
            return BadRequest(new { success = false, message = "النقدية الفعلية لا يمكن أن تكون سالبة" });

        // ⚠️ منطق الوردية (مثل أي نظام POS): المتوقع في الدرج = منول البداية + مبيعات الكاش فقط.
        // البطاقات/الكريدت لا تدخل الدرج. الفرق = العد الفعلي - المتوقع، ويُرحَّل كقيد محاسبي.
        var expectedCash = shift.StartingCash + shift.TotalCashSales;
        var variance = dto.EndingCash - expectedCash;

        shift.ClosedAt = DateTime.UtcNow;
        shift.ClosedByUserId = userId;
        shift.EndingCash = dto.EndingCash;
        shift.ExpectedCash = expectedCash;
        shift.Variance = variance;
        await _context.SaveChangesAsync();

        await _accountingService.CreatePosShiftVarianceEntryAsync(storeId.Value, userId, variance);

        var varianceText = Math.Abs(variance) < 0.01m
            ? "مطابقة تامة"
            : variance > 0
                ? $"زيادة {variance:N2} ر.س"
                : $"عجز {Math.Abs(variance):N2} ر.س";
        return Ok(new { success = true, message = $"تم إغلاق الوردية. المبيعات: {shift.TotalSales:N2} ر.س — {varianceText}", data = new PosShiftDto
        {
            Id = shift.Id, StoreId = shift.StoreId, OpenedByName = shift.OpenedBy?.FullName ?? "",
            OpenedAt = shift.OpenedAt, ClosedAt = shift.ClosedAt, StartingCash = shift.StartingCash,
            EndingCash = shift.EndingCash, TotalSales = shift.TotalSales, TotalCashSales = shift.TotalCashSales,
            TotalCardSales = shift.TotalCardSales, ExpectedCash = shift.ExpectedCash,
            Variance = shift.Variance, IsOpen = shift.IsOpen
        } });
    }

    [RequirePermission("POS.Add")]
    [HttpPost("sale")]
    public async Task<IActionResult> CreateSale([FromBody] CreatePosSaleDto dto)
    {
        var userId = GetUserId();
        var storeId = await GetStoreIdAsync();
        if (storeId != null)
        {
            var openShift = await _context.Set<PosShift>().AnyAsync(s => s.StoreId == storeId && s.ClosedAt == null);
            if (!openShift) return BadRequest(new { success = false, message = "يجب فتح وردية كاشير أولاً" });
        }

        try
        {
            // ⚠️ طرق الدفع الإلكترونية في نقطة البيع: لا يتم البيع فورًا.
            // ننشئ رابط دفع (مويصر/تابي/تمارا) ويفتحه الكاشير/العميل للدفع،
            // وبعد اكتمال الدفع يتأكد البيع. هذا يضمن أن البوابة المختارة تُفتح فعلاً.
            var method = string.IsNullOrWhiteSpace(dto.PaymentMethod) ? "Cash" : dto.PaymentMethod.Trim();
            var isElectronic = method is "Mada" or "CreditCard" or "Tabby" or "Tamara";

            if (isElectronic && storeId != null)
            {
                // نحسب الإجمالي قبل إنشاء الرابط (بدون إنشاء فاتورة نهائية)
                var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId.Value);
                var currency = string.IsNullOrWhiteSpace(store?.Currency) ? "SAR" : store.Currency;

                // نجمع مبلغ البنود (لن نطبق الخصومات/الضريبة هنا — تُحسب عند تأكيد الدفع)
                var itemsTotal = dto.Items.Sum(i => (i.UnitPrice - i.DiscountAmount) * i.Quantity);
                if (itemsTotal <= 0)
                    return BadRequest(new { success = false, message = "مبلغ العملية غير صالح" });

                var callbackUrl = "https://fatora.trillion-invest.tech/api/v1/payments/webhook";
                var successUrl = "https://fatora.trillion-invest.tech/dashboard/pos";

                var link = await _paymentService.CreatePaymentLinkAsync(new CreatePaymentDto
                {
                    Amount = itemsTotal,
                    Currency = currency,
                    Description = $"دفع نقطة البيع - {store?.StoreName}",
                    CallbackUrl = callbackUrl,
                    SuccessUrl = successUrl
                });

                if (!link.Success)
                    return BadRequest(new { success = false, message = link.Message ?? "فشل إنشاء رابط الدفع" });

                return Ok(new
                {
                    success = true,
                    data = new { paymentLinkUrl = link.PaymentLinkUrl, paymentMethod = method, pending = true },
                    message = "تم إنشاء رابط الدفع — أكمل الدفع من البوابة ليتم تأكيد العملية"
                });
            }

            var result = await _accountingService.CreatePosSaleAsync(userId, dto);
            if (storeId != null)
            {
                // ⚠️ إصلاح: كانت القراءة/التعديل/الحفظ (read-modify-write) على الوردية عرضة لفقد التحديثات
                // (lost update) لو حصلت أكتر من عملية بيع في نفس اللحظة تقريبًا (كاشيرين على نفس الوردية،
                // أو ضغط سريع/إعادة محاولة من الشبكة) — التحديث بقى بأمر SQL واحد ذري (atomic) بدون تتبّع EF،
                // يضمن إن كل عملية بيع تُضاف فعليًا مهما كان التوقيت.
                var isCash = string.Equals(result.PaymentMethod, "Cash", StringComparison.OrdinalIgnoreCase);
                var amount = result.TotalAmount;
                await _context.Set<PosShift>()
                    .Where(s => s.StoreId == storeId && s.ClosedAt == null)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(s => s.TotalSales, s => s.TotalSales + amount)
                        .SetProperty(s => s.TotalCashSales, s => isCash ? s.TotalCashSales + amount : s.TotalCashSales)
                        .SetProperty(s => s.TotalCardSales, s => !isCash ? s.TotalCardSales + amount : s.TotalCardSales));
            }
            return Ok(new { success = true, data = result, message = "تمت عملية البيع بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
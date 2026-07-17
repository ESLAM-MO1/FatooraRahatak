using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Employees;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.AspNetCore.Http;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/payroll")]
[Authorize]
public class PayrollController : ControllerBase
{
    private readonly IPayrollService _payrollService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public PayrollController(IPayrollService payrollService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _payrollService = payrollService;
        _context = context;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ⚠️ مُعدَّلة: كانت بتحل المتجر لصاحب المتجر (Owner) فقط، فأصبحت تحله لصاحب المتجر
    // أو لأي موظف نشط تابع له (Employee.Status == "Active")، بنفس نمط ResolveStoreAndRoleAsync
    // المستخدم في AccountingService — بدون رجوع الدور نفسه لأنه غير مستخدم حاليًا في هذا الكنترولر.
    private async Task<long?> GetStoreIdAsync()
    {
        var userId = GetUserId();

        var ownedStore = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == userId);
        if (ownedStore != null)
            return ownedStore.Id;

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == userId && e.Status == "Active");
        return employee?.StoreId;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] GeneratePayrollDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _payrollService.GenerateMonthlyPayrollAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء رواتب الشهر بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdatePayrollDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _payrollService.UpdatePayrollAsync(storeId.Value, id, dto);
            return Ok(new { success = true, data = result, message = "تم تحديث الراتب" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id}/approve")]
    public async Task<IActionResult> Approve(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "Payroll.Approve"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _payrollService.ApprovePayrollAsync(storeId.Value, id, userId);
            return Ok(new { success = true, data = result, message = "تم اعتماد الراتب وتوليد القيد المحاسبي" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id}/mark-paid")]
    public async Task<IActionResult> MarkAsPaid(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _payrollService.MarkAsPaidAsync(storeId.Value, id);
            return Ok(new { success = true, message = "تم تسجيل صرف الراتب" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? year, [FromQuery] int? month)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _payrollService.GetPayrollsAsync(storeId.Value, year, month);
        return Ok(new { success = true, data = result });
    }
}
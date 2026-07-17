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
[Route("api/v1/employees")]
[Authorize]
public class EmployeeController : ControllerBase
{
    private readonly IEmployeeService _employeeService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public EmployeeController(IEmployeeService employeeService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _employeeService = employeeService;
        _context = context;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<long?> GetStoreIdAsync()
    {
        var userId = GetUserId();
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == userId);
        return store?.Id;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEmployeeDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try { await _permCheck.EnsurePermissionAsync(GetUserId(), "EmployeeManagement.Add"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _employeeService.CreateAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم إضافة الموظف بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _employeeService.GetAllAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [HttpPut("{id}/deactivate")]
    public async Task<IActionResult> Deactivate(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try { await _permCheck.EnsurePermissionAsync(GetUserId(), "EmployeeManagement.Edit"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            await _employeeService.DeactivateAsync(storeId.Value, id);
            return Ok(new { success = true, message = "تم إنهاء خدمة الموظف" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Employees;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly IAttendanceService _attendanceService;
    private readonly AppDbContext _context;

    public AttendanceController(IAttendanceService attendanceService, AppDbContext context)
    {
        _attendanceService = attendanceService;
        _context = context;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<long?> GetStoreIdAsync()
    {
        var userId = GetUserId();
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == userId);
        return store?.Id;
    }

    [HttpPost("attendance/check-in")]
    public async Task<IActionResult> CheckIn([FromBody] CheckInOutDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _attendanceService.CheckInAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم تسجيل الحضور" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("attendance/check-out")]
    public async Task<IActionResult> CheckOut([FromBody] CheckInOutDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _attendanceService.CheckOutAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم تسجيل الانصراف" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("attendance")]
    public async Task<IActionResult> GetAttendance([FromQuery] long? employeeId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _attendanceService.GetAttendanceAsync(storeId.Value, employeeId, from, to);
        return Ok(new { success = true, data = result });
    }

    [HttpPost("leave-requests")]
    public async Task<IActionResult> CreateLeaveRequest([FromBody] CreateLeaveRequestDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _attendanceService.CreateLeaveRequestAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم تقديم طلب الإجازة" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("leave-requests")]
    public async Task<IActionResult> GetLeaveRequests([FromQuery] long? employeeId)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _attendanceService.GetLeaveRequestsAsync(storeId.Value, employeeId);
        return Ok(new { success = true, data = result });
    }

    [HttpPut("leave-requests/{id}/approve")]
    public async Task<IActionResult> ApproveLeaveRequest(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _attendanceService.ApproveLeaveRequestAsync(storeId.Value, id, GetUserId());
            return Ok(new { success = true, message = "تم اعتماد طلب الإجازة" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("leave-requests/{id}/reject")]
    public async Task<IActionResult> RejectLeaveRequest(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _attendanceService.RejectLeaveRequestAsync(storeId.Value, id, GetUserId());
            return Ok(new { success = true, message = "تم رفض طلب الإجازة" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}


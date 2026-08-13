using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Admin;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/roles")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly IRoleService _roleService;

    public RolesController(IRoleService roleService)
    {
        _roleService = roleService;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [RequirePermission("EmployeeManagement.View")]
    [HttpGet("permissions")]
    public async Task<IActionResult> GetAllPermissions()
    {
        var permissions = await _roleService.GetAllPermissionsAsync();
        return Ok(new { success = true, data = permissions });
    }

    [RequirePermission("EmployeeManagement.View")]
    [HttpGet]
    public async Task<IActionResult> GetStoreRoles()
    {
        var roles = await _roleService.GetStoreRolesAsync(GetUserId());
        return Ok(new { success = true, data = roles });
    }

    [RequirePermission("EmployeeManagement.Edit")]
    [HttpPost]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleDto dto)
    {
        try
        {
            var role = await _roleService.CreateRoleAsync(GetUserId(), dto);
            return Ok(new { success = true, data = role, message = "تم إنشاء المسمى الوظيفي بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("EmployeeManagement.Edit")]
    [HttpPut("{id}/permissions")]
    public async Task<IActionResult> UpdateRolePermissions(long id, [FromBody] UpdateRolePermissionsDto dto)
    {
        try
        {
            await _roleService.UpdateRolePermissionsAsync(GetUserId(), id, dto);
            return Ok(new { success = true, message = "تم تحديث صلاحيات المسمى الوظيفي بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("EmployeeManagement.Delete")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRole(long id)
    {
        try
        {
            await _roleService.DeleteRoleAsync(GetUserId(), id);
            return Ok(new { success = true, message = "تم حذف المسمى الوظيفي بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}

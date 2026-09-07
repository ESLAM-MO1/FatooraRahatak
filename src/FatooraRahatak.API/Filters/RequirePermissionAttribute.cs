using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Filters;

/// <summary>
/// Enforces a permission code (e.g. "Products.View") on a controller action.
/// Returns 403 with a JSON body when the user lacks the permission.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class RequirePermissionAttribute : Attribute, IAsyncActionFilter
{
    private readonly string _permissionCode;

    public RequirePermissionAttribute(string permissionCode)
    {
        _permissionCode = permissionCode;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var userIdClaim = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var permCheck = context.HttpContext.RequestServices.GetService(typeof(IPermissionCheckService)) as IPermissionCheckService;
        if (permCheck == null)
        {
            context.Result = new StatusCodeResult(StatusCodes.Status500InternalServerError);
            return;
        }

        if (!long.TryParse(userIdClaim, out var userId) || !await permCheck.UserHasPermissionAsync(userId, _permissionCode))
        {
            context.Result = new ObjectResult(new { success = false, message = "ليس لديك صلاحية لتنفيذ هذا الإجراء" })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        await next();
    }
}

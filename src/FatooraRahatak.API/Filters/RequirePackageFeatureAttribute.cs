using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.API.Filters;

/// <summary>
/// يفرض توفر ميزة من مزايا الباقة قبل تنفيذ الإجراء (مثل HasPos, HasPayroll...).
/// يُرجع 403 مع رسالة واضحة عندما لا تتوفر الميزة في باقة المتجر الحالية.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class RequirePackageFeatureAttribute : Attribute, IAsyncActionFilter
{
    private readonly string _feature;

    public RequirePackageFeatureAttribute(string feature)
    {
        _feature = feature;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var userIdClaim = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        if (!long.TryParse(userIdClaim, out var userId))
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

        var storeId = await permCheck.GetUserStoreIdAsync(userId);

        if (storeId.HasValue)
        {
            var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var store = await db.Stores
                .Include(s => s.Package)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == storeId.Value);

            if (store?.Package != null && !IsFeatureEnabled(store.Package, _feature))
            {
                context.Result = new ObjectResult(new
                {
                    success = false,
                    message = $"هذه الميزة غير متاحة في باقتك الحالية (\"{store.Package.PackageName}\"). قم بترقية باقتك للاستفادة منها."
                })
                {
                    StatusCode = StatusCodes.Status403Forbidden
                };
                return;
            }
        }

        await next();
    }

    private static bool IsFeatureEnabled(Package package, string feature) => feature switch
    {
        "HasPos" => package.HasPos,
        "HasPayroll" => package.HasPayroll,
        "HasAccountingFull" => package.HasAccountingFull,
        "HasCustomDomain" => package.HasCustomDomain,
        "HasLogo" => package.HasLogo,
        "HasCashOnDelivery" => package.HasCashOnDelivery,
        "HasShippingIntegration" => package.HasShippingIntegration,
        "HasShippingCalculator" => package.HasShippingCalculator,
        "HasShippingTracking" => package.HasShippingTracking,
        "HasShippingLabelPrinting" => package.HasShippingLabelPrinting,
        "HasApiAccess" => package.HasApiAccess,
        "HasZatcaInvoice" => package.HasZatcaInvoice,
        "HasAffiliateMarketing" => package.HasAffiliateMarketing,
        "HasShippingDiscounts" => package.HasShippingDiscounts,
        "HasFreeShipping" => package.HasFreeShipping,
        _ => true
    };
}

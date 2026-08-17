using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Application.DTOs.Referral;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/referrals")]
[Authorize]
[RequirePackageFeature("HasAffiliateMarketing")]
public class ReferralController : ControllerBase
{
    private readonly IReferralService _referralService;

    public ReferralController(IReferralService referralService)
    {
        _referralService = referralService;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("my")]
    public async Task<IActionResult> GetMyOverview()
    {
        var data = await _referralService.GetMyOverviewAsync(GetUserId());
        return Ok(new { success = true, data });
    }

    [HttpGet("withdrawals")]
    public async Task<IActionResult> GetMyWithdrawals()
    {
        var data = await _referralService.GetMyWithdrawalsAsync(GetUserId());
        return Ok(new { success = true, data });
    }

    [HttpPost("withdrawals")]
    public async Task<IActionResult> RequestWithdrawal([FromBody] CreateWithdrawalDto dto)
    {
        try
        {
            var data = await _referralService.RequestWithdrawalAsync(GetUserId(), dto.Amount);
            return Ok(new { success = true, data, message = "تم إرسال طلب سحب العمولات بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}

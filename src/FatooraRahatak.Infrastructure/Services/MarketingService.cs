using FatooraRahatak.Application.DTOs.Marketing;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Services;

public class MarketingService : IMarketingService
{
    private static readonly HashSet<string> ServerSideTrackingChannels = new() { "FacebookPixel", "GoogleAnalytics" };

    private readonly AppDbContext _context;
    private readonly IConversionTrackingService _conversionTrackingService;

    public MarketingService(AppDbContext context, IConversionTrackingService conversionTrackingService)
    {
        _context = context;
        _conversionTrackingService = conversionTrackingService;
    }

    public async Task<List<MarketingIntegrationDto>> GetIntegrationsAsync(long storeId)
    {
        var rows = await _context.MarketingIntegrations
            .Where(i => i.StoreId == storeId)
            .OrderBy(i => i.Channel)
            .ToListAsync();

        return rows.Select(ToDto).ToList();
    }

    public async Task<MarketingIntegrationDto> UpsertIntegrationAsync(long storeId, UpsertMarketingIntegrationDto dto)
    {
        var channel = dto.Channel.Trim();
        if (string.IsNullOrWhiteSpace(channel))
            throw new InvalidOperationException("القناة مطلوبة");

        if (dto.EnableServerSideTracking && !ServerSideTrackingChannels.Contains(channel))
            throw new InvalidOperationException("تتبع التحويلات من السيرفر متاح حاليًا فقط لقناتي فيسبوك بيكسل وجوجل أناليتكس");

        var existing = await _context.MarketingIntegrations
            .FirstOrDefaultAsync(i => i.StoreId == storeId && i.Channel == channel);

        if (existing == null)
        {
            existing = new MarketingIntegration
            {
                StoreId = storeId,
                Channel = channel,
                Code = string.IsNullOrWhiteSpace(dto.Code) ? null : dto.Code.Trim(),
                AdditionalCode = string.IsNullOrWhiteSpace(dto.AdditionalCode) ? null : dto.AdditionalCode.Trim(),
                IsEnabled = dto.IsEnabled,
                AccessToken = string.IsNullOrEmpty(dto.AccessToken) ? null : dto.AccessToken.Trim(),
                EnableServerSideTracking = dto.EnableServerSideTracking
            };
            _context.MarketingIntegrations.Add(existing);
        }
        else
        {
            existing.Code = string.IsNullOrWhiteSpace(dto.Code) ? null : dto.Code.Trim();
            existing.AdditionalCode = string.IsNullOrWhiteSpace(dto.AdditionalCode) ? null : dto.AdditionalCode.Trim();
            existing.IsEnabled = dto.IsEnabled;
            // dto.AccessToken == null يعني "سيبه زي ما هو" (الفرونت مابيرجعش التوكن المقنّع)،
            // و "" (سترينج فاضية) صراحةً يعني "امسح القيمة المحفوظة"
            if (dto.AccessToken != null)
                existing.AccessToken = dto.AccessToken.Trim().Length == 0 ? null : dto.AccessToken.Trim();
            existing.EnableServerSideTracking = dto.EnableServerSideTracking;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        if (existing.EnableServerSideTracking && (string.IsNullOrWhiteSpace(existing.Code) || string.IsNullOrWhiteSpace(existing.AccessToken)))
            throw new InvalidOperationException("لتفعيل تتبع التحويلات من السيرفر لازم تدخل المعرف (Pixel ID / Measurement ID) والـ Access Token/API Secret");

        await _context.SaveChangesAsync();

        return ToDto(existing);
    }

    public async Task<ConversionTestResultDto> TestConversionEventAsync(long storeId, long integrationId)
    {
        var integration = await _context.MarketingIntegrations
            .FirstOrDefaultAsync(i => i.Id == integrationId && i.StoreId == storeId);
        if (integration == null)
            throw new InvalidOperationException("التكامل غير موجود");

        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        if (string.IsNullOrWhiteSpace(integration.Code) || string.IsNullOrWhiteSpace(integration.AccessToken))
            throw new InvalidOperationException("أدخل المعرف والـ Access Token/API Secret واحفظهم أولًا قبل الاختبار");

        var (success, message) = await _conversionTrackingService.SendTestEventAsync(
            store, integration.Channel, integration.Code, integration.AccessToken);

        return new ConversionTestResultDto { Success = success, Message = message };
    }

    private static MarketingIntegrationDto ToDto(MarketingIntegration i) => new()
    {
        Id = i.Id,
        Channel = i.Channel,
        Code = i.Code,
        AdditionalCode = i.AdditionalCode,
        IsEnabled = i.IsEnabled,
        HasAccessToken = !string.IsNullOrWhiteSpace(i.AccessToken),
        AccessTokenMasked = MaskToken(i.AccessToken),
        EnableServerSideTracking = i.EnableServerSideTracking,
        SupportsServerSideTracking = ServerSideTrackingChannels.Contains(i.Channel)
    };

    private static string? MaskToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        var visible = token.Length > 4 ? token[^4..] : token;
        return new string('•', 10) + visible;
    }

    public async Task ToggleIntegrationAsync(long storeId, long id)
    {
        var integration = await _context.MarketingIntegrations
            .FirstOrDefaultAsync(i => i.Id == id && i.StoreId == storeId);
        if (integration == null)
            throw new InvalidOperationException("التكامل غير موجود");

        integration.IsEnabled = !integration.IsEnabled;
        integration.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteIntegrationAsync(long storeId, long id)
    {
        var integration = await _context.MarketingIntegrations
            .FirstOrDefaultAsync(i => i.Id == id && i.StoreId == storeId);
        if (integration == null)
            throw new InvalidOperationException("التكامل غير موجود");

        _context.MarketingIntegrations.Remove(integration);
        await _context.SaveChangesAsync();
    }

    public async Task<List<MarketingCampaignDto>> GetCampaignsAsync(long storeId)
    {
        return await _context.MarketingCampaigns
            .Where(c => c.StoreId == storeId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new MarketingCampaignDto
            {
                Id = c.Id,
                Name = c.Name,
                Channel = c.Channel,
                CouponCode = c.CouponCode,
                StartDate = c.StartDate,
                EndDate = c.EndDate,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<MarketingCampaignDto> CreateCampaignAsync(long storeId, CreateMarketingCampaignDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new InvalidOperationException("اسم الحملة مطلوب");

        var campaign = new MarketingCampaign
        {
            StoreId = storeId,
            Name = dto.Name.Trim(),
            Channel = (dto.Channel ?? string.Empty).Trim(),
            CouponCode = string.IsNullOrWhiteSpace(dto.CouponCode) ? null : dto.CouponCode.Trim(),
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            IsActive = dto.IsActive
        };
        _context.MarketingCampaigns.Add(campaign);
        await _context.SaveChangesAsync();
        return ToCampaignDto(campaign);
    }

    public async Task<MarketingCampaignDto> UpdateCampaignAsync(long storeId, long id, CreateMarketingCampaignDto dto)
    {
        var campaign = await _context.MarketingCampaigns
            .FirstOrDefaultAsync(c => c.Id == id && c.StoreId == storeId);
        if (campaign == null)
            throw new InvalidOperationException("الحملة غير موجودة");

        campaign.Name = dto.Name.Trim();
        campaign.Channel = (dto.Channel ?? string.Empty).Trim();
        campaign.CouponCode = string.IsNullOrWhiteSpace(dto.CouponCode) ? null : dto.CouponCode.Trim();
        campaign.StartDate = dto.StartDate;
        campaign.EndDate = dto.EndDate;
        campaign.IsActive = dto.IsActive;
        campaign.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return ToCampaignDto(campaign);
    }

    public async Task DeleteCampaignAsync(long storeId, long id)
    {
        var campaign = await _context.MarketingCampaigns
            .FirstOrDefaultAsync(c => c.Id == id && c.StoreId == storeId);
        if (campaign == null)
            throw new InvalidOperationException("الحملة غير موجودة");
        _context.MarketingCampaigns.Remove(campaign);
        await _context.SaveChangesAsync();
    }

    public async Task<MarketingPerformanceDto> GetPerformanceAsync(long storeId, DateTime? from, DateTime? to)
    {
        var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
        var toDate = to ?? DateTime.UtcNow;

        var orders = await _context.Orders
            .Where(o => o.StoreId == storeId
                        && o.CreatedAt >= fromDate
                        && o.CreatedAt <= toDate
                        && o.MarketingSource != null && o.MarketingSource != "")
            .Select(o => new { o.MarketingSource, o.TotalAmount, o.CustomerId })
            .ToListAsync();

        var totalRevenue = orders.Sum(o => o.TotalAmount);

        var channels = orders
            .GroupBy(o => o.MarketingSource!)
            .Select(g => new MarketingChannelPerformanceDto
            {
                Channel = g.Key,
                OrdersCount = g.Count(),
                Revenue = g.Sum(o => o.TotalAmount),
                CustomersCount = g.Count(o => o.CustomerId.HasValue),
                SharePct = totalRevenue > 0 ? Math.Round(g.Sum(o => o.TotalAmount) / totalRevenue * 100m, 1) : 0m
            })
            .OrderByDescending(c => c.Revenue)
            .ToList();

        var campaigns = await GetCampaignsAsync(storeId);

        return new MarketingPerformanceDto
        {
            TotalTrackedOrders = orders.Count,
            TotalTrackedRevenue = totalRevenue,
            Channels = channels,
            Campaigns = campaigns
        };
    }

    public async Task<StorePublicScriptsDto> GetPublicScriptsBySlugAsync(string slug)
    {
        var integrationDtos = await (from i in _context.MarketingIntegrations
                                     join s in _context.Stores on i.StoreId equals s.Id
                                     where s.StoreSlug == slug && s.Status == StoreStatus.Active
                                           && i.IsEnabled && !string.IsNullOrWhiteSpace(i.Code)
                                     orderby i.Channel
                                     select new MarketingIntegrationDto
                                     {
                                         Id = i.Id,
                                         Channel = i.Channel,
                                         Code = i.Code,
                                         AdditionalCode = i.AdditionalCode,
                                         IsEnabled = i.IsEnabled
                                     }).ToListAsync();

        return new StorePublicScriptsDto { Integrations = integrationDtos };
    }

    private static MarketingCampaignDto ToCampaignDto(MarketingCampaign c)
    {
        return new MarketingCampaignDto
        {
            Id = c.Id,
            Name = c.Name,
            Channel = c.Channel,
            CouponCode = c.CouponCode,
            StartDate = c.StartDate,
            EndDate = c.EndDate,
            IsActive = c.IsActive,
            CreatedAt = c.CreatedAt
        };
    }
}
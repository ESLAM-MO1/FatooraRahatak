using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Platform;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;
public class PlatformIntegrationService : IPlatformIntegrationService
{
    private static readonly string[] SupportedPlatforms =
    [
        "Salla", "Zid", "Shopify", "WooCommerce",
        "Noon", "Amazon", "Jahez", "HungerStation",
        "Alibaba", "AliExpress", "Temu"
    ];

    private readonly AppDbContext _context;

    public PlatformIntegrationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<PlatformIntegrationDto>> GetIntegrationsAsync(long storeId)
    {
        return await _context.Set<PlatformIntegration>()
            .Where(p => p.StoreId == storeId)
            .OrderBy(p => p.PlatformCode)
            .Select(p => new PlatformIntegrationDto
            {
                Id = p.Id,
                StoreId = p.StoreId,
                PlatformCode = p.PlatformCode,
                ApiKeyMasked = MaskSecret(p.ApiKey),
                ApiSecretMasked = MaskSecret(p.ApiSecret),
                StoreUrl = p.StoreUrl,
                IsConnected = p.IsConnected,
                IsEnabled = p.IsEnabled,
                SyncProducts = p.SyncProducts,
                SyncOrders = p.SyncOrders,
                SyncInventory = p.SyncInventory,
                LastSyncedAt = p.LastSyncedAt,
                LastSyncMessage = p.LastSyncMessage
            })
            .ToListAsync();
    }

    public async Task<PlatformIntegrationDto> ConnectAsync(long storeId, ConnectPlatformIntegrationDto dto)
    {
        if (!SupportedPlatforms.Contains(dto.PlatformCode))
            throw new InvalidOperationException("منصة غير مدعومة");

        var existing = await _context.Set<PlatformIntegration>()
            .FirstOrDefaultAsync(p => p.StoreId == storeId && p.PlatformCode == dto.PlatformCode);

        if (existing != null)
        {
            existing.ApiKey = string.IsNullOrWhiteSpace(dto.ApiKey) ? existing.ApiKey : dto.ApiKey;
            existing.ApiSecret = string.IsNullOrWhiteSpace(dto.ApiSecret) ? existing.ApiSecret : dto.ApiSecret;
            existing.StoreUrl = dto.StoreUrl;
            existing.IsConnected = true;
            existing.SyncProducts = dto.SyncProducts;
            existing.SyncOrders = dto.SyncOrders;
            existing.SyncInventory = dto.SyncInventory;
            existing.LastSyncMessage = "تم الربط بنجاح";
            await _context.SaveChangesAsync();
            return await ToDtoAsync(existing);
        }

        var integration = new PlatformIntegration
        {
            StoreId = storeId,
            PlatformCode = dto.PlatformCode,
            ApiKey = dto.ApiKey,
            ApiSecret = dto.ApiSecret,
            StoreUrl = dto.StoreUrl,
            IsConnected = true,
            IsEnabled = true,
            SyncProducts = dto.SyncProducts,
            SyncOrders = dto.SyncOrders,
            SyncInventory = dto.SyncInventory,
            LastSyncMessage = "تم الربط بنجاح"
        };

        _context.Set<PlatformIntegration>().Add(integration);
        await _context.SaveChangesAsync();

        return await ToDtoAsync(integration);
    }

    public async Task<PlatformIntegrationDto?> UpdateAsync(long storeId, long id, UpdatePlatformIntegrationDto dto)
    {
        var integration = await _context.Set<PlatformIntegration>()
            .FirstOrDefaultAsync(p => p.Id == id && p.StoreId == storeId);

        if (integration == null) return null;

        if (!string.IsNullOrWhiteSpace(dto.ApiKey))
            integration.ApiKey = dto.ApiKey;
        if (!string.IsNullOrWhiteSpace(dto.ApiSecret))
            integration.ApiSecret = dto.ApiSecret;
        if (dto.StoreUrl != null)
            integration.StoreUrl = dto.StoreUrl;
        if (dto.IsEnabled.HasValue)
            integration.IsEnabled = dto.IsEnabled.Value;
        if (dto.SyncProducts.HasValue)
            integration.SyncProducts = dto.SyncProducts.Value;
        if (dto.SyncOrders.HasValue)
            integration.SyncOrders = dto.SyncOrders.Value;
        if (dto.SyncInventory.HasValue)
            integration.SyncInventory = dto.SyncInventory.Value;

        await _context.SaveChangesAsync();
        return await ToDtoAsync(integration);
    }

    public async Task<bool> DeleteAsync(long storeId, long id)
    {
        var integration = await _context.Set<PlatformIntegration>()
            .FirstOrDefaultAsync(p => p.Id == id && p.StoreId == storeId);

        if (integration == null) return false;

        _context.Set<PlatformIntegration>().Remove(integration);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PlatformIntegrationDto?> ToggleEnabledAsync(long storeId, long id, bool isEnabled)
    {
        var integration = await _context.Set<PlatformIntegration>()
            .FirstOrDefaultAsync(p => p.Id == id && p.StoreId == storeId);

        if (integration == null) return null;

        integration.IsEnabled = isEnabled;
        await _context.SaveChangesAsync();
        return await ToDtoAsync(integration);
    }

    private static string? MaskSecret(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (value.Length <= 6) return "••••••";
        return value[..4] + "••••" + value[^2..];
    }

    private async Task<PlatformIntegrationDto> ToDtoAsync(PlatformIntegration p)
    {
        return new PlatformIntegrationDto
        {
            Id = p.Id,
            StoreId = p.StoreId,
            PlatformCode = p.PlatformCode,
            ApiKeyMasked = MaskSecret(p.ApiKey),
            ApiSecretMasked = MaskSecret(p.ApiSecret),
            StoreUrl = p.StoreUrl,
            IsConnected = p.IsConnected,
            IsEnabled = p.IsEnabled,
            SyncProducts = p.SyncProducts,
            SyncOrders = p.SyncOrders,
            SyncInventory = p.SyncInventory,
            LastSyncedAt = p.LastSyncedAt,
            LastSyncMessage = p.LastSyncMessage
        };
    }
}
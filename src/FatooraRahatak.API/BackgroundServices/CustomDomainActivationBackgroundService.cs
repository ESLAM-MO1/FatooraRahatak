using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.BackgroundServices;

public class CustomDomainActivationBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CustomDomainActivationBackgroundService> _logger;
    private readonly Dictionary<string, (int Failures, DateTime NextTry)> _retry = new();
    private const string ServerIp = "50.6.196.176";

    public CustomDomainActivationBackgroundService(IServiceScopeFactory scopeFactory, ILogger<CustomDomainActivationBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCycleAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "فشلت دورة فحص وتفعيل الدومينات المخصصة");
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var pleskService = scope.ServiceProvider.GetRequiredService<IPleskService>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var pendingStores = await db.Stores
            .Where(s => s.CustomDomain != null && s.CustomDomain != "" && s.CustomDomainStatus == CustomDomainStatus.Pending)
            .ToListAsync(ct);

        foreach (var store in pendingStores)
        {
            var domain = store.CustomDomain!.Trim().ToLowerInvariant();

            if (_retry.TryGetValue(domain, out var state) && state.NextTry > DateTime.UtcNow)
                continue;

            bool dnsOk;
            try
            {
                var hostEntry = await System.Net.Dns.GetHostEntryAsync(domain, ct);
                dnsOk = hostEntry.AddressList.Any(ip => ip.ToString() == ServerIp);
            }
            catch
            {
                dnsOk = false;
            }

            if (!dnsOk)
                continue;

            var (ok, output) = await pleskService.ProvisionCustomDomainAsync(domain);
            if (!ok)
            {
                var failures = (_retry.TryGetValue(domain, out var prev) ? prev.Failures : 0) + 1;
                _retry[domain] = (failures, DateTime.UtcNow.AddMinutes(Math.Min(60, 5 * failures)));
                _logger.LogWarning("فشل تفعيل الدومين {Domain} (محاولة {Attempt}): {Output}", domain, failures, output);
                continue;
            }

            _retry.Remove(domain);

            store.CustomDomainStatus = CustomDomainStatus.Active;
            store.UpdatedAt = DateTime.UtcNow;
            CustomDomainCorsCache.AddDomain(domain);

            try
            {
                await notifications.CreateAsync(
                    store.OwnerUserId,
                    "تم تفعيل نطاقك المخصص",
                    $"تم ربط النطاق {domain} بمتجرك بنجاح وأصبح جاهزًا للاستخدام.",
                    NotificationType.DomainRequestSubmitted,
                    "/dashboard/domains");
            }
            catch { }

            _logger.LogInformation("تم تفعيل الدومين المخصص {Domain} تلقائيًا للمتجر {StoreId}", domain, store.Id);
        }

        if (pendingStores.Count > 0)
            await db.SaveChangesAsync(ct);
    }
}

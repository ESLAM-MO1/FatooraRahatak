using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.BackgroundServices;

/// <summary>
/// تفعيل تلقائي بالكامل للدومينات المخصصة (مثل Shopify/Salla):
/// العميل يكتب دومينه فقط، ويضبط DNS عنده (A/CNAME) حسب التعليمات الظاهرة له.
/// هذه الخدمة تفحص كل الدومينات بحالة Pending كل عدة دقائق، وأول ما يتأكد
/// توجيه الـ DNS فعليًا لسيرفرنا، تقوم تلقائيًا بـ:
///   1) ربط alias في Plesk
///   2) إصدار شهادة SSL (Let's Encrypt)
///   3) تفعيل الحالة (Active) في قاعدة البيانات
///   4) تفعيل CORS فورًا عبر CustomDomainCorsCache
/// بدون أي تدخل يدوي من الأدمن أو العميل.
/// </summary>
public class CustomDomainActivationBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CustomDomainActivationBackgroundService> _logger;
    private const string ServerIp = "50.6.196.176";

    public CustomDomainActivationBackgroundService(IServiceScopeFactory scopeFactory, ILogger<CustomDomainActivationBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // تأخير بسيط عند الإقلاع حتى يكتمل تجهيز باقي الخدمات (seed الدومينات الحالية...)
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

            await Task.Delay(TimeSpan.FromMinutes(3), stoppingToken);
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
            var domain = store.CustomDomain!;

            // 1) فحص DNS فعليًا: هل الدومين يوجّه لسيرفرنا؟
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
            {
                // لم يضبط العميل DNS بعد — نتخطاه وننتظر الدورة القادمة، بلا أي إزعاج له.
                continue;
            }

            // 2) ربط alias في Plesk
            var (aliasOk, aliasOutput) = await pleskService.CreateDomainAliasAsync(domain);
            if (!aliasOk)
            {
                _logger.LogWarning("فشل ربط alias للدومين {Domain}: {Output}", domain, aliasOutput);
                continue; // سيُعاد المحاولة في الدورة القادمة تلقائيًا
            }

            // 3) إصدار شهادة SSL (Let's Encrypt) — شرط أساسي لاعتبار الدومين مفعّلاً فعليًا
            var (sslOk, sslOutput) = await pleskService.IssueSslAsync(domain);
            if (!sslOk)
            {
                _logger.LogWarning("فشل إصدار SSL للدومين {Domain}: {Output}", domain, sslOutput);
                // الـ alias نجح لكن الشهادة لأ — لا نفعّل الحالة كـ Active حتى ينجح SSL أيضًا،
                // لتفادي دومين "مفعّل" ظاهريًا بدون HTTPS يعمل فعليًا.
                continue;
            }

            // 4) كل شيء نجح فعليًا: تفعيل الحالة + تفعيل CORS فورًا
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

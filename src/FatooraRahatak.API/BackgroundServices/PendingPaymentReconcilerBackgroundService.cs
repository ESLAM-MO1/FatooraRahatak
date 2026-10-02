using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.BackgroundServices;

public class PendingPaymentReconcilerBackgroundService : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(15);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PendingPaymentReconcilerBackgroundService> _logger;

    public PendingPaymentReconcilerBackgroundService(IServiceScopeFactory scopeFactory, ILogger<PendingPaymentReconcilerBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ReconcileOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "فشلت دورة مطابقة المدفوعات المعلّقة");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    private async Task ReconcileOnceAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var paymentService = scope.ServiceProvider.GetRequiredService<IPaymentService>();

        var cutoffDate = DateTime.UtcNow.AddHours(-24);
        var pendingPayments = await db.Payments
            .Where(p => p.Status == PaymentStatus.Pending
                     && (p.ProviderType == PaymentProviderType.Moyasar
                         || p.ProviderType == PaymentProviderType.Tabby
                         || p.ProviderType == PaymentProviderType.Tamara)
                     && !string.IsNullOrWhiteSpace(p.ProviderPaymentId)
                     && p.CreatedAt >= cutoffDate)
            .OrderBy(p => p.CreatedAt)
            .Take(25)
            .ToListAsync(ct);

        foreach (var payment in pendingPayments)
        {
            using var perPaymentCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            perPaymentCts.CancelAfter(TimeSpan.FromSeconds(15));

            try
            {
                await paymentService.CheckPaymentStatusAsync(payment.PaymentReference)
                    .WaitAsync(perPaymentCts.Token);
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                _logger.LogWarning(
                    "فحص حالة الدفعة {Reference} استغرق أكثر من 15 ثانية — تم تخطّيها لهذه الدورة",
                    payment.PaymentReference);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "فشل فحص حالة الدفعة {Reference}", payment.PaymentReference);
            }
        }
    }
}

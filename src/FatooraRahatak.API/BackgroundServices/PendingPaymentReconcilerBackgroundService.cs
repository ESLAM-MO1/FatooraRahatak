using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.BackgroundServices;

/// <summary>
/// إصلاح جذري لـ"الدفع ينجح لكن الباقة لا تُطبَّق":
/// الدفع كان يعتمد على استقبال webhook من موياسر (callback_url) أو على عودة
/// المستخدم للصفحة لفحص الحالة — وكلا المسارين هشّ: الـ callback_url إذا ضلّ
/// الرابط لا يصل، والمستخدم قد لا يعود للصفحة.
/// هذه الخدمة تستعلم حالة كل دفعة معلّقة لها فاتورة موياسر مباشرةً من API
/// وتفعّل الاشتراك/الطلب/الفاتورة فور اكتشاف أنها مدفوعة — بدون أي اعتماد
/// خارجي، فيتم التفعيل خلال ثوانٍ مهما كانت الظروف.
/// </summary>
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
        // مهلة بدء أولية قصيرة حتى لا تتعارض مع إقلاع باقي النظام
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

        // كل المدفوعات المعلّقة (لم تُفعَّل بعد) التي لها معرّف فاتورة/دفع لدى موياسر
        var pendingPayments = await db.Payments
            .Where(p => p.Status == PaymentStatus.Pending
                     && p.ProviderType == PaymentProviderType.Moyasar
                     && !string.IsNullOrWhiteSpace(p.ProviderPaymentId))
            .OrderBy(p => p.CreatedAt)
            .Take(25)
            .ToListAsync(ct);

        foreach (var payment in pendingPayments)
        {
            // ⚠️ إصلاح: كل دفعة بمهلتها وبمعالجة أخطاء خاصة بها — قبل كده كانت
            // دفعة واحدة عالقة (مثلاً provider id تجريبي/قديم مش بيرد) توقف باقي
            // الدفعات في نفس الدورة، وتُبقي الاتصال بقاعدة البيانات مفتوح لمدة
            // طويلة (لحد Timeout الديفولت 100 ثانية لكل دفعة)، وده كان بيأخر أي
            // Query تانية بتحتاج نفس صف المتجر (كل صفحات الداشبورد تقريبًا).
            using var perPaymentCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            perPaymentCts.CancelAfter(TimeSpan.FromSeconds(15));

            try
            {
                // يستعلم من موياسر مباشرة ويطبّق الأثر (تفعيل الاشتراك/تأكيد الطلب)
                // عند اكتشاف أن الدفعة مدفوعة — بلا webhook وبلا اعتماد على المستخدم.
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
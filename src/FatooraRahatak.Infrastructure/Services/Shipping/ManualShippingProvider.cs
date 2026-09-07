using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Infrastructure.Services.Shipping;

/// <summary>
/// مزود يدوي (بدون تكامل API): تُدار الشحنة وتتبعها يدويًا من لوحة التحكم.
/// </summary>
public class ManualShippingProvider : ShippingProviderBase
{
    public override ShippingCompanyCode Code => ShippingCompanyCode.Manual;
    public override string DisplayName => "شحن يدوي / شركة أخرى";
    public override int EstimatedDeliveryDays => 5;

    protected override Task<CreateShipmentProviderResult> CreateShipmentWithApiAsync(ShippingProviderContext ctx, CancellationToken ct)
        => Task.FromResult(SimulateCreate(ctx));

    protected override Task<TrackingProviderResult> GetTrackingWithApiAsync(ShippingProviderContext ctx, string awb, CancellationToken ct)
    {
        return Task.FromResult(new TrackingProviderResult
        {
            Success = true,
            Status = "Pending",
            Events = new List<TrackingEventItem>
            {
                new() { EventCode = "CREATED", Description = "تم إنشاء الشحنة (يدوي)", EventAt = DateTime.UtcNow }
            },
            Message = "شحنة يدوية — قم بتحديث الحالة والتتبع من لوحة التحكم"
        });
    }
}

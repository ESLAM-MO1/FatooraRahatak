namespace FatooraRahatak.Domain.Entities.Products;

public static class ProductPricing
{
    public static decimal? Active(decimal? discount, System.DateTime? startsAt, System.DateTime? endsAt)
    {
        if (discount == null) return null;
        var now = System.DateTime.UtcNow;
        if (startsAt.HasValue && now < startsAt.Value) return null;
        if (endsAt.HasValue && now > endsAt.Value) return null;
        return discount;
    }

    public static decimal Effective(decimal basePrice, decimal? discount, System.DateTime? startsAt, System.DateTime? endsAt)
    {
        var active = Active(discount, startsAt, endsAt);
        return active is > 0 ? active.Value : basePrice;
    }
}

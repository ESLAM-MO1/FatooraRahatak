using System.Text.Json;

namespace FatooraRahatak.Infrastructure.Services.Shipping;

public class ShippingRateConfig
{
    public decimal BaseRate { get; set; } = 15;
    public decimal PerKg { get; set; } = 2;
    public decimal CodFeePercent { get; set; } = 0;
    public Dictionary<string, decimal> CityRates { get; set; } = new();
    public int EstimatedDeliveryDays { get; set; } = 0;
}

public static class ShippingCostCalculator
{
    public static ShippingRateConfig ParseConfig(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new ShippingRateConfig();

        try
        {
            return JsonSerializer.Deserialize<ShippingRateConfig>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new ShippingRateConfig();
        }
        catch
        {
            return new ShippingRateConfig();
        }
    }

    public static decimal Calculate(string? configJson, string city, decimal weight, decimal? codAmount)
    {
        var cfg = ParseConfig(configJson);

        // سعر المدينة (لو محدد) هو السعر الأساسي الكامل للتوصيل لهذه المدينة،
        // وليس مبلغًا يُضاف فوق السعر الأساسي العام. لو المدينة غير محددة في القائمة،
        // نستخدم السعر الأساسي العام كافتراضي.
        var cost = !string.IsNullOrWhiteSpace(city) && cfg.CityRates.TryGetValue(city.Trim(), out var cityRate)
            ? cityRate
            : cfg.BaseRate;

        cost += cfg.PerKg * Math.Max(0, weight - 1);

        if (cfg.CodFeePercent > 0 && (codAmount ?? 0) > 0)
            cost += (codAmount!.Value * cfg.CodFeePercent) / 100m;

        return Math.Round(cost, 2);
    }

    public static int EstimatedDays(string? configJson, int fallback)
    {
        var cfg = ParseConfig(configJson);
        return cfg.EstimatedDeliveryDays > 0 ? cfg.EstimatedDeliveryDays : fallback;
    }
}
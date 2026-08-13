namespace FatooraRahatak.Domain.Entities.Shipping;

public static class ShipmentHelpers
{
    public static string ParseCity(string address)
    {
        if (string.IsNullOrWhiteSpace(address)) return string.Empty;

        var lastPart = address.Trim().Split(',').LastOrDefault()?.Trim();
        return string.IsNullOrWhiteSpace(lastPart) ? address : lastPart;
    }
}

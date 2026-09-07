using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Infrastructure.Services.Shipping;

public class ShippingProviderFactory
{
    private readonly IReadOnlyDictionary<ShippingCompanyCode, IShippingProvider> _providers;

    public ShippingProviderFactory(IEnumerable<IShippingProvider> providers)
    {
        _providers = providers.ToDictionary(p => p.Code, p => p);
    }

    public IShippingProvider Get(ShippingCompanyCode code)
        => _providers.TryGetValue(code, out var provider) ? provider : _providers[ShippingCompanyCode.Manual];
}

using Microsoft.AspNetCore.Http;

namespace FatooraRahatak.API.Helpers;

public static class UrlHelpers
{
    public static string AbsoluteUrl(HttpRequest request, string path)
    {
        var proto = request.Headers["X-Forwarded-Proto"].FirstOrDefault();
        var scheme = !string.IsNullOrWhiteSpace(proto) ? proto : request.Scheme;
        var host = request.Headers["X-Forwarded-Host"].FirstOrDefault();
        var authority = !string.IsNullOrWhiteSpace(host) ? host : request.Host.Value;
        return $"{scheme}://{authority}{(path.StartsWith("/") ? path : "/" + path)}";
    }
}

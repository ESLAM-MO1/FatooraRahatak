using System.Diagnostics;
using System.Text.RegularExpressions;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.Infrastructure.Services;

public class PleskService : IPleskService
{
    private const string ParentDomain = "rahtk.sa";
    private const string PleskBin = "/usr/sbin/plesk";
    private const string DomAliasBin = "/usr/local/psa/bin/domalias";
    private const string SudoBin = "/usr/bin/sudo";
    private const string HelperBin = "/usr/local/sbin/rahtk-custom-domain";

    private static readonly Regex SafeDomain = new(
        @"^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$",
        RegexOptions.Compiled);

    public async Task<(bool Success, string Output)> ProvisionCustomDomainAsync(string domain)
    {
        var d = (domain ?? string.Empty).Trim().ToLowerInvariant();
        if (!SafeDomain.IsMatch(d))
            return (false, "INVALID_DOMAIN");

        return await RunCommandAsync(SudoBin, $"-n {HelperBin} provision {d}");
    }

    public async Task<(bool Success, string Output)> CreateDomainAliasAsync(string domain)
    {
        var (success, output) = await RunCommandAsync(SudoBin,
            $"{DomAliasBin} --create {domain} -domain {ParentDomain} -web true -mail false -dns true -seo-redirect false");

        if (!success && output.ToLowerInvariant().Contains("already exists"))
            return (true, output);

        return (success, output);
    }

    public async Task<(bool Success, string Output)> RemoveDomainAliasAsync(string domain)
    {
        var d = (domain ?? string.Empty).Trim().ToLowerInvariant();
        var helperOk = false;
        var helperOutput = string.Empty;
        if (SafeDomain.IsMatch(d))
            (helperOk, helperOutput) = await RunCommandAsync(SudoBin, $"-n {HelperBin} remove {d}");

        var (aliasOk, aliasOutput) = await RunCommandAsync(SudoBin, $"{DomAliasBin} --delete {domain}");
        return (helperOk || aliasOk, $"{helperOutput}\n{aliasOutput}".Trim());
    }

    public async Task<(bool Success, string Output)> IssueSslAsync(IEnumerable<string> allDomains)
    {
        var domains = allDomains.Distinct().ToList();
        var aliasList = string.Join(",", domains);
        var (success, output) = await RunCommandAsync(SudoBin,
            $"{PleskBin} ext sslit --certificate -issue -domain {ParentDomain} -aliases {aliasList} -secure-domain -challenge http");

        if (success)
            return (true, output);

        if (output.Contains("invalidAliases"))
        {
            var actuallySecured = await VerifyCertificateCoversAllDomainsAsync(domains);
            if (actuallySecured)
                return (true, output);
        }

        return (success, output);
    }

    private static async Task<bool> VerifyCertificateCoversAllDomainsAsync(List<string> domains)
    {
        try
        {
            var shellCommand = $"echo | openssl s_client -connect {ParentDomain}:443 -servername {ParentDomain} 2>/dev/null | openssl x509 -noout -text | grep -A2 Subject.Alternative.Name";
            var (ok, sanOutput) = await RunCommandAsync("/bin/sh", $"-c '{shellCommand}'");
            if (!ok || string.IsNullOrWhiteSpace(sanOutput))
                return false;
            return domains.All(d => sanOutput.Contains(d, StringComparison.OrdinalIgnoreCase));
        }
        catch
        {
            return false;
        }
    }

    private static async Task<(bool, string)> RunCommandAsync(string fileName, string arguments)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null)
                return (false, "تعذر بدء العملية");

            string stdout = await process.StandardOutput.ReadToEndAsync();
            string stderr = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            var output = string.IsNullOrWhiteSpace(stderr) ? stdout : $"{stdout}\n{stderr}".Trim();
            return (process.ExitCode == 0, output.Trim());
        }
        catch (Exception ex)
        {
            return (false, $"تعذر تنفيذ الأمر: {ex.Message}");
        }
    }
}

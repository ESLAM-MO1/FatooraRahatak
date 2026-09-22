using System.Diagnostics;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.Infrastructure.Services;

public class PleskService : IPleskService
{
    private const string ParentDomain = "rahtk.sa";
    private const string PleskBin = "/usr/sbin/plesk";
    private const string DomAliasBin = "/usr/local/psa/bin/domalias";
    private const string SudoBin = "/usr/bin/sudo";

    public async Task<(bool Success, string Output)> CreateDomainAliasAsync(string domain)
    {
        var (success, output) = await RunCommandAsync(SudoBin,
            $"{DomAliasBin} --create {domain} -domain {ParentDomain} -web true -mail false -dns true -seo-redirect false");

        // Idempotent: the alias may already exist from an earlier attempt whose next
        // step (SSL issuance) failed. Without this, activation would retry alias
        // creation forever every cycle and never reach the SSL step.
        if (!success && output.ToLowerInvariant().Contains("already exists"))
            return (true, output);

        return (success, output);
    }

    public Task<(bool Success, string Output)> RemoveDomainAliasAsync(string domain) =>
        RunCommandAsync(SudoBin, $"{DomAliasBin} --delete {domain}");

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

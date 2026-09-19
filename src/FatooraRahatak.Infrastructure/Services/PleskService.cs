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

    public Task<(bool Success, string Output)> IssueSslAsync(string domain) =>
        // -aliases بدون قيمة معناها "أمّن كل الـ aliases النشطة" بدل استبدال القائمة بدومين واحد بس،
        // لأن تمرير -aliases {domain} بيستبدل كل الدومينات التانية الموجودة في الشهادة (باگ حقيقي حصل فعليًا).
        RunCommandAsync(SudoBin,
            $"{PleskBin} ext sslit --certificate -issue -domain {ParentDomain} -aliases -secure-domain -challenge http");

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

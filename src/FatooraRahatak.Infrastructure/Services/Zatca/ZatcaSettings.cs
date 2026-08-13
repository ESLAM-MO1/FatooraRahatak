namespace FatooraRahatak.Infrastructure.Services.Zatca;

public class ZatcaSettings
{
    public string Environment { get; set; } = "Sandbox";
    public string BaseUrl { get; set; } = string.Empty;
    public string OrganizationName { get; set; } = string.Empty;
    public string OrganizationUnit { get; set; } = string.Empty;
    public string BusinessCategory { get; set; } = string.Empty;
    public string SolutionName { get; set; } = "FatooraRahatak";
}

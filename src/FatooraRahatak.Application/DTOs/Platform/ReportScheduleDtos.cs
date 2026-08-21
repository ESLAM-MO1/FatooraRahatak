namespace FatooraRahatak.Application.DTOs.Platform;

public class ReportScheduleDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Frequency { get; set; } = "Weekly";
    public string ReportScope { get; set; } = "Business";
    public List<string> Kpis { get; set; } = new();
    public List<string> Recipients { get; set; } = new();
    public bool IsActive { get; set; } = true;
    public DateTime? LastRunAt { get; set; }
    public DateTime NextRunAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateReportScheduleDto
{
    public string Name { get; set; } = string.Empty;
    public string Frequency { get; set; } = "Weekly";
    public string ReportScope { get; set; } = "Business";
    public List<string> Kpis { get; set; } = new();
    public List<string> Recipients { get; set; } = new();
    public bool IsActive { get; set; } = true;
}

public class ReportConfigDto
{
    public List<string> SelectedKpis { get; set; } = new();
    public List<string> AvailableKpis { get; set; } = new();
}

public class ReportConfigUpdateDto
{
    public List<string> SelectedKpis { get; set; } = new();
}

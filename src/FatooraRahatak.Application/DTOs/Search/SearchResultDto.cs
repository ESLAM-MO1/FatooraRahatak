namespace FatooraRahatak.Application.DTOs.Search;

public class SearchResultDto
{
    public string Type { get; set; } = string.Empty;
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string Link { get; set; } = string.Empty;
}

public class SearchResponseDto
{
    public List<SearchResultDto> Results { get; set; } = new();
}
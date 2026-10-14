namespace FatooraRahatak.Application.DTOs.Chat;

public class ChatRequestDto
{
    public string Message { get; set; } = string.Empty;
    public List<ChatTurnDto>? History { get; set; }
    public ConfirmedActionDto? ConfirmedAction { get; set; }
}

public class ChatTurnDto
{
    public string Role { get; set; } = "user";
    public string Content { get; set; } = string.Empty;
}

public class ConfirmedActionDto
{
    public string Tool { get; set; } = string.Empty;
    public string Arguments { get; set; } = string.Empty;
}

public class PendingActionDto
{
    public string Tool { get; set; } = string.Empty;
    public string Arguments { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class ChatResponseDto
{
    public bool Fallback { get; set; }
    public string Reply { get; set; } = string.Empty;
    public PendingActionDto? PendingAction { get; set; }
}

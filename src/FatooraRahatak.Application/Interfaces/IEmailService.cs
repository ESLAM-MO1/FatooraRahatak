namespace FatooraRahatak.Application.Interfaces;

public interface IEmailService
{
    bool IsConfigured();
    Task SendEmailAsync(string to, string subject, string body);
    Task SendTemplatedEmailAsync(string to, string subject, string bodyHtml);
}

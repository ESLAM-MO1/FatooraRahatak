using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly string _smtpHost;
    private readonly int _smtpPort;
    private readonly string _smtpUsername;
    private readonly string _smtpPassword;
    private readonly string _fromAddress;
    private readonly string _fromName;

    public EmailService(IConfiguration configuration)
    {
        _smtpHost = configuration["Smtp:Host"] ?? "";
        int.TryParse(configuration["Smtp:Port"] ?? "587", out _smtpPort);
        _smtpUsername = configuration["Smtp:Username"] ?? "";
        _smtpPassword = configuration["Smtp:Password"] ?? "";
        _fromAddress = configuration["Smtp:FromAddress"] ?? _smtpUsername;
        _fromName = configuration["Smtp:FromName"] ?? "فاتورة راحتك";
    }

    public bool IsConfigured()
    {
        return !string.IsNullOrWhiteSpace(_smtpHost)
            && !string.IsNullOrWhiteSpace(_smtpUsername)
            && !string.IsNullOrWhiteSpace(_fromAddress);
    }

    public async Task SendEmailAsync(string to, string subject, string body)
    {
        if (string.IsNullOrWhiteSpace(_smtpHost) || string.IsNullOrWhiteSpace(_smtpUsername) || string.IsNullOrWhiteSpace(_fromAddress))
            throw new InvalidOperationException("بيانات الاتصال بالبريد الإلكتروني (SMTP) غير مكتملة. يرجى ضبط الإعدادات أولاً.");

        using var message = new MailMessage
        {
            From = new MailAddress(_fromAddress, _fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        message.To.Add(to);

        using var client = new SmtpClient(_smtpHost, _smtpPort)
        {
            Credentials = new NetworkCredential(_smtpUsername, _smtpPassword),
            EnableSsl = _smtpPort == 587 || _smtpPort == 465
        };

        try
        {
            await client.SendMailAsync(message);
        }
        catch (SmtpException)
        {
            throw new InvalidOperationException("حدث خطأ في إرسال البريد الإلكتروني، تأكد من صحة إعدادات SMTP وحاول مرة أخرى");
        }
    }
}

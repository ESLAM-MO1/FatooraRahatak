using System.Text.Json;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly string _smtpHost;
    private readonly int _smtpPort;
    private readonly string _fromAddress;
    private readonly string _fromName;
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _refreshToken;
    private readonly ILogger<EmailService> _logger;
    private static readonly HttpClient _httpClient = new HttpClient();

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _smtpHost = configuration["Smtp:Host"] ?? "smtp.gmail.com";
        int.TryParse(configuration["Smtp:Port"] ?? "587", out _smtpPort);
        _fromAddress = configuration["Smtp:FromAddress"] ?? "";
        _fromName = configuration["Smtp:FromName"] ?? "فاتورة راحتك";
        _clientId = configuration["GoogleAuth:ClientId"] ?? "";
        _clientSecret = configuration["GoogleAuth:ClientSecret"] ?? "";
        _refreshToken = configuration["GoogleAuth:MailRefreshToken"] ?? "";
        _logger = logger;
    }

    public bool IsConfigured()
    {
        return !string.IsNullOrWhiteSpace(_smtpHost)
            && !string.IsNullOrWhiteSpace(_fromAddress)
            && !string.IsNullOrWhiteSpace(_refreshToken);
    }

    private async Task<string> GetAccessTokenAsync()
    {
        var values = new Dictionary<string, string>
        {
            { "client_id", _clientId },
            { "client_secret", _clientSecret },
            { "refresh_token", _refreshToken },
            { "grant_type", "refresh_token" }
        };
        var response = await _httpClient.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(values));
        var json = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Failed to refresh Google OAuth token: {Response}", json);
            throw new InvalidOperationException("تعذر تجديد صلاحية الوصول لبريد جوجل، راجع إعدادات OAuth");
        }
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("access_token").GetString()
            ?? throw new InvalidOperationException("لم يتم استلام access_token من جوجل");
    }

    public async Task SendEmailAsync(string to, string subject, string body)
    {
        if (string.IsNullOrWhiteSpace(_fromAddress) || string.IsNullOrWhiteSpace(_refreshToken))
            throw new InvalidOperationException("بيانات الاتصال بالبريد الإلكتروني (OAuth) غير مكتملة. يرجى ضبط الإعدادات أولاً.");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_fromName, _fromAddress));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = body };

        try
        {
            var accessToken = await GetAccessTokenAsync();
            var oauth2 = new SaslMechanismOAuth2(_fromAddress, accessToken);

            using var client = new SmtpClient();
            await client.ConnectAsync(_smtpHost, _smtpPort, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(oauth2);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SMTP OAuth send failed to {To} subject={Subject}", to, subject);
            throw new InvalidOperationException("حدث خطأ في إرسال البريد الإلكتروني، تأكد من صحة إعدادات OAuth وحاول مرة أخرى");
        }
    }

    public async Task SendTemplatedEmailAsync(string to, string subject, string bodyHtml)
    {
        await SendEmailAsync(to, subject, EmailTemplateRenderer.Render(subject, bodyHtml));
    }
}

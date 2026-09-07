using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.Infrastructure.Services;

public class WhatsAppService : IWhatsAppService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<WhatsAppService> _logger;
    private readonly HttpClient _httpClient;

    public WhatsAppService(IConfiguration configuration, ILogger<WhatsAppService> logger, HttpClient httpClient)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClient;
    }

    public async Task SendTextMessageAsync(string to, string message)
    {
        var accessToken = _configuration["WhatsApp:AccessToken"] ?? "";
        var phoneNumberId = _configuration["WhatsApp:PhoneNumberId"] ?? "";

        if (string.IsNullOrWhiteSpace(accessToken) || string.IsNullOrWhiteSpace(phoneNumberId))
        {
            _logger.LogWarning("WhatsApp is not configured (AccessToken/PhoneNumberId missing). Skipping message to {To}.", to);
            return;
        }

        var request = new HttpRequestMessage(HttpMethod.Post, $"https://graph.facebook.com/v20.0/{phoneNumberId}/messages");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var payload = JsonSerializer.Serialize(new
        {
            messaging_product = "whatsapp",
            to,
            type = "text",
            text = new { body = message }
        });
        request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("WhatsApp message to {To} failed ({StatusCode}): {Error}", to, response.StatusCode, error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "WhatsApp message to {To} failed with exception", to);
        }
    }
}

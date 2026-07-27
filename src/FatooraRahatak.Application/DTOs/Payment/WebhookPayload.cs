using System.Text.Json.Serialization;

namespace FatooraRahatak.Application.DTOs.Payment;

public class WebhookPayload
{
    [JsonPropertyName("id")]
    public string? PaymentId { get; set; }

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("reference")]
    public string? Reference { get; set; }

    [JsonPropertyName("source")]
    public WebhookSource? Source { get; set; }

    [JsonPropertyName("created_at")]
    public string? CreatedAt { get; set; }

    [JsonPropertyName("paid_at")]
    public string? PaidAt { get; set; }

    [JsonPropertyName("signature")]
    public string? Signature { get; set; }
}

public class WebhookSource
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("transaction_id")]
    public string? TransactionId { get; set; }
}
using System.Text.Json;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Infrastructure.Services.Shipping;

/// <summary>
/// مزود أرامكس (Aramex) — يعتمد على واجهة JSON API.
/// يُستخدم الوضع التجريبي عند غياب المفاتيح.
/// </summary>
public class AramexShippingProvider : ShippingProviderBase
{
    public override ShippingCompanyCode Code => ShippingCompanyCode.Aramex;
    public override string DisplayName => "أرامكس";
    public override int EstimatedDeliveryDays => 3;

    protected override async Task<CreateShipmentProviderResult> CreateShipmentWithApiAsync(ShippingProviderContext ctx, CancellationToken ct)
    {
        var baseUrl = (ctx.ApiBaseUrl ?? "https://ws.aramex.net/ShippingAPI.V2/Shipping").TrimEnd('/');

        var payload = new
        {
            ClientInfo = new
            {
                UserName = ctx.ApiKey,
                Password = ctx.ApiSecret,
                Version = "v1.0",
                AccountNumber = ctx.ApiBaseUrl,
                AccountPin = "0",
                Entity = "SAU",
                CountryCode = "SA"
            },
            Transaction = new { Reference1 = ctx.Reference, Reference2 = "", Reference3 = "", Reference4 = "", Reference5 = "" },
            Shipments = new object[]
            {
                new
                {
                    Shipper = new
                    {
                        PartyAddress = new { Line1 = "المملكة العربية السعودية", Line2 = "", Line3 = "", City = "الرياض", StateOrProvinceCode = "RUH", PostCode = "", CountryCode = "SA" },
                        Contact = new { Department = "", PersonName = "المتجر", Title = "", CompanyName = ctx.RecipientName, PhoneNumber1 = ctx.RecipientPhone, PhoneNumber1Ext = "", PhoneNumber2 = "", FaxNumber = "", CellPhone = "", EmailAddress = "", Type = "" }
                    },
                    Consignee = new
                    {
                        PartyAddress = new { Line1 = ctx.DestinationAddress, Line2 = "", Line3 = "", City = ctx.DestinationCity, StateOrProvinceCode = "", PostCode = "", CountryCode = "SA" },
                        Contact = new { Department = "", PersonName = ctx.RecipientName, Title = "", CompanyName = "", PhoneNumber1 = ctx.RecipientPhone, PhoneNumber1Ext = "", PhoneNumber2 = "", FaxNumber = "", CellPhone = "", EmailAddress = "", Type = "" }
                    },
                    Reference1 = ctx.Reference,
                    Reference2 = "",
                    Reference3 = "",
                    Reference4 = "",
                    Reference5 = "",
                    ShippingDateTime = DateTime.Now,
                    DueDate = DateTime.Now.AddDays(3),
                    Comments = "شحنة من المتجر",
                    PickupLocation = "الرياض",
                    OperationsInstructions = "",
                    AccountingInstructions = "",
                    Details = new
                    {
                        Dimensions = new object[] { new { Length = 10, Width = 10, Height = 10, Unit = "cm" } },
                        Weight = new { Unit = "KG", Value = Math.Max(ctx.Weight, 0.5m) },
                        Currency = ctx.Currency,
                        Contents = new object[] { new { PieceNumber = 1, ContentDescription = "منتجات المتجر", Comments = "", Weight = new { Unit = "KG", Value = Math.Max(ctx.Weight, 0.5m) } } },
                        Services = "CODS,GP",
                        ItemsCount = 1
                    },
                    LabelInfo = new { ReportID = 9201, ReportType = "URL" }
                }
            }
        };

        var created = await PostJsonAsync(ctx.HttpClient,
            $"{baseUrl}/Service_1_0.svc/json/CreateShipments",
            payload,
            ct: ct);

        if (created.ValueKind == JsonValueKind.Undefined)
            return new CreateShipmentProviderResult { Success = false, Message = "فشل الاتصال بخدمة أرامكس" };

        var awb = TryGetString(created, "ID", out var id) ? id : null;
        if (TryGetString(created, "AwbNumber", out var awbNum))
            awb = awbNum;

        if (created.TryGetProperty("Shipments", out var shipments) && shipments.ValueKind == JsonValueKind.Array)
        {
            foreach (var s in shipments.EnumerateArray())
            {
                if (TryGetString(s, "ID", out var sId) && !string.IsNullOrEmpty(sId)) { awb = sId; break; }
                if (TryGetString(s, "AwbNumber", out var sAwb) && !string.IsNullOrEmpty(sAwb)) { awb = sAwb; break; }
            }
        }

        return new CreateShipmentProviderResult
        {
            Success = !string.IsNullOrEmpty(awb),
            Awb = awb ?? string.Empty,
            Status = awb == null ? "Pending" : "Registered",
            Message = awb == null ? "لم يتم استلام رقم تتبع من أرامكس" : null,
            Events = awb == null
                ? new()
                : new List<TrackingEventItem>
                {
                    new() { EventCode = "CREATED", Description = "تم إنشاء الشحنة في أرامكس", EventAt = DateTime.UtcNow }
                }
        };
    }

    protected override async Task<TrackingProviderResult> GetTrackingWithApiAsync(ShippingProviderContext ctx, string awb, CancellationToken ct)
    {
        var baseUrl = (ctx.ApiBaseUrl ?? "https://ws.aramex.net/ShippingAPI.V2/Shipping").TrimEnd('/');

        var payload = new
        {
            ClientInfo = new
            {
                UserName = ctx.ApiKey,
                Password = ctx.ApiSecret,
                Version = "v1.0",
                AccountNumber = ctx.ApiBaseUrl,
                AccountPin = "0",
                Entity = "SAU",
                CountryCode = "SA"
            },
            Transaction = new { Reference1 = ctx.Reference },
            Shipments = new[] { new { ID = awb } }
        };

        var data = await PostJsonAsync(ctx.HttpClient,
            $"{baseUrl}/Service_1_0.svc/json/TrackShipments",
            payload,
            ct: ct);

        if (data.ValueKind == JsonValueKind.Undefined)
            return new TrackingProviderResult { Success = false, Message = "فشل جلب التتبع من أرامكس" };

        var events = new List<TrackingEventItem>();
        var status = "Unknown";

        if (data.TryGetProperty("TrackingResults", out var results))
        {
            foreach (var r in results.EnumerateArray())
            {
                if (TryGetString(r, "Value", out var v)) status = v;
                else if (TryGetString(r, "CurrentStatus", out var cs)) status = cs;

                if (r.TryGetProperty("TrackingDetails", out var details))
                {
                    foreach (var d in details.EnumerateArray())
                    {
                        events.Add(new TrackingEventItem
                        {
                            EventCode = TryGetString(d, "Code", out var code) ? code : "",
                            Description = TryGetString(d, "Description", out var desc) ? desc : (TryGetString(d, "UpdateDescription", out var ud) ? ud : ""),
                            EventAt = ParseDate(TryGetString(d, "UpdateDateTime", out var udt) ? udt : null) ?? ParseDate(TryGetString(d, "UpdateDate", out var ud2) ? ud2 : null)
                        });
                    }
                }
            }
        }

        return new TrackingProviderResult
        {
            Success = true,
            Status = MapStatus(status),
            Events = events,
            Message = null
        };
    }

    private static string MapStatus(string raw)
    {
        var s = raw.ToLowerInvariant();
        if (s.Contains("deliver")) return "Delivered";
        if (s.Contains("out for delivery")) return "OutForDelivery";
        if (s.Contains("transit") || s.Contains("pickup") || s.Contains("shipped")) return "InTransit";
        if (s.Contains("fail") || s.Contains("exception")) return "Failed";
        if (s.Contains("return")) return "Returned";
        return "InTransit";
    }
}

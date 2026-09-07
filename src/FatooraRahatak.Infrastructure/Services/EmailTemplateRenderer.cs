using System.Text;

namespace FatooraRahatak.Infrastructure.Services;

public static class EmailTemplateRenderer
{
    private const string BrandColor = "#C9A227";
    private const string TextColor = "#1f2937";
    private const string SubtextColor = "#6b7280";
    private const string BgColor = "#f5f6f8";
    private const string WhiteColor = "#ffffff";

    public static string Render(string subject, string bodyHtml)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<!DOCTYPE html>");
        sb.AppendLine("<html dir=\"rtl\" lang=\"ar\">");
        sb.AppendLine("<head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">");
        sb.AppendLine("<style>");
        sb.AppendLine("*{margin:0;padding:0;box-sizing:border-box}");
        sb.AppendLine("body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background-color:" + BgColor + ";padding:24px;margin:0}");
        sb.AppendLine(".container{max-width:560px;margin:0 auto;background:" + WhiteColor + ";border-radius:16px;overflow:hidden;border:1px solid #e8e9ec}");
        sb.AppendLine(".header{background:" + BrandColor + ";padding:24px 28px;text-align:center}");
        sb.AppendLine(".header h1{margin:0;font-size:20px;color:#1a1a2e;letter-spacing:0.5px}");
        sb.AppendLine(".header .sub{margin:4px 0 0;font-size:12px;color:rgba(26,26,46,0.7)}");
        sb.AppendLine(".body{padding:28px;color:" + TextColor + ";font-size:14px;line-height:1.8}");
        sb.AppendLine(".body h2{margin:0 0 16px;font-size:17px;color:" + BrandColor + "}");
        sb.AppendLine(".body p{margin:0 0 12px}");
        sb.AppendLine(".code-box{text-align:center;margin:20px 0;padding:16px 24px;background:#f9fafb;border-radius:12px;border:1px solid #e8e9ec}");
        sb.AppendLine(".code-box span{font-size:30px;font-weight:700;letter-spacing:6px;color:" + BrandColor + ";direction:ltr;display:inline-block;font-family:monospace}");
        sb.AppendLine(".details-box{background:#f9fafb;border-radius:10px;padding:16px 20px;margin:16px 0;border:1px solid #e8e9ec}");
        sb.AppendLine(".details-box .row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid #eee}");
        sb.AppendLine(".details-box .row:last-child{border-bottom:none}");
        sb.AppendLine(".details-box .label{color:" + SubtextColor + ";font-weight:600}");
        sb.AppendLine(".details-box .value{color:" + TextColor + ";font-weight:700}");
        sb.AppendLine(".footer{background:" + BgColor + ";padding:18px 28px;text-align:center;font-size:12px;color:" + SubtextColor + ";border-top:1px solid #e8e9ec}");
        sb.AppendLine(".footer p{margin:2px 0}");
        sb.AppendLine(".btn{display:inline-block;padding:10px 24px;background:" + BrandColor + ";color:#1a1a2e;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;margin:12px 0}");
        sb.AppendLine("table.items{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}");
        sb.AppendLine("table.items th{padding:8px;background:#f3f4f6;color:" + TextColor + ";font-weight:600;text-align:right}");
        sb.AppendLine("table.items td{padding:8px;border-bottom:1px solid #eee;color:" + TextColor + "}");
        sb.AppendLine("</style></head><body>");
        sb.AppendLine("<div class=\"container\">");
        sb.AppendLine("<div class=\"header\" style=\"background:" + BrandColor + ";padding:20px 28px;text-align:center\">");
        sb.AppendLine("<img src=\"https://fatora.trillion-invest.tech/logo.png\" alt=\"فاتورة راحتك\" style=\"max-width:160px;height:auto;margin-bottom:6px\" />");
        sb.AppendLine("<h1 style=\"margin:6px 0 0;font-size:20px;color:#1a1a2e;letter-spacing:0.5px\">فاتورة راحتك</h1>");
        sb.AppendLine("<div class=\"sub\" style=\"margin:2px 0 0;font-size:12px;color:rgba(26,26,46,0.7)\">منصة الفواتير والمتاجر الإلكترونية</div></div>");
        sb.AppendLine("<div class=\"body\">");
        sb.AppendLine(bodyHtml);
        sb.AppendLine("</div>");
        sb.AppendLine("<div class=\"footer\">");
        sb.AppendLine("<p>فاتورة راحتك - جميع الحقوق محفوظة &copy; " + DateTime.UtcNow.Year + "</p>");
        sb.AppendLine("<p>للاستفسارات والدعم الفني: <a href=\"mailto:support@rahatik.com\" style=\"color:" + BrandColor + ";text-decoration:none\">support@rahatik.com</a></p>");
        sb.AppendLine("</div>");
        sb.AppendLine("</div></body></html>");
        return sb.ToString();
    }

    public static string CodeBox(string code) =>
        $@"<div class=""code-box""><span>{code}</span></div>";

    public static string DetailRow(string label, string value) =>
        $@"<div class=""row""><span class=""label"">{label}</span><span class=""value"">{value}</span></div>";

    public static string DetailsBox(string rows) =>
        $@"<div class=""details-box"">{rows}</div>";
}
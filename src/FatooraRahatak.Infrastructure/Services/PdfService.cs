using FatooraRahatak.Application.DTOs.Accounting;
using FatooraRahatak.Application.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace FatooraRahatak.Infrastructure.Services;

public class PdfService : IPdfService
{
    public byte[] GenerateInvoicePdf(InvoiceDto invoice)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var isSales = string.Equals(invoice.InvoiceType, "Sales", StringComparison.OrdinalIgnoreCase);
        var partyLabel = isSales ? "العميل" : "المورد";
        var partyName = invoice.PartyName ?? "غير معروف";

        // ⚠️ إصلاح: QuestPDF الوحدة الافتراضية فيها هي المليمتر، فكانت الأرقام الثابتة
        // (مثل ConstantItem(200) و ConstantColumn(85)) أكبر من عرض صفحة A4 وتُنتج
        // DocumentLayoutException. استخدمنا تخطيطًا نسبيًا (RelativeColumn / RelativeItem)
        // بالكامل حتى يتكيف مع أي عرض صفحة.
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(16);
                page.DefaultTextStyle(t => t
                    .FontFamily("Arial")
                    .FontSize(10)
                    .LineHeight(1.4f)
                    .FontColor("#1f2937"));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem(6).Column(left =>
                        {
                            left.Item().Text(t => t
                                .Span(invoice.StoreName ?? "فاتورة")
                                .FontSize(18)
                                .Bold()
                                .FontColor("#1d4ed8"));
                            if (!string.IsNullOrWhiteSpace(invoice.ContactPhone))
                                left.Item().Text(invoice.ContactPhone).FontSize(9).FontColor("#6b7280");
                            if (!string.IsNullOrWhiteSpace(invoice.ContactEmail))
                                left.Item().Text(invoice.ContactEmail).FontSize(9).FontColor("#6b7280");
                            if (!string.IsNullOrWhiteSpace(invoice.ContactAddress))
                                left.Item().Text(invoice.ContactAddress).FontSize(9).FontColor("#6b7280");
                            if (!string.IsNullOrWhiteSpace(invoice.VatNumber))
                                left.Item().Text($"الرقم الضريبي: {invoice.VatNumber}").FontSize(9).FontColor("#6b7280");
                            if (!string.IsNullOrWhiteSpace(invoice.BranchName))
                                left.Item().Text($"الفرع: {invoice.BranchName}").FontSize(9).FontColor("#6b7280");
                            if (!string.IsNullOrWhiteSpace(invoice.CommercialRegistrationNumber))
                                left.Item().Text($"رقم السجل التجاري: {invoice.CommercialRegistrationNumber}").FontSize(9).FontColor("#6b7280");
                        });

                        row.RelativeItem(4).Column(right =>
                        {
                            right.Item().AlignRight().Text(t => t
                                .Span(isSales ? "فاتورة بيع" : "فاتورة شراء")
                                .FontSize(16)
                                .Bold());
                            right.Item().AlignRight().Text($"الرقم: {invoice.InvoiceNumber}");
                            right.Item().AlignRight().Text($"التاريخ: {invoice.InvoiceDate:yyyy-MM-dd}");
                            right.Item().AlignRight().Text($"طريقة الدفع: {invoice.PaymentMethod}");
                            right.Item().AlignRight().Text($"الحالة: {invoice.PaymentStatus}");
                        });
                    });

                    col.Item().PaddingVertical(10).LineHorizontal(1).LineColor("#e5e7eb");
                });

                page.Content().Column(col =>
                {
                    col.Item().PaddingBottom(8).Row(row =>
                    {
                        row.RelativeItem(2).Text(t => t.Span($"{partyLabel}:").Bold());
                        row.RelativeItem(8).Text(partyName);
                        if (!string.IsNullOrWhiteSpace(invoice.PartyPhone))
                        {
                            row.RelativeItem(2).Text(t => t.Span("الجوال:").Bold());
                            row.RelativeItem(4).Text(invoice.PartyPhone);
                        }
                        if (!string.IsNullOrWhiteSpace(invoice.PartyCity))
                        {
                            row.RelativeItem(2).Text(t => t.Span("المدينة:").Bold());
                            row.RelativeItem(4).Text(invoice.PartyCity);
                        }
                    });

                    col.Item().PaddingBottom(16).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(1);
                            cols.RelativeColumn(5);
                            cols.RelativeColumn(1);
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(2);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Background("#1d4ed8").AlignCenter().Text("#").FontSize(9).Bold().FontColor("#ffffff");
                            header.Cell().Background("#1d4ed8").AlignRight().Text("المنتج").FontSize(9).Bold().FontColor("#ffffff");
                            header.Cell().Background("#1d4ed8").AlignCenter().Text("الكمية").FontSize(9).Bold().FontColor("#ffffff");
                            header.Cell().Background("#1d4ed8").AlignCenter().Text("السعر").FontSize(9).Bold().FontColor("#ffffff");
                            header.Cell().Background("#1d4ed8").AlignCenter().Text("الإجمالي").FontSize(9).Bold().FontColor("#ffffff");
                        });

                        var index = 1;
                        foreach (var item in invoice.Items)
                        {
                            table.Cell().BorderBottom(0.5f).BorderColor("#e5e7eb").Padding(4).AlignCenter()
                                .Text(index++.ToString()).FontSize(9).FontColor("#374151");
                            table.Cell().BorderBottom(0.5f).BorderColor("#e5e7eb").Padding(4).AlignRight()
                                .Text(item.ProductNameSnapshot).FontSize(9).FontColor("#374151");
                            table.Cell().BorderBottom(0.5f).BorderColor("#e5e7eb").Padding(4).AlignCenter()
                                .Text(item.Quantity.ToString()).FontSize(9).FontColor("#374151");
                            table.Cell().BorderBottom(0.5f).BorderColor("#e5e7eb").Padding(4).AlignCenter()
                                .Text($"{item.UnitPrice.ToString("0.00")} ر.س").FontSize(9).FontColor("#374151");
                            table.Cell().BorderBottom(0.5f).BorderColor("#e5e7eb").Padding(4).AlignCenter()
                                .Text($"{item.LineTotal.ToString("0.00")} ر.س").FontSize(9).FontColor("#374151");
                        }
                    });

                    col.Item().PaddingTop(8).AlignRight().Column(totals =>
                    {
                        totals.Item().Text(t =>
                        {
                            t.Span("الإجمالي الفرعي: ").SemiBold();
                            t.Span($"{invoice.SubTotal.ToString("0.00")} ر.س");
                        });
                        if (invoice.DiscountAmount > 0)
                            totals.Item().Text(t =>
                            {
                                t.Span("الخصم: ").SemiBold();
                                t.Span($"{invoice.DiscountAmount.ToString("0.00")} ر.س");
                            });
                        if (invoice.TaxAmount > 0)
                            totals.Item().Text(t =>
                            {
                                t.Span("الضريبة: ").SemiBold();
                                t.Span($"{invoice.TaxAmount.ToString("0.00")} ر.س");
                            });
                        totals.Item().PaddingTop(4).Text(t =>
                        {
                            t.Span("الإجمالي: ").Bold().FontSize(13).FontColor("#1d4ed8");
                            t.Span($"{invoice.TotalAmount.ToString("0.00")} ر.س").Bold().FontSize(13).FontColor("#1d4ed8");
                        });
                    });

                    if (!string.IsNullOrWhiteSpace(invoice.Notes))
                    {
                        col.Item().PaddingTop(12).Text(t =>
                        {
                            t.Span("ملاحظات: ").SemiBold();
                            t.Span(invoice.Notes);
                        });
                    }
                });

                page.Footer().Column(footer =>
                {
                    footer.Item().PaddingTop(12).LineHorizontal(1).LineColor("#e5e7eb");
                    footer.Item().PaddingTop(6).Row(row =>
                    {
                        row.RelativeItem().AlignRight().Text(t =>
                        {
                            t.Span(invoice.StoreName ?? "").FontColor("#6b7280").FontSize(9);
                            if (!string.IsNullOrWhiteSpace(invoice.ContactPhone))
                                t.Span($"  |  {invoice.ContactPhone}").FontColor("#6b7280").FontSize(9);
                        });
                        if (!string.IsNullOrWhiteSpace(invoice.QrBase64))
                        {
                            try
                            {
                                var qrBytes = Convert.FromBase64String(invoice.QrBase64);
                                row.RelativeItem(1).AlignRight().Image(qrBytes).FitWidth();
                            }
                            catch
                            {
                                // تجاهل QR التالف
                            }
                        }
                    });
                });
            });
        }).GeneratePdf();
    }
}

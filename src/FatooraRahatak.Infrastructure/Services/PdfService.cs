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
        PdfFonts.EnsureRegistered();

        var isSales = string.Equals(invoice.InvoiceType, "Sales", StringComparison.OrdinalIgnoreCase);
        var partyLabel = isSales ? "العميل" : "المورد";
        var partyName = invoice.PartyName ?? "غير معروف";

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(14);
                page.DefaultTextStyle(t => t
                    .FontFamily(PdfFonts.ArabicFontFamily)
                    .FontSize(10)
                    .LineHeight(1.5f)
                    .FontColor("#1f2937"));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem(6).Column(left =>
                        {
                            left.Item().Text(t => t
                                .Span(invoice.StoreName ?? "فاتورة")
                                .FontSize(19)
                                .Bold()
                                .FontColor("#0b5e78"));
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
                                .Bold()
                                .FontColor("#0b5e78"));
                            right.Item().PaddingTop(4).AlignRight().Text($"الرقم: {invoice.InvoiceNumber}").FontSize(10).FontColor("#374151");
                            right.Item().AlignRight().Text($"التاريخ: {invoice.InvoiceDate:yyyy-MM-dd}").FontSize(10).FontColor("#374151");
                            right.Item().AlignRight().Text($"طريقة الدفع: {invoice.PaymentMethod}").FontSize(10).FontColor("#374151");
                            right.Item().AlignRight().Text($"الحالة: {invoice.PaymentStatus}").FontSize(10).FontColor("#374151");
                        });
                    });

                    col.Item().PaddingVertical(8).LineHorizontal(1).LineColor("#e5e7eb");
                });

                page.Content().Column(col =>
                {
                    // معلومات العميل/المورد
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Border(1).BorderColor("#e5e7eb").Padding(8).Column(party =>
                        {
                            party.Item().Text(t => t.Span(partyLabel).Bold().FontSize(11).FontColor("#0b5e78"));
                            party.Item().PaddingTop(4).Text(partyName).FontSize(10).FontColor("#374151");
                            if (!string.IsNullOrWhiteSpace(invoice.PartyPhone))
                                party.Item().PaddingTop(2).Text($"الجوال: {invoice.PartyPhone}").FontSize(9).FontColor("#6b7280");
                            if (!string.IsNullOrWhiteSpace(invoice.PartyCity))
                                party.Item().Text($"المدينة: {invoice.PartyCity}").FontSize(9).FontColor("#6b7280");
                        });
                        row.RelativeItem().Border(1).BorderColor("#e5e7eb").Padding(8).Column(comp =>
                        {
                            comp.Item().Text(t => t.Span("بيانات المنشأة").Bold().FontSize(11).FontColor("#0b5e78"));
                            comp.Item().PaddingTop(4).Text(invoice.StoreName ?? "").FontSize(10).FontColor("#374151");
                            if (!string.IsNullOrWhiteSpace(invoice.VatNumber))
                                comp.Item().PaddingTop(2).Text($"الرقم الضريبي: {invoice.VatNumber}").FontSize(9).FontColor("#6b7280");
                            if (!string.IsNullOrWhiteSpace(invoice.ContactPhone))
                                comp.Item().Text($"الهاتف: {invoice.ContactPhone}").FontSize(9).FontColor("#6b7280");
                            if (!string.IsNullOrWhiteSpace(invoice.ContactEmail))
                                comp.Item().Text($"البريد: {invoice.ContactEmail}").FontSize(9).FontColor("#6b7280");
                        });
                    });

                    // جدول المنتجات
                    col.Item().PaddingTop(12).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(1);
                            cols.RelativeColumn(5);
                            cols.RelativeColumn(1);
                            cols.RelativeColumn(1.5f);
                            cols.RelativeColumn(1.5f);
                            cols.RelativeColumn(1.5f);
                            cols.RelativeColumn(1.5f);
                        });

                        table.Header(header =>
                        {
                            var hdrStyle = "#0b5e78";
                            header.Cell().Background(hdrStyle).AlignCenter().Padding(6).Text("#").FontSize(9).Bold().FontColor("#ffffff");
                            header.Cell().Background(hdrStyle).AlignRight().Padding(6).Text("المنتج").FontSize(9).Bold().FontColor("#ffffff");
                            header.Cell().Background(hdrStyle).AlignCenter().Padding(6).Text("الكمية").FontSize(9).Bold().FontColor("#ffffff");
                            header.Cell().Background(hdrStyle).AlignCenter().Padding(6).Text("السعر").FontSize(9).Bold().FontColor("#ffffff");
                            header.Cell().Background(hdrStyle).AlignCenter().Padding(6).Text("الإجمالي").FontSize(9).Bold().FontColor("#ffffff");
                            header.Cell().Background(hdrStyle).AlignCenter().Padding(6).Text("الخصم").FontSize(9).Bold().FontColor("#ffffff");
                            header.Cell().Background(hdrStyle).AlignCenter().Padding(6).Text("الصافي").FontSize(9).Bold().FontColor("#ffffff");
                        });

                        var index = 1;
                        foreach (var item in invoice.Items)
                        {
                            var rowColor = index % 2 == 0 ? "#f8f9fa" : "#ffffff";
                            table.Cell().Background(rowColor).BorderBottom(0.5f).BorderColor("#e5e7eb").Padding(4).AlignCenter()
                                .Text(index++.ToString()).FontSize(9).FontColor("#374151");
                            table.Cell().Background(rowColor).BorderBottom(0.5f).BorderColor("#e5e7eb").Padding(4).AlignRight()
                                .Text(item.ProductNameSnapshot).FontSize(9).FontColor("#374151");
                            table.Cell().Background(rowColor).BorderBottom(0.5f).BorderColor("#e5e7eb").Padding(4).AlignCenter()
                                .Text(item.Quantity.ToString()).FontSize(9).FontColor("#374151");
                            table.Cell().Background(rowColor).BorderBottom(0.5f).BorderColor("#e5e7eb").Padding(4).AlignCenter()
                                .Text($"{item.UnitPrice.ToString("0.00")}").FontSize(9).FontColor("#374151");
                            table.Cell().Background(rowColor).BorderBottom(0.5f).BorderColor("#e5e7eb").Padding(4).AlignCenter()
                                .Text($"{item.LineTotal.ToString("0.00")}").FontSize(9).FontColor("#374151");
                            table.Cell().Background(rowColor).BorderBottom(0.5f).BorderColor("#e5e7eb").Padding(4).AlignCenter()
                                .Text(item.DiscountAmount > 0 ? item.DiscountAmount.ToString("0.00") : "—").FontSize(9).FontColor("#991b1b");
                            table.Cell().Background(rowColor).BorderBottom(0.5f).BorderColor("#e5e7eb").Padding(4).AlignCenter()
                                .Text($"{item.LineAfterDiscount.ToString("0.00")}").FontSize(9).Bold().FontColor("#1f2937");
                        }
                    });

                    // الإجماليات
                    col.Item().PaddingTop(8).AlignRight().Column(totals =>
                    {
                        totals.Item().Text(t =>
                        {
                            t.Span("الإجمالي الفرعي: ").FontSize(10).SemiBold();
                            t.Span($"{invoice.SubTotal.ToString("0.00")} ر.س").FontSize(10);
                        });
                        if (invoice.DiscountAmount > 0)
                            totals.Item().Text(t =>
                            {
                                t.Span("الخصم: ").FontSize(10).SemiBold();
                                t.Span($"{invoice.DiscountAmount.ToString("0.00")} ر.س").FontSize(10).FontColor("#991b1b");
                            });
                        if (invoice.TaxAmount > 0)
                            totals.Item().Text(t =>
                            {
                                t.Span("الضريبة: ").FontSize(10).SemiBold();
                                t.Span($"{invoice.TaxAmount.ToString("0.00")} ر.س").FontSize(10);
                            });
                        totals.Item().PaddingTop(4).LineHorizontal(1).LineColor("#e5e7eb");
                        totals.Item().PaddingTop(4).Text(t =>
                        {
                            t.Span("الإجمالي: ").Bold().FontSize(13).FontColor("#0b5e78");
                            t.Span($"{invoice.TotalAmount.ToString("0.00")} ر.س").Bold().FontSize(13).FontColor("#0b5e78");
                        });
                    });

                    // ملاحظات
                    if (!string.IsNullOrWhiteSpace(invoice.Notes))
                    {
                        col.Item().PaddingTop(12).Border(1).BorderColor("#e5e7eb").Padding(8).Text(t =>
                        {
                            t.Span("ملاحظات: ").SemiBold().FontSize(10);
                            t.Span(invoice.Notes).FontSize(10);
                        });
                    }
                });

                // Footer
                page.Footer().Column(footer =>
                {
                    footer.Item().PaddingTop(10).LineHorizontal(1).LineColor("#e5e7eb");
                    footer.Item().PaddingTop(6).Row(row =>
                    {
                        row.RelativeItem().Column(left =>
                        {
                            left.Item().Text(t => t.Span(invoice.StoreName ?? "").FontColor("#6b7280").FontSize(9));
                            if (!string.IsNullOrWhiteSpace(invoice.ContactPhone))
                                left.Item().Text(invoice.ContactPhone).FontColor("#6b7280").FontSize(9);
                        });
                        if (!string.IsNullOrWhiteSpace(invoice.QrBase64))
                        {
                            try
                            {
                                var qrBytes = Convert.FromBase64String(invoice.QrBase64);
                                row.RelativeItem(1).AlignRight().Image(qrBytes).FitWidth();
                            }
                            catch { }
                        }
                    });
                });
            });
        }).GeneratePdf();
    }
}
using System.Globalization;
using System.Xml.Linq;
using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Infrastructure.Services.Zatca;

public static class ZatcaXmlBuilder
{
    private const string InvoiceNs = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2";
    private const string CbcNs = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
    private const string CacNs = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";
    private const string CctsNs = "urn:un:unece:uncefact:documentation:2";
    private const string ExtNs = "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2";

    private static readonly XNamespace Inv = InvoiceNs;
    private static readonly XNamespace Cbc = CbcNs;
    private static readonly XNamespace Cac = CacNs;
    private static readonly XNamespace Ext = ExtNs;

    public static string BuildInvoiceXml(
        Store store,
        Invoice invoice,
        bool forceReporting = false,
        string? buyerVatNumber = null)
    {
        var isStandard = !forceReporting && !string.IsNullOrWhiteSpace(buyerVatNumber);
        var profileId = isStandard ? "clearance:1:0" : "reporting:1:0";
        var invoiceTypeCode = isStandard ? "388" : "381";

        var currency = "SAR";
        var issueDate = invoice.InvoiceDate;
        var issueTime = issueDate.ToDateTime(TimeOnly.MinValue).ToUniversalTime().ToString("HH:mm:ss");

        var discountAmount = invoice.DiscountAmount;
        var lineExtensionTotal = invoice.SubTotal;
        var taxExclusive = Math.Round(lineExtensionTotal - discountAmount, 2);
        var taxAmount = invoice.TaxAmount;
        var taxInclusive = Math.Round(taxExclusive + taxAmount, 2);
        var payable = Math.Round(invoice.TotalAmount, 2);

        var root = new XElement(Inv + "Invoice",
            new XAttribute(XNamespace.Xmlns + "cac", CacNs),
            new XAttribute(XNamespace.Xmlns + "cbc", CbcNs),
            new XAttribute(XNamespace.Xmlns + "ext", ExtNs),
            new XAttribute(XNamespace.Xmlns + "ccts", CctsNs),

            new XElement(Cbc + "UBLVersionID", "2.1"),
            new XElement(Cbc + "CustomizationID", "urn:cen.eu:en16931:2017#compliant#urn:fatie:1:0:2017:1"),
            new XElement(Cbc + "ProfileID", profileId),
            new XElement(Cbc + "ID", invoice.InvoiceNumber),
            new XElement(Cbc + "IssueDate", issueDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)),
            new XElement(Cbc + "IssueTime", issueTime),
            new XElement(Cbc + "InvoiceTypeCode", invoiceTypeCode),
            new XElement(Cbc + "Note", string.IsNullOrWhiteSpace(invoice.Notes) ? string.Empty : invoice.Notes),
            new XElement(Cbc + "DocumentCurrencyCode", currency),
            new XElement(Cbc + "BuyerReference", string.Empty),

            BuildSupplierParty(store),
            BuildCustomerParty(invoice, buyerVatNumber),
            BuildTaxTotal(taxExclusive, taxAmount),
            BuildLegalMonetaryTotal(lineExtensionTotal, discountAmount, taxExclusive, taxAmount, taxInclusive, payable),
            invoice.Items.Select(item => BuildInvoiceLine(item, store)));

        var document = new XDocument(new XDeclaration("1.0", "UTF-8", null), root);
        return document.ToString(SaveOptions.DisableFormatting);
    }

    private static XElement BuildSupplierParty(Store store)
    {
        var vatNumber = store.VatNumber ?? string.Empty;
        return new XElement(Cac + "AccountingSupplierParty",
            new XElement(Cac + "Party",
                new XElement(Cac + "PartyName",
                    new XElement(Cbc + "Name", store.StoreName ?? string.Empty)),
                new XElement(Cac + "PostalAddress",
                    new XElement(Cbc + "StreetName", string.Empty),
                    new XElement(Cbc + "BuildingNumber", string.Empty),
                    new XElement(Cbc + "PlotIdentification", string.Empty),
                    new XElement(Cbc + "CitySubdivisionName", string.Empty),
                    new XElement(Cbc + "CityName", string.Empty),
                    new XElement(Cbc + "PostalZone", string.Empty),
                    new XElement(Cbc + "CountrySubentity", string.Empty),
                    new XElement(Cac + "Country",
                        new XElement(Cbc + "IdentificationCode", "SA"))),
                new XElement(Cac + "PartyTaxScheme",
                    new XElement(Cbc + "CompanyID", vatNumber),
                    new XElement(Cac + "TaxScheme",
                        new XElement(Cbc + "ID", "VAT")))));
    }

    private static XElement BuildCustomerParty(Invoice invoice, string? buyerVatNumber)
    {
        var partyName = !string.IsNullOrWhiteSpace(invoice.PartyName)
            ? invoice.PartyName
            : "عميل";

        var customerElements = new List<XElement>
        {
            new XElement(Cbc + "ID", "CU1"),
            new XElement(Cac + "Party",
                new XElement(Cac + "PartyName",
                    new XElement(Cbc + "Name", partyName)),
                new XElement(Cac + "PostalAddress",
                    new XElement(Cbc + "StreetName", string.Empty),
                    new XElement(Cbc + "BuildingNumber", string.Empty),
                    new XElement(Cbc + "CityName", invoice.PartyCity ?? string.Empty),
                    new XElement(Cbc + "PostalZone", string.Empty),
                    new XElement(Cac + "Country",
                        new XElement(Cbc + "IdentificationCode", "SA"))))
        };

        if (!string.IsNullOrWhiteSpace(buyerVatNumber))
        {
            customerElements.Add(new XElement(Cac + "PartyTaxScheme",
                new XElement(Cbc + "CompanyID", buyerVatNumber),
                new XElement(Cac + "TaxScheme",
                    new XElement(Cbc + "ID", "VAT"))));
        }

        return new XElement(Cac + "AccountingCustomerParty", customerElements);
    }

    private static XElement BuildTaxTotal(decimal taxableAmount, decimal taxAmount)
    {
        return new XElement(Cac + "TaxTotal",
            new XElement(Cbc + "TaxAmount", Format(taxAmount), new XAttribute("currencyID", "SAR")),
            new XElement(Cac + "TaxSubtotal",
                new XElement(Cbc + "TaxableAmount", Format(taxableAmount), new XAttribute("currencyID", "SAR")),
                new XElement(Cbc + "TaxAmount", Format(taxAmount), new XAttribute("currencyID", "SAR")),
                new XElement(Cac + "TaxCategory",
                    new XElement(Cbc + "ID", "S"),
                    new XElement(Cbc + "Percent", "15"),
                    new XElement(Cbc + "TaxScheme",
                        new XElement(Cbc + "ID", "VAT")))));
    }

    private static XElement BuildLegalMonetaryTotal(
        decimal lineExtensionTotal,
        decimal discountAmount,
        decimal taxExclusive,
        decimal taxAmount,
        decimal taxInclusive,
        decimal payable)
    {
        var total = new XElement(Cac + "LegalMonetaryTotal",
            new XElement(Cbc + "LineExtensionAmount", Format(lineExtensionTotal), new XAttribute("currencyID", "SAR")),
            new XElement(Cbc + "TaxExclusiveAmount", Format(taxExclusive), new XAttribute("currencyID", "SAR")),
            new XElement(Cbc + "TaxInclusiveAmount", Format(taxInclusive), new XAttribute("currencyID", "SAR")));

        if (discountAmount > 0)
            total.Add(new XElement(Cbc + "AllowanceTotalAmount", Format(discountAmount), new XAttribute("currencyID", "SAR")));

        total.Add(new XElement(Cbc + "PayableAmount", Format(payable), new XAttribute("currencyID", "SAR")));
        return total;
    }

    private static XElement BuildInvoiceLine(InvoiceItem item, Store store)
    {
        var unitPrice = item.UnitPrice;
        var quantity = item.Quantity;
        var lineTotal = item.LineTotal;
        var tax = Math.Round((lineTotal - item.DiscountAmount) * 0.15m, 2);

        var line = new XElement(Cac + "InvoiceLine",
            new XElement(Cbc + "ID", item.Id.ToString(CultureInfo.InvariantCulture)),
            new XElement(Cbc + "InvoicedQuantity", quantity.ToString(CultureInfo.InvariantCulture), new XAttribute("unitCode", "PCE")),
            new XElement(Cbc + "LineExtensionAmount", Format(lineTotal), new XAttribute("currencyID", "SAR")),
            new XElement(Cac + "TaxTotal",
                new XElement(Cbc + "TaxAmount", Format(tax), new XAttribute("currencyID", "SAR")),
                new XElement(Cac + "TaxSubtotal",
                    new XElement(Cbc + "TaxableAmount", Format(lineTotal - item.DiscountAmount), new XAttribute("currencyID", "SAR")),
                    new XElement(Cbc + "TaxAmount", Format(tax), new XAttribute("currencyID", "SAR")),
                    new XElement(Cac + "TaxCategory",
                        new XElement(Cbc + "ID", "S"),
                        new XElement(Cbc + "Percent", "15"),
                        new XElement(Cac + "TaxScheme",
                            new XElement(Cbc + "ID", "VAT"))))),
            new XElement(Cac + "Item",
                new XElement(Cbc + "Name", item.ProductNameSnapshot ?? string.Empty),
                new XElement(Cac + "SellersItemIdentification",
                    new XElement(Cbc + "ID", item.ProductCodeSnapshot ?? item.ProductId.ToString(CultureInfo.InvariantCulture))),
                new XElement(Cac + "ClassifiedTaxCategory",
                    new XElement(Cbc + "ID", "S"),
                    new XElement(Cbc + "Percent", "15"),
                    new XElement(Cac + "TaxScheme",
                        new XElement(Cbc + "ID", "VAT")))));

        if (item.DiscountAmount > 0)
        {
            line.Add(new XElement(Cac + "AllowanceCharge",
                new XElement(Cbc + "ChargeIndicator", "false"),
                new XElement(Cbc + "AllowanceChargeReasonCode", "95"),
                new XElement(Cbc + "Amount", Format(item.DiscountAmount), new XAttribute("currencyID", "SAR"))));
        }

        return line;
    }

    private static string Format(decimal value) => value.ToString("0.00", CultureInfo.InvariantCulture);
}

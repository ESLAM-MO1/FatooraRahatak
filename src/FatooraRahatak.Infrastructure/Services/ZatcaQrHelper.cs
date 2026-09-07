using System.Globalization;
using System.Text;
using QRCoder;

namespace FatooraRahatak.Infrastructure.Services;

// =====================================================================
// مولّد QR كود الفواتير الإلكترونية (المرحلة الأولى — فاتورة مبسطة)
// بتنسيق هيئة الزكاة والضريبة والجمارك السعودية (ZATCA) TLV:
//   1) اسم البائع   2) الرقم الضريبي   3) الوقت/التاريخ (ISO 8601)
//   4) إجمالي الفاتورة شامل الضريبة   5) إجمالي الضريبة
// ثم Base64 لكل البيانات، ويُرمَّز بالكامل داخل QR.
// =====================================================================
public static class ZatcaQrHelper
{
    public static string BuildQrBase64(
        string sellerName,
        string vatNumber,
        DateTime timestamp,
        decimal totalWithVat,
        decimal vatAmount)
    {
        var tlv = new List<byte>();
        AddTlv(tlv, 1, sellerName);
        AddTlv(tlv, 2, vatNumber);
        AddTlv(tlv, 3, timestamp.ToString("yyyy-MM-ddTHH:mm:ss"));
        AddTlv(tlv, 4, totalWithVat.ToString("0.00", CultureInfo.InvariantCulture));
        AddTlv(tlv, 5, vatAmount.ToString("0.00", CultureInfo.InvariantCulture));

        return EncodeQr(tlv);
    }

    // ⚠️ QR الفاتورة الإلكترونية (المرحلة الثانية) المبني على البيانات الموقّعة فعليًا:
    // نفس التاغات الخمسة + تاغ 6 (Hash الفاتورة الموقّعة) + تاغ 7 (التوقيع الرقمي).
    // هذا النموذج هو ما يُطلَب بعد تكامل زاتكا الفعلي (Reporting/Clearance).
    public static string BuildSignedQrBase64(
        string sellerName,
        string vatNumber,
        DateTime timestamp,
        decimal totalWithVat,
        decimal vatAmount,
        string invoiceHash,
        string digitalSignature)
    {
        var tlv = new List<byte>();
        AddTlv(tlv, 1, sellerName);
        AddTlv(tlv, 2, vatNumber);
        AddTlv(tlv, 3, timestamp.ToString("yyyy-MM-ddTHH:mm:ss"));
        AddTlv(tlv, 4, totalWithVat.ToString("0.00", CultureInfo.InvariantCulture));
        AddTlv(tlv, 5, vatAmount.ToString("0.00", CultureInfo.InvariantCulture));
        AddTlv(tlv, 6, invoiceHash);
        AddTlv(tlv, 7, digitalSignature);

        return EncodeQr(tlv);
    }

    private static string EncodeQr(List<byte> tlv)
    {
        var tlvBase64 = Convert.ToBase64String(tlv.ToArray());

        using var qrGenerator = new QRCodeGenerator();
        using var qrData = qrGenerator.CreateQrCode(tlvBase64, QRCodeGenerator.ECCLevel.M);
        using var qrCode = new PngByteQRCode(qrData);
        var png = qrCode.GetGraphic(5);
        return Convert.ToBase64String(png);
    }

    private static void AddTlv(List<byte> buffer, byte tag, string value)
    {
        var valueBytes = Encoding.UTF8.GetBytes(value ?? string.Empty);
        buffer.Add(tag);
        buffer.Add((byte)valueBytes.Length);
        buffer.AddRange(valueBytes);
    }
}

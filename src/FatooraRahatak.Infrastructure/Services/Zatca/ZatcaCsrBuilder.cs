using System.Formats.Asn1;
using System.Security.Cryptography;
using System.Text;

namespace FatooraRahatak.Infrastructure.Services.Zatca;

public static class ZatcaCsrBuilder
{
    // زاتكا بتشترط منحنى secp256k1 بالتحديد
    private const string Secp256k1Oid = "1.3.132.0.10";
    private const string EcdsaWithSha256Oid = "1.2.840.10045.4.3.2";
    private const string ExtensionRequestOid = "1.2.840.113549.1.9.14";
    private const string SubjectAltNameOid = "2.5.29.17";
    private const string ZatcaTemplateNameOid = "1.3.6.1.4.1.311.20.2";

    // SN في أدوات زاتكا الرسمية = surname (2.5.4.4)
    private const string SnSurnameOid = "2.5.4.4";
    private const string UidOid = "0.9.2342.19200300.100.1.1";
    private const string TitleOid = "2.5.4.12";
    private const string RegisteredAddressOid = "2.5.4.26";
    private const string BusinessCategoryOid = "2.5.4.15";
    private const string CnOid = "2.5.4.3";
    private const string OuOid = "2.5.4.11";
    private const string OOid = "2.5.4.10";
    private const string COid = "2.5.4.6";

    // يرجّع (CsrBase64, PrivateKeyPem)
    // CsrBase64 = Base64 لنص الـ PEM الكامل، وهي الصيغة اللي بوابة زاتكا بتطلبها في حقل csr
    public static (string CsrBase64, string PrivateKeyPem) GenerateCsr(
        string certificateTemplateName,
        string commonName,
        string organizationName,
        string organizationUnit,
        string vatNumber,
        string egsSerialNumber,
        string invoiceType,
        string address,
        string businessCategory)
    {
        commonName = Clean(commonName, 64);
        organizationName = Clean(organizationName, 64);
        organizationUnit = Clean(organizationUnit, 64);
        vatNumber = Clean(vatNumber, 15);
        egsSerialNumber = Clean(egsSerialNumber, 100);
        invoiceType = Clean(invoiceType, 4);
        address = Clean(address, 100);
        businessCategory = Clean(businessCategory, 100);

        using var ecdsa = ECDsa.Create(ECCurve.CreateFromValue(Secp256k1Oid));

        var subjectPublicKeyInfo = ecdsa.ExportSubjectPublicKeyInfo();

        var csrInfo = BuildCertificationRequestInfo(
            subjectPublicKeyInfo, certificateTemplateName, commonName, organizationName, organizationUnit,
            vatNumber, egsSerialNumber, invoiceType, address, businessCategory);

        var signature = ecdsa.SignData(csrInfo, HashAlgorithmName.SHA256, DSASignatureFormat.Rfc3279DerSequence);

        var csrDer = WrapCertificationRequest(csrInfo, signature);
        var csrPem = ToPem(csrDer);
        var csrBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(csrPem));

        return (csrBase64, ecdsa.ExportPkcs8PrivateKeyPem());
    }

    private static string ToPem(byte[] der)
    {
        var b64 = Convert.ToBase64String(der);
        var sb = new StringBuilder();
        sb.Append("-----BEGIN CERTIFICATE REQUEST-----\n");
        for (var i = 0; i < b64.Length; i += 64)
        {
            sb.Append(b64, i, Math.Min(64, b64.Length - i));
            sb.Append('\n');
        }
        sb.Append("-----END CERTIFICATE REQUEST-----\n");
        return sb.ToString();
    }

    private static string Clean(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var sb = new StringBuilder(value.Length);
        foreach (var ch in value)
            sb.Append(char.IsControl(ch) ? ' ' : ch);
        var s = string.Join(' ', sb.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
        return s.Length <= maxLength ? s : s.Substring(0, maxLength).TrimEnd();
    }

    private static byte[] BuildCertificationRequestInfo(
        byte[] subjectPublicKeyInfo,
        string certificateTemplateName,
        string commonName,
        string organizationName,
        string organizationUnit,
        string vatNumber,
        string egsSerialNumber,
        string invoiceType,
        string address,
        string businessCategory)
    {
        var writer = new AsnWriter(AsnEncodingRules.DER);
        writer.PushSequence();
        writer.WriteInteger(0);

        WriteSubjectName(writer, commonName, organizationName, organizationUnit);
        writer.WriteEncodedValue(subjectPublicKeyInfo);

        var attributesTag = new Asn1Tag(TagClass.ContextSpecific, 0);
        writer.PushSetOf(attributesTag);
        WriteExtensionRequestAttribute(writer, certificateTemplateName, vatNumber, egsSerialNumber, invoiceType, address, businessCategory);
        writer.PopSetOf(attributesTag);

        writer.PopSequence();
        return writer.Encode();
    }

    private static void WriteSubjectName(AsnWriter writer, string commonName, string organizationName, string organizationUnit)
    {
        writer.PushSequence();
        WriteRdn(writer, COid, "SA", UniversalTagNumber.PrintableString);
        WriteRdn(writer, OuOid, organizationUnit);
        WriteRdn(writer, OOid, organizationName);
        WriteRdn(writer, CnOid, commonName);
        writer.PopSequence();
    }

    private static void WriteRdn(AsnWriter writer, string oid, string value, UniversalTagNumber stringType = UniversalTagNumber.UTF8String)
    {
        writer.PushSetOf();
        writer.PushSequence();
        writer.WriteObjectIdentifier(oid);
        writer.WriteCharacterString(stringType, value ?? string.Empty);
        writer.PopSequence();
        writer.PopSetOf();
    }

    private static void WriteExtensionRequestAttribute(
        AsnWriter writer, string certificateTemplateName, string vatNumber,
        string egsSerialNumber, string invoiceType, string address, string businessCategory)
    {
        writer.PushSequence();
        writer.WriteObjectIdentifier(ExtensionRequestOid);
        writer.PushSetOf();
        writer.PushSequence();

        // نفس الإضافتين الموجودتين في CSR أداة زاتكا الرسمية: اسم القالب + SAN
        WriteExtension(writer, ZatcaTemplateNameOid, BuildPrintableStringValue(certificateTemplateName));
        WriteExtension(writer, SubjectAltNameOid, BuildSubjectAltNameValue(vatNumber, egsSerialNumber, invoiceType, address, businessCategory));

        writer.PopSequence();
        writer.PopSetOf();
        writer.PopSequence();
    }

    private static void WriteExtension(AsnWriter writer, string oid, byte[] extnValueContent)
    {
        writer.PushSequence();
        writer.WriteObjectIdentifier(oid);
        writer.WriteOctetString(extnValueContent);
        writer.PopSequence();
    }

    private static byte[] BuildPrintableStringValue(string value)
    {
        var w = new AsnWriter(AsnEncodingRules.DER);
        w.WriteCharacterString(UniversalTagNumber.PrintableString, value);
        return w.Encode();
    }

    private static byte[] BuildSubjectAltNameValue(string vatNumber, string egsSerialNumber, string invoiceType, string address, string businessCategory)
    {
        var w = new AsnWriter(AsnEncodingRules.DER);

        w.PushSequence();                                   // GeneralNames
        var directoryNameTag = new Asn1Tag(TagClass.ContextSpecific, 4, isConstructed: true);
        w.PushSequence(directoryNameTag);                   // [4] directoryName (EXPLICIT)
        w.PushSequence();                                   // Name -> RDNSequence (كان ناقص)
        WriteRdn(w, SnSurnameOid, egsSerialNumber);
        WriteRdn(w, UidOid, vatNumber);
        WriteRdn(w, TitleOid, invoiceType);
        WriteRdn(w, RegisteredAddressOid, address);
        WriteRdn(w, BusinessCategoryOid, businessCategory);
        w.PopSequence();
        w.PopSequence(directoryNameTag);
        w.PopSequence();

        return w.Encode();
    }

    private static byte[] WrapCertificationRequest(byte[] csrInfo, byte[] signature)
    {
        var writer = new AsnWriter(AsnEncodingRules.DER);
        writer.PushSequence();
        writer.WriteEncodedValue(csrInfo);

        writer.PushSequence();
        writer.WriteObjectIdentifier(EcdsaWithSha256Oid);
        writer.PopSequence();

        writer.WriteBitString(signature);
        writer.PopSequence();
        return writer.Encode();
    }
}

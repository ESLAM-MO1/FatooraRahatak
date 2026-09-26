using System.Formats.Asn1;
using System.Security.Cryptography;

namespace FatooraRahatak.Infrastructure.Services.Zatca;

public static class ZatcaCsrBuilder
{
    // زاتكا بتشترط منحنى secp256k1 بالتحديد - مش P-256 القياسي، ومش RSA خالص
    private const string Secp256k1Oid = "1.3.132.0.10";
    private const string EcdsaWithSha256Oid = "1.2.840.10045.4.3.2";
    private const string ExtensionRequestOid = "1.2.840.113549.1.9.14";
    private const string SubjectAltNameOid = "2.5.29.17";
    private const string BasicConstraintsOid = "2.5.29.19";
    private const string KeyUsageOid = "2.5.29.15";
    private const string ZatcaTemplateNameOid = "1.3.6.1.4.1.311.20.2";

    // ملحوظة مهمة: SN هنا بتستخدم OID بتاع "surname" (2.5.4.4) مش "serialNumber" (2.5.4.5)
    // ده مش غلط مني - ده الـ mapping اللي زاتكا نفسها بتستخدمه في أدواتها الرسمية
    private const string SnSurnameOid = "2.5.4.4";
    private const string UidOid = "0.9.2342.19200300.100.1.1";
    private const string TitleOid = "2.5.4.12";
    private const string RegisteredAddressOid = "2.5.4.26";
    private const string BusinessCategoryOid = "2.5.4.15";
    private const string CnOid = "2.5.4.3";
    private const string OuOid = "2.5.4.11";
    private const string OOid = "2.5.4.10";
    private const string COid = "2.5.4.6";

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
        using var ecdsa = ECDsa.Create(ECCurve.CreateFromValue(Secp256k1Oid));

        var subjectPublicKeyInfo = ecdsa.ExportSubjectPublicKeyInfo();

        var csrInfo = BuildCertificationRequestInfo(
            subjectPublicKeyInfo, certificateTemplateName, commonName, organizationName, organizationUnit,
            vatNumber, egsSerialNumber, invoiceType, address, businessCategory);

        var signature = ecdsa.SignData(csrInfo, HashAlgorithmName.SHA256, DSASignatureFormat.Rfc3279DerSequence);

        var csr = WrapCertificationRequest(csrInfo, signature);

        return (Convert.ToBase64String(csr), ecdsa.ExportPkcs8PrivateKeyPem());
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

        writer.PushSetOf(new Asn1Tag(TagClass.ContextSpecific, 0));
        WriteExtensionRequestAttribute(writer, certificateTemplateName, vatNumber, egsSerialNumber, invoiceType, address, businessCategory);
        writer.PopSetOf(new Asn1Tag(TagClass.ContextSpecific, 0));

        writer.PopSequence();
        return writer.Encode();
    }

    private static void WriteSubjectName(AsnWriter writer, string commonName, string organizationName, string organizationUnit)
    {
        writer.PushSequence();
        WriteRdn(writer, COid, "SA");
        WriteRdn(writer, OuOid, organizationUnit);
        WriteRdn(writer, OOid, organizationName);
        WriteRdn(writer, CnOid, commonName);
        writer.PopSequence();
    }

    private static void WriteRdn(AsnWriter writer, string oid, string value)
    {
        writer.PushSetOf();
        writer.PushSequence();
        writer.WriteObjectIdentifier(oid);
        writer.WriteCharacterString(UniversalTagNumber.UTF8String, value ?? string.Empty);
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

        WriteExtension(writer, ZatcaTemplateNameOid, BuildPrintableStringValue(certificateTemplateName));
        WriteExtension(writer, BasicConstraintsOid, BuildEmptySequenceValue());
        WriteExtension(writer, KeyUsageOid, BuildKeyUsageValue());
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

    private static byte[] BuildEmptySequenceValue()
    {
        var w = new AsnWriter(AsnEncodingRules.DER);
        w.PushSequence();
        w.PopSequence();
        return w.Encode();
    }

    private static byte[] BuildKeyUsageValue()
    {
        var w = new AsnWriter(AsnEncodingRules.DER);
        w.WriteBitString(new byte[] { 0xC0 }, 6);
        return w.Encode();
    }

    private static byte[] BuildSubjectAltNameValue(string vatNumber, string egsSerialNumber, string invoiceType, string address, string businessCategory)
    {
        var w = new AsnWriter(AsnEncodingRules.DER);
        w.PushSequence();

        w.PushSequence(new Asn1Tag(TagClass.ContextSpecific, 4, isConstructed: true));
        w.PushSequence();
        WriteRdn(w, SnSurnameOid, egsSerialNumber);
        WriteRdn(w, UidOid, vatNumber);
        WriteRdn(w, TitleOid, invoiceType);
        WriteRdn(w, RegisteredAddressOid, address);
        WriteRdn(w, BusinessCategoryOid, businessCategory);
        w.PopSequence();
        w.PopSequence();

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

using System.Formats.Asn1;
using System.Security.Cryptography;

namespace FatooraRahatak.Infrastructure.Services.Zatca;

public static class ZatcaCsrBuilder
{
    private const string RsaPssOid = "1.2.840.113549.1.1.10";
    private const string Sha256Oid = "2.16.840.1.101.3.4.2.1";
    private const string RsaEncryptionOid = "1.2.840.113549.1.1.1";

    public static (string CsrBase64, string PrivateKeyPem) GenerateCsr(
        string vatNumber,
        string organizationName,
        string organizationUnit,
        string serialNumber)
    {
        using var rsa = RSA.Create(2048);
        var publicKey = rsa.ExportParameters(false);

        var csrInfo = BuildCertificationRequestInfo(publicKey, vatNumber, organizationName, organizationUnit, serialNumber);

        var signature = rsa.SignData(csrInfo, HashAlgorithmName.SHA256, RSASignaturePadding.Pss);

        var csr = WrapCertificationRequest(csrInfo, signature);

        return (Convert.ToBase64String(csr), rsa.ExportPkcs8PrivateKeyPem());
    }

    private static byte[] BuildCertificationRequestInfo(
        RSAParameters publicKey,
        string vatNumber,
        string organizationName,
        string organizationUnit,
        string serialNumber)
    {
        var writer = new AsnWriter(AsnEncodingRules.DER);
        writer.PushSequence();
        writer.WriteInteger(0);

        WriteSubjectName(writer, vatNumber, organizationName, organizationUnit, serialNumber);
        WriteSubjectPublicKeyInfo(writer, publicKey);

        writer.PushSequence(new Asn1Tag(TagClass.ContextSpecific, 0));
        writer.PopSequence();

        return writer.Encode();
    }

    private static void WriteSubjectName(AsnWriter writer, string vatNumber, string organizationName, string organizationUnit, string serialNumber)
    {
        writer.PushSequence();
        WriteRdn(writer, "2.5.4.3", vatNumber);
        WriteRdn(writer, "0.9.2342.19200300.100.1.1", vatNumber);
        WriteRdn(writer, "2.5.4.5", serialNumber);
        WriteRdn(writer, "2.5.4.11", organizationUnit);
        WriteRdn(writer, "2.5.4.10", organizationName);
        WriteRdn(writer, "2.5.4.6", "SA");
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

    private static void WriteSubjectPublicKeyInfo(AsnWriter writer, RSAParameters publicKey)
    {
        var rsaPublicKey = new AsnWriter(AsnEncodingRules.DER);
        rsaPublicKey.PushSequence();
        rsaPublicKey.WriteIntegerUnsigned(publicKey.Modulus);
        rsaPublicKey.WriteIntegerUnsigned(publicKey.Exponent);
        var spkiKey = rsaPublicKey.Encode();

        writer.PushSequence();
        writer.PushSequence();
        writer.WriteObjectIdentifier(RsaEncryptionOid);
        writer.WriteNull();
        writer.PopSequence();
        writer.WriteBitString(spkiKey);
        writer.PopSequence();
    }

    private static byte[] WrapCertificationRequest(byte[] csrInfo, byte[] signature)
    {
        var writer = new AsnWriter(AsnEncodingRules.DER);
        writer.PushSequence();
        writer.WriteEncodedValue(csrInfo);
        WriteRsaPssAlgorithm(writer);
        writer.WriteBitString(signature);
        return writer.Encode();
    }

    private static void WriteRsaPssAlgorithm(AsnWriter writer)
    {
        writer.PushSequence();
        writer.WriteObjectIdentifier(RsaPssOid);
        writer.PushSequence();

        writer.PushSequence(new Asn1Tag(TagClass.ContextSpecific, 0));
        writer.PushSequence();
        writer.WriteObjectIdentifier(Sha256Oid);
        writer.WriteNull();
        writer.PopSequence();
        writer.PopSequence();

        writer.PushSequence(new Asn1Tag(TagClass.ContextSpecific, 1));
        writer.PushSequence();
        writer.WriteObjectIdentifier(RsaPssOid);
        writer.PushSequence();
        writer.PushSequence(new Asn1Tag(TagClass.ContextSpecific, 0));
        writer.PushSequence();
        writer.WriteObjectIdentifier(Sha256Oid);
        writer.WriteNull();
        writer.PopSequence();
        writer.PopSequence();
        writer.PushSequence(new Asn1Tag(TagClass.ContextSpecific, 1));
        writer.PushSequence();
        writer.WriteObjectIdentifier(Sha256Oid);
        writer.WriteNull();
        writer.PopSequence();
        writer.PopSequence();
        writer.WriteInteger(32);
        writer.WriteInteger(1);
        writer.PopSequence();
        writer.PopSequence();
        writer.PopSequence();

        writer.PushSequence(new Asn1Tag(TagClass.ContextSpecific, 2));
        writer.WriteInteger(32);
        writer.PopSequence();

        writer.PushSequence(new Asn1Tag(TagClass.ContextSpecific, 3));
        writer.WriteInteger(1);
        writer.PopSequence();

        writer.PopSequence();
        writer.PopSequence();
    }
}

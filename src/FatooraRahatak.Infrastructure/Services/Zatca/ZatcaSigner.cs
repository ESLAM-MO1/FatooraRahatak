using System.Security.Cryptography;
using System.Security.Cryptography.Xml;
using System.Text;
using System.Xml;

namespace FatooraRahatak.Infrastructure.Services.Zatca;

public static class ZatcaSigner
{
    private const string DsNs = "http://www.w3.org/2000/09/xmldsig#";
    private const string XadesNs = "http://uri.etsi.org/01903/v1.3.2#";
    private const string ExtNs = "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2";
    private const string SigNs = "urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2";
    private const string SacNs = "urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2";
    private const string SbcNs = "urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2";
    private const string InvoiceNs = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2";

    private const string C14N = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
    private const string Sha256 = "http://www.w3.org/2001/04/xmlenc#sha256";
    private const string RsaPss = "http://www.w3.org/2007/05/xmldsig-more#rsa-pss";
    private const string Enveloped = "http://www.w3.org/2000/09/xmldsig#enveloped-signature";

    public static ZatcaSignatureResult Sign(string unsignedXml, string privateKeyPem, string certificateDerBase64)
    {
        var doc = new XmlDocument { PreserveWhitespace = false };
        doc.LoadXml(unsignedXml);

        using var rsa = LoadPrivateKey(privateKeyPem);
        var certDer = Convert.FromBase64String(certificateDerBase64);
        var certDigest = Convert.ToBase64String(SHA256.HashData(certDer));

        EnsureExtensionWrapper(doc);

        var signedPropsId = "xades-signedprops-" + Guid.NewGuid().ToString("N");
        var signingTime = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");

        var signingCertificate = BuildSigningCertificate(certDer, certDigest);

        var signedProperties = BuildSignedProperties(signedPropsId, signingTime, signingCertificate);
        var signedPropsDigest = CanonicalizeDigest(signedProperties);

        var invoiceDigest = Convert.ToBase64String(CanonicalizeDigest(doc));

        var signedInfo = BuildSignedInfo(invoiceDigest, signedPropsId, signedPropsDigest);
        var signedInfoCanonical = CanonicalizeBytes(signedInfo);
        var signatureValue = rsa.SignData(signedInfoCanonical, HashAlgorithmName.SHA256, RSASignaturePadding.Pss);

        var fullSignature = BuildFullSignature(signedInfo, signatureValue, certDer, signedProperties);

        AddSignatureToDocument(doc, fullSignature);

        var signedXml = CanonicalizeToString(doc);
        var invoiceHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(signedXml)));

        return new ZatcaSignatureResult
        {
            SignedXml = signedXml,
            InvoiceHash = invoiceHash,
            SignatureValueBase64 = Convert.ToBase64String(signatureValue)
        };
    }

    private static string BuildSigningCertificate(byte[] certDer, string certDigest)
    {
        var builder = new StringBuilder();
        builder.Append("<xades:SigningCertificate xmlns:ds=\"").Append(DsNs).Append("\" xmlns:xades=\"").Append(XadesNs).Append("\">");
        builder.Append("<xades:Cert>");
        builder.Append("<xades:CertDigest>");
        builder.Append("<ds:DigestMethod Algorithm=\"").Append(Sha256).Append("\"/>");
        builder.Append("<ds:DigestValue>").Append(certDigest).Append("</ds:DigestValue>");
        builder.Append("</xades:CertDigest>");
        builder.Append("<xades:IssuerSerial>");
        builder.Append("<ds:X509IssuerName>").Append(XmlEncode(GetIssuerName(certDer))).Append("</ds:X509IssuerName>");
        builder.Append("<ds:X509SerialNumber>").Append(GetSerialNumber(certDer)).Append("</ds:X509SerialNumber>");
        builder.Append("</xades:IssuerSerial>");
        builder.Append("</xades:Cert>");
        builder.Append("</xades:SigningCertificate>");
        return builder.ToString();
    }

    private static string BuildSignedProperties(string id, string signingTime, string signingCertificate)
    {
        return "<xades:SignedProperties xmlns:ds=\"" + DsNs + "\" xmlns:xades=\"" + XadesNs + "\" Id=\"" + id + "\">" +
               "<xades:SignedSignatureProperties>" +
               "<xades:SigningTime>" + signingTime + "</xades:SigningTime>" +
               signingCertificate +
               "</xades:SignedSignatureProperties>" +
               "<xades:SignedDataObjectProperties>" +
               "<xades:DataObjectFormat ObjectReference=\"#Invoice\">" +
               "<xades:Description>text/xml</xades:Description>" +
               "<xades:ObjectIdentifier>" +
               "<xades:Identifier Qualifier=\"OIDAsURN\">urn:oasis:names:specification:ubl:schema:xsd:Invoice-2</xades:Identifier>" +
               "</xades:ObjectIdentifier>" +
               "</xades:DataObjectFormat>" +
               "</xades:SignedDataObjectProperties>" +
               "</xades:SignedProperties>";
    }

    private static string BuildSignedInfo(string invoiceDigest, string signedPropsId, byte[] signedPropsDigest)
    {
        return "<ds:SignedInfo xmlns:ds=\"" + DsNs + "\">" +
               "<ds:CanonicalizationMethod Algorithm=\"" + C14N + "\"/>" +
               "<ds:SignatureMethod Algorithm=\"" + RsaPss + "\">" +
               "<ds:DigestMethod Algorithm=\"" + Sha256 + "\"/>" +
               "</ds:SignatureMethod>" +
               "<ds:Reference Id=\"Invoice\" URI=\"\">" +
               "<ds:Transforms>" +
               "<ds:Transform Algorithm=\"" + Enveloped + "\"/>" +
               "<ds:Transform Algorithm=\"" + C14N + "\"/>" +
               "</ds:Transforms>" +
               "<ds:DigestMethod Algorithm=\"" + Sha256 + "\"/>" +
               "<ds:DigestValue>" + invoiceDigest + "</ds:DigestValue>" +
               "</ds:Reference>" +
               "<ds:Reference URI=\"#" + signedPropsId + "\">" +
               "<ds:Transforms>" +
               "<ds:Transform Algorithm=\"" + C14N + "\"/>" +
               "</ds:Transforms>" +
               "<ds:DigestMethod Algorithm=\"" + Sha256 + "\"/>" +
               "<ds:DigestValue>" + Convert.ToBase64String(signedPropsDigest) + "</ds:DigestValue>" +
               "</ds:Reference>" +
               "</ds:SignedInfo>";
    }

    private static string BuildFullSignature(
        string signedInfo,
        byte[] signatureValue,
        byte[] certDer,
        string signedProperties)
    {
        var signature = new StringBuilder();
        signature.Append("<ds:Signature xmlns:ds=\"").Append(DsNs).Append("\" Id=\"signature\">");
        signature.Append(signedInfo);
        signature.Append("<ds:SignatureValue>").Append(Convert.ToBase64String(signatureValue)).Append("</ds:SignatureValue>");
        signature.Append("<ds:KeyInfo>");
        signature.Append("<ds:X509Data>");
        signature.Append("<ds:X509Certificate>").Append(Convert.ToBase64String(certDer)).Append("</ds:X509Certificate>");
        signature.Append("</ds:X509Data>");
        signature.Append("</ds:KeyInfo>");
        signature.Append("<ds:Object>");
        signature.Append("<xades:QualifyingProperties xmlns:ds=\"").Append(DsNs)
            .Append("\" xmlns:xades=\"").Append(XadesNs).Append("\" Target=\"#signature\">");
        signature.Append(signedProperties);
        signature.Append("</xades:QualifyingProperties>");
        signature.Append("</ds:Object>");
        signature.Append("</ds:Signature>");
        return signature.ToString();
    }

    private static void EnsureExtensionWrapper(XmlDocument doc)
    {
        var root = doc.DocumentElement!;
        if (root.SelectSingleNode("ext:UBLExtensions", GetNsmgr(root)) != null)
            return;

        var ublExtensions = doc.CreateElement("ext", "UBLExtensions", ExtNs);
        root.PrependChild(ublExtensions);
    }

    private static void AddSignatureToDocument(XmlDocument doc, string fullSignature)
    {
        var root = doc.DocumentElement!;
        var ublExtensions = root.SelectSingleNode("ext:UBLExtensions", GetNsmgr(root));
        if (ublExtensions == null)
        {
            ublExtensions = doc.CreateElement("ext", "UBLExtensions", ExtNs);
            root.PrependChild(ublExtensions);
        }

        var ublExtension = doc.CreateElement("sig", "UBLExtension", SigNs);
        var extensionUri = doc.CreateElement("ext", "ExtensionURI", ExtNs);
        extensionUri.InnerText = "urn:oasis:names:specification:ubl:dsig:enveloped:xades";
        ublExtension.AppendChild(extensionUri);

        var extensionContent = doc.CreateElement("ext", "ExtensionContent", ExtNs);

        var signatureFragment = new XmlDocument();
        signatureFragment.LoadXml(fullSignature);
        extensionContent.AppendChild(doc.ImportNode(signatureFragment.DocumentElement!, true));

        ublExtension.AppendChild(extensionContent);
        ublExtensions.AppendChild(ublExtension);
    }

    private static XmlNamespaceManager GetNsmgr(XmlElement root)
    {
        var nsmgr = new XmlNamespaceManager(root.OwnerDocument.NameTable);
        nsmgr.AddNamespace("ext", ExtNs);
        nsmgr.AddNamespace("sig", SigNs);
        nsmgr.AddNamespace("sac", SacNs);
        nsmgr.AddNamespace("sbc", SbcNs);
        return nsmgr;
    }

    private static byte[] CanonicalizeDigest(XmlDocument doc)
    {
        var transform = new XmlDsigC14NTransform();
        transform.LoadInput(doc);
        using var hash = SHA256.Create();
        return transform.GetDigestedOutput(hash);
    }

    private static byte[] CanonicalizeDigest(string xml)
    {
        var doc = new XmlDocument { PreserveWhitespace = false };
        doc.LoadXml(xml);
        return CanonicalizeDigest(doc);
    }

    private static byte[] CanonicalizeBytes(string xml)
    {
        var doc = new XmlDocument { PreserveWhitespace = false };
        doc.LoadXml(xml);
        var transform = new XmlDsigC14NTransform();
        transform.LoadInput(doc);
        using var stream = (System.IO.Stream)transform.GetOutput()!;
        using var reader = new System.IO.StreamReader(stream);
        return Encoding.UTF8.GetBytes(reader.ReadToEnd());
    }

    private static string CanonicalizeToString(XmlDocument doc)
    {
        var transform = new XmlDsigC14NTransform();
        transform.LoadInput(doc);
        using var stream = (System.IO.Stream)transform.GetOutput()!;
        using var reader = new System.IO.StreamReader(stream);
        return reader.ReadToEnd();
    }

    private static RSA LoadPrivateKey(string privateKeyPem)
    {
        var key = privateKeyPem?.Trim() ?? string.Empty;
        try
        {
            if (key.StartsWith("-----BEGIN"))
            {
                var rsa = RSA.Create();
                rsa.ImportFromPem(key);
                return rsa;
            }
        }
        catch
        {
        }

        var der = key.Contains("-----")
            ? Convert.FromBase64String(string.Concat(key.Split('\n', '\r').Where(l => !l.Contains("BEGIN") && !l.Contains("END") && !string.IsNullOrWhiteSpace(l))))
            : Convert.FromBase64String(key);
        try
        {
            var rsa = RSA.Create();
            rsa.ImportPkcs8PrivateKey(der, out _);
            return rsa;
        }
        catch
        {
            var rsa = RSA.Create();
            rsa.ImportRSAPrivateKey(der, out _);
            return rsa;
        }
    }

    private static string GetIssuerName(byte[] certDer)
    {
        using var cert = new System.Security.Cryptography.X509Certificates.X509Certificate2(certDer);
        return cert.IssuerName.Name ?? string.Empty;
    }

    private static string GetSerialNumber(byte[] certDer)
    {
        using var cert = new System.Security.Cryptography.X509Certificates.X509Certificate2(certDer);
        var serial = cert.GetSerialNumber();
        Array.Reverse(serial);
        var decimalValue = new System.Numerics.BigInteger(serial, isUnsigned: true, isBigEndian: true);
        return decimalValue.ToString();
    }

    private static string XmlEncode(string value) =>
        value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");
}

public class ZatcaSignatureResult
{
    public string SignedXml { get; set; } = string.Empty;
    public string InvoiceHash { get; set; } = string.Empty;
    public string SignatureValueBase64 { get; set; } = string.Empty;
}

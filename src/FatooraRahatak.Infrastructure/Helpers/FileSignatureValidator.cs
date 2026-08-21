namespace FatooraRahatak.Infrastructure.Helpers;

/// <summary>
/// تحقق حقيقي من هوية الملف عبر توقيعه (Magic Bytes) بدل الاعتماد على الامتداد فقط.
/// </summary>
public static class FileSignatureValidator
{
    private static bool StartsWith(byte[] data, byte[] signature, int start = 0)
    {
        if (data.Length < start + signature.Length)
            return false;

        for (var i = 0; i < signature.Length; i++)
        {
            if (data[start + i] != signature[i])
                return false;
        }

        return true;
    }

    /// <summary>JPG / JPEG: FF D8 FF</summary>
    public static bool IsJpeg(byte[] header) =>
        header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF;

    /// <summary>PNG: 89 50 4E 47 0D 0A 1A 0A</summary>
    public static bool IsPng(byte[] header) =>
        StartsWith(header, new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A });

    /// <summary>WebP: RIFF .... WEBP</summary>
    public static bool IsWebp(byte[] header) =>
        header.Length >= 12
        && StartsWith(header, new byte[] { 0x52, 0x49, 0x46, 0x46 }) // "RIFF"
        && StartsWith(header, new byte[] { 0x57, 0x45, 0x42, 0x50 }, 8); // "WEBP"

    /// <summary>PDF: %PDF</summary>
    public static bool IsPdf(byte[] header) =>
        StartsWith(header, new byte[] { 0x25, 0x50, 0x44, 0x46 });

    /// <summary>يطابق محتوى الملف مع الامتداد المعلن (jpg/png/webp/pdf فقط).</summary>
    public static bool MatchesExtension(byte[] header, string extension)
    {
        return (extension.ToLowerInvariant()) switch
        {
            ".jpg" or ".jpeg" => IsJpeg(header),
            ".png" => IsPng(header),
            ".webp" => IsWebp(header),
            ".pdf" => IsPdf(header),
            _ => false
        };
    }
}

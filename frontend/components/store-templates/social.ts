export function resolveSocialUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const v = url.trim();
  if (!v) return null;
  const lower = v.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) return v;
  if (lower.startsWith("dashboard/") || lower.startsWith("/dashboard")) return null;
  if (lower.startsWith("www.")) return `https://${v}`;
  if (
    lower.startsWith("wa.me/") ||
    lower.startsWith("m.me/") ||
    lower.startsWith("t.me/") ||
    lower.startsWith("snapchat.com/") ||
    lower.startsWith("instagram.com/") ||
    lower.startsWith("facebook.com/") ||
    lower.startsWith("twitter.com/") ||
    lower.startsWith("x.com/") ||
    lower.startsWith("youtube.com/") ||
    lower.startsWith("tiktok.com/") ||
    lower.includes(".")
  ) {
    return `https://${v}`;
  }
  return null;
}
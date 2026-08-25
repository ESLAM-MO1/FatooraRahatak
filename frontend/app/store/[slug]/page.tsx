import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE}/public/stores/${slug}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = (await res.json())?.data;
      return { title: data?.storeName || "فاتورة راحتك", description: data?.storeName || "فاتورة راحتك" };
    }
  } catch {}
  return { title: "فاتورة راحتك" };
}

export default function StorePage() {
  return null;
}

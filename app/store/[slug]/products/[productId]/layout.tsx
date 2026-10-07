import type { Metadata } from "next";

type Params = { slug: string; productId: string };

async function loadProduct(slug: string, productId: string) {
  try {
    const res = await fetch(
      `http://127.0.0.1:5092/api/v1/public/stores/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, productId } = await params;
  const p = await loadProduct(slug, productId);
  if (!p) return {};
  const title: string = (p.seoTitle && String(p.seoTitle).trim()) || p.nameAr || p.nameEn;
  const raw: string = (p.seoDescription && String(p.seoDescription).trim()) || p.descriptionAr || "";
  const description = raw.replace(/\s+/g, " ").trim().slice(0, 160) || undefined;
  const imgs: { imageUrl: string; isPrimary: boolean; sortOrder: number }[] = Array.isArray(p.images) ? p.images : [];
  const primary = [...imgs].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)[0];
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: primary ? [primary.imageUrl] : undefined },
    twitter: { card: primary ? "summary_large_image" : "summary", title, description, images: primary ? [primary.imageUrl] : undefined },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}

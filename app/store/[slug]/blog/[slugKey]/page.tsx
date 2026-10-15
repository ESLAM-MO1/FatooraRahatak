"use client";
import { useEffect, useState } from "react";
import { useParams, redirect, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { useStore } from "@/components/StoreContext";
import { useStorePageContent } from "@/lib/storePages";
import api from "@/lib/api";

interface BlogPost {
  id: number;
  titleAr: string;
  titleEn: string;
  slugAr: string;
  slugEn: string;
  contentAr: string;
  contentEn: string;
  featuredImage: string | null;
  authorName: string;
  publishedAt: string | null;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const slugKey = params.slugKey as string;
  const router = useRouter();
  const store = useStore();
  const { i18n } = useTranslation();
  const isAr = i18n.language !== "en";
  const { isEnabled } = useStorePageContent("blog");
  // null = loading، "missing" = المقال غير موجود أو غير منشور
  const [post, setPost] = useState<BlogPost | null | "missing">(null);
  // useParams ممكن يرجّع قيمة slugKey بترميزها الأصلي في الرابط (%D8..) — نفك
  // الترميز دفاعيًا قبل إعادة الترميز عشان الطلب ما يبقاش مُرمّز مرتين ويرجّع 404.
  let key = slugKey;
  try {
    key = decodeURIComponent(slugKey);
  } catch {
    key = slugKey;
  }

  useEffect(() => {
    let alive = true;
    api
      .get(`/public/stores/${slug}/blog/${encodeURIComponent(key)}`)
      .then((r) => {
        if (!alive) return;
        if (r.data?.data) setPost(r.data.data);
        else {
          setPost("missing");
          router.replace(`/store/${slug}/blog`);
        }
      })
      .catch(() => {
        if (!alive) return;
        setPost("missing");
        router.replace(`/store/${slug}/blog`);
      });
    return () => {
      alive = false;
    };
  }, [slug, slugKey, key, router]);

  if (!isEnabled) redirect(`/store/${slug}`);

  const fmtDate = (iso: string | null) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(isAr ? "ar-EG" : "en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  if (post === null || post === "missing") {
    return (
      <div className="max-w-3xl mx-auto px-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 animate-pulse" aria-hidden="true">
          <div className="h-4 rounded mb-6" style={{ background: "#F3F4F6", width: "30%" }} />
          <div className="h-7 rounded mb-4" style={{ background: "#F3F4F6", width: "75%" }} />
          <div style={{ aspectRatio: "16/9", background: "#F3F4F6", borderRadius: 16 }} />
          <div className="h-3 rounded mt-4" style={{ background: "#F3F4F6", width: "95%" }} />
          <div className="h-3 rounded mt-2" style={{ background: "#F3F4F6", width: "88%" }} />
        </div>
      </div>
    );
  }

  const postTitle = (isAr ? post.titleAr : post.titleEn) || post.titleAr || post.titleEn || "";
  const body = (isAr ? post.contentAr : post.contentEn) || post.contentAr || post.contentEn || "";

  return (
    <div className="max-w-3xl mx-auto px-0">
      <nav className="mb-6" aria-label="breadcrumb">
        <a
          href={`/store/${slug}/blog`}
          className="text-[13px] font-bold hover:underline"
          style={{ color: "var(--blue, #2563eb)" }}
        >
          {isAr ? "العودة للمدونة" : "Back to blog"}
        </a>
      </nav>

      <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl sm:text-[30px] font-extrabold mb-4 leading-snug" style={{ color: "#111827" }}>
          {postTitle}
        </h1>

        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] mb-6 pb-5 border-b border-gray-100"
          style={{ color: "#9CA3AF" }}
        >
          {post.authorName && <span>✍️ {post.authorName}</span>}
          {post.publishedAt && <span>🗓 {fmtDate(post.publishedAt)}</span>}
        </div>

        {post.featuredImage && (
          <div className="rounded-2xl overflow-hidden mb-6" style={{ background: "#F3F4F6" }}>
            <img src={post.featuredImage} alt={postTitle} className="w-full h-auto block" />
          </div>
        )}

        <div
          className="whitespace-pre-wrap leading-relaxed text-[15px]"
          style={{ color: "#374151", lineHeight: 1.9 }}
        >
          {body}
        </div>

        {store.storeName && (
          <div className="mt-8 pt-5 border-t border-gray-100 text-[12px]" style={{ color: "#9CA3AF" }}>
            © {new Date().getFullYear()} {store.storeName}
          </div>
        )}
      </article>
    </div>
  );
}

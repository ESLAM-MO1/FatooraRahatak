"use client";
import { useEffect, useState } from "react";
import { useParams, redirect } from "next/navigation";
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

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

export default function BlogPage() {
  const params = useParams();
  const slug = params.slug as string;
  const store = useStore();
  const { title, content, isEnabled } = useStorePageContent("blog");
  const { t, i18n } = useTranslation();
  const isAr = i18n.language !== "en";
  const [posts, setPosts] = useState<BlogPost[] | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get(`/public/stores/${slug}/blog`)
      .then((r) => alive && setPosts(Array.isArray(r.data?.data) ? r.data.data : []))
      .catch(() => alive && setPosts([]));
    return () => {
      alive = false;
    };
  }, [slug]);

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

  return (
    <div className="max-w-5xl mx-auto px-0">
      <nav className="mb-6" aria-label="breadcrumb">
        <a
          href={`/store/${slug}`}
          className="text-[13px] font-bold hover:underline"
          style={{ color: "var(--blue, #2563eb)" }}
        >
          {t("storePages.backToStore")}
        </a>
      </nav>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl sm:text-[28px] font-extrabold mb-3 leading-snug" style={{ color: "#111827" }}>
          {title}
        </h1>
        {content && (
          <div className="whitespace-pre-wrap leading-relaxed text-[14px] mb-6" style={{ color: "#6B7280", lineHeight: 1.9 }}>
            {content}
          </div>
        )}

        {posts === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div style={{ aspectRatio: "16/10", background: "#F3F4F6" }} />
                <div className="p-4 space-y-2">
                  <div className="h-4 rounded" style={{ background: "#F3F4F6", width: "70%" }} />
                  <div className="h-3 rounded" style={{ background: "#F3F4F6", width: "90%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-gray-200" style={{ background: "#F9FAFB" }}>
            <div className="text-[34px] mb-2">📝</div>
            <p className="text-[14px] font-bold" style={{ color: "#6B7280" }}>
              {isAr ? "لا توجد مقالات منشورة بعد" : "No published posts yet"}
            </p>
            <p className="text-[12px] mt-1" style={{ color: "#9CA3AF" }}>
              {isAr ? "عد لاحقًا لقراءة أحدث المقالات" : "Check back later for the latest posts"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => {
              const postTitle = (isAr ? post.titleAr : post.titleEn) || post.titleAr || post.titleEn || "";
              const body = collapse((isAr ? post.contentAr : post.contentEn) || post.contentAr || post.contentEn || "");
              const excerpt = body.length > 150 ? `${body.slice(0, 150)}…` : body;
              const key = post.slugAr || post.slugEn || String(post.id);
              const postSlug = encodeURIComponent(key);
              return (
                <a
                  key={post.id}
                  href={`/store/${slug}/blog/${postSlug}`}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                >
                  <div className="overflow-hidden" style={{ aspectRatio: "16/10", background: "#F3F4F6" }}>
                    {post.featuredImage ? (
                      <img
                        src={post.featuredImage}
                        alt={postTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-[30px]"
                        style={{ background: "linear-gradient(135deg, #EFF6FF, #F5F3FF)" }}
                      >
                        📝
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h2 className="text-[15px] font-extrabold mb-2 leading-snug" style={{ color: "#111827" }}>
                      {postTitle}
                    </h2>
                    {excerpt && (
                      <p className="text-[13px] leading-relaxed mb-3 flex-1" style={{ color: "#6B7280" }}>
                        {excerpt}
                      </p>
                    )}
                    <div
                      className="flex items-center justify-between text-[11px] pt-3 border-t border-gray-100 gap-2"
                      style={{ color: "#9CA3AF" }}
                    >
                      <span className="truncate">{post.authorName}</span>
                      <span className="shrink-0">{fmtDate(post.publishedAt)}</span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {store.storeName && (
          <div className="mt-8 pt-5 border-t border-gray-100 text-[12px]" style={{ color: "#9CA3AF" }}>
            © {new Date().getFullYear()} {store.storeName}
          </div>
        )}
      </div>
    </div>
  );
}

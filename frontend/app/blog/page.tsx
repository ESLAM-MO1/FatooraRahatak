"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { SiteLayout } from "../site-layout";
import Hero from "@/components/Hero";
import LoadingState from "@/components/LoadingState";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

interface BlogPost {
  id: number;
  titleAr: string;
  slugAr: string;
  contentAr: string;
  authorName: string;
  featuredImage: string | null;
  createdAt: string;
}

export default function BlogPage() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/site/blog`);
        const json = await res.json();
        setPosts(json.data || []);
      } catch {
        setError(t("blog.loadError"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-SA-u-nu-latn", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const excerpt = (content: string) => {
    const stripped = content.replace(/<[^>]*>/g, "");
    return stripped.length > 100 ? stripped.substring(0, 100) + "…" : stripped;
  };

  if (loading)
    return (
      <SiteLayout>
        <LoadingState />
      </SiteLayout>
    );

  if (error) {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="alert alert--danger">{error}</div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div>
        <Hero title={t("blog.pageTitle")} subtitle={t("blog.pageSubtitle")} />
        <div className="max-w-7xl mx-auto px-4 py-12">
          {posts.length === 0 ? (
            <p className="text-center text-[var(--sub)] py-12">{t("blog.noPostsYet")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slugAr}`}
                  className="group border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden shadow-[var(--shadow)] hover:shadow-[var(--shadow-md)] transition-shadow bg-white"
                >
                  {post.featuredImage ? (
                    <div className="overflow-hidden">
                      <img
                        src={post.featuredImage}
                        alt={post.titleAr}
                        className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div
                      className="aspect-video flex items-center justify-center"
                      style={{ backgroundColor: "var(--blue-50)" }}
                    >
                      <svg className="w-12 h-12" style={{ color: "var(--blue)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.5-4.5 3 3L15 10l5 5m0 0l2-2m-2 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v10z" />
                      </svg>
                    </div>
                  )}
                  <div className="p-5">
                    <h2 className="text-[15px] font-bold text-[var(--ink)] mb-2 line-clamp-2 group-hover:text-[var(--blue)] transition-colors">
                      {post.titleAr}
                    </h2>
                    <p className="text-[13px] text-[var(--sub)] mb-4 line-clamp-2 leading-relaxed">
                      {excerpt(post.contentAr)}
                    </p>
                    <div className="flex items-center gap-3 text-[12px] text-[var(--sub)]">
                      {post.authorName && <span>{post.authorName}</span>}
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import { SiteLayout } from "../../site-layout";
import LoadingState from "@/components/LoadingState";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

interface BlogPost {
  id: number;
  titleAr: string;
  slug: string;
  contentAr: string;
  authorName: string;
  featuredImage: string | null;
  createdAt: string;
}

export default function BlogPostPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/site/blog/${slug}`);
        const json = await res.json();
        setPost(json.data);
      } catch {
        setError(t("blog.slugLoadError"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, t]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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

  if (!post) return null;

  return (
    <SiteLayout>
      <div>
        <section
          className="py-16 text-center text-white"
          style={{ backgroundColor: "var(--blue-deep)" }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{post.titleAr}</h1>
          <div className="flex items-center justify-center gap-3 text-[14px] opacity-80">
            {post.authorName && <span>{post.authorName}</span>}
            <span>{formatDate(post.createdAt)}</span>
          </div>
        </section>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-[13px] font-bold text-[var(--blue)] hover:underline mb-8"
          >
            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {t("blog.backToBlog")}
          </Link>

          {post.featuredImage && (
            <div className="mb-8 rounded-[var(--radius-md)] overflow-hidden">
              <img
                src={post.featuredImage}
                alt={post.titleAr}
                className="w-full h-auto max-h-96 object-cover"
              />
            </div>
          )}

          <div
            className="leading-relaxed"
            style={{ lineHeight: 1.9, fontSize: "16px", color: "var(--ink-light)" }}
            dangerouslySetInnerHTML={{ __html: post.contentAr }}
          />
        </div>
      </div>
    </SiteLayout>
  );
}

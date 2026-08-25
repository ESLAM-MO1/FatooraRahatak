"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5092/api/v1";

export interface StoreBanner {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
}

interface StoreBannersProps {
  slug: string;
  position: "HomeTop" | "HomeMiddle" | "HomeBottom";
}

function ArrowIcon({ dir }: { dir: "l" | "r" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={dir === "l" ? { transform: "rotate(180deg)" } : undefined}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function Slideshow({ banners, titleLabel }: { banners: StoreBanner[]; titleLabel: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;
  const current = banners[index] || banners[0];

  useEffect(() => {
    setIndex(0);
  }, [banners.length]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(timer);
  }, [count, paused]);

  const go = (i: number) => setIndex(((i % count) + count) % count);

  return (
    <section
      className="w-full"
      style={{ background: "#F3F4F6", padding: "0 0 28px" }}
      aria-roledescription="carousel"
      aria-label={titleLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden shadow-sm" style={{ aspectRatio: "21/9" }}>
          <div
            className="w-full h-full flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(${-index * 100}%)` }}
          >
            {banners.map((b) => (
              <div key={b.id} className="w-full h-full shrink-0 relative">
                <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                {b.title && (
                  <div
                    className="absolute inset-x-0 bottom-0 px-6 py-4 text-white text-[15px] sm:text-lg font-bold"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }}
                  >
                    {b.title}
                  </div>
                )}
              </div>
            ))}
          </div>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Previous"
                className="absolute inset-y-0 inline-flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ insetInlineStart: 12, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.35)" }}
              >
                <span className="flex items-center justify-center rounded-full bg-black/25 w-10 h-10">
                  <ArrowIcon dir="l" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Next"
                className="absolute inset-y-0 inline-flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ insetInlineEnd: 12, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.35)" }}
              >
                <span className="flex items-center justify-center rounded-full bg-black/25 w-10 h-10">
                  <ArrowIcon dir="r" />
                </span>
              </button>
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 z-10">
                {banners.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`slide ${i + 1}`}
                    className="rounded-full transition-all"
                    style={{
                      width: i === index ? 22 : 8,
                      height: 8,
                      background: i === index ? "#fff" : "rgba(255,255,255,0.65)",
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function PromoGrid({ banners, titleLabel }: { banners: StoreBanner[]; titleLabel: string }) {
  return (
    <section className="w-full" style={{ padding: "0 0 32px" }} aria-label={titleLabel}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid gap-4 sm:gap-5 grid-cols-1 ${banners.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : banners.length === 2 ? "sm:grid-cols-2" : ""}`}>
          {banners.map((b) => (
            <a
              key={b.id}
              href={b.linkUrl || undefined}
              target={b.linkUrl ? "_blank" : undefined}
              rel={b.linkUrl ? "noopener noreferrer" : undefined}
              className="group block relative rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
              style={{ aspectRatio: "16/9" }}
            >
              <img
                src={b.imageUrl}
                alt={b.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {b.title && (
                <div
                  className="absolute inset-0 flex items-end p-4"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45), transparent 55%)" }}
                >
                  <span className="text-white text-[14px] sm:text-[15px] font-bold">{b.title}</span>
                </div>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function FullWidthStrip({ banners, titleLabel }: { banners: StoreBanner[]; titleLabel: string }) {
  return (
    <section className="w-full" style={{ padding: "0 0 32px" }} aria-label={titleLabel}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {banners.map((b) => (
          <a
            key={b.id}
            href={b.linkUrl || undefined}
            target={b.linkUrl ? "_blank" : undefined}
            rel={b.linkUrl ? "noopener noreferrer" : undefined}
            className="block relative rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
            style={{ aspectRatio: "21/5" }}
          >
            <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
            {b.title && (
              <div
                className="absolute inset-0 flex items-center px-6"
                style={{ background: "linear-gradient(to right, rgba(0,0,0,0.5), transparent 60%)" }}
              >
                <span className="text-white text-lg font-bold">{b.title}</span>
              </div>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}

export default function StoreBanners({ slug, position }: StoreBannersProps) {
  const [banners, setBanners] = useState<StoreBanner[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/public/stores/${slug}/banners`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const all: StoreBanner[] = data.data || [];
        setBanners(all.filter((b) => b.position === position));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [slug, position]);

  if (banners.length === 0) return null;

  const label = position === "HomeTop" ? "Home banners" : position === "HomeMiddle" ? "Promo banners" : "Banners";

  if (position === "HomeTop") return <Slideshow banners={banners} titleLabel={label} />;
  if (position === "HomeMiddle") return <PromoGrid banners={banners} titleLabel={label} />;
  return <FullWidthStrip banners={banners} titleLabel={label} />;
}
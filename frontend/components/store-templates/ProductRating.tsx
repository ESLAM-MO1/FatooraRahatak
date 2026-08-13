"use client";

interface ProductRatingProps {
  rating?: number;
  count?: number;
  size?: number;
  showCount?: boolean;
  color?: string;
}

export default function ProductRating({ rating = 0, count = 0, size = 13, showCount = true, color = "#F59E0B" }: ProductRatingProps) {
  const filled = Math.round(rating * 2) / 2;
  return (
    <div className="inline-flex items-center gap-1" dir="ltr">
      <div className="flex items-center gap-0.5" dir="ltr">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} style={{ color: star <= filled ? color : "#D1D5DB", fontSize: size }}>★</span>
        ))}
      </div>
      {showCount && count > 0 && (
        <span className="text-[11px]" style={{ color: "#9CA3AF" }}>
          ({count})
        </span>
      )}
    </div>
  );
}

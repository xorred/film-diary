import { ratingWords, stars } from "@/lib/format";

export function Stars({ rating, className = "" }: { rating: number | null; className?: string }) {
  if (rating == null) return null;
  return (
    <span className={`font-sans tracking-[0.08em] text-burgundy ${className}`} aria-label={ratingWords(rating)} title={ratingWords(rating)}>
      {stars(rating)}
    </span>
  );
}

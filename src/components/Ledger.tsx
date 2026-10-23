"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { dayMonth, posterUrl } from "@/lib/format";
import { Stars } from "./Stars";

export type LedgerRow = {
  id: string;
  title: string;
  year: number;
  date: string;
  rating: number | null;
  again: boolean;
  poster: string | null;
  meta: string; // e.g. "Marathi, Umesh Vinayak Kulkarni"
};

// Recent diary entries set as a typeset list. Hovering a title floats its poster beside the cursor.
export function Ledger({ rows }: { rows: LedgerRow[] }) {
  const [hover, setHover] = useState<LedgerRow | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });

  // Ease the poster toward the cursor so it trails a little, like a slide in a projector.
  useEffect(() => {
    if (!hover) return;
    let raf = 0;
    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.18;
      pos.current.y += (target.current.y - pos.current.y) * 0.18;
      if (card.current) card.current.style.transform = `translate3d(${pos.current.x + 28}px, ${pos.current.y - 120}px, 0) rotate(-2deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hover]);

  const onMove = (e: React.MouseEvent) => {
    target.current = { x: e.clientX, y: e.clientY };
    if (!hover) pos.current = { ...target.current };
  };

  return (
    <div onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <ol className="border-t border-rule">
        {rows.map((r) => (
          <li key={r.id + r.date} className="border-b border-rule">
            <Link
              href={`/films/${r.id}`}
              onMouseEnter={() => setHover(r)}
              onFocus={() => setHover(null)}
              className="group grid grid-cols-[4.5rem_1fr] items-baseline gap-x-6 gap-y-1 py-4 sm:grid-cols-[6rem_1fr_auto]"
            >
              <span className="meta text-faint">{dayMonth(r.date)}</span>
              <span className="min-w-0">
                <span className="font-serif text-[clamp(1.35rem,2.4vw,2rem)] leading-tight transition-colors group-hover:text-burgundy">
                  {r.title}
                </span>
                {r.again && <span className="hand ml-3 text-[1.4rem]">again</span>}
                <span className="meta mt-0.5 block text-faint">
                  {r.year}
                  {r.meta && <>, {r.meta}</>}
                </span>
              </span>
              <Stars rating={r.rating} className="col-start-2 text-[0.8rem] sm:col-start-3" />
            </Link>
          </li>
        ))}
      </ol>

      {/* The floating poster. Pointer devices only; hidden from screen readers. */}
      <div
        ref={card}
        aria-hidden
        className={`pointer-events-none fixed top-0 left-0 z-40 hidden w-[150px] transition-opacity duration-200 [@media(hover:hover)]:block ${
          hover?.poster ? "opacity-100" : "opacity-0"
        }`}
      >
        {hover?.poster && (
          <span className="poster block shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)]">
            <Image src={posterUrl(hover.poster, "w342")} alt="" fill sizes="150px" className="object-cover" />
          </span>
        )}
      </div>
    </div>
  );
}

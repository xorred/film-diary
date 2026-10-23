"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { WatchlistSummary } from "@/lib/data";
import { posterUrl, runtimeText, stillUrl } from "@/lib/format";

const LENGTHS = [
  { value: "", label: "any length" },
  { value: "100", label: "under 1h 40m" },
  { value: "130", label: "under 2h 10m" },
  { value: "160", label: "under 2h 40m" },
];

// Watchlist picker. Shuffles through the posters like a projector changing slides,
// then stops on one.
export function TonightPicker({ films }: { films: WatchlistSummary[] }) {
  const [lang, setLang] = useState("");
  const [maxLen, setMaxLen] = useState("");
  const [shuffling, setShuffling] = useState<WatchlistSummary | null>(null);
  const [pick, setPick] = useState<WatchlistSummary | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const langs = useMemo(() => {
    const c = new Map<string, number>();
    for (const f of films) if (f.langName !== "Unknown") c.set(f.langName, (c.get(f.langName) ?? 0) + 1);
    return [...c].sort((a, b) => b[1] - a[1]);
  }, [films]);

  const pool = films.filter((f) => (!lang || f.langName === lang) && (!maxLen || (f.runtime != null && f.runtime <= Number(maxLen))));

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const go = () => {
    if (!pool.length) return;
    if (timer.current) clearTimeout(timer.current);
    const final = pool[Math.floor(Math.random() * pool.length)];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || pool.length === 1) {
      setShuffling(null);
      setPick(final);
      return;
    }
    // Slow down like a wheel: short gaps first, longer ones at the end.
    let step = 0;
    const steps = 16;
    const tick = () => {
      step++;
      if (step >= steps) {
        setShuffling(null);
        setPick(final);
        return;
      }
      setShuffling(pool[Math.floor(Math.random() * pool.length)]);
      timer.current = setTimeout(tick, 45 + step * step * 1.6);
    };
    setPick(null);
    tick();
  };

  const sel = "mx-1 border-0 border-b border-ink bg-transparent px-0.5 pb-0.5 font-serif italic text-ink focus:outline-none";
  const showing = shuffling ?? pick;

  return (
    <section aria-labelledby="tonight" className="grid gap-x-10 gap-y-10 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <h2 id="tonight" className="font-serif text-[1.6rem] italic leading-tight">
          What should I watch tonight?
        </h2>
        <p className="mt-5 font-serif text-[1.35rem] leading-relaxed">
          Something in
          <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value)} className={sel}>
            <option value="">any language</option>
            {langs.map(([l]) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          that runs{" "}
          <span className="whitespace-nowrap">
            <select aria-label="Length" value={maxLen} onChange={(e) => setMaxLen(e.target.value)} className={sel}>
              {LENGTHS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            .
          </span>
        </p>
        <p className="meta mt-3 text-faint">
          {pool.length} {pool.length === 1 ? "film fits" : "films fit"}.
        </p>
        <button
          type="button"
          onClick={go}
          disabled={!pool.length || Boolean(shuffling)}
          className="mt-6 border border-ink px-5 py-2.5 font-sans text-[0.875rem] transition-colors hover:bg-ink hover:text-paper disabled:opacity-40"
        >
          {pick ? "Pick another" : "Pick one for me"}
        </button>
      </div>

      <div className="min-h-[260px] lg:col-span-7" aria-live="polite">
        {showing ? (
          <div className={shuffling ? "" : "pick-in"}>
            <div className="relative aspect-[16/9] overflow-hidden bg-paper-2">
              {showing.backdrop ? (
                <Image src={stillUrl(showing.backdrop, "w780")} alt="" fill sizes="(min-width: 1024px) 720px, 92vw" className="still object-cover" />
              ) : showing.poster ? (
                <Image src={posterUrl(showing.poster, "w342")} alt="" fill sizes="300px" className="object-contain" />
              ) : null}
            </div>
            {!shuffling && pick && (
              <div className="mt-5">
                <p className="hand">tonight, then</p>
                <h3 className="display mt-1 text-[clamp(1.9rem,3.4vw,2.8rem)]">{pick.title}</h3>
                <p className="meta mt-2">
                  {[pick.year, pick.langName !== "Unknown" ? pick.langName : "", runtimeText(pick.runtime), pick.directors[0] ?? ""]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {pick.overview && <p className="mt-4 max-w-[38em] text-[1.05rem] leading-relaxed text-charcoal">{pick.overview}</p>}
                <a href={pick.uri} className="meta link-underline mt-4 inline-block">
                  Open it on Letterboxd
                </a>
              </div>
            )}
            {shuffling && <p className="meta mt-4 text-faint">{shuffling.title}</p>}
          </div>
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center border border-dashed border-rule">
            <p className="font-serif text-[1.15rem] italic text-faint">Choose, then let the projector decide.</p>
          </div>
        )}
      </div>
    </section>
  );
}

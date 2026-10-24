"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { WatchlistSummary } from "@/lib/data";
import { posterUrl, runtimeText, stillUrl } from "@/lib/format";
import type { Reason } from "@/lib/stats";

export type Suggestion = WatchlistSummary & { reasons: Reason[]; score: number };

const TIME = [
  { value: "", label: "any amount of time" },
  { value: "100", label: "about an hour and a half" },
  { value: "130", label: "a couple of hours" },
  { value: "160", label: "two and a half hours" },
  { value: "200", label: "the whole evening" },
];

const decadeOf = (y: number) => `${Math.floor(y / 10) * 10}s`;

function counted(values: string[]) {
  const c = new Map<string, number>();
  for (const v of values) c.set(v, (c.get(v) ?? 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// Tonight's screening: pick the time you have and a mood, get three films from the watchlist
// with the reasons they made the cut, all taken from my own ratings.
export function TonightPicker({ films }: { films: Suggestion[] }) {
  const [time, setTime] = useState("");
  const [lang, setLang] = useState("");
  const [genre, setGenre] = useState("");
  const [decade, setDecade] = useState("");
  const filterKey = [time, lang, genre, decade].join("|");
  const [page, setPage] = useState({ key: filterKey, n: 0 });
  const offset = page.key === filterKey ? page.n : 0;

  const langs = useMemo(() => counted(films.map((f) => f.langName).filter((l) => l !== "Unknown")), [films]);
  const genres = useMemo(() => counted(films.flatMap((f) => f.genres)), [films]);
  const decades = useMemo(() => [...new Set(films.map((f) => decadeOf(f.year)))].sort().reverse(), [films]);

  // Best match first. Ties go to the film that has waited longest on the list.
  const pool = useMemo(
    () =>
      films
        .filter(
          (f) =>
            (!time || (f.runtime != null && f.runtime <= Number(time))) &&
            (!lang || f.langName === lang) &&
            (!genre || f.genres.includes(genre)) &&
            (!decade || decadeOf(f.year) === decade),
        )
        .sort((a, b) => b.score - a.score || a.addedDate.localeCompare(b.addedDate)),
    [films, time, lang, genre, decade],
  );

  const start = pool.length ? offset % pool.length : 0;
  const picks = pool.length <= 3 ? pool : [0, 1, 2].map((i) => pool[(start + i) % pool.length]);
  const filtered = Boolean(time || lang || genre || decade);
  const reset = () => {
    setTime("");
    setLang("");
    setGenre("");
    setDecade("");
  };

  const sel = "max-w-full border-0 border-b border-ink bg-transparent px-0.5 pb-0.5 font-serif italic text-ink focus:outline-none";

  return (
    <section aria-labelledby="tonight">
      <h2 id="tonight" className="font-serif text-[1.6rem] italic leading-tight">
        Tonight&apos;s screening
      </h2>

      <p className="mt-5 max-w-[46ch] font-serif text-[clamp(1.2rem,2vw,1.45rem)] leading-[1.9]">
        I have{" "}
        <select aria-label="Time available" value={time} onChange={(e) => setTime(e.target.value)} className={sel}>
          {TIME.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>{" "}
        for something in{" "}
        <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value)} className={sel}>
          <option value="">any language</option>
          {langs.map(([l]) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        , maybe{" "}
        <select aria-label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)} className={sel}>
          <option value="">any genre</option>
          {genres.map(([g]) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        , made in{" "}
        <span className="whitespace-nowrap">
          <select aria-label="Decade" value={decade} onChange={(e) => setDecade(e.target.value)} className={sel}>
            <option value="">any decade</option>
            {decades.map((d) => (
              <option key={d} value={d}>
                the {d}
              </option>
            ))}
          </select>
          .
        </span>
      </p>

      <p className="meta mt-3 text-faint" aria-live="polite">
        {pool.length} of {films.length} on the watchlist fit. Ranked by how I&apos;ve rated their directors, genres and languages.{" "}
        {filtered && (
          <button type="button" onClick={reset} className="link-underline text-ink">
            Clear choices
          </button>
        )}
      </p>

      {pool.length === 0 ? (
        <div className="mt-10 border border-dashed border-rule p-8">
          <p className="font-serif text-[1.2rem] italic text-charcoal">Nothing on the watchlist fits all of that tonight.</p>
          <button type="button" onClick={reset} className="meta link-underline mt-3 text-ink">
            Start again with everything
          </button>
        </div>
      ) : (
        <>
          <ol key={`${filterKey}-${start}`} className="pick-in mt-10 grid gap-x-8 gap-y-14 md:grid-cols-3">
            {picks.map((f) => (
              <li key={f.id}>
                <div className="relative aspect-[16/10] overflow-hidden bg-paper-2">
                  {f.backdrop ? (
                    <Image src={stillUrl(f.backdrop, "w780")} alt="" fill sizes="(min-width: 768px) 400px, 92vw" className="still object-cover" />
                  ) : f.poster ? (
                    <Image src={posterUrl(f.poster, "w342")} alt="" fill sizes="200px" className="object-contain" />
                  ) : null}
                </div>
                <h3 className="mt-4 font-serif text-[1.5rem] leading-tight">{f.title}</h3>
                <p className="meta mt-1">
                  {[f.year, f.langName !== "Unknown" ? f.langName : "", runtimeText(f.runtime), f.directors[0] ?? ""].filter(Boolean).join(", ")}
                </p>
                <ul className="meta mt-3 space-y-1 text-charcoal">
                  {time && f.runtime != null && (
                    <li>
                      Runs {runtimeText(f.runtime)}
                      {Number(time) - f.runtime > 0 ? `, with ${runtimeText(Number(time) - f.runtime)} to spare.` : ", right on time."}
                    </li>
                  )}
                  {f.reasons.map((r) => (
                    <li key={r.kind}>{r.text}</li>
                  ))}
                  {f.reasons.length === 0 && <li className="text-faint">Nothing in my ratings to go on. A blind date.</li>}
                </ul>
                <p className="meta mt-3 flex flex-wrap gap-x-4">
                  {f.tmdbUrl && (
                    <a href={f.tmdbUrl} className="link-underline">
                      TMDB
                    </a>
                  )}
                  <a href={f.uri} className="link-underline">
                    Letterboxd
                  </a>
                </p>
              </li>
            ))}
          </ol>
          {pool.length > 3 && (
            <button
              type="button"
              onClick={() => setPage({ key: filterKey, n: offset + 3 })}
              className="mt-10 border border-ink px-5 py-2.5 font-sans text-[0.875rem] transition-colors hover:bg-ink hover:text-paper"
            >
              Three others
            </button>
          )}
        </>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { FilmSummary } from "@/lib/data";
import { Poster } from "./Poster";
import { Stars } from "./Stars";

type Sort = "watched" | "rating" | "year" | "title";
const SORTS: { id: Sort; label: string }[] = [
  { id: "watched", label: "when I saw it" },
  { id: "rating", label: "my rating" },
  { id: "year", label: "release year" },
  { id: "title", label: "title" },
];

// Ready-made collections, each just a set of filters.
const COLLECTIONS: { label: string; query: string }[] = [
  { label: "Five stars", query: "rating=5" },
  { label: "Marathi", query: "lang=Marathi" },
  { label: "The ones I wrote about", query: "only=reviewed" },
  { label: "Seen more than once", query: "only=again" },
  { label: "Before 1980", query: "before=1980" },
  { label: "Series", query: "only=series" },
];

const decadeOf = (y: number) => `${Math.floor(y / 10) * 10}s`;
const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function counted(values: string[]) {
  const c = new Map<string, number>();
  for (const v of values) c.set(v, (c.get(v) ?? 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1]);
}

export function Archive({ films }: { films: FilmSummary[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const q = params.get("q") ?? "";
  const lang = params.get("lang") ?? "";
  const decade = params.get("decade") ?? "";
  const genre = params.get("genre") ?? "";
  const rating = params.get("rating") ?? "";
  const only = params.get("only") ?? "";
  const before = params.get("before") ?? "";
  const sort = (params.get("sort") as Sort) || "watched";

  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const s = next.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  const langs = useMemo(() => counted(films.map((f) => f.langName).filter((l) => l !== "Unknown")), [films]);
  const genres = useMemo(() => counted(films.flatMap((f) => f.genres)), [films]);
  const decades = useMemo(() => [...new Set(films.map((f) => decadeOf(f.year)))].sort().reverse(), [films]);

  const shown = useMemo(() => {
    const needle = norm(q.trim());
    const list = films.filter(
      (f) =>
        (!needle || norm(f.title).includes(needle) || f.directors.some((d) => norm(d).includes(needle))) &&
        (!lang || f.langName === lang) &&
        (!decade || decadeOf(f.year) === decade) &&
        (!genre || f.genres.includes(genre)) &&
        (!rating || (f.rating ?? 0) >= Number(rating)) &&
        (!before || f.year < Number(before)) &&
        (only !== "reviewed" || f.reviewed) &&
        (only !== "again" || f.timesWatched > 1) &&
        (only !== "series" || f.isSeries),
    );
    const when = (f: FilmSummary) => f.watchedDate ?? f.loggedDate.slice(0, 7);
    const cmp: Record<Sort, (a: FilmSummary, b: FilmSummary) => number> = {
      watched: (a, b) => when(b).localeCompare(when(a)) || a.title.localeCompare(b.title),
      rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.year - a.year,
      year: (a, b) => b.year - a.year || a.title.localeCompare(b.title),
      title: (a, b) => a.title.localeCompare(b.title),
    };
    return list.sort(cmp[sort]);
  }, [films, q, lang, decade, genre, rating, only, before, sort]);

  const filtered = q || lang || decade || genre || rating || only || before;
  const selectCls = "border-0 border-b border-rule bg-transparent py-1 pr-6 font-sans text-[0.875rem] text-ink focus:border-ink";

  return (
    <>
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <label className="block">
            <span className="sr-only">Search by title or director</span>
            <input
              type="search"
              value={q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Look for a film or a director"
              className="w-full border-0 border-b border-ink bg-transparent pb-2 font-serif text-[1.5rem] italic placeholder:text-faint focus:outline-none"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 lg:col-span-7 lg:justify-end">
          <select aria-label="Language" value={lang} onChange={(e) => set({ lang: e.target.value })} className={selectCls}>
            <option value="">Any language</option>
            {langs.map(([l, n]) => (
              <option key={l} value={l}>
                {l} ({n})
              </option>
            ))}
          </select>
          <select aria-label="Decade" value={decade} onChange={(e) => set({ decade: e.target.value })} className={selectCls}>
            <option value="">Any decade</option>
            {decades.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select aria-label="Genre" value={genre} onChange={(e) => set({ genre: e.target.value })} className={selectCls}>
            <option value="">Any genre</option>
            {genres.map(([g, n]) => (
              <option key={g} value={g}>
                {g} ({n})
              </option>
            ))}
          </select>
          <label className="flex items-baseline gap-2 font-sans text-[0.875rem] text-faint">
            Sorted by
            <select value={sort} onChange={(e) => set({ sort: e.target.value === "watched" ? "" : e.target.value })} className={selectCls}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="meta mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <span className="text-faint">Collections</span>
        {COLLECTIONS.map((c) => {
          const active = params.toString() === c.query;
          return (
            <Link
              key={c.label}
              href={`${pathname}?${c.query}`}
              scroll={false}
              className={active ? "text-ink underline underline-offset-4" : "link-underline"}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      <p className="meta mt-10 text-faint" aria-live="polite">
        {shown.length === films.length ? `All ${films.length} films.` : `${shown.length} of ${films.length} films.`}{" "}
        {filtered && (
          <Link href={pathname} scroll={false} className="link-underline">
            Show everything
          </Link>
        )}
      </p>

      {shown.length === 0 ? (
        <p className="mt-10 font-serif text-[1.3rem] italic text-charcoal">Nothing like that in here. Try fewer filters.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-3 gap-x-4 gap-y-9 sm:grid-cols-4 sm:gap-x-6 lg:grid-cols-6">
          {shown.map((f) => (
            <li key={f.id}>
              <Poster id={f.id} title={f.title} year={f.year} poster={f.poster} sizes="(min-width: 1024px) 190px, (min-width: 640px) 24vw, 31vw" />
              <p className="mt-2 text-[0.95rem] leading-snug">
                <Link href={`/films/${f.id}`} className="link-quiet">
                  {f.title}
                </Link>
              </p>
              <p className="meta flex flex-wrap gap-x-2 text-faint">
                <span>{f.year}</span>
                <Stars rating={f.rating} className="text-[0.7rem]" />
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

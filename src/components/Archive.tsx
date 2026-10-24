"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FilmSummary } from "@/lib/data";
import { longDate } from "@/lib/format";
import { Poster } from "./Poster";
import { Stars } from "./Stars";

type Sort = "watched" | "rating" | "year" | "title";
const SORTS: { id: Sort; label: string }[] = [
  { id: "watched", label: "when I saw it" },
  { id: "rating", label: "my rating" },
  { id: "year", label: "release year" },
  { id: "title", label: "title, A to Z" },
];

const RATINGS = [
  { value: "5", label: "Five stars" },
  { value: "4.5", label: "4½ and up" },
  { value: "4", label: "4 and up" },
  { value: "3.5", label: "3½ and up" },
  { value: "-3", label: "3 and under" },
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

const FILTER_KEYS = ["q", "lang", "decade", "genre", "rating", "dir", "seen", "only", "before"] as const;
const PAGE = 60;

const decadeOf = (y: number) => `${Math.floor(y / 10) * 10}s`;
const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function counted(values: string[]) {
  const c = new Map<string, number>();
  for (const v of values) c.set(v, (c.get(v) ?? 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function seenLine(f: FilmSummary) {
  if (f.watchedDate) return `Seen ${longDate(f.watchedDate)}`;
  return "No viewing date";
}

export function Archive({ films }: { films: FilmSummary[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const get = (k: string) => params.get(k) ?? "";
  const f = Object.fromEntries(FILTER_KEYS.map((k) => [k, get(k)])) as Record<(typeof FILTER_KEYS)[number], string>;
  const sort = (get("sort") as Sort) || "watched";
  const view = get("view") === "list" ? "list" : "grid";

  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const s = next.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  const clearFilters = () => set(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));

  const langs = useMemo(() => counted(films.map((x) => x.langName).filter((l) => l !== "Unknown")), [films]);
  const genres = useMemo(() => counted(films.flatMap((x) => x.genres)), [films]);
  const directors = useMemo(() => counted(films.flatMap((x) => x.directors)).filter(([, n]) => n >= 2), [films]);
  const decades = useMemo(() => [...new Set(films.map((x) => decadeOf(x.year)))].sort().reverse(), [films]);
  const seenYears = useMemo(() => [...new Set(films.flatMap((x) => x.seenYears))].sort().reverse(), [films]);

  const shown = useMemo(() => {
    const needle = norm(f.q.trim());
    const r = f.rating ? Number(f.rating) : null;
    const list = films.filter(
      (x) =>
        (!needle || norm(x.title).includes(needle) || x.directors.some((d) => norm(d).includes(needle))) &&
        (!f.lang || x.langName === f.lang) &&
        (!f.decade || decadeOf(x.year) === f.decade) &&
        (!f.genre || x.genres.includes(f.genre)) &&
        (!f.dir || x.directors.includes(f.dir)) &&
        (r == null || (r < 0 ? (x.rating ?? 0) <= -r : (x.rating ?? 0) >= r)) &&
        (!f.seen || (f.seen === "undated" ? x.seenYears.length === 0 : x.seenYears.includes(f.seen))) &&
        (!f.before || x.year < Number(f.before)) &&
        (f.only !== "reviewed" || x.reviewed) &&
        (f.only !== "again" || x.timesWatched > 1) &&
        (f.only !== "series" || x.isSeries),
    );
    // "When I saw it": dated viewings newest first, then everything without a known date.
    // The undated ones are never ordered by their Letterboxd logging date.
    const cmp: Record<Sort, (a: FilmSummary, b: FilmSummary) => number> = {
      watched: (a, b) =>
        a.watchedDate && b.watchedDate
          ? b.watchedDate.localeCompare(a.watchedDate)
          : a.watchedDate
            ? -1
            : b.watchedDate
              ? 1
              : a.title.localeCompare(b.title),
      rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.year - a.year || a.title.localeCompare(b.title),
      year: (a, b) => b.year - a.year || a.title.localeCompare(b.title),
      title: (a, b) => a.title.localeCompare(b.title),
    };
    return list.sort(cmp[sort]);
  }, [films, f.q, f.lang, f.decade, f.genre, f.dir, f.rating, f.seen, f.before, f.only, sort]);

  // Load more as you scroll. The count resets whenever the filters or sort change.
  const listKey = params.toString();
  const [limit, setLimit] = useState({ key: listKey, n: PAGE });
  const n = limit.key === listKey ? limit.n : PAGE;
  const more = () => setLimit((prev) => ({ key: listKey, n: (prev.key === listKey ? prev.n : PAGE) + PAGE }));
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setLimit((prev) => ({ key: listKey, n: (prev.key === listKey ? prev.n : PAGE) + PAGE }));
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [n, shown.length, listKey]);

  const visible = shown.slice(0, n);
  const active = FILTER_KEYS.filter((k) => f[k]);
  const sel = "max-w-[11rem] border-0 border-b border-rule bg-transparent py-1 pr-6 font-sans text-[0.875rem] text-ink focus:border-ink";

  return (
    <>
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-12 lg:items-end">
        <label className="block lg:col-span-6">
          <span className="sr-only">Search by title or director</span>
          <input
            type="search"
            value={f.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Look for a film or a director"
            className="w-full border-0 border-b border-ink bg-transparent pb-2 font-serif text-[1.5rem] italic placeholder:text-faint focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3 lg:col-span-6 lg:justify-end">
          <label className="flex items-baseline gap-2 font-sans text-[0.875rem] text-faint">
            Sorted by
            <select value={sort} onChange={(e) => set({ sort: e.target.value === "watched" ? "" : e.target.value })} className={sel}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div role="group" aria-label="Layout" className="flex gap-3 font-sans text-[0.875rem]">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => set({ view: v === "grid" ? "" : v })}
                className={view === v ? "text-ink underline underline-offset-4" : "text-faint hover:text-ink"}
              >
                {v === "grid" ? "Posters" : "List"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <fieldset className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-3">
        <legend className="sr-only">Filters</legend>
        <select aria-label="Language" value={f.lang} onChange={(e) => set({ lang: e.target.value })} className={sel}>
          <option value="">Any language</option>
          {langs.map(([l, c]) => (
            <option key={l} value={l}>
              {l} ({c})
            </option>
          ))}
        </select>
        <select aria-label="Director" value={f.dir} onChange={(e) => set({ dir: e.target.value })} className={sel}>
          <option value="">Any director</option>
          {directors.map(([d, c]) => (
            <option key={d} value={d}>
              {d} ({c})
            </option>
          ))}
        </select>
        <select aria-label="Genre" value={f.genre} onChange={(e) => set({ genre: e.target.value })} className={sel}>
          <option value="">Any genre</option>
          {genres.map(([g, c]) => (
            <option key={g} value={g}>
              {g} ({c})
            </option>
          ))}
        </select>
        <select aria-label="Release decade" value={f.decade} onChange={(e) => set({ decade: e.target.value })} className={sel}>
          <option value="">Any decade</option>
          {decades.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select aria-label="My rating" value={f.rating} onChange={(e) => set({ rating: e.target.value })} className={sel}>
          <option value="">Any rating</option>
          {RATINGS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select aria-label="Year I saw it" value={f.seen} onChange={(e) => set({ seen: e.target.value })} className={sel}>
          <option value="">Seen any year</option>
          {seenYears.map((y) => (
            <option key={y} value={y}>
              Seen in {y}
            </option>
          ))}
          <option value="undated">No viewing date</option>
        </select>
      </fieldset>

      <div className="meta mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <span className="text-faint">Collections</span>
        {COLLECTIONS.map((c) => {
          const on = params.toString() === c.query;
          return (
            <Link key={c.label} href={`${pathname}?${c.query}`} scroll={false} className={on ? "text-ink underline underline-offset-4" : "link-underline"}>
              {c.label}
            </Link>
          );
        })}
      </div>

      <p className="meta mt-10 text-faint" aria-live="polite">
        {shown.length === films.length ? `All ${films.length} titles.` : `${shown.length} of ${films.length} titles.`}{" "}
        {active.length > 0 && (
          <button type="button" onClick={clearFilters} className="link-underline text-ink">
            Clear {active.length === 1 ? "filter" : `all ${active.length} filters`}
          </button>
        )}
        {sort === "watched" && shown.some((x) => !x.watchedDate) && shown.some((x) => x.watchedDate) && (
          <> Films with no viewing date come after the dated ones.</>
        )}
      </p>

      {shown.length === 0 ? (
        <div className="mt-10">
          <p className="font-serif text-[1.3rem] italic text-charcoal">Nothing on the list matches all of that.</p>
          <button type="button" onClick={clearFilters} className="meta link-underline mt-3 text-ink">
            Clear the filters
          </button>
        </div>
      ) : view === "grid" ? (
        <ul className="mt-6 grid grid-cols-3 gap-x-4 gap-y-9 sm:grid-cols-4 sm:gap-x-6 lg:grid-cols-6">
          {visible.map((x) => (
            <li key={x.id}>
              <Poster id={x.id} title={x.title} year={x.year} poster={x.poster} sizes="(min-width: 1024px) 190px, (min-width: 640px) 24vw, 31vw" />
              <p className="mt-2 text-[0.95rem] leading-snug">
                <Link href={`/films/${x.id}`} className="link-quiet">
                  {x.title}
                </Link>
              </p>
              <p className="meta flex flex-wrap gap-x-2 text-faint">
                <span>{x.year}</span>
                <Stars rating={x.rating} className="text-[0.7rem]" />
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-6 border-t border-rule">
          {visible.map((x) => (
            <li key={x.id} className="border-b border-rule">
              <Link href={`/films/${x.id}`} className="group grid grid-cols-[40px_1fr_4.5rem] items-center gap-x-4 py-2.5 sm:grid-cols-[40px_1fr_13rem_5rem] sm:gap-x-6">
                <span className="w-[40px]">
                  <Poster title={x.title} year={x.year} poster={x.poster} sizes="40px" />
                </span>
                <span className="min-w-0">
                  <span className="font-serif text-[1.15rem] leading-snug group-hover:text-burgundy">{x.title}</span>
                  <span className="meta block truncate text-faint">
                    {[x.year, x.langName !== "Unknown" ? x.langName : "", x.directors[0] ?? ""].filter(Boolean).join(", ")}
                  </span>
                </span>
                <span className="meta hidden text-faint sm:block">{seenLine(x)}</span>
                <Stars rating={x.rating} className="justify-self-end text-[0.75rem]" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {visible.length < shown.length && (
        <div ref={sentinel} className="mt-12 flex justify-center">
          <button type="button" onClick={more} className="meta border border-rule px-4 py-2 text-ink hover:border-ink">
            Show more ({shown.length - visible.length} left)
          </button>
        </div>
      )}
    </>
  );
}

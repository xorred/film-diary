/**
 * Builds data/films.json from the Letterboxd export in data/letterboxd/.
 *
 *   npm run enrich              fetch TMDB info for new films only (uses the cache)
 *   npm run enrich -- --refresh refetch everything
 *   npm run enrich -- --offline no TMDB calls, just rebuild from the CSVs + cache
 *
 * Matching order: title + year, then title + year +/- 1, then title only (only if exactly
 * one film has that title). Anything else is written to data/unmatched.md, never guessed.
 * Fix those in data/overrides.json: { "Title (Year)": 12345 } for a film, or "tv:12345" for a series.
 */
import fs from "node:fs";
import path from "node:path";
import { filmKey, loadExport, sanitizeReview, slugify, type Row } from "./lib/letterboxd";
import { Tmdb } from "./lib/tmdb";
import { buildTaste } from "./lib/taste";
import type { CacheEntry, DiaryEntry, Film, FilmsData, TmdbRef, WatchlistFilm } from "../src/lib/types";

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");
const EXPORT_DIR = path.join(DATA, "letterboxd");
const OUT = path.join(DATA, "films.json");
const OVERRIDES = path.join(DATA, "overrides.json");
const REPORT = path.join(DATA, "unmatched.md");

const args = new Set(process.argv.slice(2));
const offline = args.has("--offline");
const refresh = args.has("--refresh");

loadEnv();

async function main() {
  const lb = loadExport(EXPORT_DIR);
  const previous: FilmsData | null = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;
  const cache: Record<string, CacheEntry> = refresh ? {} : { ...(previous?.cache ?? {}) };
  const overrides = readOverrides();

  // Every film we need TMDB info for: watched + watchlist.
  const wanted = new Map<string, { title: string; year: number }>();
  for (const r of [...lb.watched, ...lb.watchlist]) {
    wanted.set(filmKey(r.Name, r.Year), { title: r.Name, year: Number(r.Year) });
  }

  const todo = [...wanted].filter(([key, f]) => {
    const hit = cache[key];
    if (!hit) return true;
    const ov = overrides[key];
    if (ov !== undefined) return hit.overrideId !== refKey(ov); // override added or changed
    if (hit.overrideId !== undefined) return true; // override was removed
    if (hit.tmdb === null) return true; // retry unmatched ones every run
    // Older runs allowed title-only matches years apart (Hawkeye 2021 -> a 1988 film). Recheck those.
    const tmdbYear = Number(hit.tmdb.releaseDate?.slice(0, 4) || 0);
    return hit.tmdb.matchedBy === "title-only" && Math.abs(tmdbYear - f.year) > 3;
  });

  if (todo.length && offline) {
    console.log(`Offline: skipping ${todo.length} films that still need TMDB info.`);
  } else if (todo.length) {
    const key = process.env.TMDB_API_KEY;
    if (!key) {
      console.error("TMDB_API_KEY is not set. Add it to .env.local (see .env.example), or run with --offline.");
      process.exit(1);
    }
    const tmdb = new Tmdb(key);
    console.log(`Looking up ${todo.length} films on TMDB (${wanted.size - todo.length} already cached)...`);
    let done = 0;
    await pool(todo, 4, async ([k, f]) => {
      const now = new Date().toISOString();
      try {
        const ov = overrides[k];
        if (ov !== undefined) {
          cache[k] = { tmdb: await tmdb.details(ov, "override"), overrideId: refKey(ov), checkedAt: now };
        } else {
          const m = await tmdb.match(f.title, f.year);
          cache[k] =
            m.ref !== null
              ? { tmdb: await tmdb.details(m.ref, m.by), checkedAt: now }
              : { tmdb: null, candidates: m.candidates, checkedAt: now };
        }
      } catch (e) {
        if (String(e).includes("401")) throw e;
        console.warn(`  ! ${k}: ${(e as Error).message}`);
      }
      if (++done % 50 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}`);
    });
  }

  // Drop cache entries for films no longer in the export.
  for (const k of Object.keys(cache)) if (!wanted.has(k)) delete cache[k];

  const data = assemble(lb, cache);
  fs.writeFileSync(OUT, JSON.stringify(data, null, 1) + "\n");
  writeReport(data, cache);

  const matched = data.films.filter((f) => f.tmdb).length;
  const wlMatched = data.watchlist.filter((f) => f.tmdb).length;
  console.log(`\nWatched: ${matched}/${data.films.length} matched. Watchlist: ${wlMatched}/${data.watchlist.length} matched.`);
  console.log(`Wrote ${rel(OUT)} and ${rel(REPORT)}.`);
}

function assemble(lb: ReturnType<typeof loadExport>, cache: Record<string, CacheEntry>): FilmsData {
  const byKey = <T extends Row>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const k = filmKey(r.Name, r.Year);
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return m;
  };
  const ratings = byKey(lb.ratings);
  const diaryRows = byKey(lb.diary);
  const reviews = byKey(lb.reviews);
  const likes = new Set(lb.likes.map((r) => filmKey(r.Name, r.Year)));
  const num = (s?: string) => (s ? Number(s) : null);

  const films: Film[] = lb.watched.map((r) => {
    const key = filmKey(r.Name, r.Year);
    const diary = (diaryRows.get(key) ?? []).sort((a, b) => a["Watched Date"].localeCompare(b["Watched Date"]));
    const latestReview = (reviews.get(key) ?? []).sort((a, b) => b.Date.localeCompare(a.Date))[0];
    const firstIsRewatch = diary[0]?.Rewatch === "Yes";
    return {
      id: slugify(r.Name, r.Year),
      key,
      title: r.Name,
      year: Number(r.Year),
      letterboxdUri: r["Letterboxd URI"],
      rating: num(ratings.get(key)?.[0]?.Rating) ?? num(diary.at(-1)?.Rating),
      liked: likes.has(key),
      watchedDate: diary.at(-1)?.["Watched Date"] ?? null,
      loggedDate: r.Date,
      timesWatched: Math.max(1, diary.length + (firstIsRewatch ? 1 : 0)),
      review: latestReview?.Review ? { html: sanitizeReview(latestReview.Review), date: latestReview["Watched Date"] || latestReview.Date } : null,
      tmdb: cache[key]?.tmdb ?? null,
    };
  });

  const ids = new Map(films.map((f) => [f.key, f.id]));
  const diary: DiaryEntry[] = lb.diary
    .map((r) => ({
      filmId: ids.get(filmKey(r.Name, r.Year)) ?? slugify(r.Name, r.Year),
      title: r.Name,
      year: Number(r.Year),
      watchedDate: r["Watched Date"] || r.Date,
      loggedDate: r.Date,
      rating: num(r.Rating),
      rewatch: r.Rewatch === "Yes",
    }))
    .sort((a, b) => b.watchedDate.localeCompare(a.watchedDate));

  const watchlist: WatchlistFilm[] = lb.watchlist.map((r) => {
    const key = filmKey(r.Name, r.Year);
    return {
      id: slugify(r.Name, r.Year),
      key,
      title: r.Name,
      year: Number(r.Year),
      addedDate: r.Date,
      letterboxdUri: r["Letterboxd URI"],
      tmdb: cache[key]?.tmdb ?? null,
    };
  });

  const byUri = new Map(films.map((f) => [f.letterboxdUri, f.id]));
  const favorites = (lb.profile["Favorite Films"] ?? "")
    .split(",")
    .map((s) => byUri.get(s.trim()))
    .filter((x): x is string => Boolean(x));

  // Stable key order keeps git diffs small.
  const sortedCache = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));

  return {
    generatedAt: new Date().toISOString(),
    username: lb.profile.Username ?? "",
    bio: lb.profile.Bio ?? "",
    favorites,
    films,
    watchlist,
    diary,
    taste: buildTaste(films, lb.profile.Bio ?? ""),
    cache: sortedCache,
  };
}

function writeReport(data: FilmsData, cache: Record<string, CacheEntry>) {
  const unmatched = [...data.films.map((f) => ({ f, where: "watched" })), ...data.watchlist.map((f) => ({ f, where: "watchlist" }))].filter(
    ({ f }) => !f.tmdb,
  );
  const loose = data.films.filter((f) => ["title-only", "title+nearby-year", "tv-series"].includes(f.tmdb?.matchedBy ?? ""));

  const lines = [
    "# Films that need a look",
    "",
    `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by \`npm run enrich\`.`,
    "",
    "To fix one, find the film on themoviedb.org. The number in its URL is the id",
    "(themoviedb.org/movie/**12345**-name). Add it to `data/overrides.json`, then run `npm run enrich` again.",
    "For a TV series (themoviedb.org/tv/12345-name) write it as \"tv:12345\".",
    "",
    "```json",
    '{ "Some Film (2011)": 12345, "Some Series (2021)": "tv:67890" }',
    "```",
    "",
    `## Not matched (${unmatched.length})`,
    "",
  ];
  if (!unmatched.length) lines.push("None. Everything matched.", "");
  for (const { f, where } of unmatched) {
    lines.push(`- **${f.key}** (${where})`);
    const c = cache[f.key]?.candidates ?? [];
    if (c.length) lines.push(`  - closest TMDB results: ${c.map((x) => `${x.title} (${x.year}) id ${x.id}`).join("; ")}`);
    else if (!cache[f.key]) lines.push("  - not looked up yet (run without --offline)");
  }
  lines.push(
    "",
    `## Matched loosely, worth a quick check (${loose.length})`,
    "",
    "These matched with a year a little off, on title alone, or as a TV series. They are probably right.",
    "",
  );
  for (const f of loose) {
    lines.push(
      `- ${f.key} -> ${f.tmdb!.title} (${f.tmdb!.releaseDate?.slice(0, 4) ?? "?"}), ${f.tmdb!.directors.join(", ") || "director unknown"}, id ${f.tmdb!.id} [${f.tmdb!.matchedBy}]`,
    );
  }
  fs.writeFileSync(REPORT, lines.join("\n") + "\n");
}

// Values: 12345 (a film), "movie:12345" or "tv:12345" (a series).
function readOverrides(): Record<string, TmdbRef> {
  if (!fs.existsSync(OVERRIDES)) return {};
  const raw = JSON.parse(fs.readFileSync(OVERRIDES, "utf8")) as Record<string, unknown>;
  const out: Record<string, TmdbRef> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("_")) continue; // keys starting with _ are notes
    const m = typeof v === "number" ? ["", "movie", String(v)] : typeof v === "string" ? v.match(/^(movie|tv):(\d+)$/) : null;
    if (m) out[k] = { kind: m[1] as TmdbRef["kind"], id: Number(m[2]) };
    else console.warn(`overrides.json: "${k}" should be a TMDB id like 12345, or "tv:12345" for a series`);
  }
  return out;
}

const refKey = (r: TmdbRef) => `${r.kind}:${r.id}`;

// Minimal .env loader so there is no extra dependency.
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

const rel = (p: string) => path.relative(ROOT, p);

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

// Small TMDB client: search by title/year and fetch details + director.
// Letterboxd also lists some TV miniseries (Loki, Scam 1992...), so TV is searched as a fallback.
import type { Candidate, MatchMethod, TmdbInfo, TmdbRef } from "../../src/lib/types";

const API = "https://api.themoviedb.org/3";

type Result = {
  id: number;
  title: string;
  originalTitle: string;
  date?: string;
  kind: "movie" | "tv";
};

type RawMovie = { id: number; title: string; original_title: string; release_date?: string };
type RawTv = { id: number; name: string; original_name: string; first_air_date?: string };

export class Tmdb {
  constructor(private key: string) {}

  private async get<T>(pathname: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(API + pathname);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    // TMDB gives two kinds of credentials. The long "Read Access Token" starts with "eyJ".
    const headers: Record<string, string> = { accept: "application/json" };
    if (this.key.startsWith("eyJ")) headers.authorization = `Bearer ${this.key}`;
    else url.searchParams.set("api_key", this.key);

    let lastError = "";
    for (let attempt = 0; attempt < 6; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
      } catch (e) {
        // Network blips and timeouts: wait a little longer each time and try again.
        lastError = (e as Error).message;
        await sleep(1000 * (attempt + 1));
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        lastError = `HTTP ${res.status}`;
        await sleep(1000 * Number(res.headers.get("retry-after") ?? attempt + 1));
        continue;
      }
      if (res.status === 401) throw new Error("TMDB said the key is invalid (401). Check TMDB_API_KEY in .env.local.");
      if (res.status === 404) throw new Error(`TMDB has nothing at ${pathname} (404). Check the id in overrides.json.`);
      if (!res.ok) throw new Error(`TMDB ${res.status} for ${pathname}`);
      return (await res.json()) as T;
    }
    throw new Error(`gave up on ${pathname} after 6 tries (${lastError})`);
  }

  async searchMovies(query: string, year?: number): Promise<Result[]> {
    const params: Record<string, string> = { query, include_adult: "false" };
    if (year) params.primary_release_year = String(year);
    const data = await this.get<{ results: RawMovie[] }>("/search/movie", params);
    return data.results.map((r) => ({ id: r.id, title: r.title, originalTitle: r.original_title, date: r.release_date, kind: "movie" }));
  }

  async searchTv(query: string, year?: number): Promise<Result[]> {
    const params: Record<string, string> = { query, include_adult: "false" };
    if (year) params.first_air_date_year = String(year);
    const data = await this.get<{ results: RawTv[] }>("/search/tv", params);
    return data.results.map((r) => ({ id: r.id, title: r.name, originalTitle: r.original_name, date: r.first_air_date, kind: "tv" }));
  }

  async details(ref: TmdbRef, matchedBy: MatchMethod): Promise<TmdbInfo> {
    if (ref.kind === "tv") return this.tvDetails(ref.id, matchedBy);
    const d = await this.get<{
      id: number;
      title: string;
      original_title: string;
      release_date: string;
      poster_path: string | null;
      backdrop_path: string | null;
      original_language: string;
      runtime: number | null;
      genres: { name: string }[];
      overview: string;
      credits?: { crew: { job: string; name: string }[] };
    }>(`/movie/${ref.id}`, { append_to_response: "credits" });
    return {
      kind: "movie",
      id: d.id,
      title: d.title,
      originalTitle: d.original_title,
      releaseDate: d.release_date || null,
      posterPath: d.poster_path,
      backdropPath: d.backdrop_path,
      originalLanguage: d.original_language,
      runtime: d.runtime || null,
      genres: d.genres.map((g) => g.name),
      directors: [...new Set((d.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name))],
      overview: d.overview,
      matchedBy,
    };
  }

  private async tvDetails(id: number, matchedBy: MatchMethod): Promise<TmdbInfo> {
    const d = await this.get<{
      id: number;
      name: string;
      original_name: string;
      first_air_date: string;
      poster_path: string | null;
      backdrop_path: string | null;
      original_language: string;
      episode_run_time: number[];
      number_of_episodes: number;
      genres: { name: string }[];
      overview: string;
      created_by: { name: string }[];
      last_episode_to_air?: { runtime: number | null };
    }>(`/tv/${id}`);
    // For a series, "runtime" is the whole thing: episodes x typical episode length.
    const perEpisode = d.episode_run_time[0] || d.last_episode_to_air?.runtime || null;
    return {
      kind: "tv",
      id: d.id,
      title: d.name,
      originalTitle: d.original_name,
      releaseDate: d.first_air_date || null,
      posterPath: d.poster_path,
      backdropPath: d.backdrop_path,
      originalLanguage: d.original_language,
      runtime: perEpisode && d.number_of_episodes ? perEpisode * d.number_of_episodes : null,
      genres: d.genres.map((g) => g.name),
      directors: d.created_by.map((c) => c.name),
      overview: d.overview,
      matchedBy,
    };
  }

  // Finds the TMDB entry for a Letterboxd title + year. Never guesses: returns null plus a few
  // candidates when nothing matches the title exactly.
  async match(title: string, year: number): Promise<{ ref: TmdbRef; by: MatchMethod } | { ref: null; candidates: Candidate[] }> {
    const queries = [...new Set([title, ascii(title)])];
    const want = loose(title);
    // Non-Latin titles have an empty loose key, so compare those as written.
    const same = (r: Result) =>
      want ? loose(r.title) === want || loose(r.originalTitle) === want : r.title === title || r.originalTitle === title;
    const yearOf = (r: Result) => Number(r.date?.slice(0, 4) || 0);
    const seen = new Map<string, Result>();
    const note = (rs: Result[]) => rs.slice(0, 4).forEach((r) => seen.set(`${r.kind}:${r.id}`, r));

    const find = async (search: (q: string, y?: number) => Promise<Result[]>, y?: number) => {
      for (const q of queries) {
        const results = await search(q, y);
        note(results);
        const hit = results.find(same);
        if (hit) return hit;
      }
      return null;
    };
    const ref = (r: Result): TmdbRef => ({ kind: r.kind, id: r.id });
    const movies = this.searchMovies.bind(this);
    const tv = this.searchTv.bind(this);

    const exact = await find(movies, year);
    if (exact) return { ref: ref(exact), by: "title+year" };
    for (const y of [year - 1, year + 1]) {
      const near = await find(movies, y);
      if (near) return { ref: ref(near), by: "title+nearby-year" };
    }

    const show = await find(tv, year);
    if (show) return { ref: ref(show), by: "tv-series" };

    // Title only: accept only when exactly one film has this exact title, and its year is close.
    for (const q of queries) {
      const results = await this.searchMovies(q);
      note(results);
      const hits = results.filter(same);
      if (hits.length === 1 && Math.abs(yearOf(hits[0]) - year) <= 3) return { ref: ref(hits[0]), by: "title-only" };
    }

    const candidates = [...seen.values()].slice(0, 5).map((r) => ({
      id: r.kind === "tv" ? `tv:${r.id}` : r.id,
      title: r.title,
      year: r.date?.slice(0, 4) || "?",
    }));
    return { ref: null, candidates };
  }
}

// "Bāhubali – Part 1" -> "Bahubali - Part 1"
export function ascii(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‐-―]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
}

// Loose comparison key: ignores case, accents, punctuation and doubled letters
// (so "Bāhubali" and "Baahubali" count as the same title).
export function loose(s: string) {
  return ascii(s)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/(.)\1+/g, "$1");
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { DiaryEntry, Film, FilmsData, WatchlistFilm } from "./types";
import { languageName } from "./language";
import { renderNote } from "./markdown";

const EMPTY: FilmsData = {
  generatedAt: "",
  username: "",
  bio: "",
  favorites: [],
  films: [],
  watchlist: [],
  diary: [],
  taste: { summary: "" },
  cache: {},
};

const root = (...p: string[]) => path.join(process.cwd(), ...p);
const readJson = <T,>(file: string, fallback: T): T =>
  fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as T) : fallback;

let data: FilmsData | null = null;
// Read once per build. Pages are static, so this only runs at build time.
export function getData(): FilmsData {
  data ??= readJson(root("data", "films.json"), EMPTY);
  return data;
}

// ---------- films ----------

// Watched order: diary films newest first, then the undated ones by when they were logged.
export function filmsByWatched(): Film[] {
  return [...getData().films].sort((a, b) => {
    const da = a.watchedDate ?? "";
    const db = b.watchedDate ?? "";
    if (da !== db) return db.localeCompare(da);
    return b.loggedDate.localeCompare(a.loggedDate) || a.title.localeCompare(b.title);
  });
}

export function getFilm(id: string) {
  return getData().films.find((f) => f.id === id) ?? null;
}

export function diaryFor(id: string): DiaryEntry[] {
  return getData().diary.filter((d) => d.filmId === id);
}

// ---------- hand-edited content ----------

type Site = { headline: string; circledFilm: string };
export function siteConfig(): Site {
  return readJson(root("content", "site.json"), { headline: "{count} films, and the evenings I spent with them.", circledFilm: "" });
}

export function noteFor(id: string): string | null {
  const file = root("content", "notes", `${id}.md`);
  return fs.existsSync(file) ? renderNote(fs.readFileSync(file, "utf8")) : null;
}

// ---------- what the browser gets ----------

// The slim version of a film for lists, search and filters.
export type FilmSummary = {
  id: string;
  title: string;
  year: number;
  rating: number | null;
  liked: boolean;
  watchedDate: string | null;
  loggedDate: string;
  timesWatched: number;
  langName: string;
  genres: string[];
  directors: string[];
  isSeries: boolean;
  poster: string | null;
  reviewed: boolean;
};

export function summarize(f: Film): FilmSummary {
  return {
    id: f.id,
    title: f.title,
    year: f.year,
    rating: f.rating,
    liked: f.liked,
    watchedDate: f.watchedDate,
    loggedDate: f.loggedDate,
    timesWatched: f.timesWatched,
    langName: f.tmdb ? languageName(f.tmdb.originalLanguage) : "Unknown",
    genres: f.tmdb?.genres ?? [],
    directors: f.tmdb?.directors ?? [],
    isSeries: f.tmdb?.kind === "tv",
    poster: f.tmdb?.posterPath ?? null,
    reviewed: Boolean(f.review),
  };
}

export type WatchlistSummary = {
  id: string;
  title: string;
  year: number;
  langName: string;
  runtime: number | null;
  directors: string[];
  poster: string | null;
  backdrop: string | null;
  overview: string;
  uri: string;
};

export function watchlistSummaries(): WatchlistSummary[] {
  return getData().watchlist.map((w: WatchlistFilm) => ({
    id: w.id,
    title: w.title,
    year: w.year,
    langName: w.tmdb ? languageName(w.tmdb.originalLanguage) : "Unknown",
    runtime: w.tmdb?.runtime ?? null,
    directors: w.tmdb?.directors ?? [],
    poster: w.tmdb?.posterPath ?? null,
    backdrop: w.tmdb?.backdropPath ?? null,
    overview: w.tmdb?.overview ?? "",
    uri: w.letterboxdUri,
  }));
}

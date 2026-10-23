// Shapes shared by the enrich script and the site.

export type MatchMethod =
  | "override"
  | "title+year"
  | "title+nearby-year"
  | "title-only"
  | "tv-series";

// Overrides and matches can point at a film or a TV series on TMDB.
export type TmdbRef = { kind: "movie" | "tv"; id: number };

export type TmdbInfo = {
  kind?: "movie" | "tv"; // missing means movie (older cache entries)
  id: number;
  title: string;
  originalTitle: string;
  releaseDate: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  originalLanguage: string; // ISO 639-1 code from TMDB, e.g. "mr"
  runtime: number | null; // minutes. For a series, the whole series.
  genres: string[];
  directors: string[];
  overview: string;
  matchedBy: MatchMethod;
};

export type Candidate = { id: number | string; title: string; year: string };

export type CacheEntry = {
  tmdb: TmdbInfo | null;
  candidates?: Candidate[]; // only kept for unmatched films, to help with overrides
  overrideId?: string; // the override this entry was fetched with, e.g. "movie:123" or "tv:456"
  checkedAt: string;
};

export type Review = { html: string; date: string };

export type Film = {
  id: string; // slug, e.g. "deool-2011"
  key: string; // "Deool (2011)", also the key used in overrides.json and the cache
  title: string;
  year: number;
  letterboxdUri: string;
  rating: number | null; // 0.5 to 5
  liked: boolean;
  watchedDate: string | null; // real watch date from the diary (latest), or null
  loggedDate: string; // date it was added on Letterboxd
  timesWatched: number; // diary entries, at least 1
  review: Review | null;
  tmdb: TmdbInfo | null;
};

export type WatchlistFilm = {
  id: string;
  key: string;
  title: string;
  year: number;
  addedDate: string;
  letterboxdUri: string;
  tmdb: TmdbInfo | null;
};

export type DiaryEntry = {
  filmId: string;
  title: string;
  year: number;
  watchedDate: string;
  loggedDate: string;
  rating: number | null;
  rewatch: boolean;
};

export type TasteProfile = {
  summary: string; // plain text, passed to Theatre mode
};

export type FilmsData = {
  generatedAt: string;
  username: string;
  bio: string;
  favorites: string[]; // film ids
  films: Film[];
  watchlist: WatchlistFilm[];
  diary: DiaryEntry[];
  taste: TasteProfile;
  cache: Record<string, CacheEntry>;
};

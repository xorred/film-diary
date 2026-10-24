import "server-only";
import { getData } from "./data";
import type { Film } from "./types";

/*
 * Every count on the site comes from here, so pages never disagree.
 *
 * Words used, carefully:
 *   title          a film or series on Letterboxd's watched list (each counted once)
 *   viewing        one time I watched something. Known viewings = dated diary entries, plus one
 *                  viewing for every undated film, plus one earlier viewing when a film's first
 *                  diary entry is marked as a rewatch. It is a minimum: unlogged rewatches can't be known.
 *   diary entry    a viewing with a real date
 *   undated        a film on the watched list with no diary entry. Its Letterboxd date is when it was
 *                  logged, not when it was watched, so it is never used as a viewing date.
 */

export function counts() {
  const { films, diary } = getData();
  const series = films.filter((f) => f.tmdb?.kind === "tv").length;
  const rated = films.filter((f) => f.rating != null).length;
  const viewings = films.reduce((n, f) => n + f.timesWatched, 0);
  return {
    titles: films.length,
    films: films.length - series,
    series,
    viewings,
    repeatViewings: viewings - films.length,
    diaryEntries: diary.length,
    diaryRewatches: diary.filter((d) => d.rewatch).length,
    undated: films.filter((f) => !f.watchedDate).length,
    rated,
    unrated: films.length - rated,
    reviews: films.filter((f) => f.review).length,
  };
}

// Estimated time spent: running time x times watched. Films with no running time on TMDB are left out
// and reported, so the number is honest about being an estimate.
export function hoursEstimate() {
  const { films } = getData();
  let minutes = 0;
  let missing = 0;
  for (const f of films) {
    if (f.tmdb?.runtime) minutes += f.tmdb.runtime * f.timesWatched;
    else missing++;
  }
  return { hours: Math.round(minutes / 60), missing };
}

export type YearSummary = {
  year: string;
  entries: number;
  uniqueFilms: number;
  rewatches: number;
  avgRating: number | null;
  hours: number;
  best: Film[]; // highest rated films seen that year
};

// One row per year, built only from dated diary entries.
export function yearSummaries(): YearSummary[] {
  const { films, diary } = getData();
  const byId = new Map(films.map((f) => [f.id, f]));
  const years = new Map<string, typeof diary>();
  for (const d of diary) {
    const y = d.watchedDate.slice(0, 4);
    years.set(y, [...(years.get(y) ?? []), d]);
  }
  return [...years]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, entries]) => {
      const ratings = entries.map((e) => e.rating).filter((r): r is number => r != null);
      const top = Math.max(...ratings);
      const best = [...new Set(entries.filter((e) => e.rating === top).map((e) => e.filmId))]
        .map((id) => byId.get(id))
        .filter((f): f is Film => Boolean(f));
      const minutes = entries.reduce((m, e) => m + (byId.get(e.filmId)?.tmdb?.runtime ?? 0), 0);
      return {
        year,
        entries: entries.length,
        uniqueFilms: new Set(entries.map((e) => e.filmId)).size,
        rewatches: entries.filter((e) => e.rewatch).length,
        avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
        hours: Math.round(minutes / 60),
        best,
      };
    });
}

// ---------- Reasons for watchlist suggestions ----------

export type Reason = { kind: "director" | "language" | "genre"; text: string; avg: number };

function averages(films: Film[], keys: (f: Film) => string[]) {
  const m = new Map<string, number[]>();
  for (const f of films) {
    if (f.rating == null) continue;
    for (const k of keys(f)) m.set(k, [...(m.get(k) ?? []), f.rating]);
  }
  return new Map([...m].map(([k, rs]) => [k, { n: rs.length, avg: rs.reduce((a, b) => a + b, 0) / rs.length }]));
}

/**
 * Builds reasons from my own ratings for a film I haven't seen yet: how I rate its director,
 * its language and its best-matching genre. Only real numbers, never a guess about the film itself.
 */
export function reasonMaker() {
  const { films } = getData();
  const dirs = averages(films, (f) => f.tmdb?.directors ?? []);
  const langs = averages(films, (f) => (f.tmdb ? [f.tmdb.originalLanguage] : []));
  const genres = averages(films, (f) => f.tmdb?.genres ?? []);
  const one = (n: number) => n.toFixed(1);

  return (w: { directors: string[]; langCode: string | null; langName: string; genres: string[] }) => {
    const reasons: Reason[] = [];
    for (const d of w.directors) {
      const s = dirs.get(d);
      if (s) {
        reasons.push({
          kind: "director",
          avg: s.avg,
          text:
            s.n === 1
              ? `I've seen one other film by ${d} and gave it ${s.avg}★.`
              : `I've seen ${s.n} films by ${d}, average ${one(s.avg)}★.`,
        });
        break;
      }
    }
    const l = w.langCode ? langs.get(w.langCode) : undefined;
    if (l && l.n >= 3) reasons.push({ kind: "language", avg: l.avg, text: `${w.langName}: ${l.n} seen, average ${one(l.avg)}★.` });
    const g = w.genres
      .map((name) => ({ name, s: genres.get(name) }))
      .filter((x): x is { name: string; s: { n: number; avg: number } } => Boolean(x.s && x.s.n >= 5))
      .sort((a, b) => b.s.avg - a.s.avg)[0];
    if (g) reasons.push({ kind: "genre", avg: g.s.avg, text: `${g.name}: ${g.s.n} seen, average ${one(g.s.avg)}★.` });

    // Score: a director I know counts most, then genre, then language. A film with nothing to go on scores 0.
    const weights = { director: 3, genre: 2, language: 1 };
    const total = reasons.reduce((t, r) => t + weights[r.kind], 0);
    const score = total ? reasons.reduce((t, r) => t + r.avg * weights[r.kind], 0) / total : 0;
    return { reasons, score };
  };
}

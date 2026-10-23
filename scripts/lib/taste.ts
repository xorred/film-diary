// Turns ratings into a short plain-text taste profile for Theatre mode.
import type { Film, TasteProfile } from "../../src/lib/types";
import { languageName } from "../../src/lib/language";

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const f1 = (n: number) => n.toFixed(1);

function line(f: Film) {
  const t = f.tmdb;
  const bits = [`${f.title} (${f.year})`, `${f.rating}/5`];
  if (t) bits.push(languageName(t.originalLanguage), t.directors[0] ? `dir. ${t.directors[0]}` : "", t.genres.slice(0, 2).join("/"));
  return "- " + bits.filter(Boolean).join(", ");
}

function groupAvg(films: Film[], keys: (f: Film) => string[], minCount: number) {
  const m = new Map<string, number[]>();
  for (const f of films) {
    if (f.rating == null) continue;
    for (const k of keys(f)) m.set(k, [...(m.get(k) ?? []), f.rating]);
  }
  return [...m]
    .filter(([, r]) => r.length >= minCount)
    .map(([k, r]) => ({ k, n: r.length, avg: avg(r) }));
}

export function buildTaste(films: Film[], bio: string): TasteProfile {
  const rated = films.filter((f) => f.rating != null);
  const overall = avg(rated.map((f) => f.rating!));
  const byRating = [...rated].sort((a, b) => b.rating! - a.rating! || b.year - a.year);

  const loved = byRating.filter((f) => f.rating! >= 4.5).slice(0, 30);
  const disliked = [...byRating].reverse().filter((f) => f.rating! <= 2).slice(0, 20);

  const langs = groupAvg(rated, (f) => (f.tmdb ? [languageName(f.tmdb.originalLanguage)] : []), 3).sort((a, b) => b.n - a.n);
  const directors = groupAvg(rated, (f) => f.tmdb?.directors ?? [], 3).sort((a, b) => b.n - a.n || b.avg - a.avg).slice(0, 15);
  const genres = groupAvg(rated, (f) => f.tmdb?.genres ?? [], 5).sort((a, b) => b.avg - a.avg);
  const reviewed = films.filter((f) => f.review).slice(0, 8);

  const parts = [
    bio ? `Their own words: "${bio}"` : "",
    `Has logged ${films.length} films and rated ${rated.length}. Average rating ${f1(overall)}/5, so 3.5 is a good film for them and 4+ is a favourite.`,
    "",
    "Languages watched (films, average rating):",
    ...langs.map((l) => `- ${l.k}: ${l.n} films, avg ${f1(l.avg)}`),
    "",
    "Genres by average rating (5+ films):",
    ...genres.map((g) => `- ${g.k}: avg ${f1(g.avg)} over ${g.n}`),
    "",
    "Directors they watch most (3+ films):",
    ...directors.map((d) => `- ${d.k}: ${d.n} films, avg ${f1(d.avg)}`),
    "",
    "Films they loved (4.5 to 5):",
    ...loved.map(line),
    "",
    "Films they rated low (2 or under):",
    ...disliked.map(line),
    "",
    "A few lines from their reviews:",
    ...reviewed.map((f) => `- ${f.title}: "${f.review!.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)}"`),
  ];

  return { summary: parts.join("\n").replace(/\n{3,}/g, "\n\n").trim() };
}

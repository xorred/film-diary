import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/Section";
import { getData } from "@/lib/data";
import { runtimeText } from "@/lib/format";
import { INDIAN, languageName } from "@/lib/language";
import type { Film } from "@/lib/types";

export const metadata: Metadata = { title: "Numbers" };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const one = (n: number) => n.toFixed(1);
const fmt = (n: number) => n.toLocaleString("en-IN");

type Row = { label: string; n: number; avg?: number; href?: string };

// A thin horizontal bar row: label, bar, count. One series, one colour, values written out.
function Bars({ rows, max, unit = "films" }: { rows: Row[]; max: number; unit?: string }) {
  return (
    <table className="w-full font-sans text-[0.875rem]">
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.label}
            className="group border-b border-rule"
            title={`${r.label}: ${r.n} ${unit}${r.avg ? `, average rating ${one(r.avg)}` : ""}`}
          >
            <th scope="row" className="w-[34%] py-2.5 pr-4 text-left font-normal text-ink sm:w-[26%]">
              {r.href ? (
                <Link href={r.href} className="link-underline">
                  {r.label}
                </Link>
              ) : (
                r.label
              )}
            </th>
            <td className="py-2.5 pr-4">
              <span
                className="block h-[5px] rounded-r-[3px] bg-ink transition-colors group-hover:bg-burgundy"
                style={{ width: `${Math.max(1.5, (r.n / max) * 100)}%` }}
                aria-hidden
              />
            </td>
            <td className="w-16 py-2.5 text-right tabular-nums text-charcoal">{r.n}</td>
            {r.avg !== undefined && <td className="hidden w-20 py-2.5 text-right tabular-nums text-faint sm:table-cell">{one(r.avg)}★</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function group(films: Film[], key: (f: Film) => string[]) {
  const m = new Map<string, number[]>();
  for (const f of films) for (const k of key(f)) m.set(k, [...(m.get(k) ?? []), f.rating ?? NaN]);
  return [...m].map(([label, rs]) => ({ label, n: rs.length, avg: avg(rs.filter((r) => !Number.isNaN(r))) }));
}

export default function StatsPage() {
  const { films, diary } = getData();
  if (!films.length) return null;
  const matched = films.filter((f) => f.tmdb);
  const series = matched.filter((f) => f.tmdb!.kind === "tv").length;
  const movies = films.length - series;

  // Hours: runtime times how often I've seen it. Series count as the whole series.
  const minutes = matched.reduce((sum, f) => sum + (f.tmdb!.runtime ?? 0) * f.timesWatched, 0);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  // Languages
  const langs = group(matched, (f) => [f.tmdb!.originalLanguage]).map((r) => ({ ...r, code: r.label, label: languageName(r.label) }));
  const indian = langs.filter((l) => INDIAN.has(l.code)).sort((a, b) => b.n - a.n);
  const other = langs.filter((l) => !INDIAN.has(l.code)).sort((a, b) => b.n - a.n);
  const english = langs.find((l) => l.code === "en")?.n ?? 0;
  const notEnglishShare = Math.round(((matched.length - english) / matched.length) * 10);
  const langMax = Math.max(...langs.map((l) => l.n));

  // Ratings
  const rated = films.filter((f) => f.rating != null);
  const steps = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  const dist = steps.map((s) => ({ s, n: rated.filter((f) => f.rating === s).length }));
  const distMax = Math.max(...dist.map((d) => d.n));
  const mean = avg(rated.map((f) => f.rating!));
  const mode = [...dist].sort((a, b) => b.n - a.n)[0];

  // Directors, decades, genres
  const directors = group(matched, (f) => f.tmdb!.directors)
    .filter((d) => d.n >= 3)
    .sort((a, b) => b.n - a.n || b.avg - a.avg)
    .slice(0, 12);
  const decades = group(films, (f) => [`${Math.floor(f.year / 10) * 10}s`])
    .sort((a, b) => b.label.localeCompare(a.label))
    .map((d) => ({ ...d, href: `/films?decade=${d.label}` }));
  const genres = group(matched, (f) => f.tmdb!.genres)
    .sort((a, b) => b.n - a.n)
    .slice(0, 10)
    .map((g) => ({ ...g, href: `/films?genre=${encodeURIComponent(g.label)}` }));
  const generous = [...group(matched, (f) => f.tmdb!.genres)].filter((g) => g.n >= 8).sort((a, b) => b.avg - a.avg)[0];

  // A few small facts
  const moviesOnly = matched.filter((f) => f.tmdb!.kind !== "tv" && f.tmdb!.runtime);
  const longest = [...moviesOnly].sort((a, b) => b.tmdb!.runtime! - a.tmdb!.runtime!)[0];
  const shortest = [...moviesOnly].sort((a, b) => a.tmdb!.runtime! - b.tmdb!.runtime!)[0];
  const oldest = [...films].sort((a, b) => a.year - b.year)[0];
  const busiest = (() => {
    const m = new Map<string, number>();
    for (const d of diary) m.set(d.watchedDate.slice(0, 7), (m.get(d.watchedDate.slice(0, 7)) ?? 0) + 1);
    const [ym, n] = [...m].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
    return { ym, n };
  })();
  const monthLabel = (ym: string) => new Date(`${ym}-15T12:00:00Z`).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="pt-14 sm:pt-20">
      <h1 className="display text-[clamp(2.4rem,5vw,4.2rem)]">In numbers</h1>
      <p className="mt-8 max-w-[30ch] font-serif text-[clamp(1.4rem,2.6vw,2.1rem)] leading-snug text-charcoal">
        {fmt(movies)} films{series ? ` and ${series} series` : ""}. Roughly {fmt(hours)} hours in front of a screen, which is about{" "}
        {days} days without sleep.
      </p>
      <p className="meta mt-4 max-w-[60ch] text-faint">
        Hours use each film&apos;s running time from TMDB, counted again for every rewatch. A series counts as all its episodes.
      </p>

      <Section
        className="mt-24"
        title="Languages"
        aside={`${notEnglishShare} of every 10 films I log aren't in English. Average rating on the right.`}
      >
        <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          <div>
            <h3 className="meta mb-2 text-faint">Indian languages</h3>
            <Bars rows={indian.map((l) => ({ ...l, href: `/films?lang=${encodeURIComponent(l.label)}` }))} max={langMax} />
          </div>
          <div>
            <h3 className="meta mb-2 text-faint">Everything else</h3>
            <Bars rows={other.map((l) => ({ ...l, href: `/films?lang=${encodeURIComponent(l.label)}` }))} max={langMax} />
          </div>
        </div>
      </Section>

      <Section
        className="mt-24"
        title="How I rate"
        aside={`On average ${one(mean)} stars. The most common score is ${mode.s}, given ${mode.n} times.`}
      >
        <figure>
          <div className="flex h-[200px] items-end gap-[2px] sm:gap-2" role="img" aria-label="How many films got each rating">
            {dist.map((d) => (
              <div key={d.s} className="group flex h-full flex-1 flex-col justify-end" title={`${d.s} stars: ${d.n} films`}>
                <span className="meta mb-1 text-center text-[0.72rem] tabular-nums text-charcoal">{d.n}</span>
                <span
                  className="block rounded-t-[3px] bg-burgundy opacity-80 transition-opacity group-hover:opacity-100"
                  style={{ height: `${Math.max(1, (d.n / distMax) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-[2px] border-t border-ink pt-2 sm:gap-2">
            {dist.map((d) => (
              <span key={d.s} className="meta flex-1 text-center text-[0.72rem] text-faint">
                {d.s}
              </span>
            ))}
          </div>
          <figcaption className="meta mt-3 text-faint">Stars along the bottom, number of films above each bar.</figcaption>
        </figure>
      </Section>

      <Section className="mt-24" title="Directors I keep going back to" aside="Three films or more. Average rating on the right.">
        <Bars rows={directors.map((d) => ({ ...d, href: `/films?q=${encodeURIComponent(d.label)}` }))} max={directors[0]?.n ?? 1} />
      </Section>

      <Section className="mt-24" title="When they were made" aside={`From ${oldest.title} (${oldest.year}) to this year.`}>
        <Bars rows={decades} max={Math.max(...decades.map((d) => d.n))} />
      </Section>

      <Section
        className="mt-24"
        title="Genres"
        aside={generous ? `${generous.label} is where I'm kindest, at ${one(generous.avg)} on average.` : undefined}
      >
        <Bars rows={genres} max={genres[0]?.n ?? 1} />
        <p className="meta mt-3 text-faint">A film can have more than one genre, so these add up to more than {films.length}.</p>
      </Section>

      <Section className="mt-24" title="Odds and ends">
        <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {longest && (
            <div>
              <dt className="meta text-faint">Longest sit</dt>
              <dd className="mt-1 font-serif text-[1.3rem] leading-snug">
                <Link href={`/films/${longest.id}`} className="link-underline">
                  {longest.title}
                </Link>
                , {runtimeText(longest.tmdb!.runtime)}
              </dd>
            </div>
          )}
          {shortest && (
            <div>
              <dt className="meta text-faint">Shortest</dt>
              <dd className="mt-1 font-serif text-[1.3rem] leading-snug">
                <Link href={`/films/${shortest.id}`} className="link-underline">
                  {shortest.title}
                </Link>
                , {runtimeText(shortest.tmdb!.runtime)}
              </dd>
            </div>
          )}
          <div>
            <dt className="meta text-faint">Oldest</dt>
            <dd className="mt-1 font-serif text-[1.3rem] leading-snug">
              <Link href={`/films/${oldest.id}`} className="link-underline">
                {oldest.title}
              </Link>
              , {oldest.year}
            </dd>
          </div>
          {busiest.n > 0 && (
            <div>
              <dt className="meta text-faint">Busiest month in the diary</dt>
              <dd className="mt-1 font-serif text-[1.3rem] leading-snug">
                {monthLabel(busiest.ym)}, {busiest.n} films
              </dd>
            </div>
          )}
        </dl>
      </Section>
    </div>
  );
}

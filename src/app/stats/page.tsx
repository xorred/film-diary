import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/Section";
import { getData } from "@/lib/data";
import { counts, hoursEstimate, yearSummaries } from "@/lib/stats";
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
  const c = counts();
  const { hours, missing } = hoursEstimate();
  const days = Math.round(hours / 24);
  const yearRows = yearSummaries();

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
      <p className="mt-8 max-w-[32ch] font-serif text-[clamp(1.4rem,2.6vw,2.1rem)] leading-snug text-charcoal">
        {fmt(c.titles)} titles, and at least {fmt(c.viewings)} viewings. Somewhere around {fmt(hours)} hours in the dark, about{" "}
        {days} days.
      </p>

      <Section
        className="mt-20"
        title="The count"
        aside="What each number means, so nothing gets counted twice."
      >
        <dl className="grid gap-x-12 sm:grid-cols-2">
          {(
            [
              [c.titles, "titles watched", `${fmt(c.films)} films and ${c.series} series. Each counted once.`],
              [c.viewings, "viewings, at least", `One for every title, plus ${c.repeatViewings} known rewatches. Rewatches I never logged can't be counted.`],
              [c.diaryEntries, "dated diary entries", `Viewings with a real date. ${c.diaryRewatches} of them are marked as rewatches.`],
              [c.undated, "titles with no viewing date", "Logged on Letterboxd without a date, mostly in one sitting in October 2023. Their logging date is not used as a viewing date."],
              [c.rated, "rated", c.unrated ? `${c.unrated} not rated.` : "Every title has a rating."],
              [c.reviews, "written reviews", "The rest have a rating and nothing more."],
            ] as const
          ).map(([n, label, note]) => (
            <div key={label} className="border-b border-rule py-4">
              <dt className="flex items-baseline gap-3">
                <span className="font-serif text-[1.9rem] leading-none tabular-nums">{fmt(n)}</span>
                <span className="font-serif text-[1.1rem] italic">{label}</span>
              </dt>
              <dd className="meta mt-1.5 max-w-[44ch] text-faint">{note}</dd>
            </div>
          ))}
        </dl>
        <p className="meta mt-5 max-w-[64ch] text-faint">
          Hours are an estimate: each title&apos;s running time from TMDB, counted once per known viewing. A series counts as all its
          episodes. {missing} {missing === 1 ? "title has" : "titles have"} no running time on TMDB and {missing === 1 ? "is" : "are"} left out.
        </p>
      </Section>

      <Section
        className="mt-24"
        title="Year by year"
        aside="Only from dated diary entries. The undated titles can't be placed in a year, so they aren't here."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] font-sans text-[0.875rem]">
            <caption className="sr-only">Dated diary entries by year</caption>
            <thead>
              <tr className="border-b border-ink text-left text-faint">
                <th scope="col" className="py-2 pr-4 font-normal">Year</th>
                <th scope="col" className="py-2 pr-4 text-right font-normal">Entries</th>
                <th scope="col" className="py-2 pr-4 text-right font-normal">Rewatches</th>
                <th scope="col" className="py-2 pr-4 text-right font-normal">Average</th>
                <th scope="col" className="py-2 pr-4 text-right font-normal">Hours, about</th>
                <th scope="col" className="py-2 font-normal">Rated highest</th>
              </tr>
            </thead>
            <tbody>
              {yearRows.map((y) => (
                <tr key={y.year} className="border-b border-rule align-baseline">
                  <th scope="row" className="py-3 pr-4 text-left font-serif text-[1.15rem] font-normal">
                    <Link href={`/diary#y${y.year}`} className="link-underline">
                      {y.year}
                    </Link>
                  </th>
                  <td className="py-3 pr-4 text-right tabular-nums">{y.entries}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-charcoal">{y.rewatches || ""}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-charcoal">{y.avgRating != null ? `${one(y.avgRating)}★` : ""}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-charcoal">{y.hours}</td>
                  <td className="py-3 font-serif text-[1rem]">
                    {y.best.slice(0, 3).map((f, i, arr) => (
                      <span key={f.id}>
                        <Link href={`/films/${f.id}`} className="link-underline">
                          {f.title}
                        </Link>
                        {i < arr.length - 1 ? ", " : ""}
                      </span>
                    ))}
                    {y.best.length > 3 && <span className="meta text-faint"> and {y.best.length - 3} more</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        className="mt-24"
        title="Languages"
        aside={`${notEnglishShare} of every 10 titles I've watched aren't in English. Titles, with average rating on the right.`}
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

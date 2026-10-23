import Link from "next/link";
import { ContactSheet, type SheetFrame } from "@/components/ContactSheet";
import { Ledger, type LedgerRow } from "@/components/Ledger";
import { Poster } from "@/components/Poster";
import { Section } from "@/components/Section";
import { getData, getFilm, siteConfig } from "@/lib/data";
import { longDate, numberWords } from "@/lib/format";
import { languageName } from "@/lib/language";
import type { Film } from "@/lib/types";

// A short line from a review, for the grease-pencil note on the contact sheet.
function firstLine(html: string, max = 64) {
  const text = html
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  const cut = text.split(/(?<=[.!?…])\s/)[0];
  return cut.length <= max ? cut : `${cut.slice(0, cut.lastIndexOf(" ", max))}...`;
}

function list(items: string[]) {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export default function Home() {
  const { films, diary, favorites } = getData();
  if (!films.length) {
    return (
      <p className="essay py-24">
        Nothing here yet. Put the Letterboxd export in <code>data/letterboxd/</code> and run <code>npm run enrich</code>.
      </p>
    );
  }

  const site = siteConfig();
  const byId = new Map(films.map((f) => [f.id, f]));

  // The contact sheet: the film I'd start with (circled), then films I loved, wrote about or saw lately.
  const sheetFilms: Film[] = [];
  const add = (f: Film | null | undefined) => {
    if (f?.tmdb?.backdropPath && !sheetFilms.some((x) => x.id === f.id) && sheetFilms.length < 24) sheetFilms.push(f);
  };
  // Circled in red: the film set in content/site.json, or else the latest film I loved enough to write about.
  const circled =
    (site.circledFilm ? getFilm(site.circledFilm) : null) ??
    films
      .filter((f) => f.review && (f.rating ?? 0) >= 4.5 && f.tmdb?.backdropPath)
      .sort((a, b) => b.review!.date.localeCompare(a.review!.date))[0] ??
    null;
  add(circled);
  const loved = films.filter((f) => (f.rating ?? 0) >= 4.5).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.year - a.year);
  const recent = diary.map((d) => byId.get(d.filmId)).filter((f): f is Film => Boolean(f && (f.rating ?? 0) >= 3.5));
  favorites.forEach((id) => add(byId.get(id)));
  // Alternate loved and recent so each strip has a mix of old and new.
  for (let k = 0; sheetFilms.length < 24 && k < Math.max(loved.length, recent.length); k++) {
    add(recent[k]);
    add(loved[k]);
  }
  const frames: SheetFrame[] = sheetFilms.map((f) => ({ id: f.id, title: f.title, year: f.year, still: f.tmdb!.backdropPath! }));
  const strips: SheetFrame[][] = [];
  for (let k = 0; k < frames.length; k += 6) strips.push(frames.slice(k, k + 6));

  // Languages, most watched first, for the opening line.
  const langCount = new Map<string, number>();
  for (const f of films) if (f.tmdb) langCount.set(f.tmdb.originalLanguage, (langCount.get(f.tmdb.originalLanguage) ?? 0) + 1);
  const langs = [...langCount].sort((a, b) => b[1] - a[1]).map(([c]) => languageName(c));
  const since = [...films].map((f) => f.loggedDate).sort()[0];

  const rows: LedgerRow[] = diary.slice(0, 10).flatMap((d) => {
    const f = byId.get(d.filmId);
    if (!f) return [];
    const meta = [f.tmdb ? languageName(f.tmdb.originalLanguage) : "", f.tmdb?.directors[0] ?? ""].filter(Boolean).join(", ");
    return [{ id: f.id, title: f.title, year: f.year, date: d.watchedDate, rating: d.rating, again: d.rewatch, poster: f.tmdb?.posterPath ?? null, meta }];
  });
  const keep = favorites.map((id) => byId.get(id)).filter((f): f is Film => Boolean(f));
  const fiveStars = films.filter((f) => f.rating === 5 && !favorites.includes(f.id)).sort((a, b) => a.year - b.year);

  // A quiet record: diary entries per year, plus everything from before the diary.
  const perYear = new Map<string, number>();
  for (const d of diary) perYear.set(d.watchedDate.slice(0, 4), (perYear.get(d.watchedDate.slice(0, 4)) ?? 0) + 1);
  const years = [...perYear].sort((a, b) => b[0].localeCompare(a[0]));
  const maxYear = Math.max(...years.map(([, n]) => n));
  const undated = films.filter((f) => !f.watchedDate).length;

  return (
    <>
      {/* Opening */}
      <div className="grid gap-x-10 gap-y-5 pt-12 sm:pt-16 lg:grid-cols-12 lg:items-end">
        <h1 className="display max-w-[22ch] text-[clamp(2rem,3.6vw,3.3rem)] lg:col-span-8">
          {site.headline.replace("{count}", numberWords(films.length))}
        </h1>
        <p className="meta max-w-[36ch] lg:col-span-4 lg:justify-self-end lg:pb-1.5 lg:text-right">
          Kept since {longDate(since).replace(/^\d+ /, "")}. Mostly {list(langs.slice(0, 2))}, with {list(langs.slice(2, 5))} in between.
        </p>
      </div>

      {/* The contact sheet */}
      <section aria-label="Contact sheet" className="mt-24 sm:mt-28">
        <ContactSheet strips={strips} circled={circled?.id ?? null} note={circled?.review ? firstLine(circled.review.html, 40) : null} />
        <p className="meta mt-6 max-w-[60ch] text-faint">
          A contact sheet of films I loved and films I saw lately. The one circled in red is the last film I loved enough to write about. Hover a frame for a closer look.
        </p>
      </section>

      {/* Lately */}
      <Section
        className="mt-32"
        title="Lately"
        aside={
          <>
            The last ten entries in my diary.{" "}
            <Link href="/diary" className="link-underline">
              All of it
            </Link>
          </>
        }
      >
        <Ledger rows={rows} />
      </Section>

      {/* Always */}
      {keep.length > 0 && (
        <Section className="mt-32" title="The ones I keep" aside="Four films I would keep if I could only keep four.">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {keep.map((f, i) => (
              <li key={f.id} className={i % 2 ? "sm:mt-14" : ""}>
                <Poster id={f.id} title={f.title} year={f.year} poster={f.tmdb?.posterPath ?? null} sizes="(min-width: 1024px) 220px, 45vw" big />
                <p className="mt-3 font-serif text-[1.1rem] italic leading-snug">
                  <Link href={`/films/${f.id}`} className="link-quiet">
                    {f.title}
                  </Link>
                </p>
                <p className="meta">
                  {f.year}
                  {f.tmdb?.directors[0] && <>, {f.tmdb.directors[0]}</>}
                </p>
              </li>
            ))}
          </ul>
          {fiveStars.length > 0 && (
            <p className="mt-14 max-w-[60ch] text-[1.05rem] leading-relaxed text-charcoal">
              <span className="meta mr-2 text-faint">Also five stars</span>
              {fiveStars.map((f, i) => (
                <span key={f.id}>
                  <Link href={`/films/${f.id}`} className="link-underline text-ink">
                    {f.title}
                  </Link>
                  {i < fiveStars.length - 2 ? ", " : i === fiveStars.length - 2 ? " and " : "."}
                </span>
              ))}
            </p>
          )}
        </Section>
      )}

      {/* The record */}
      <Section
        className="mt-28"
        title="The record"
        aside={
          <>
            Diary entries by year.{" "}
            <Link href="/stats" className="link-underline">
              More numbers
            </Link>
          </>
        }
      >
        <table className="w-full max-w-[640px] font-sans text-[0.875rem]">
          <caption className="sr-only">Films logged in the diary each year</caption>
          <tbody>
            {years.map(([y, n]) => (
              <tr key={y} className="border-b border-rule">
                <th scope="row" className="w-16 py-2 text-left font-normal text-charcoal">
                  {y}
                </th>
                <td className="py-2 pr-4">
                  <span className="block h-px bg-ink" style={{ width: `${(n / maxYear) * 100}%` }} aria-hidden />
                </td>
                <td className="w-24 py-2 text-right tabular-nums text-charcoal">
                  {n} {n === 1 ? "film" : "films"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="meta mt-4 max-w-[60ch] text-faint">
          And {undated} more from before I kept a diary, most of them logged in one long sitting in October 2023.
        </p>
      </Section>

    </>
  );
}

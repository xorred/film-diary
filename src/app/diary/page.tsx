import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Stars } from "@/components/Stars";
import { getData } from "@/lib/data";
import { monthName, posterUrl } from "@/lib/format";

export const metadata: Metadata = { title: "Diary" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekday = (iso: string) => WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];

export default function DiaryPage() {
  const { diary, films } = getData();
  const byId = new Map(films.map((f) => [f.id, f]));

  // Month by month, newest first. Within a month, newest first too.
  const months = new Map<string, typeof diary>();
  for (const d of diary) {
    const m = d.watchedDate.slice(0, 7);
    months.set(m, [...(months.get(m) ?? []), d]);
  }
  const years = [...new Set(diary.map((d) => d.watchedDate.slice(0, 4)))];
  const monthsOf = (y: string) => [...months.keys()].filter((m) => m.startsWith(y));
  const rewatches = diary.filter((d) => d.rewatch).length;
  const undated = films.filter((f) => !f.watchedDate).length;
  const reviewCount = films.filter((f) => f.review).length;
  // A review belongs to a diary entry when it was written for that viewing (same date).
  const excerpt = (filmId: string, date: string) => {
    const r = byId.get(filmId)?.review;
    if (!r || r.date !== date) return null;
    const text = r.html.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    return text.length > 150 ? `${text.slice(0, text.lastIndexOf(" ", 150))}...` : text;
  };

  return (
    <div className="pt-14 sm:pt-20">
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-12 lg:items-end">
        <h1 className="display text-[clamp(2.4rem,5vw,4.2rem)] lg:col-span-7">The diary</h1>
        <p className="meta max-w-[40ch] lg:col-span-5 lg:justify-self-end lg:text-right">
          Every viewing I logged with the date I saw it. {diary.length} entries, {rewatches} of them rewatches.{" "}
          <Link href="/diary/reviews" className="link-underline">
            Read all {reviewCount} reviews
          </Link>
        </p>
      </div>

      <nav aria-label="Jump to a year or month" className="mt-10 border-y border-rule py-3">
        <ul className="meta grid gap-y-1.5">
          {years.map((y) => (
            <li key={y} className="flex flex-wrap items-baseline gap-x-4">
              <a href={`#y${y}`} className="link-underline w-10 text-ink">
                {y}
              </a>
              {monthsOf(y).map((m) => (
                <a key={m} href={`#m${m}`} className="link-underline text-faint hover:text-ink">
                  {monthName(m).slice(0, 3)}
                </a>
              ))}
            </li>
          ))}
          <li>
            <a href="#undated" className="link-underline text-faint">
              No viewing date ({undated})
            </a>
          </li>
        </ul>
      </nav>

      <div className="mt-16 space-y-20">
        {[...months].map(([m, entries], idx, all) => {
          const year = m.slice(0, 4);
          const firstOfYear = idx === 0 || all[idx - 1][0].slice(0, 4) !== year;
          return (
            <section key={m} id={`m${m}`} className="relative grid scroll-mt-8 gap-x-10 gap-y-5 lg:grid-cols-12">
              {firstOfYear && <span id={`y${year}`} className="absolute -top-8" aria-hidden />}
              <header className="lg:col-span-3">
                <div className="lg:sticky lg:top-8">
                  <h2 className="font-serif text-[1.7rem] italic leading-tight">{monthName(m)}</h2>
                  <p className="meta text-faint">
                    {entries.length} {entries.length === 1 ? "film" : "films"}
                  </p>
                </div>
              </header>

              <ol className="border-t border-rule lg:col-span-9">
                {entries.map((d, i) => {
                  const f = byId.get(d.filmId);
                  const day = Number(d.watchedDate.slice(8, 10));
                  return (
                    <li key={d.filmId + d.watchedDate + i} className="border-b border-rule">
                      <Link
                        href={`/films/${d.filmId}`}
                        className="group grid grid-cols-[2.6rem_44px_1fr] items-center gap-x-4 py-3 sm:grid-cols-[3.4rem_52px_1fr_auto] sm:gap-x-6"
                      >
                        <span className="text-right">
                          <span className="block font-serif text-[1.7rem] leading-none tabular-nums">{day}</span>
                          <span className="meta block text-[0.7rem] text-faint">{weekday(d.watchedDate)}</span>
                        </span>
                        <span className="poster">
                          {f?.tmdb?.posterPath && <Image src={posterUrl(f.tmdb.posterPath, "w185")} alt="" fill sizes="52px" className="object-cover" />}
                        </span>
                        <span className="min-w-0">
                          <span className="font-serif text-[1.25rem] leading-snug transition-colors group-hover:text-burgundy">{d.title}</span>
                          {d.rewatch && <span className="hand ml-2.5 text-[1.35rem]">again</span>}
                          <span className="meta block text-faint">
                            {d.year}
                            {f?.tmdb?.directors[0] && <>, {f.tmdb.directors[0]}</>}
                          </span>
                          <Stars rating={d.rating} className="text-[0.75rem] sm:hidden" />
                          {excerpt(d.filmId, d.watchedDate) && (
                            <span className="mt-1.5 block max-w-[52ch] font-serif text-[0.98rem] italic leading-snug text-charcoal">
                              {excerpt(d.filmId, d.watchedDate)}
                            </span>
                          )}
                        </span>
                        <Stars rating={d.rating} className="hidden text-[0.8rem] sm:inline" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}

        <section id="undated" className="grid scroll-mt-8 gap-x-10 gap-y-4 lg:grid-cols-12">
          <h2 className="font-serif text-[1.7rem] italic leading-tight lg:col-span-3">No viewing date</h2>
          <div className="essay text-[1.15rem] lg:col-span-7">
            <p>
              {undated} more titles are on my list without a date. Most went in during one long sitting in October 2023, from
              before I kept a diary. Letterboxd only knows when I logged them, not when I watched them, so they aren&apos;t placed in
              the months above.
            </p>
            <p>
              <Link href="/films?seen=undated" className="link-underline">
                See all {undated} in the films list
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

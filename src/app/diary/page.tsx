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
  const rewatches = diary.filter((d) => d.rewatch).length;
  const undated = films.filter((f) => !f.watchedDate).length;

  return (
    <div className="pt-14 sm:pt-20">
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-12 lg:items-end">
        <h1 className="display text-[clamp(2.4rem,5vw,4.2rem)] lg:col-span-7">The diary</h1>
        <p className="meta max-w-[40ch] lg:col-span-5 lg:justify-self-end lg:text-right">
          Every film I logged with the date I saw it. {diary.length} entries, {rewatches} of them second viewings.
        </p>
      </div>

      <nav aria-label="Jump to a year" className="meta mt-10 flex flex-wrap gap-x-5 gap-y-2 border-y border-rule py-3">
        {years.map((y) => (
          <a key={y} href={`#y${y}`} className="link-underline">
            {y}
          </a>
        ))}
        <a href="#before" className="link-underline text-faint">
          Before the diary
        </a>
      </nav>

      <div className="mt-16 space-y-20">
        {[...months].map(([m, entries], idx, all) => {
          const year = m.slice(0, 4);
          const firstOfYear = idx === 0 || all[idx - 1][0].slice(0, 4) !== year;
          return (
            <section key={m} id={firstOfYear ? `y${year}` : undefined} className="grid scroll-mt-8 gap-x-10 gap-y-5 lg:grid-cols-12">
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

        <section id="before" className="grid scroll-mt-8 gap-x-10 gap-y-4 lg:grid-cols-12">
          <h2 className="font-serif text-[1.7rem] italic leading-tight lg:col-span-3">Before the diary</h2>
          <p className="essay text-[1.15rem] lg:col-span-7">
            {undated} more films I watched before I started writing down dates. Most of them went in on one long evening in
            October 2023.{" "}
            <Link href="/films" className="link-underline">
              They&apos;re all in the films list
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { Archive } from "@/components/Archive";
import { filmsByWatched, summarize } from "@/lib/data";
import { counts } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Films",
  description: "Every film and series in the diary, searchable by title, director, language, decade, genre and rating.",
};

export default function FilmsPage() {
  const films = filmsByWatched().map(summarize);
  const c = counts();
  return (
    <div className="pt-14 sm:pt-20">
      <div className="mb-14 grid gap-x-10 gap-y-6 lg:grid-cols-12 lg:items-end">
        <h1 className="display max-w-[16ch] text-[clamp(2.4rem,5vw,4.2rem)] lg:col-span-7">Everything I&apos;ve seen, in one place.</h1>
        <p className="max-w-[38ch] font-serif text-[1.15rem] leading-relaxed text-charcoal lg:col-span-5 lg:justify-self-end">
          {c.films} films and {c.series} series, {c.unrated ? `${c.rated} of them rated` : "every one rated"}, {c.reviews} with a few
          words of review. {c.diaryEntries} have the date I saw them. The rest have no viewing date on record.
        </p>
      </div>
      <Suspense>
        <Archive films={films} />
      </Suspense>
    </div>
  );
}

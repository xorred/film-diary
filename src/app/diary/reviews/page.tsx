import type { Metadata } from "next";
import Link from "next/link";
import { Poster } from "@/components/Poster";
import { Stars } from "@/components/Stars";
import { getData } from "@/lib/data";
import { longDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Reviews",
  description: "Every review from the diary, in full, newest first.",
};

export default function ReviewsPage() {
  const reviewed = getData()
    .films.filter((f) => f.review)
    .sort((a, b) => b.review!.date.localeCompare(a.review!.date));

  return (
    <div className="pt-14 sm:pt-20">
      <p className="meta text-faint">
        <Link href="/diary" className="link-underline">
          Diary
        </Link>{" "}
        / Reviews
      </p>
      <div className="mt-6 grid gap-x-10 gap-y-6 lg:grid-cols-12 lg:items-end">
        <h1 className="display text-[clamp(2.4rem,5vw,4.2rem)] lg:col-span-7">What I wrote</h1>
        <p className="meta max-w-[40ch] lg:col-span-5 lg:justify-self-end lg:text-right">
          {reviewed.length} reviews, in full, newest first. Each one is also on its film&apos;s page.
        </p>
      </div>

      <div className="mt-16 space-y-20">
        {reviewed.map((f) => (
          <article key={f.id} className="grid gap-x-10 gap-y-6 border-t border-rule pt-10 lg:grid-cols-12">
            <div className="grid grid-cols-[96px_1fr] gap-5 lg:col-span-3 lg:block">
              <div className="lg:w-[130px]">
                <Poster id={f.id} title={f.title} year={f.year} poster={f.tmdb?.posterPath ?? null} sizes="130px" />
              </div>
              <div className="lg:mt-5">
                <p className="meta text-faint">Written {longDate(f.review!.date)}</p>
                <Stars rating={f.rating} className="mt-1 block text-[0.85rem]" />
              </div>
            </div>
            <div className="lg:col-span-8 lg:col-start-5">
              <h2 className="font-serif text-[clamp(1.7rem,3vw,2.4rem)] leading-tight">
                <Link href={`/films/${f.id}`} className="link-quiet">
                  {f.title}
                </Link>
              </h2>
              <p className="meta mt-1 text-faint">
                {f.year}
                {f.tmdb?.directors[0] && <>, {f.tmdb.directors[0]}</>}
              </p>
              <div className="essay mt-6" dangerouslySetInnerHTML={{ __html: f.review!.html }} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

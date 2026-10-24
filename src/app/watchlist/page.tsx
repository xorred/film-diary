import type { Metadata } from "next";
import { Poster } from "@/components/Poster";
import { TonightPicker, type Suggestion } from "@/components/TonightPicker";
import { watchlistSummaries } from "@/lib/data";
import { reasonMaker } from "@/lib/stats";
import { runtimeText } from "@/lib/format";

export const metadata: Metadata = {
  title: "Watchlist",
  description: "Films still to see, and a way to pick tonight's from the time you have.",
};

export default function WatchlistPage() {
  const films = watchlistSummaries().sort((a, b) => b.year - a.year);
  const oldest = [...films].sort((a, b) => a.year - b.year)[0];
  const reasonsFor = reasonMaker();
  const suggestions: Suggestion[] = films.map((f) => ({ ...f, ...reasonsFor(f) }));

  return (
    <div className="pt-14 sm:pt-20">
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-12 lg:items-end">
        <h1 className="display text-[clamp(2.4rem,5vw,4.2rem)] lg:col-span-7">Still to see</h1>
        <p className="meta max-w-[40ch] lg:col-span-5 lg:justify-self-end lg:text-right">
          {films.length} films waiting their turn{oldest && <>, the oldest from {oldest.year}</>}.
        </p>
      </div>

      <div className="rule mt-14 pt-12">
        <TonightPicker films={suggestions} />
      </div>

      <section aria-label="The whole watchlist" className="rule mt-24 pt-10">
        <h2 className="font-serif text-[1.6rem] italic">The whole list</h2>
        <p className="meta mt-1 text-faint">Newest films first. Each one opens on Letterboxd.</p>
        <ul className="mt-8 grid grid-cols-3 gap-x-4 gap-y-9 sm:grid-cols-4 sm:gap-x-6 lg:grid-cols-6">
          {films.map((f) => (
            <li key={f.id}>
              <a href={f.uri} className="group block">
                <Poster title={f.title} year={f.year} poster={f.poster} sizes="(min-width: 1024px) 190px, (min-width: 640px) 24vw, 31vw" />
                <span className="mt-2 block text-[0.95rem] leading-snug">
                  <span className="link-quiet">{f.title}</span>
                </span>
                <span className="meta block text-faint">
                  {[f.year, f.langName !== "Unknown" ? f.langName : "", runtimeText(f.runtime)].filter(Boolean).join(", ")}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

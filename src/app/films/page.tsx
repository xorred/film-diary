import type { Metadata } from "next";
import { Suspense } from "react";
import { Archive } from "@/components/Archive";
import { filmsByWatched, summarize } from "@/lib/data";

export const metadata: Metadata = { title: "Films" };

export default function FilmsPage() {
  const films = filmsByWatched().map(summarize);
  return (
    <div className="pt-14 sm:pt-20">
      <h1 className="display mb-12 max-w-[18ch] text-[clamp(2.4rem,5vw,4.2rem)]">Everything I&apos;ve seen, in one place.</h1>
      <Suspense>
        <Archive films={films} />
      </Suspense>
    </div>
  );
}

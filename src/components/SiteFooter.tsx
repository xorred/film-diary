import { getData } from "@/lib/data";
import { longDate } from "@/lib/format";

export function SiteFooter() {
  const { generatedAt, username } = getData();
  return (
    <footer className="mx-auto mt-32 w-full max-w-[1320px] px-5 pb-12 sm:px-10">
      <div className="rule grid gap-6 pt-6 meta sm:grid-cols-[1fr_1fr]">
        <p className="max-w-[46ch]">
          Kept on{" "}
          <a className="link-underline" href={`https://letterboxd.com/${username}/`}>
            Letterboxd
          </a>
          .{generatedAt && <> Last updated {longDate(generatedAt.slice(0, 10))}.</>}
        </p>
        <p className="max-w-[46ch] text-faint sm:justify-self-end sm:text-right">
          Film details and images from{" "}
          <a className="link-underline" href="https://www.themoviedb.org/">
            TMDB
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>
    </footer>
  );
}

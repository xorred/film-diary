import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Poster } from "@/components/Poster";
import { Stars } from "@/components/Stars";
import { diaryFor, filmsByWatched, getData, getFilm, noteFor } from "@/lib/data";
import { longDate, posterUrl, runtimeText, seenText, stillUrl } from "@/lib/format";
import { languageName } from "@/lib/language";

export const dynamicParams = false;

export function generateStaticParams() {
  return getData().films.map((f) => ({ id: f.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const f = getFilm((await params).id);
  if (!f) return {};
  const text = f.review
    ? f.review.html.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()
    : f.tmdb?.overview ?? "";
  const description = `${f.rating != null ? `${f.rating}★. ` : ""}${text.slice(0, 180)}${text.length > 180 ? "..." : ""}`.trim();
  const image = f.tmdb?.backdropPath ? stillUrl(f.tmdb.backdropPath, "w1280") : f.tmdb?.posterPath ? posterUrl(f.tmdb.posterPath, "w500") : null;
  return {
    title: `${f.title} (${f.year})`,
    description,
    openGraph: { title: `${f.title} (${f.year})`, description, images: image ? [{ url: image, alt: f.title }] : [] },
  };
}

export default async function FilmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const film = getFilm(id);
  if (!film) notFound();

  const t = film.tmdb;
  const entries = diaryFor(film.id).sort((a, b) => a.watchedDate.localeCompare(b.watchedDate));
  const note = noteFor(film.id);
  const isSeries = t?.kind === "tv";
  const showOriginal = t && t.originalTitle && t.originalTitle !== film.title;
  // A drop cap only looks right on a capital Latin letter.
  const firstChar = film.review?.html.replace(/<[^>]+>|&[a-z]+;|[“"'‘\s]/g, "").charAt(0) ?? "";
  const dropcap = /[A-Z]/.test(firstChar);

  const order = filmsByWatched();
  const i = order.findIndex((f) => f.id === film.id);
  const after = i > 0 ? order[i - 1] : null;
  const before = i < order.length - 1 ? order[i + 1] : null;

  const facts: [string, string][] = [
    [isSeries ? "Created by" : "Directed by", t?.directors.join(", ") ?? ""],
    ["Released", t?.releaseDate ? longDate(t.releaseDate) : String(film.year)],
    ["Language", t ? languageName(t.originalLanguage) : ""],
    [isSeries ? "The whole series" : "Running time", runtimeText(t?.runtime ?? null)],
    ["Genre", t?.genres.join(", ") ?? ""],
  ];

  return (
    <article className="pt-10 sm:pt-16">
      <p className="meta text-faint">
        <Link href="/films" className="link-underline">
          Films
        </Link>{" "}
        / {film.year}
        {isSeries && ", a series"}
      </p>

      <header className="mt-6 grid gap-x-10 lg:grid-cols-12">
        <h1 className="display text-[clamp(2.6rem,7vw,6rem)] lg:col-span-10">{film.title}</h1>
        {showOriginal && (
          <p className="mt-3 font-serif text-[1.5rem] italic text-charcoal lg:col-span-10" lang={t.originalLanguage}>
            {t.originalTitle}
          </p>
        )}
      </header>

      {t?.backdropPath && (
        <div className="relative mt-12 aspect-[16/10] overflow-hidden sm:aspect-[2.39/1]">
          <Image
            src={stillUrl(t.backdropPath)}
            alt={`A still from ${film.title}`}
            fill
            priority
            sizes="(min-width: 1320px) 1240px, 94vw"
            className="still object-cover"
          />
        </div>
      )}

      <div className="mt-14 grid gap-x-10 gap-y-12 lg:grid-cols-12">
        {/* The margin: poster, facts, when I saw it */}
        <aside className="lg:col-span-3">
          <div className="grid grid-cols-[120px_1fr] gap-6 lg:block">
            <div className="lg:w-[180px]">
              <Poster title={film.title} year={film.year} poster={t?.posterPath ?? null} sizes="180px" />
            </div>
            <div className="lg:mt-8">
              <Stars rating={film.rating} className="text-[1rem]" />
              {film.liked && <p className="hand mt-1">loved this one</p>}
              <dl className="meta mt-5 space-y-3">
                {facts
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-faint">{k}</dt>
                      <dd className="text-ink">{v}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          </div>
        </aside>

        {/* The page: review, notes, the diary */}
        <div className="lg:col-span-8 lg:col-start-5">
          {film.review ? (
            <>
              <div className={`essay ${dropcap ? "dropcap single" : ""}`} dangerouslySetInnerHTML={{ __html: film.review.html }} />
              <p className="meta mt-6 text-faint">Written {longDate(film.review.date)}.</p>
            </>
          ) : !note && t?.overview ? (
            <div className="max-w-[34em]">
              <p className="meta text-faint">I didn&apos;t write about this one. What it&apos;s about, from TMDB:</p>
              <p className="mt-3 font-serif text-[1.15rem] italic leading-relaxed text-charcoal">{t.overview}</p>
            </div>
          ) : null}

          {note && (
            <section className={film.review ? "mt-16" : ""}>
              {film.review && <h2 className="mb-5 font-serif text-[1.4rem] italic">Later, some more</h2>}
              <div className={`essay ${film.review ? "" : "dropcap"}`} dangerouslySetInnerHTML={{ __html: note }} />
            </section>
          )}

          <section className="rule mt-16 pt-6">
            <h2 className="sr-only">When I watched it</h2>
            {entries.length ? (
              <ul className="space-y-1.5">
                {entries.map((e, n) => (
                  <li key={e.watchedDate + n} className="flex flex-wrap items-baseline gap-x-4">
                    <span className="font-serif text-[1.05rem]">{longDate(e.watchedDate)}</span>
                    <Stars rating={e.rating} className="text-[0.75rem]" />
                    {(e.rewatch || n > 0) && <span className="hand text-[1.35rem]">again</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-serif text-[1.05rem]">{seenText(film)}</p>
            )}
            <p className="meta mt-3">
              <a href={film.letterboxdUri} className="link-underline">
                On Letterboxd
              </a>
              {t && (
                <>
                  {" "}
                  and{" "}
                  <a href={`https://www.themoviedb.org/${isSeries ? "tv" : "movie"}/${t.id}`} className="link-underline">
                    TMDB
                  </a>
                </>
              )}
            </p>
          </section>
        </div>
      </div>

      {/* Neighbours in the diary */}
      <nav aria-label="Nearby in the diary" className="rule mt-24 grid gap-8 pt-6 sm:grid-cols-2">
        {before && (
          <Link href={`/films/${before.id}`} className="group">
            <span className="meta text-faint">Watched before this</span>
            <span className="mt-1 block font-serif text-[1.35rem] italic leading-tight">
              <span className="link-quiet">{before.title}</span>
            </span>
          </Link>
        )}
        {after && (
          <Link href={`/films/${after.id}`} className="group sm:text-right">
            <span className="meta text-faint">Watched after</span>
            <span className="mt-1 block font-serif text-[1.35rem] italic leading-tight">
              <span className="link-quiet">{after.title}</span>
            </span>
          </Link>
        )}
      </nav>
    </article>
  );
}

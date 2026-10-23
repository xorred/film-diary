import Image from "next/image";
import Link from "next/link";
import { posterUrl } from "@/lib/format";

type Props = {
  id?: string; // links to the film page when set
  title: string;
  year: number;
  poster: string | null;
  sizes: string;
  big?: boolean;
  priority?: boolean;
};

// A poster treated as a print: no rounded corners, a hairline edge, nothing on top of it.
export function Poster({ id, title, year, poster, sizes, big, priority }: Props) {
  const body = poster ? (
    <Image
      src={posterUrl(poster, big ? "w500" : "w342")}
      alt={`Poster for ${title} (${year})`}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover"
    />
  ) : (
    // No poster on TMDB: set the title like a plain title card instead.
    <span className="absolute inset-0 flex flex-col justify-between p-[9%]">
      <span className="font-serif text-[clamp(0.9rem,1.3vw,1.2rem)] italic leading-tight">{title}</span>
      <span className="meta">{year}</span>
    </span>
  );

  return id ? (
    <Link href={`/films/${id}`} className="poster" aria-label={`${title} (${year})`}>
      {body}
    </Link>
  ) : (
    <span className="poster">{body}</span>
  );
}

import Image from "next/image";
import Link from "next/link";
import { stillUrl } from "@/lib/format";

export type SheetFrame = { id: string; title: string; year: number; still: string };

// Small differences so the strips look laid down by hand, not placed by a grid.
const LAY = [
  { rot: -0.35, x: -6 },
  { rot: 0.28, x: 10 },
  { rot: -0.12, x: -2 },
  { rot: 0.42, x: 6 },
];

// A hand-drawn loop: starts top left, goes round, overshoots its own start.
const LOOP = "M34 26 C80 4 168 8 188 52 C206 96 150 134 92 131 C32 128 4 98 12 62 C18 36 48 20 82 15";

/**
 * The home page opening: a printed contact sheet. Black strips of film on paper,
 * each frame a still. On load the frames develop one by one, then a grease-pencil
 * circle marks the one I'd start with.
 */
export function ContactSheet({
  strips,
  circled,
  note,
}: {
  strips: SheetFrame[][];
  circled: string | null;
  note: string | null;
}) {
  const total = strips.flat().length;
  return (
    <div className="sheet-print">
    <div className="sheet" role="group" aria-label="A contact sheet of films">
      {strips.map((strip, r) => {
        const lay = LAY[r % LAY.length];
        return (
          <div
            key={r}
            className="sheet-strip"
            style={{ ["--rot" as string]: `${lay.rot}deg`, ["--x" as string]: `${lay.x}px` }}
          >
            <div className="sheet-edge">
              <span className="sheet-holes" aria-hidden />
            </div>
            <ul className="sheet-frames" aria-label={`Strip ${r + 1}`}>
              {strip.map((f, k) => {
                const num = strips.slice(0, r).reduce((sum, st) => sum + st.length, 0) + k + 1;
                const isCircled = f.id === circled;
                return (
                  <li key={f.id} className={`sheet-frame ${isCircled ? "is-circled" : ""}`} style={{ ["--d" as string]: `${0.25 + (num / total) * 1.6}s` }}>
                    <span className="sheet-num" aria-hidden>
                      {num} <span className="opacity-60">▸</span> {num}A
                    </span>
                    <Link href={`/films/${f.id}`} className="sheet-link" aria-label={`${f.title} (${f.year})`}>
                      <Image src={stillUrl(f.still, "w780")} alt="" fill sizes="(min-width: 1024px) 200px, 44vw" className="sheet-img object-cover" />
                    </Link>
                    <span className="sheet-cap" aria-hidden>
                      {f.title}, {f.year}
                    </span>
                    {isCircled && (
                      <>
                        <svg className="grease-loop" viewBox="0 0 200 140" preserveAspectRatio="none" aria-hidden>
                          <path d={LOOP} pathLength={1} />
                        </svg>
                        {note && <span className="grease-note">{note}</span>}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="sheet-edge">
              <span className="sheet-holes" aria-hidden />
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}

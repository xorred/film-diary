// Reads a Letterboxd export folder. Checks headers instead of assuming them.
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

export type Row = Record<string, string>;

function readCsv(file: string, required: string[], optional = false): Row[] {
  if (!fs.existsSync(file)) {
    if (optional) return [];
    throw new Error(`Missing ${file}. Is the Letterboxd export unzipped into data/letterboxd/?`);
  }
  let text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  // List exports start with a few lines of list info. The films table begins at "Position,".
  const listStart = text.indexOf("\nPosition,");
  if (text.startsWith("Letterboxd list export") && listStart >= 0) text = text.slice(listStart + 1);

  const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields ?? [];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length) {
    throw new Error(`${path.basename(file)} is missing columns: ${missing.join(", ")} (found: ${headers.join(", ")})`);
  }
  return parsed.data;
}

export function filmKey(title: string, year: string | number) {
  return `${title} (${year})`;
}

export function slugify(title: string, year: string | number) {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "film"}-${year}`;
}

export function loadExport(dir: string) {
  const p = (f: string) => path.join(dir, f);
  const base = ["Date", "Name", "Year", "Letterboxd URI"];
  const profileRows = readCsv(p("profile.csv"), ["Username"], true);
  return {
    watched: readCsv(p("watched.csv"), base),
    ratings: readCsv(p("ratings.csv"), [...base, "Rating"], true),
    diary: readCsv(p("diary.csv"), [...base, "Rating", "Rewatch", "Watched Date"], true),
    reviews: readCsv(p("reviews.csv"), [...base, "Review"], true),
    watchlist: readCsv(p("watchlist.csv"), base, true),
    likes: readCsv(p("likes/films.csv"), base, true),
    profile: profileRows[0] ?? {},
  };
}

// Letterboxd reviews only use a few tags. Keep those, escape everything else.
const ALLOWED = /<\/?(b|i|em|strong|u|br|p|blockquote)\s*\/?>/gi;

export function sanitizeReview(raw: string) {
  const kept: string[] = [];
  const marked = raw.replace(ALLOWED, (tag) => {
    kept.push(tag.toLowerCase().replace(/\s+/g, ""));
    return `\u0000${kept.length - 1}\u0000`;
  });
  const escaped = marked
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return escaped
    .replace(/\u0000(\d+)\u0000/g, (_, i) => kept[Number(i)])
    .trim()
    .replace(/\r?\n/g, "<br>");
}

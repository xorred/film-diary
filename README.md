# Sagar Pawar, a film diary

A personal film diary built from my Letterboxd export: every film I've logged, my ratings and reviews,
a diary by month, my watchlist and a few numbers. Next.js, statically generated, hosted on Vercel.

## How it fits together

```
data/letterboxd/      my Letterboxd export, unzipped
scripts/enrich.ts     matches each film to TMDB and writes data/films.json
data/films.json       everything the site reads (also the TMDB cache)
data/overrides.json   manual fixes: "Title (Year)" -> TMDB id
data/unmatched.md     report of films that need a manual fix
content/site.json     home page headline and which film is circled on the contact sheet
content/notes/        optional longer notes for any film page (see the README in there)
src/lib/stats.ts      every count on the site, with what each word means (title, viewing, diary entry)
```

The site never calls TMDB itself. It only reads `data/films.json`, so a build needs no keys.

## 1. Export from Letterboxd

On letterboxd.com go to **Settings → Data → Export your data**. You get a zip.
Unzip it into `data/letterboxd/`, replacing what's there. The folder should contain `watched.csv`,
`ratings.csv`, `diary.csv` and so on.

## 2. Get a TMDB key

Make a free account on themoviedb.org, then **Settings → API → Request an API key** (pick "Personal").
Either the short "API Key" or the long "API Read Access Token" works.

Copy `.env.example` to `.env.local` and paste it in:

```
TMDB_API_KEY=your_key_here
```

`.env.local` is in `.gitignore` and never gets committed.

## 3. Run the enrich script

```
npm install
npm run enrich
```

It matches every film by title and year, then by year plus or minus one, then as a TV series,
then by title alone (only when exactly one film has that title and the year is within 3).
Anything it can't match safely goes into `data/unmatched.md` with the closest TMDB results.

Results are cached in `data/films.json`, so running it again only looks up new films.
Other options: `npm run enrich -- --refresh` refetches everything, `--offline` rebuilds from the CSVs without TMDB.

### Fixing a wrong or missing match

Find the film on themoviedb.org. The number in its address is the id, e.g. themoviedb.org/movie/**155**-the-dark-knight.
Add it to `data/overrides.json` using the exact `Title (Year)` from the report, then run `npm run enrich` again:

```json
{
  "The Dark Knight (2008)": 155,
  "Loki (2021)": "tv:84958"
}
```

Use `"tv:<id>"` for a series.

## 4. Look at it locally

```
npm run dev
```

Then open http://localhost:3000.

## 5. Deploy on Vercel

1. Push the project to GitHub.
2. On vercel.com: **Add New → Project**, pick the repo, click **Deploy**. Nothing to configure.

Every push to `main` redeploys the site.

The optional "Should I watch it?" feature only appears when `ANTHROPIC_API_KEY` is set
(Vercel: Project → Settings → Environment Variables, then redeploy). Without it the site works fully
and the feature stays hidden.

## Visitor analytics

The site uses Vercel Web Analytics (`@vercel/analytics`, added once in `src/app/layout.tsx`).
Turn it on once: in the Vercel dashboard open the project, go to the **Analytics** tab and click **Enable**.
After the next deploy you'll see page views, visitors, top pages and referrers there. It sets no cookies.

Locally the analytics script returns a 404. That's expected: it only exists on Vercel.

There is deliberately no public visitor counter on the site. Vercel's analytics don't expose an all-time
total to the page, and a homemade counter would need its own database. The numbers live in the dashboard.

## 6. After new watches

1. Export from Letterboxd again and unzip over `data/letterboxd/`.
2. `npm run enrich`
3. Check `data/unmatched.md`, fix anything in `data/overrides.json`, run enrich again if you did.
4. `git add . && git commit -m "New watches" && git push`

## Credits

Film details and images come from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.

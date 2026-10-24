// The site's public address, for social previews and the sitemap.
// Set NEXT_PUBLIC_SITE_URL if the site moves to its own domain.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://film-diary1.vercel.app");

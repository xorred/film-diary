import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getData } from "@/lib/data";
import { stillUrl } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { theatreEnabled } from "@/lib/theatre";

const description = "A film diary kept by Sagar Pawar. Every film, the date, the rating and a few words.";

// The default sharing image: a still from the latest film I loved enough to review.
function shareStill() {
  const f = getData()
    .films.filter((x) => x.review && (x.rating ?? 0) >= 4.5 && x.tmdb?.backdropPath)
    .sort((a, b) => b.review!.date.localeCompare(a.review!.date))[0];
  return f ? [{ url: stillUrl(f.tmdb!.backdropPath!, "w1280"), width: 1280, height: 720, alt: `A still from ${f.title}` }] : [];
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Sagar Pawar, a film diary", template: "%s | Sagar Pawar, a film diary" },
  description,
  openGraph: { type: "website", siteName: "Sagar Pawar, a film diary", description, images: shareStill() },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2ede3" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1714" },
  ],
};

// Applies the saved theme before paint so there is no flash.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:bg-paper focus:px-3 focus:py-2 focus:font-sans focus:text-sm">
          Skip to the content
        </a>
        <SiteHeader theatre={theatreEnabled()} />
        <main id="main" className="mx-auto w-full max-w-[1320px] px-5 sm:px-10">{children}</main>
        <SiteFooter />
        {/* Vercel Web Analytics: page views and visitors, no cookies. Data lives in the Vercel dashboard. */}
        <Analytics />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { theatreEnabled } from "@/lib/theatre";

export const metadata: Metadata = {
  title: { default: "Sagar Pawar, a film diary", template: "%s | Sagar Pawar, a film diary" },
  description: "A film diary kept by Sagar Pawar. Every film, the date, the rating and a few words.",
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
        <SiteHeader theatre={theatreEnabled()} />
        <main className="mx-auto w-full max-w-[1320px] px-5 sm:px-10">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/diary", label: "Diary" },
  { href: "/films", label: "Films" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/stats", label: "Numbers" },
];

export function SiteHeader({ theatre }: { theatre: boolean }) {
  const path = usePathname();
  const links = theatre ? [...LINKS, { href: "/theatre", label: "Should I watch it?" }] : LINKS;

  return (
    <header className="relative">
      <div className="mx-auto grid w-full max-w-[1320px] grid-cols-[1fr_auto] items-baseline gap-x-8 gap-y-4 px-5 pt-6 pb-5 sm:px-10 lg:grid-cols-[auto_1fr_auto] lg:pt-7">
        <Link href="/" className="block">
          <span className="block font-serif text-[1.35rem] italic leading-none">Sagar Pawar</span>
          <span className="meta mt-1.5 block text-faint">a film diary</span>
        </Link>

        <nav
          aria-label="Main"
          className="col-span-2 -mx-5 overflow-x-auto px-5 lg:col-span-1 lg:mx-0 lg:justify-self-end lg:px-0"
        >
          <ul className="flex gap-6 whitespace-nowrap font-sans text-[0.875rem] text-charcoal">
            {links.map((l) => {
              const active = path.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`link-quiet pb-0.5 hover:text-ink ${
                      active ? "text-ink [background-size:100%_1px]" : ""
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="col-start-2 row-start-1 lg:col-start-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

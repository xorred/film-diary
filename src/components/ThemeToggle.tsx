"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function current(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- read the theme set before hydration
  useEffect(() => setTheme(current()), []);

  const flip = () => {
    const next: Theme = current() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={flip}
      className={`font-sans text-[0.875rem] ${onDark ? "text-[#8f8577] hover:text-[#f3ece0]" : "text-faint hover:text-ink"}`}
      aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"}
    >
      {theme === "dark" ? "Day" : "Night"}
    </button>
  );
}

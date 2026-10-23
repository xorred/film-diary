// TMDB uses ISO 639-1 codes, plus a couple of its own.
const SPECIAL: Record<string, string> = {
  cn: "Cantonese",
  xx: "No language",
  sh: "Serbo-Croatian",
};

const names = new Intl.DisplayNames(["en"], { type: "language" });

export function languageName(code: string | null | undefined) {
  if (!code) return "Unknown";
  if (SPECIAL[code]) return SPECIAL[code];
  try {
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

// Indian languages get their own colour family on the stats page.
export const INDIAN = new Set(["hi", "mr", "ta", "te", "ml", "kn", "bn", "gu", "pa", "or", "as", "ur", "kok", "sa", "bho"]);

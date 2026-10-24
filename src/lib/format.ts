export function stars(rating: number | null) {
  if (rating == null) return "";
  return "★".repeat(Math.floor(rating)) + (rating % 1 ? "½" : "");
}

export function ratingWords(rating: number | null) {
  if (rating == null) return "not rated";
  return `${rating} out of 5`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "2024-03-14" -> "14 March 2024"
export function longDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

// "2024-03-14" -> "14 Mar"
export function dayMonth(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

// "2024-03" -> "March 2024"
export function monthName(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

export function runtimeText(min: number | null) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`;
}

export function posterUrl(path: string, size: "w185" | "w342" | "w500" | "w780" = "w342") {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function stillUrl(path: string, size: "w780" | "w1280" | "original" = "w1280") {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

// When the film was seen, in words. Without a diary entry the viewing date is unknown: Letterboxd's
// date is when it was logged, which only tells us it was seen on or before that day.
export function seenText(f: { watchedDate: string | null; loggedDate: string }) {
  if (f.watchedDate) return `Seen ${longDate(f.watchedDate)}`;
  return `Viewing date unknown. Logged ${longDate(f.loggedDate)}, so seen on or before then.`;
}

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

// 636 -> "Six hundred and thirty-six"
export function numberWords(n: number): string {
  const under100 = (x: number) => (x < 20 ? ONES[x] : TENS[Math.floor(x / 10)] + (x % 10 ? `-${ONES[x % 10]}` : ""));
  const under1000 = (x: number) => {
    const h = Math.floor(x / 100);
    const r = x % 100;
    return [h ? `${ONES[h]} hundred` : "", r ? (h ? "and " : "") + under100(r) : ""].filter(Boolean).join(" ");
  };
  if (n === 0) return "No";
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  const words = [th ? `${under1000(th)} thousand` : "", rest ? (th && rest < 100 ? "and " : "") + under1000(rest) : ""]
    .filter(Boolean)
    .join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

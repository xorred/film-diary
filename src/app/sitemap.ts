import type { MetadataRoute } from "next";
import { getData } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const { films, generatedAt } = getData();
  const lastModified = generatedAt ? new Date(generatedAt) : undefined;
  const pages = ["", "/diary", "/diary/reviews", "/films", "/watchlist", "/stats"].map((p) => ({ url: `${SITE_URL}${p}`, lastModified }));
  return [...pages, ...films.map((f) => ({ url: `${SITE_URL}/films/${f.id}`, lastModified }))];
}

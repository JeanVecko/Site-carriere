import type { MetadataRoute } from "next";
import { detailHref, isExpired } from "./lib/api";
import { fetchAnnouncements, SITE_URL } from "./lib/server";
import { cityHref, citiesWithJobs } from "./lib/cities";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/offres", "/emplois", "/annonces", "/appels-offres", "/a-propos", "/recruteurs", "/alertes", "/mentions-legales"].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "daily" as const,
  }));
  const all = await fetchAnnouncements();
  // Pages des villes qui ont des offres ouvertes (Offres d’emploi à Kinshasa…).
  const cities = citiesWithJobs(all).map((city) => ({ url: `${SITE_URL}${cityHref(city.slug)}`, changeFrequency: "daily" as const }));
  const offers = all
    .filter((item) => !isExpired(item))
    .map((item) => ({
      url: `${SITE_URL}${detailHref(item)}`,
      lastModified: item.created_at ? new Date(item.created_at) : undefined,
    }));
  return [...pages, ...cities, ...offers];
}

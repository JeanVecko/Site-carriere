import type { MetadataRoute } from "next";
import { detailHref, isExpired } from "./lib/api";
import { fetchAnnouncements, SITE_URL } from "./lib/server";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/offres", "/annonces", "/appels-offres", "/a-propos", "/recruteurs", "/mentions-legales"].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "daily" as const,
  }));
  const offers = (await fetchAnnouncements())
    .filter((item) => !isExpired(item))
    .map((item) => ({
      url: `${SITE_URL}${detailHref(item)}`,
      lastModified: item.created_at ? new Date(item.created_at) : undefined,
    }));
  return [...pages, ...offers];
}

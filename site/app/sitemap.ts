import type { MetadataRoute } from "next";
import { detailHref, isExpired } from "./lib/api";
import { fetchAnnouncements, fetchArticles, fetchCompanies, SITE_URL } from "./lib/server";
import { articleHref } from "./lib/articles";
import { companyHref } from "./lib/api";
import { cityHref, citiesWithJobs } from "./lib/cities";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/offres", "/emplois", "/entreprises", "/conseils", "/annonces", "/appels-offres", "/a-propos", "/recruteurs", "/alertes", "/mentions-legales"].map((path) => ({
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
  // Pages des entreprises qui ont des offres en cours.
  const companies = (await fetchCompanies()).map((company) => ({ url: `${SITE_URL}${companyHref(company.slug)}`, changeFrequency: "weekly" as const }));
  // Conseils carrière publiés.
  const articles = (await fetchArticles()).map((article) => ({
    url: `${SITE_URL}${articleHref(article.slug)}`,
    lastModified: new Date(article.updated_at),
    changeFrequency: "monthly" as const,
  }));
  return [...pages, ...articles, ...cities, ...companies, ...offers];
}

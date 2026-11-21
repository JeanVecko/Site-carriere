import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import CategoryList from "../../components/CategoryList";
import SiteFooter from "../../components/SiteFooter";
import { isExpired } from "../../lib/api";
import { cityBySlug, cityHref, citiesWithJobs, jobsInCity } from "../../lib/cities";
import { fetchAnnouncements, SITE_URL } from "../../lib/server";

// Comme les autres listes : rafraîchie à chaque publication et chaque matin (voir lib/server.ts).
export const revalidate = 43200;

type Props = { params: Promise<{ ville: string }> };

// Pages préparées pour chaque ville qui a des offres ouvertes ; une nouvelle ville l'est à sa première visite.
export async function generateStaticParams() {
  return citiesWithJobs(await fetchAnnouncements("Offre d’emploi")).map((city) => ({ ville: city.slug }));
}

async function loadCity(slug: string) {
  const city = cityBySlug(slug);
  if (!city) return null;
  const all = await fetchAnnouncements("Offre d’emploi");
  const jobs = jobsInCity(all, city.slug);
  const open = jobs.filter((item) => !isExpired(item)).length;
  if (open === 0) return null; // pas de page vide (Google les pénalise)
  const others = citiesWithJobs(all).filter((entry) => entry.slug !== city.slug).slice(0, 12);
  return { city, jobs, open, others };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadCity((await params).ville);
  if (!data) return { title: "Page introuvable — Carrières RDC" };
  const { city, open } = data;
  const title = `Offres d’emploi à ${city.name} — ${open} poste${open > 1 ? "s" : ""} ouvert${open > 1 ? "s" : ""} | Carrières RDC`;
  const description = `${open} offre${open > 1 ? "s" : ""} d’emploi en cours à ${city.name} (RDC) : CDI, CDD, stages et consultances dans les entreprises, ONG et institutions. Postulez directement, sans frais.`;
  const url = `${SITE_URL}${cityHref(city.slug)}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
}

export default async function Page({ params }: Props) {
  const data = await loadCity((await params).ville);
  if (!data) notFound();
  const { city, jobs, others } = data;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Offres d’emploi", item: `${SITE_URL}/offres` },
      { "@type": "ListItem", position: 3, name: city.name, item: `${SITE_URL}${cityHref(city.slug)}` },
    ],
  };
  return (
    <>
      <SiteHeader active="/offres" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <Suspense fallback={null}>
        <CategoryList category="jobs" initialItems={jobs} place={{ name: city.name, slug: city.slug, others }} />
      </Suspense>
      <SiteFooter />
    </>
  );
}

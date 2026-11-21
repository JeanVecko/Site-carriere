import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { cityHref, citiesWithJobs } from "../lib/cities";
import { fetchAnnouncements, SITE_URL } from "../lib/server";

export const revalidate = 43200;

export const metadata: Metadata = {
  title: "Offres d’emploi par ville en RDC — Carrières RDC",
  description: "Toutes les offres d’emploi en cours en République démocratique du Congo, ville par ville : Kinshasa, Lubumbashi, Goma, Bukavu, Bunia…",
  alternates: { canonical: `${SITE_URL}/emplois` },
};

export default async function Page() {
  const cities = citiesWithJobs(await fetchAnnouncements("Offre d’emploi"));
  return (
    <>
      <SiteHeader active="/offres" />
      <main>
        <section className="pub-list-hero">
          <div className="pub-container">
            <nav className="pub-breadcrumb pub-breadcrumb-light" aria-label="Fil d’Ariane">
              <Link href="/">Accueil</Link> <span aria-hidden="true">/</span> <Link href="/offres">Offres d’emploi</Link>{" "}
              <span aria-hidden="true">/</span> <span>Par ville</span>
            </nav>
            <h1>Offres d’emploi par ville</h1>
            <p>Choisissez une ville pour voir les postes ouverts, mis à jour chaque jour.</p>
          </div>
        </section>
        <section className="pub-container pub-city-index">
          {cities.length === 0 ? (
            <p className="pub-empty">Aucune offre d’emploi en cours pour le moment.</p>
          ) : (
            <ul>
              {cities.map((city) => (
                <li key={city.slug}>
                  <Link href={cityHref(city.slug)}>
                    <MapPin size={18} aria-hidden="true" />
                    <span>
                      <strong>{city.name}</strong>
                      <small>
                        {city.count} offre{city.count > 1 ? "s" : ""} en cours
                      </small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

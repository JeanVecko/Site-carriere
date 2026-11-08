import Link from "next/link";
import { ArrowRight, CheckCircle2, Megaphone, Search } from "lucide-react";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import OfferRow from "./components/OfferRow";
import { SOCIAL_NETWORKS } from "./components/SocialLinks";
import { isExpired } from "./lib/api";
import { fetchAnnouncements } from "./lib/server";

export const revalidate = 60;

const CATEGORIES = [
  { label: "Offres d’emploi", value: "Offre d’emploi", href: "/offres" },
  { label: "Annonces", value: "Annonce", href: "/annonces" },
  { label: "Appels d’offres", value: "Appel d’offre", href: "/appels-offres" },
];

export default async function Home() {
  const open = (await fetchAnnouncements()).filter((item) => !isExpired(item));
  // Les 10 dernières offres d'emploi encore ouvertes (la liste de l'API est triée de la plus récente à la plus ancienne).
  const latest = open.filter((item) => item.category === "Offre d’emploi").slice(0, 10);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="home-hero">
          <h1>
            Votre prochain <em>emploi</em> en RDC commence ici.
          </h1>
          <p>Offres d’emploi, annonces et appels d’offres, publiés chaque jour.</p>
          <form className="home-search" action="/offres" role="search">
            <Search size={18} aria-hidden="true" />
            <input name="q" type="search" placeholder="Poste, entreprise ou ville…" aria-label="Rechercher une offre d’emploi" />
            <button type="submit">Rechercher</button>
          </form>
          <nav className="home-categories" aria-label="Catégories">
            {CATEGORIES.map((category) => (
              <Link key={category.href} href={category.href}>
                {category.label}
                <span>{open.filter((item) => item.category === category.value).length}</span>
              </Link>
            ))}
          </nav>
        </section>

        <section className="home-recruiters" aria-labelledby="recruiters-title">
          <div className="home-recruiters-icon" aria-hidden="true">
            <Megaphone size={26} />
          </div>
          <div className="home-recruiters-text">
            <h2 id="recruiters-title">
              Vous recrutez ? <em>Faites-nous confiance.</em>
            </h2>
            <p>
              Entreprises, ONG, institutions : confiez-nous vos offres d’emploi et appels d’offres.
              Nous les publions sur le site et les relayons sur nos plateformes pour toucher les bons profils partout en RDC.
            </p>
            <ul>
              <li><CheckCircle2 size={15} aria-hidden="true" /> Publication rapide</li>
              <li><CheckCircle2 size={15} aria-hidden="true" /> Visible sur toutes nos plateformes</li>
              <li><CheckCircle2 size={15} aria-hidden="true" /> Les candidatures vous arrivent directement</li>
            </ul>
          </div>
          <a className="home-recruiters-button" href="#contact">
            Publier une offre <ArrowRight size={16} />
          </a>
        </section>

        <section className="home-latest" aria-label="Dernières offres d’emploi">
          {latest.length > 0 ? (
            <ul className="offer-rows">
              {latest.map((item) => (
                <OfferRow key={String(item.id)} item={item} />
              ))}
            </ul>
          ) : (
            <p className="empty-state">Aucune offre d’emploi en cours pour le moment. Revenez bientôt !</p>
          )}
          <div className="home-more">
            <Link className="home-more-button" href="/offres">
              Voir plus d’offres <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section className="home-tiktok">
          <p>
            <strong>Ne ratez aucune offre :</strong> suivez-nous sur nos plateformes.
          </p>
          <div className="home-social-buttons">
            {SOCIAL_NETWORKS.map((network) => (
              <a key={network.name} href={network.href} target="_blank" rel="noreferrer" aria-label={network.label}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d={network.path} />
                </svg>
                {network.name}
              </a>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

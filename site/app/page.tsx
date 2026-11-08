import Link from "next/link";
import { ArrowRight, CircleCheck, Megaphone, Search } from "lucide-react";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import OfferRow from "./components/OfferRow";
import { ACTIVE_SOCIAL_NETWORKS } from "./components/SocialLinks";
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
  // Les 10 dernières offres d'emploi encore ouvertes (l'API trie de la plus récente à la plus ancienne).
  const latest = open.filter((item) => item.category === "Offre d’emploi").slice(0, 10);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="pub-hero">
          <div className="pub-container">
            <h1>
              Votre prochain <em>emploi</em> en RDC commence ici.
            </h1>
            <p className="pub-lead">Offres d’emploi, annonces et appels d’offres, vérifiés et réunis au même endroit.</p>
            <form className="pub-search" action="/offres" role="search">
              <Search size={20} aria-hidden="true" />
              <input name="q" type="search" placeholder="Poste, entreprise ou ville…" aria-label="Rechercher une offre d’emploi" />
              <button className="pub-btn pub-btn-gold" type="submit">
                Rechercher
              </button>
            </form>
            <nav className="pub-chips" aria-label="Catégories">
              {CATEGORIES.map((category) => (
                <Link key={category.href} href={category.href}>
                  {category.label}
                  <b>{open.filter((item) => item.category === category.value).length}</b>
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <div className="pub-container">
          <section className="pub-section" style={{ paddingBottom: 0 }} id="recruteurs" aria-labelledby="recruiters-title">
            <div className="pub-recruit">
              <div className="pub-recruit-icon" aria-hidden="true">
                <Megaphone size={26} />
              </div>
              <div className="pub-recruit-text">
                <h2 id="recruiters-title">
                  Vous recrutez ? <em>Faites-nous confiance.</em>
                </h2>
                <p>
                  Entreprises, ONG, institutions : confiez-nous vos offres d’emploi et appels d’offres. Nous les publions
                  sur le site et les relayons sur nos plateformes pour toucher les bons profils partout en RDC.
                </p>
                <ul>
                  <li><CircleCheck size={15} aria-hidden="true" /> Publication rapide</li>
                  <li><CircleCheck size={15} aria-hidden="true" /> Visible sur toutes nos plateformes</li>
                  <li><CircleCheck size={15} aria-hidden="true" /> Les candidatures vous arrivent directement</li>
                </ul>
              </div>
              <a className="pub-btn pub-btn-navy" href="#contact">
                Publier une offre <ArrowRight size={16} />
              </a>
            </div>
          </section>

          <section className="pub-section" aria-label="Dernières offres d’emploi">
            {latest.length > 0 ? (
              <ul className="pub-jobs">
                {latest.map((item) => (
                  <OfferRow key={String(item.id)} item={item} />
                ))}
              </ul>
            ) : (
              <p className="pub-empty">Aucune offre d’emploi en cours pour le moment. Revenez bientôt !</p>
            )}
            <div className="pub-more">
              <Link className="pub-btn pub-btn-navy" href="/offres">
                Voir plus d’offres <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          <section className="pub-follow" style={{ marginBottom: 44 }} aria-labelledby="follow-title">
            <div>
              <h2 id="follow-title">Ne ratez aucune offre</h2>
              <p>Suivez-nous sur nos plateformes pour recevoir les nouvelles offres dès leur publication.</p>
            </div>
            <div className="pub-follow-buttons">
              {ACTIVE_SOCIAL_NETWORKS.map((network) => (
                <a key={network.name} className="pub-btn pub-btn-light" href={network.href} target="_blank" rel="noreferrer" aria-label={network.label}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d={network.path} />
                  </svg>
                  {network.name}
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter withContact />
    </>
  );
}

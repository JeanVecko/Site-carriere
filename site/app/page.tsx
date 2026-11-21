import Link from "next/link";
import {
  ArrowRight, BellRing, Mail, MapPin, Megaphone, Search, Send, UserRound,
} from "lucide-react";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import OfferRow from "./components/OfferRow";
import SplashScreen from "./components/SplashScreen";
import { CONTRACT_TYPES, isExpired } from "./lib/api";
import { fetchAnnouncements } from "./lib/server";

export const revalidate = 43200;

function cityOf(location?: string) {
  const city = (location || "").split(/[·,(/-]/)[0].trim();
  return city ? city.charAt(0).toUpperCase() + city.slice(1) : "";
}

export default async function Home() {
  const open = (await fetchAnnouncements()).filter((item) => !isExpired(item));
  const jobs = open.filter((item) => item.category === "Offre d’emploi");
  // Les 5 dernières offres d’emploi encore ouvertes (l’API trie de la plus récente à la plus ancienne).
  const latest = jobs.slice(0, 5);
  const cityCounts = new Map<string, number>();
  for (const item of jobs) {
    const city = cityOf(item.location);
    if (city) cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
  }
  const cities = [...cityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([city]) => city);

  return (
    <>
      <SplashScreen />
      <SiteHeader />
      <main className="home">
        {/* ----- Bandeau ----- */}
        <section className="pub-hero home-hero">
          <div className="pub-container home-hero-grid">
            <div className="home-hero-text">
              <h1>
                Votre prochain emploi en RDC <em>commence ici</em>
              </h1>
              <p className="pub-lead">
                Offres d’emploi, annonces et appels d’offres vérifiés, publiés chaque jour par les employeurs et organisations de
                toute la République démocratique du Congo.
              </p>
              <div className="home-hero-actions">
                <Link className="pub-btn pub-btn-navy" href="/offres">
                  Voir les offres <ArrowRight size={16} />
                </Link>
                <Link className="pub-btn pub-btn-outline" href="/recruteurs">
                  Publier une offre <Megaphone size={16} />
                </Link>
              </div>
            </div>

            {/* Une seule carte, sobre : les dernières offres sont listées juste en dessous. */}
            <div className="home-hero-visual">
              <div className="home-hero-card">
                <span className="home-hero-card-icon" aria-hidden="true"><BellRing size={22} /></span>
                <strong>Ne ratez aucune offre</strong>
                <p>{open.length} publications ouvertes aujourd’hui. Recevez les nouvelles chaque matin par e-mail.</p>
                <Link className="pub-btn pub-btn-navy pub-btn-sm" href="/alertes">
                  Créer une alerte <BellRing size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ----- Barre de recherche à cheval sur le bandeau ----- */}
        <div className="pub-container">
          <form className="home-search" action="/offres" role="search">
            <label>
              <Search size={18} aria-hidden="true" />
              <span>
                <small>Je cherche</small>
                <input name="q" type="search" placeholder="Poste, entreprise…" aria-label="Poste ou entreprise" />
              </span>
            </label>
            <label>
              <MapPin size={18} aria-hidden="true" />
              <span>
                <small>Où ?</small>
                <select name="ville" defaultValue="" aria-label="Ville">
                  <option value="">Toutes les villes</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </span>
            </label>
            <label>
              <UserRound size={18} aria-hidden="true" />
              <span>
                <small>Contrat</small>
                <select name="contrat" defaultValue="" aria-label="Type de contrat">
                  <option value="">Tous les contrats</option>
                  {CONTRACT_TYPES.filter((type) => type !== "Autre").map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </span>
            </label>
            <button className="pub-btn pub-btn-dark" type="submit">Rechercher</button>
          </form>
        </div>

        {/* ----- Dernières offres ----- */}
        <section className="pub-container home-latest" aria-labelledby="latest-title">
          <header className="home-title">
            <h2 id="latest-title">Dernières offres d’emploi</h2>
            <p>Les offres les plus récentes, encore ouvertes aux candidatures.</p>
          </header>
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
              Voir toutes les offres <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* ----- Inscription rapide aux alertes, à cheval sur le pied de page ----- */}
        <section className="pub-container home-newsletter pub-follow" aria-labelledby="newsletter-title">
          <span className="home-newsletter-icon" aria-hidden="true"><Mail size={30} /></span>
          <div>
            <h2 id="newsletter-title">Restez informé des nouvelles offres</h2>
            <p>Inscrivez-vous à l’alerte gratuite : un e-mail par jour au plus, désabonnement en un clic.</p>
          </div>
          <form action="/alertes" className="home-newsletter-form">
            <input name="email" type="email" required placeholder="Votre adresse e-mail" aria-label="Votre adresse e-mail" />
            <button className="pub-btn pub-btn-dark" type="submit">
              Je m’inscris <Send size={14} />
            </button>
          </form>
        </section>
      </main>
      <SiteFooter withContact />
    </>
  );
}

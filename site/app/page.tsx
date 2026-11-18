import Link from "next/link";
import {
  ArrowRight, BadgeCheck, BellRing, Briefcase, FileText, Mail, MapPin, Megaphone, Search, Send, ShieldCheck, UserRound,
} from "lucide-react";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import OfferRow from "./components/OfferRow";
import SplashScreen from "./components/SplashScreen";
import { companyAvatar, CONTRACT_TYPES, isExpired } from "./lib/api";
import { fetchAnnouncements } from "./lib/server";

export const revalidate = 60;

const DOMAINS = [
  { title: "Offres d’emploi", text: "CDI, CDD, stages et consultances publiés par les employeurs de toute la RDC.", href: "/offres", icon: Briefcase, tone: "green", category: "Offre d’emploi" },
  { title: "Annonces", text: "Formations, séminaires, bourses, concours et événements à ne pas manquer.", href: "/annonces", icon: Megaphone, tone: "orange", category: "Annonce" },
  { title: "Appels d’offres", text: "Marchés et consultations ouverts aux entreprises et prestataires.", href: "/appels-offres", icon: FileText, tone: "violet", category: "Appel d’offre" },
  { title: "Alertes e-mail", text: "Recevez chaque matin les nouvelles offres qui correspondent à vos critères.", href: "/alertes", icon: BellRing, tone: "lime" },
  { title: "Publier une offre", text: "Entreprises, ONG, institutions : faites connaître vos offres partout en RDC.", href: "/recruteurs", icon: Send, tone: "blue" },
];

const REASONS = [
  { title: "Offres vérifiées", text: "Chaque publication est relue avant sa mise en ligne, avec sa source et sa date limite.", icon: ShieldCheck },
  { title: "Candidatures en direct", text: "Vous postulez directement auprès de l’employeur, sans intermédiaire.", icon: Send },
  { title: "Gratuit pour les candidats", text: "Aucun frais pour consulter les offres ni pour postuler.", icon: BadgeCheck },
  { title: "Partout en RDC", text: "Kinshasa, Lubumbashi, Goma, Kolwezi… et toutes les provinces.", icon: MapPin },
];

function cityOf(location?: string) {
  const city = (location || "").split(/[·,(/-]/)[0].trim();
  return city ? city.charAt(0).toUpperCase() + city.slice(1) : "";
}

export default async function Home() {
  const open = (await fetchAnnouncements()).filter((item) => !isExpired(item));
  const jobs = open.filter((item) => item.category === "Offre d’emploi");
  // Les 10 dernières offres d'emploi encore ouvertes (l'API trie de la plus récente à la plus ancienne).
  const latest = jobs.slice(0, 10);
  const companies = [...new Set(open.map((item) => item.company?.trim()).filter(Boolean))] as string[];
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

            <div className="home-hero-visual">
              <div className="home-hero-panel" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
                <img className="home-hero-watermark" src="/LOGO/Logo.png" alt="" />
                <div className="home-stack">
                  {latest.slice(0, 3).map((item, index) => {
                    const avatar = companyAvatar(item.company);
                    return (
                      <div key={String(item.id)} className={`home-stack-card is-${index}`}>
                        <span className={`pub-avatar tone-${avatar.tone}`}>{avatar.initial}</span>
                        <div>
                          <strong>{item.title}</strong>
                          <small>
                            {item.company}
                            {item.location ? ` · ${item.location}` : ""}
                          </small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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

        {/* ----- Rubriques ----- */}
        <section className="pub-container home-domains" aria-labelledby="domains-title">
          <header className="home-title">
            <h2 id="domains-title">Nos rubriques</h2>
            <p>Tout ce qu’il faut pour trouver un emploi, une formation ou un marché en RDC.</p>
          </header>
          <div className="home-domain-grid">
            {DOMAINS.map((domain) => {
              const Icon = domain.icon;
              const count = domain.category ? open.filter((item) => item.category === domain.category).length : null;
              return (
                <Link key={domain.href} href={domain.href} className={`home-domain tone-${domain.tone}`}>
                  <span className="home-domain-art" aria-hidden="true">
                    <Icon size={54} strokeWidth={1.4} />
                    {count !== null && <b>{count} en cours</b>}
                  </span>
                  <span className="home-domain-badge" aria-hidden="true"><Icon size={18} /></span>
                  <strong>{domain.title}</strong>
                  <p>{domain.text}</p>
                  <small>En savoir plus <ArrowRight size={14} /></small>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ----- Recruteurs + confiance ----- */}
        <section className="home-trust pub-recruit" id="recruteurs" aria-labelledby="trust-title">
          <div className="home-trust-visual">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
            <img src="/LOGO/Logo.png" alt="" aria-hidden="true" />
            <div className="home-trust-card">
              <span>Vous recrutez ?</span>
              <h2>
                Touchez les bons <em>profils</em> partout en RDC
              </h2>
              <p>Nous publions vos offres sur le site, les relayons sur nos réseaux et les envoyons aux abonnés des alertes e-mail.</p>
              <Link className="pub-btn pub-btn-gold pub-btn-sm" href="/recruteurs">
                Publier une offre <Send size={14} />
              </Link>
            </div>
          </div>
          <div className="home-trust-list">
            <h2 id="trust-title">Pourquoi nous faire confiance ?</h2>
            <ul>
              {REASONS.map((reason) => {
                const Icon = reason.icon;
                return (
                  <li key={reason.title}>
                    <span aria-hidden="true"><Icon size={20} /></span>
                    <div>
                      <strong>{reason.title}</strong>
                      <p>{reason.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

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

        {/* ----- Organisations ----- */}
        {companies.length >= 3 && (
          <section className="pub-container home-band" aria-label="Organisations qui publient sur Carrières RDC">
            <span>Ils publient sur Carrières RDC</span>
            <ul>
              {companies.slice(0, 6).map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </section>
        )}

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
